import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';
import { CityStreetMap } from '@/components/map/CityStreetMap';
import { useMapViewModel } from '@/src/features/discovery/hooks/useMapViewModel';

export default function MapScreen() {
  const {
    loading,
    error,
    metrics,
    segments,
    nearbyUnexploredStreets,
    weeklyMotivationDecision,
    latestSessionSummary,
    tracking,
    startTracking,
    stopTracking,
    retryLoad,
  } =
    useMapViewModel();

  const sessionSummary = useMemo(
    () =>
      latestSessionSummary ?? {
        acceptedPointCount: 0,
        distanceMeters: 0,
      },
    [latestSessionSummary]
  );
  const sessionActive = tracking.status === 'active';

  if (loading || !metrics) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.subtitle}>Loading discovery data…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.subtitle}>Could not load discovery data.</Text>
        <Pressable
          style={styles.sessionButton}
          onPress={() => {
            void retryLoad();
          }}
        >
          <Text style={styles.sessionButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>City discovery</Text>
      <Text style={styles.subtitle}>
        You discovered {metrics.lengthPercent.toFixed(1)}% of your city streets by length.
      </Text>

      <View style={styles.card}>
        <Text style={styles.metricLabel}>Coverage</Text>
        <Text style={styles.metricPrimary}>{metrics.lengthPercent.toFixed(1)}%</Text>
        <Text style={styles.metricSecondary}>
          Secondary metric: {metrics.segmentPercent.toFixed(1)}% of segments
        </Text>
      </View>

      <CityStreetMap segments={segments} />

      <Pressable
        style={styles.sessionButton}
        onPress={() => {
          if (sessionActive) {
            void stopTracking();
            return;
          }
          void startTracking();
        }}
      >
        <Text style={styles.sessionButtonText}>
          {sessionActive ? 'Stop walk session' : 'Start walk session'}
        </Text>
      </Pressable>

      <View style={styles.card}>
        <Text style={styles.metricLabel}>Session status</Text>
        <Text style={styles.metricSecondary}>{sessionActive ? 'Active (foreground tracking)' : 'Inactive'}</Text>
        <Text style={styles.metricSecondary}>
          Accepted points: {sessionSummary.acceptedPointCount}
        </Text>
        <Text style={styles.metricSecondary}>
          Session distance: {(sessionSummary.distanceMeters / 1000).toFixed(2)} km
        </Text>
        {tracking.lastError ? <Text style={styles.errorText}>Tracking error: {tracking.lastError}</Text> : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.metricLabel}>Nearby unexplored streets</Text>
        {nearbyUnexploredStreets.map((street) => (
          <Text key={street} style={styles.listItem}>
            • {street}
          </Text>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.metricLabel}>Motivation</Text>
        <Text style={styles.metricSecondary}>
          {weeklyMotivationDecision?.shouldSendNudge ? 'Nudge planned' : 'No nudge now'} (
          {weeklyMotivationDecision?.reason ?? 'on_track'})
        </Text>
        <Text style={styles.metricSecondary}>{weeklyMotivationDecision?.suggestion ?? 'No suggestion.'}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 12,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 15,
    opacity: 0.8,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d0d0d0',
    padding: 12,
    gap: 6,
  },
  metricLabel: {
    fontSize: 13,
    textTransform: 'uppercase',
    opacity: 0.7,
  },
  metricPrimary: {
    fontSize: 32,
    fontWeight: '700',
  },
  metricSecondary: {
    fontSize: 15,
    opacity: 0.9,
  },
  sessionButton: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  sessionButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  listItem: {
    fontSize: 15,
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 14,
  },
});
