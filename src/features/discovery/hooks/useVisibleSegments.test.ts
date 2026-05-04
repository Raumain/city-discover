import { filterSegmentsByRegion, type MapRegion, type VisibleSegment } from './useVisibleSegments';

const segments: VisibleSegment[] = [
  {
    id: 'inside',
    fromX: 2.35,
    fromY: 48.85,
    toX: 2.36,
    toY: 48.851,
    discoveredMeters: 10,
    lengthMeters: 100,
  },
  {
    id: 'outside',
    fromX: 3.35,
    fromY: 49.85,
    toX: 3.36,
    toY: 49.851,
    discoveredMeters: 0,
    lengthMeters: 100,
  },
];

const region: MapRegion = {
  latitude: 48.85,
  longitude: 2.35,
  latitudeDelta: 0.2,
  longitudeDelta: 0.2,
};

describe('filterSegmentsByRegion', () => {
  test('returns only segments intersecting region bounds plus margin', () => {
    const visible = filterSegmentsByRegion(segments, region, 0.05);

    expect(visible.map((segment) => segment.id)).toEqual(['inside']);
  });
});
