import { createOsmClient } from './client';

describe('osm client', () => {
  test('fetchBoundary returns city boundary metadata from overpass relation', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        elements: [
          {
            type: 'relation',
            id: 7444,
            tags: { name: 'Paris' },
            bounds: { minlat: 48.8, minlon: 2.2, maxlat: 48.9, maxlon: 2.4 },
          },
        ],
      }),
    });
    const client = createOsmClient({ fetchImpl });

    const boundary = await client.fetchBoundary({ cityName: 'Paris', countryCode: 'FR' });

    expect(boundary.cityName).toBe('Paris');
    expect(boundary.cityKey).toBe('paris');
    expect(boundary.relationId).toBe(7444);
    expect(boundary.areaKm2).toBeGreaterThan(0);
  });

  test('fetchRoadElements returns overpass elements array', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        elements: [{ type: 'node', id: 1, lat: 48.85, lon: 2.35 }],
      }),
    });
    const client = createOsmClient({ fetchImpl });

    const elements = await client.fetchRoadElements(7444);

    expect(elements).toEqual([{ type: 'node', id: 1, lat: 48.85, lon: 2.35 }]);
  });
});
