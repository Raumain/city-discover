import { updateDiscoveredSegmentsFromTrack, type StreetSegment, type TrackPoint } from '@/src/domain/discovery';
import type { DailyStat } from '@/src/domain/stats';
import { resolveDailyDistanceKm } from '@/src/features/health/healthConnect';
import { evaluateMotivation } from '@/src/features/motivation/engine';
import { buildCityGraphSnapshot, type OSMRoad } from '@/src/features/osm/ingestion';
import type { DiscoveryProvider } from '@/src/features/discovery/providers';
import { addTrackPoint, createWalkSession, finishWalkSession, type RawTrackPoint } from '@/src/features/tracking/session';

export type SegmentGeometry = {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
};

type BaseSegment = StreetSegment & SegmentGeometry;

const osmRoads: OSMRoad[] = [
  {
    id: 'seg-1',
    highway: 'residential',
    nodes: [
      { id: 'seg-1-a', x: 20, y: 25 },
      { id: 'seg-1-b', x: 210, y: 40 },
    ],
  },
  {
    id: 'seg-2',
    highway: 'residential',
    nodes: [
      { id: 'seg-2-a', x: 30, y: 80 },
      { id: 'seg-2-b', x: 200, y: 80 },
    ],
  },
  {
    id: 'seg-3',
    highway: 'residential',
    nodes: [
      { id: 'seg-3-a', x: 60, y: 130 },
      { id: 'seg-3-b', x: 220, y: 170 },
    ],
  },
  {
    id: 'seg-4',
    highway: 'residential',
    nodes: [
      { id: 'seg-4-a', x: 18, y: 190 },
      { id: 'seg-4-b', x: 250, y: 210 },
    ],
  },
  {
    id: 'seg-5',
    highway: 'residential',
    nodes: [
      { id: 'seg-5-a', x: 120, y: 20 },
      { id: 'seg-5-b', x: 130, y: 220 },
    ],
  },
  {
    id: 'seg-6',
    highway: 'residential',
    nodes: [
      { id: 'seg-6-a', x: 70, y: 20 },
      { id: 'seg-6-b', x: 60, y: 220 },
    ],
  },
];

const cityGraph = buildCityGraphSnapshot(
  { cityName: 'Demo City', areaKm2: 48.3 },
  osmRoads
);

const seedSegments: BaseSegment[] = cityGraph.segments.map((segment) => ({
  id: segment.id,
  lengthMeters: segment.lengthMeters,
  discoveredMeters: 0,
  fromX: segment.fromX,
  fromY: segment.fromY,
  toX: segment.toX,
  toY: segment.toY,
}));

const [seg1, seg2, seg3, seg4, seg5] = seedSegments.map((segment) => segment.id);

export const sampleTrackPoints: TrackPoint[] = [
  { segmentId: seg1, distanceFromPreviousMeters: 30, speedMps: 1.4 },
  { segmentId: seg1, distanceFromPreviousMeters: 50, speedMps: 1.8 },
  { segmentId: seg2, distanceFromPreviousMeters: 24, speedMps: 1.2 },
  { segmentId: seg3, distanceFromPreviousMeters: 15, speedMps: 2.1 },
  { segmentId: seg4, distanceFromPreviousMeters: 22, speedMps: 1.1 },
  { segmentId: seg3, distanceFromPreviousMeters: 25, speedMps: 1.7 },
  { segmentId: seg5, distanceFromPreviousMeters: 55, speedMps: 8.3 },
];

const discoveredSeed = updateDiscoveredSegmentsFromTrack(seedSegments, sampleTrackPoints);

export const baseCitySegments: BaseSegment[] = seedSegments.map((segment) => ({
  ...segment,
  discoveredMeters: discoveredSeed.find((candidate) => candidate.id === segment.id)?.discoveredMeters ?? 0,
}));

