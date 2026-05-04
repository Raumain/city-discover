import {
  buildCityGraphSnapshot,
  buildRoadsFromOverpassElements,
  type OSMBoundary,
  type OSMRoad,
} from './ingestion';

const boundary: OSMBoundary = {
  cityName: 'Test City',
  areaKm2: 42.5,
};

describe('buildCityGraphSnapshot', () => {
  it('filters non-walkable roads and splits roads by node pairs', () => {
    const roads: OSMRoad[] = [
      {
        id: 'walkable-1',
        highway: 'residential',
        nodes: [
          { id: 'n1', x: 0, y: 0 },
          { id: 'n2', x: 50, y: 0 },
          { id: 'n3', x: 100, y: 0 },
        ],
      },
      {
        id: 'non-walkable',
        highway: 'motorway',
        nodes: [
          { id: 'n4', x: 0, y: 20 },
          { id: 'n5', x: 100, y: 20 },
        ],
      },
    ];

    const snapshot = buildCityGraphSnapshot(boundary, roads);

    expect(snapshot.cityName).toBe('Test City');
    expect(snapshot.cityKey).toBe('test-city');
    expect(snapshot.segments).toHaveLength(2);
    expect(snapshot.segments.map((segment) => segment.id)).toEqual(['n1:n2', 'n2:n3']);
    expect(snapshot.totalStreetLengthMeters).toBeCloseTo(100, 5);
    expect(snapshot.fetchedAtIso).toBeTruthy();
  });

  it('creates stable, de-duplicated segments for crossing roads', () => {
    const roads: OSMRoad[] = [
      {
        id: 'a',
        highway: 'residential',
        nodes: [
          { id: 'n1', x: 2.35, y: 48.85 },
          { id: 'n2', x: 2.36, y: 48.85 },
          { id: 'n3', x: 2.37, y: 48.85 },
        ],
      },
      {
        id: 'b',
        highway: 'residential',
        nodes: [
          { id: 'n4', x: 2.36, y: 48.84 },
          { id: 'n2', x: 2.36, y: 48.85 },
          { id: 'n5', x: 2.36, y: 48.86 },
        ],
      },
      {
        id: 'c',
        highway: 'residential',
        nodes: [
          { id: 'n2', x: 2.36, y: 48.85 },
          { id: 'n1', x: 2.35, y: 48.85 },
        ],
      },
    ];

    const snapshot = buildCityGraphSnapshot(boundary, roads);
    const segmentIds = snapshot.segments.map((segment) => segment.id);

    expect(segmentIds).toContain('n1:n2');
    expect(segmentIds).toContain('n2:n3');
    expect(segmentIds).toContain('n2:n4');
    expect(segmentIds).toContain('n2:n5');
    expect(segmentIds.filter((segmentId) => segmentId === 'n1:n2')).toHaveLength(1);
  });
});

describe('buildRoadsFromOverpassElements', () => {
  it('maps overpass nodes and ways into walkable road candidates', () => {
    const roads = buildRoadsFromOverpassElements([
      { type: 'node', id: 1, lon: 2.35, lat: 48.85 },
      { type: 'node', id: 2, lon: 2.36, lat: 48.85 },
      { type: 'node', id: 3, lon: 2.37, lat: 48.85 },
      {
        type: 'way',
        id: 10,
        nodes: [1, 2, 3],
        tags: { highway: 'residential' },
      },
      {
        type: 'way',
        id: 11,
        nodes: [1, 3],
        tags: { highway: 'motorway' },
      },
    ]);

    expect(roads).toEqual([
      {
        id: '10',
        highway: 'residential',
        nodes: [
          { id: '1', x: 2.35, y: 48.85 },
          { id: '2', x: 2.36, y: 48.85 },
          { id: '3', x: 2.37, y: 48.85 },
        ],
      },
      {
        id: '11',
        highway: 'motorway',
        nodes: [
          { id: '1', x: 2.35, y: 48.85 },
          { id: '3', x: 2.37, y: 48.85 },
        ],
      },
    ]);
  });
});
