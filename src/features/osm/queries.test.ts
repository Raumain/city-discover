import { buildBoundaryQuery, buildRoadsInBoundaryQuery } from './queries';

describe('osm queries', () => {
  test('buildBoundaryQuery targets administrative relation by city name', () => {
    const query = buildBoundaryQuery({ cityName: 'Paris', countryCode: 'FR' });

    expect(query).toContain('relation["boundary"="administrative"]');
    expect(query).toContain('["name"="Paris"]');
    expect(query).toContain('["ISO3166-1"="FR"]');
    expect(query).toContain('out body;');
  });

  test('buildRoadsInBoundaryQuery targets walkable roads from area relation', () => {
    const query = buildRoadsInBoundaryQuery(7444);

    expect(query).toContain('area(3600007444)->.searchArea;');
    expect(query).toContain('way["highway"](area.searchArea);');
    expect(query).toContain('out body;');
  });
});
