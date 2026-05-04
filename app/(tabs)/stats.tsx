import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';
import type { PeriodMode } from '@/src/domain/stats';
import { useStatsViewModel } from '@/src/features/discovery/hooks/useStatsViewModel';

const ANCHOR_ISO_DATE = '2026-04-30';

export default function StatsScreen() {
  const [mode, setMode] = useState<PeriodMode>('day');
  const { loading, error, metrics, periodStats, weeklyMotivationDecision, retryLoad } = useStatsViewModel(mode, ANCHOR_ISO_DATE);

  if (loading || !metrics || !periodStats) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Stats</Text>
        <Text>Loading stats…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Stats</Text>
        <Text>Could not load stats.</Text>
        <Pressable style={[styles.modeButton, styles.modeButtonSelected]} onPress={() => void retryLoad()}>
          <Text style={styles.modeTextSelected}>Retry loading</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Stats</Text>

      <View style={styles.modeRow}>
        {(['day', 'week'] as const).map((candidate) => (
          <Pressable
            key={candidate}
            style={[styles.modeButton, mode === candidate && styles.modeButtonSelected]}
            onPress={() => setMode(candidate)}>
            <Text style={[styles.modeText, mode === candidate && styles.modeTextSelected]}>
              {candidate.toUpperCase()}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Steps</Text>
        <Text style={styles.value}>{periodStats.steps.toLocaleString()}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Kilometers</Text>
        <Text style={styles.value}>{periodStats.kilometers.toFixed(1)} km</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Discovery in selected period</Text>
        <Text style={styles.value}>{periodStats.periodDiscoveryPercent.toFixed(2)}%</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Cumulative discovery</Text>
        <Text style={styles.value}>{metrics.lengthPercent.toFixed(2)}%</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Weekly motivation status</Text>
        <Text style={styles.valueSmall}>{weeklyMotivationDecision?.reason ?? 'on_track'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
  },
  modeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modeButton: {
    borderWidth: 1,
    borderColor: '#d0d0d0',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  modeButtonSelected: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  modeText: {
    fontWeight: '700',
  },
  modeTextSelected: {
    color: '#fff',
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d0d0d0',
    padding: 12,
    gap: 4,
  },
  label: {
    fontSize: 13,
    textTransform: 'uppercase',
    opacity: 0.7,
  },
  value: {
    fontSize: 28,
    fontWeight: '700',
  },
  valueSmall: {
    fontSize: 16,
    fontWeight: '600',
  },
});
