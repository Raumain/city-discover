import { buildBoundaryQuery, buildRoadsInBoundaryQuery } from './queries';
import type { OverpassElement } from './ingestion';

type BoundaryRequest = {
  cityName: string;
  countryCode?: string;
};

type OSMBoundaryFetchResult = {
  cityName: string;
  cityKey: string;
  areaKm2: number;
  relationId: number;
};

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

type CreateOsmClientOptions = {
  fetchImpl?: FetchLike;
  overpassEndpoint?: string;
};

type OverpassResponse = {
  elements?: Array<{
    type: string;
    id: number;
    tags?: Record<string, string>;
    bounds?: {
      minlat: number;
      minlon: number;
      maxlat: number;
      maxlon: number;
    };
  }> &
    OverpassElement[];
};

export function createOsmClient(options: CreateOsmClientOptions = {}) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const overpassEndpoint = options.overpassEndpoint ?? 'https://overpass-api.de/api/interpreter';

  return {
    async fetchBoundary(request: BoundaryRequest): Promise<OSMBoundaryFetchResult> {
      const response = await fetchOverpass<OverpassResponse>(fetchImpl, overpassEndpoint, buildBoundaryQuery(request));
      const relation = response.elements?.find((element) => element.type === 'relation' && element.bounds);
      if (!relation?.bounds) {
        throw new Error(`No administrative boundary found for ${request.cityName}.`);
      }

      const cityName = relation.tags?.name ?? request.cityName;
      return {
        cityName,
        cityKey: slugify(cityName),
        areaKm2: approximateBoundsAreaKm2(
          relation.bounds.minlat,
          relation.bounds.minlon,
          relation.bounds.maxlat,
          relation.bounds.maxlon
        ),
        relationId: relation.id,
      };
    },

    async fetchRoadElements(relationId: number): Promise<OverpassElement[]> {
      const response = await fetchOverpass<OverpassResponse>(
        fetchImpl,
        overpassEndpoint,
        buildRoadsInBoundaryQuery(relationId)
      );
      return (response.elements as OverpassElement[] | undefined) ?? [];
    },
  };
}

async function fetchOverpass<T>(
  fetchImpl: FetchLike,
  endpoint: string,
  query: string
): Promise<T> {
  const response = await fetchImpl(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  });
  if (!response.ok) {
    throw new Error(`Overpass request failed with status ${response.status}.`);
  }
  return (await response.json()) as T;
}

function approximateBoundsAreaKm2(minLat: number, minLon: number, maxLat: number, maxLon: number): number {
  const latMeters = 111_320 * (maxLat - minLat);
  const lonMeters = 111_320 * Math.cos(((minLat + maxLat) / 2) * (Math.PI / 180)) * (maxLon - minLon);
  return Math.abs((latMeters * lonMeters) / 1_000_000);
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
