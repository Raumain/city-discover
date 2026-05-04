import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Polyline, type Region } from 'react-native-maps';

import { Text } from '@/components/Themed';
import type { StreetSegment } from '@/src/domain/discovery';
import type { SegmentGeometry } from '@/src/features/discovery/providers';
import { useVisibleSegments } from '@/src/features/discovery/hooks/useVisibleSegments';

type StreetMapSegment = StreetSegment & SegmentGeometry;

type CityStreetMapProps = {
  segments: StreetMapSegment[];
};

export function CityStreetMap({ segments }: CityStreetMapProps) {
  const normalizedSegments = useMemo(() => normalizeSegmentsForMap(segments), [segments]);
  const [region, setRegion] = useState<Region | null>(calculateInitialRegion(normalizedSegments));
  const visibleSegments = useVisibleSegments(normalizedSegments, region, 0.02);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>City map</Text>
      <MapView
        style={styles.map}
        initialRegion={region ?? undefined}
        onRegionChangeComplete={(nextRegion) => setRegion(nextRegion)}
      >
        {visibleSegments.map((segment) => (
          <Polyline
            key={segment.id}
            coordinates={[
              { latitude: segment.fromY, longitude: segment.fromX },
              { latitude: segment.toY, longitude: segment.toX },
            ]}
            strokeColor={segment.discoveredMeters > 0 ? '#16a34a' : '#9ca3af'}
            strokeWidth={4}
          />
        ))}
      </MapView>
      <Text style={styles.legend}>Green = discovered, gray = unexplored</Text>
    </View>
  );
}

function normalizeSegmentsForMap(segments: StreetMapSegment[]): StreetMapSegment[] {
  if (segments.every((segment) => isValidWgs84(segment.fromX, segment.fromY) && isValidWgs84(segment.toX, segment.toY))) {
    return segments;
  }

  const xValues = segments.flatMap((segment) => [segment.fromX, segment.toX]);
  const yValues = segments.flatMap((segment) => [segment.fromY, segment.toY]);
  const minX = Math.min(...xValues);
  const maxX = Math.max(...xValues);
  const minY = Math.min(...yValues);
  const maxY = Math.max(...yValues);
  const xRange = Math.max(maxX - minX, 1);
  const yRange = Math.max(maxY - minY, 1);
  const center = { lat: 48.8566, lon: 2.3522 };
  const latitudeSpan = 0.08;
  const longitudeSpan = 0.08;

  return segments.map((segment) => ({
    ...segment,
    fromX: center.lon + ((segment.fromX - minX) / xRange - 0.5) * longitudeSpan,
    toX: center.lon + ((segment.toX - minX) / xRange - 0.5) * longitudeSpan,
    fromY: center.lat + ((segment.fromY - minY) / yRange - 0.5) * latitudeSpan,
    toY: center.lat + ((segment.toY - minY) / yRange - 0.5) * latitudeSpan,
  }));
}

function calculateInitialRegion(segments: StreetMapSegment[]): Region | null {
  if (segments.length === 0) {
    return null;
  }

  const longitudes = segments.flatMap((segment) => [segment.fromX, segment.toX]);
  const latitudes = segments.flatMap((segment) => [segment.fromY, segment.toY]);
  const minLon = Math.min(...longitudes);
  const maxLon = Math.max(...longitudes);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLon + maxLon) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * 1.4, 0.01),
    longitudeDelta: Math.max((maxLon - minLon) * 1.4, 0.01),
  };
}

function isValidWgs84(lon: number, lat: number): boolean {
  return Math.abs(lon) <= 180 && Math.abs(lat) <= 90;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d0d0d0',
    padding: 12,
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  map: {
    height: 280,
    borderRadius: 8,
    overflow: 'hidden',
  },
  legend: {
    fontSize: 13,
    opacity: 0.8,
  },
});
