import { evaluateGeodataCachePolicy } from './geodataCachePolicy';

describe('geodata cache policy', () => {
  test('returns missing when no snapshot exists', () => {
    const result = evaluateGeodataCachePolicy(null, {
      nowIso: '2026-05-01T00:00:00.000Z',
      maxAgeHours: 168,
      requiredSchemaVersion: 1,
      cityKey: 'paris',
    });

    expect(result).toBe('missing');
  });

  test('returns stale when cached snapshot is older than max age', () => {
    const result = evaluateGeodataCachePolicy(
      {
        cityName: 'Paris',
        cityKey: 'paris',
        areaKm2: 100,
        totalStreetLengthMeters: 1000,
        fetchedAtIso: '2026-01-01T00:00:00.000Z',
        source: 'overpass',
        schemaVersion: 1,
      },
      {
        nowIso: '2026-05-01T00:00:00.000Z',
        maxAgeHours: 24,
        requiredSchemaVersion: 1,
        cityKey: 'paris',
      }
    );

    expect(result).toBe('stale');
  });

  test('returns incompatible when city or schema changes', () => {
    const byCity = evaluateGeodataCachePolicy(
      {
        cityName: 'Paris',
        cityKey: 'paris',
        areaKm2: 100,
        totalStreetLengthMeters: 1000,
        fetchedAtIso: '2026-05-01T00:00:00.000Z',
        source: 'overpass',
        schemaVersion: 1,
      },
      {
        nowIso: '2026-05-01T12:00:00.000Z',
        maxAgeHours: 24,
        requiredSchemaVersion: 1,
        cityKey: 'lyon',
      }
    );
    const bySchema = evaluateGeodataCachePolicy(
      {
        cityName: 'Paris',
        cityKey: 'paris',
        areaKm2: 100,
        totalStreetLengthMeters: 1000,
        fetchedAtIso: '2026-05-01T00:00:00.000Z',
        source: 'overpass',
        schemaVersion: 1,
      },
      {
        nowIso: '2026-05-01T12:00:00.000Z',
        maxAgeHours: 24,
        requiredSchemaVersion: 2,
        cityKey: 'paris',
      }
    );

    expect(byCity).toBe('incompatible');
    expect(bySchema).toBe('incompatible');
  });

  test('returns fresh when snapshot is current and compatible', () => {
    const result = evaluateGeodataCachePolicy(
      {
        cityName: 'Paris',
        cityKey: 'paris',
        areaKm2: 100,
        totalStreetLengthMeters: 1000,
        fetchedAtIso: '2026-05-01T00:00:00.000Z',
        source: 'overpass',
        schemaVersion: 1,
      },
      {
        nowIso: '2026-05-01T12:00:00.000Z',
        maxAgeHours: 24,
        requiredSchemaVersion: 1,
        cityKey: 'paris',
      }
    );

    expect(result).toBe('fresh');
  });
});
