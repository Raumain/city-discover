import { Alert, Pressable, StyleSheet, Switch } from 'react-native';

import { Text, View } from '@/components/Themed';
import { useSettingsViewModel } from '@/src/features/discovery/hooks/useSettingsViewModel';

const NOTIFICATION_STATUS_LABELS: Record<string, string> = {
  granted: 'Allowed',
  denied: 'Denied',
  undetermined: 'Not requested',
  unavailable: 'Unavailable on this device',
};

export default function SettingsScreen() {
  const {
    loading,
    error,
    settings,
    onboarding,
    latestSessionSummary,
    updateSetting,
    tracking,
    requestForegroundPermission,
    resetDiscoveryData,
    retryLoad,
    notificationPermission,
    healthStatus,
  } =
    useSettingsViewModel();

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Settings</Text>
        <Text>Loading settings…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Settings</Text>
        <Text>Could not load settings.</Text>
        <Pressable
          style={styles.permissionButton}
          onPress={() => {
            void retryLoad();
          }}
        >
          <Text style={styles.permissionButtonText}>Retry loading</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Permissions</Text>
        <Text style={styles.value}>Location: Foreground {tracking.foregroundPermission}</Text>
        <Text style={styles.value}>Background: Not requested yet</Text>
        <Text style={styles.value}>
          Notifications: {NOTIFICATION_STATUS_LABELS[notificationPermission] ?? notificationPermission}
        </Text>
        <Text style={styles.value}>
          Health Connect: {healthStatus === 'fallback' ? 'Using step-based fallback' : 'Active'}
        </Text>
        <Pressable
          style={styles.permissionButton}
          onPress={() => {
            void requestForegroundPermission();
          }}
        >
          <Text style={styles.permissionButtonText}>Request foreground permission</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>City setup</Text>
        <View style={styles.switchRow}>
          <Text style={styles.value}>Auto-detect city + confirmation</Text>
          <Switch
            value={settings.autoDetectCityEnabled}
            onValueChange={(value) => {
              void updateSetting('autoDetectCityEnabled', value);
            }}
          />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Notifications</Text>
        <View style={styles.switchRow}>
          <Text style={styles.value}>Smart nudges (max 3/week)</Text>
          <Switch
            value={settings.smartNudgesEnabled}
            onValueChange={(value) => {
              void updateSetting('smartNudgesEnabled', value);
            }}
          />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Data controls</Text>
        <Text style={styles.value}>Discovery is permanent until manual reset.</Text>
        <Text style={styles.value}>Storage mode: local only.</Text>
        <Text style={styles.value}>
          Last tracked session: {((latestSessionSummary?.distanceMeters ?? 0) / 1000).toFixed(2)} km
        </Text>
        <Text style={styles.value}>
          Onboarding: {onboarding.completed ? `Done (${onboarding.cityName || 'City not set'})` : 'Pending'}
        </Text>
        <Pressable
          style={[styles.permissionButton, styles.resetButton]}
          onPress={() => {
            Alert.alert('Reset discovery data?', 'This clears discovered progress, session history, and nudge history.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Reset',
                style: 'destructive',
                onPress: () => {
                  void resetDiscoveryData();
                },
              },
            ]);
          }}
        >
          <Text style={styles.permissionButtonText}>Reset discovery data</Text>
        </Pressable>
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
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d0d0d0',
    padding: 12,
    gap: 8,
  },
  label: {
    fontSize: 13,
    textTransform: 'uppercase',
    opacity: 0.7,
  },
  value: {
    fontSize: 15,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  permissionButton: {
    marginTop: 4,
    alignSelf: 'flex-start',
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  permissionButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  resetButton: {
    backgroundColor: '#dc2626',
  },
});
