export type OSMBoundary = {
  cityName: string;
  areaKm2: number;
  cityKey?: string;
};

export type OSMNode = {
  id: string;
  x: number;
  y: number;
};

export type OSMRoad = {
  id: string;
  highway: string;
  nodes: OSMNode[];
};

type OverpassNodeElement = {
  type: 'node';
  id: number;
  lon: number;
  lat: number;
};

type OverpassWayElement = {
  type: 'way';
  id: number;
  nodes: number[];
  tags?: {
    highway?: string;
  };
};

export type OverpassElement = OverpassNodeElement | OverpassWayElement;

export type CitySegment = {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  lengthMeters: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
};

export type CityGraphSnapshot = {
  cityName: string;
  cityKey: string;
  areaKm2: number;
  totalStreetLengthMeters: number;
  fetchedAtIso: string;
  source: string;
  schemaVersion: number;
  segments: CitySegment[];
};

const WALKABLE_HIGHWAYS = new Set([
  'residential',
  'living_street',
  'service',
  'tertiary',
  'secondary',
  'unclassified',
  'footway',
  'path',
  'pedestrian',
]);

export function buildCityGraphSnapshot(boundary: OSMBoundary, roads: OSMRoad[]): CityGraphSnapshot {
  const segmentsById = new Map<string, CitySegment>();

  for (const road of roads) {
    if (!WALKABLE_HIGHWAYS.has(road.highway)) continue;
    if (road.nodes.length < 2) continue;

    for (let index = 0; index < road.nodes.length - 1; index += 1) {
      const from = road.nodes[index];
      const to = road.nodes[index + 1];
      const [first, second] = [from, to].sort((left, right) => left.id.localeCompare(right.id));
      const segmentId = `${first.id}:${second.id}`;
      if (segmentsById.has(segmentId)) continue;

      segmentsById.set(segmentId, {
        id: segmentId,
        fromNodeId: from.id,
        toNodeId: to.id,
        lengthMeters: distanceMeters(from.x, from.y, to.x, to.y),
        fromX: from.x,
        fromY: from.y,
        toX: to.x,
        toY: to.y,
      });
    }
  }

  const segments = Array.from(segmentsById.values()).sort((left, right) => left.id.localeCompare(right.id));

  return {
    cityName: boundary.cityName,
    cityKey: boundary.cityKey ?? slugify(boundary.cityName),
    areaKm2: boundary.areaKm2,
    totalStreetLengthMeters: segments.reduce((sum, segment) => sum + segment.lengthMeters, 0),
    fetchedAtIso: new Date().toISOString(),
    source: 'overpass',
    schemaVersion: 1,
    segments,
  };
}

export function buildRoadsFromOverpassElements(elements: OverpassElement[]): OSMRoad[] {
  const nodesById = new Map<number, OSMNode>();
  const roads: OSMRoad[] = [];

  for (const element of elements) {
    if (element.type !== 'node') {
      continue;
    }

    nodesById.set(element.id, {
      id: String(element.id),
      x: element.lon,
      y: element.lat,
    });
  }

  for (const element of elements) {
    if (element.type !== 'way' || !element.tags?.highway) {
      continue;
    }

    const wayNodes = element.nodes
      .map((nodeId) => nodesById.get(nodeId))
      .filter((node): node is OSMNode => node != null);
    if (wayNodes.length < 2) {
      continue;
    }

    roads.push({
      id: String(element.id),
      highway: element.tags.highway,
      nodes: wayNodes,
    });
  }

  return roads;
}

function distanceMeters(ax: number, ay: number, bx: number, by: number): number {
  if (Math.abs(bx - ax) > 1 || Math.abs(by - ay) > 1) {
    return Math.hypot(bx - ax, by - ay);
  }

  if (!isWgs84Coordinate(ax, ay) || !isWgs84Coordinate(bx, by)) {
    return Math.hypot(bx - ax, by - ay);
  }

  const earthRadiusMeters = 6_371_000;
  const lat1 = toRadians(ay);
  const lat2 = toRadians(by);
  const deltaLat = toRadians(by - ay);
  const deltaLon = toRadians(bx - ax);
  const haversine =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
  const arc = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  return earthRadiusMeters * arc;
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function isWgs84Coordinate(x: number, y: number): boolean {
  return Math.abs(x) <= 180 && Math.abs(y) <= 90;
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
