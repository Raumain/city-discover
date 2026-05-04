import type { DiscoveryProvider } from '@/src/features/discovery/providers';
import { evaluateMotivation } from '@/src/features/motivation/engine';
import { createOsmClient } from '@/src/features/osm/client';
import { buildCityGraphSnapshot, buildRoadsFromOverpassElements, type OverpassElement } from '@/src/features/osm/ingestion';
import type { PersistedCitySegment, PersistedSnapshotBundle } from '@/src/features/storage/repositories/citySnapshotRepository';
import { evaluateGeodataCachePolicy } from '@/src/features/discovery/geodataCachePolicy';

type LiveDiscoveryProviderDeps = {
  cityName: string;
  countryCode?: string;
  citySnapshots: {
    getSnapshot: () => Promise<PersistedSnapshotBundle | null>;
    saveSnapshot: (snapshot: PersistedSnapshotBundle['snapshot'], segments: PersistedCitySegment[]) => Promise<void>;
  };
  discovery: {
    listProgress: () => Promise<Array<{ segmentId: string; discoveredMeters: number }>>;
  };
  osmClient?: {
    fetchBoundary: (input: { cityName: string; countryCode?: string }) => Promise<{
      cityName: string;
      cityKey: string;
      areaKm2: number;
      relationId: number;
    }>;
    fetchRoadElements: (relationId: number) => Promise<OverpassElement[]>;
  };
  cacheMaxAgeHours?: number;
};

const DEFAULT_CACHE_MAX_AGE_HOURS = 24 * 7;

export function createLiveDiscoveryProvider(deps: LiveDiscoveryProviderDeps): DiscoveryProvider {
  const osmClient = deps.osmClient ?? createOsmClient();
  const cacheMaxAgeHours = deps.cacheMaxAgeHours ?? DEFAULT_CACHE_MAX_AGE_HOURS;

  return {
    async loadSeed() {
      const bundle = await deps.citySnapshots.getSnapshot();
      const desiredCityKey = slugify(deps.cityName);
      const policy = evaluateGeodataCachePolicy(bundle?.snapshot ?? null, {
        nowIso: new Date().toISOString(),
        maxAgeHours: cacheMaxAgeHours,
        requiredSchemaVersion: 1,
        cityKey: desiredCityKey,
      });

      let activeBundle = bundle;
      if (policy !== 'fresh') {
        const boundary = await osmClient.fetchBoundary({
          cityName: deps.cityName,
          countryCode: deps.countryCode,
        });
        const elements = await osmClient.fetchRoadElements(boundary.relationId);
        const roads = buildRoadsFromOverpassElements(elements);
        const snapshot = buildCityGraphSnapshot(
          {
            cityName: boundary.cityName,
            cityKey: boundary.cityKey,
            areaKm2: boundary.areaKm2,
          },
          roads
        );
        const persistedSegments = snapshot.segments.map((segment) => ({
          id: segment.id,
          fromNodeId: segment.fromNodeId,
          toNodeId: segment.toNodeId,
          lengthMeters: segment.lengthMeters,
          fromX: segment.fromX,
          fromY: segment.fromY,
          toX: segment.toX,
          toY: segment.toY,
        }));
        await deps.citySnapshots.saveSnapshot(
          {
            cityName: snapshot.cityName,
            cityKey: snapshot.cityKey,
            areaKm2: snapshot.areaKm2,
            totalStreetLengthMeters: snapshot.totalStreetLengthMeters,
            fetchedAtIso: snapshot.fetchedAtIso,
            source: snapshot.source,
            schemaVersion: snapshot.schemaVersion,
          },
          persistedSegments
        );
        activeBundle = await deps.citySnapshots.getSnapshot();
      }

      if (!activeBundle) {
        throw new Error('Failed to initialize geodata snapshot.');
      }

      const progress = await deps.discovery.listProgress();
      return {
        snapshot: activeBundle.snapshot,
        segments: activeBundle.segments,
        progress,
        dailyStats: [],
        nearbyUnexploredStreets: [],
        weeklyMotivationDecision: evaluateMotivation({
          currentIsoDate: new Date().toISOString().slice(0, 10),
          weeklyNudgesAlreadySent: 0,
          lastActivityIsoDate: new Date().toISOString().slice(0, 10),
          weeklyDiscoveryGoalMeters: 1000,
          discoveredThisWeekMeters: 0,
        }),
        latestSessionSummary: null,
        defaultSettings: {
          smartNudgesEnabled: true,
          autoDetectCityEnabled: true,
          onboardingCompleted: false,
        },
      };
    },
  };
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
