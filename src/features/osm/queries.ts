type BoundaryQueryInput = {
  cityName: string;
  countryCode?: string;
};

export function buildBoundaryQuery(input: BoundaryQueryInput): string {
  const countryClause = input.countryCode ? `["ISO3166-1"="${escapeValue(input.countryCode)}"]` : '';
  return `
[out:json][timeout:25];
relation["boundary"="administrative"]["name"="${escapeValue(input.cityName)}"]${countryClause};
out body;
`;
}

export function buildRoadsInBoundaryQuery(relationId: number): string {
  return `
[out:json][timeout:25];
area(${3_600_000_000 + relationId})->.searchArea;
way["highway"](area.searchArea);
out body;
>;
out skel qt;
`;
}

function escapeValue(value: string): string {
  return value.replace(/"/g, '\\"');
}
