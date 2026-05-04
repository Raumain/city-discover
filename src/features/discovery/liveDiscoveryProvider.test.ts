import { createLiveDiscoveryProvider } from './liveDiscoveryProvider';
import type { PersistedCitySegment, PersistedCitySnapshot } from '@/src/features/storage/repositories/citySnapshotRepository';

type SnapshotBundle = {
  snapshot: PersistedCitySnapshot;
  segments: PersistedCitySegment[];
};

class FakeCitySnapshots {
  public bundle: SnapshotBundle | null = null;
  public saveCalls = 0;

  async getSnapshot(): Promise<SnapshotBundle | null> {
    return this.bundle;
  }

  async saveSnapshot(snapshot: PersistedCitySnapshot, segments: PersistedCitySegment[]): Promise<void> {
    this.bundle = { snapshot, segments };
    this.saveCalls += 1;
  }
}

describe('live discovery provider', () => {
  test('fetches and persists geodata when cache is missing', async () => {
    const citySnapshots = new FakeCitySnapshots();
    const provider = createLiveDiscoveryProvider({
      cityName: 'Paris',
      countryCode: 'FR',
      citySnapshots,
      discovery: {
        async listProgress() {
          return [];
        },
      },
      osmClient: {
        async fetchBoundary() {
          return { cityName: 'Paris', cityKey: 'paris', areaKm2: 12, relationId: 7444 };
        },
        async fetchRoadElements() {
          return [
            { type: 'node', id: 1, lon: 2.35, lat: 48.85 },
            { type: 'node', id: 2, lon: 2.36, lat: 48.85 },
            { type: 'way', id: 10, nodes: [1, 2], tags: { highway: 'residential' } },
          ];
        },
      },
    });

    const seed = await provider.loadSeed();

    expect(citySnapshots.saveCalls).toBe(1);
    expect(seed.snapshot.cityKey).toBe('paris');
    expect(seed.segments).toHaveLength(1);
  });

  test('reuses cached snapshot when cache is fresh', async () => {
    const citySnapshots = new FakeCitySnapshots();
    citySnapshots.bundle = {
      snapshot: {
        cityName: 'Paris',
        cityKey: 'paris',
        areaKm2: 12,
        totalStreetLengthMeters: 100,
        fetchedAtIso: new Date().toISOString(),
        source: 'overpass',
        schemaVersion: 1,
      },
      segments: [
        {
          id: 'n1:n2',
          fromNodeId: 'n1',
          toNodeId: 'n2',
          lengthMeters: 100,
          fromX: 2.35,
          fromY: 48.85,
          toX: 2.36,
          toY: 48.85,
        },
      ],
    };
    const provider = createLiveDiscoveryProvider({
      cityName: 'Paris',
      countryCode: 'FR',
      citySnapshots,
      discovery: {
        async listProgress() {
          return [];
        },
      },
      osmClient: {
        async fetchBoundary() {
          throw new Error('should not fetch boundary when cache is fresh');
        },
        async fetchRoadElements() {
          throw new Error('should not fetch roads when cache is fresh');
        },
      },
    });

    const seed = await provider.loadSeed();

    expect(citySnapshots.saveCalls).toBe(0);
    expect(seed.snapshot.cityKey).toBe('paris');
  });
});