const healthDaily = [
  { isoDate: '2026-04-24', steps: 3400, distanceKm: 2.7, newlyDiscoveredMeters: 120 },
  { isoDate: '2026-04-25', steps: 5100, distanceKm: 4.1, newlyDiscoveredMeters: 180 },
  { isoDate: '2026-04-26', steps: 2500, newlyDiscoveredMeters: 0 },
  { isoDate: '2026-04-27', steps: 7200, distanceKm: 5.4, newlyDiscoveredMeters: 300 },
  { isoDate: '2026-04-28', steps: 6800, distanceKm: 5.0, newlyDiscoveredMeters: 280 },
  { isoDate: '2026-04-29', steps: 5900, distanceKm: 4.3, newlyDiscoveredMeters: 200 },
  { isoDate: '2026-04-30', steps: 7600, distanceKm: 5.9, newlyDiscoveredMeters: 310 },
];

export const dailyStats: DailyStat[] = [
  ...healthDaily.map((entry) => ({
    isoDate: entry.isoDate,
    steps: entry.steps,
    kilometers: resolveDailyDistanceKm(
      { steps: entry.steps, distanceKm: entry.distanceKm },
      0.75
    ),
    newlyDiscoveredMeters: entry.newlyDiscoveredMeters,
  })),
];

export const nearbyUnexploredStreets = ['Rue de la Fontaine', 'Avenue des Tilleuls', 'Chemin des Roses'];

let demoSession = createWalkSession('demo-session', '2026-04-30T10:00:00.000Z');
const rawSessionPoints: RawTrackPoint[] = [
  { lat: 48.0, lon: 2.0, accuracyMeters: 12, timestampIso: '2026-04-30T10:00:10.000Z', speedMps: 1.4 },
  { lat: 48.0002, lon: 2.0002, accuracyMeters: 15, timestampIso: '2026-04-30T10:00:20.000Z', speedMps: 1.5 },
  { lat: 48.0002, lon: 2.0002, accuracyMeters: 15, timestampIso: '2026-04-30T10:00:21.000Z', speedMps: 1.5 },
  { lat: 48.0005, lon: 2.0005, accuracyMeters: 70, timestampIso: '2026-04-30T10:00:40.000Z', speedMps: 1.8 },
];
for (const point of rawSessionPoints) {
  demoSession = addTrackPoint(demoSession, point);
}
export const demoSessionSummary = finishWalkSession(demoSession, '2026-04-30T10:20:00.000Z');

export const weeklyMotivationDecision = evaluateMotivation({
  currentIsoDate: '2026-04-30',
  weeklyNudgesAlreadySent: 1,
  lastActivityIsoDate: '2026-04-25',
  weeklyDiscoveryGoalMeters: 1500,
  discoveredThisWeekMeters: 640,
});

const defaultSettings = {
  smartNudgesEnabled: true,
  autoDetectCityEnabled: true,
  onboardingCompleted: false,
};

export function createDemoDiscoveryProvider(): DiscoveryProvider {
  return {
    async loadSeed() {
      return {
        snapshot: {
          cityName: cityGraph.cityName,
          cityKey: cityGraph.cityKey,
          areaKm2: cityGraph.areaKm2,
          totalStreetLengthMeters: cityGraph.totalStreetLengthMeters,
          fetchedAtIso: cityGraph.fetchedAtIso,
          source: cityGraph.source,
          schemaVersion: cityGraph.schemaVersion,
        },
        segments: cityGraph.segments.map((segment) => ({
          id: segment.id,
          fromNodeId: segment.fromNodeId,
          toNodeId: segment.toNodeId,
          lengthMeters: segment.lengthMeters,
          fromX: segment.fromX,
          fromY: segment.fromY,
          toX: segment.toX,
          toY: segment.toY,
        })),
        progress: baseCitySegments
          .filter((segment) => segment.discoveredMeters > 0)
          .map((segment) => ({
            segmentId: segment.id,
            discoveredMeters: segment.discoveredMeters,
          })),
        dailyStats,
        nearbyUnexploredStreets,
        weeklyMotivationDecision,
        latestSessionSummary: {
        id: demoSessionSummary.id,
        startedAtIso: demoSessionSummary.startedAtIso,
        endedAtIso: demoSessionSummary.endedAtIso,
        acceptedPointCount: demoSessionSummary.acceptedPointCount,
        distanceMeters: demoSessionSummary.distanceMeters,
        discoveredMeters: 0,
      },
        defaultSettings,
      };
    },
  };
}
