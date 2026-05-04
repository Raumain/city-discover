import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, TextInput } from 'react-native';
import * as Location from 'expo-location';
import { Redirect, useRouter } from 'expo-router';

import { Text, View } from '@/components/Themed';
import { useDiscoveryData } from '@/src/features/discovery/hooks/useDiscoveryData';

export default function OnboardingScreen() {
  const router = useRouter();
  const { data, loading, error, completeOnboarding, requestForegroundPermission, retryLoad } = useDiscoveryData();
  const [cityName, setCityName] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [autoDetectCityEnabled, setAutoDetectCityEnabled] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [detectingCity, setDetectingCity] = useState(false);

  useEffect(() => {
    if (!data) {
      return;
    }
    setCityName(data.onboarding.cityName || data.snapshot.cityName);
    setCountryCode(data.onboarding.countryCode || '');
    setAutoDetectCityEnabled(data.settings.autoDetectCityEnabled);
  }, [data]);

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Onboarding</Text>
        <Text>Loading…</Text>
      </View>
    );
  }

  if (error && !data) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Onboarding</Text>
        <Text>Could not load onboarding state.</Text>
        <Pressable style={styles.primaryButton} onPress={() => void retryLoad()}>
          <Text style={styles.primaryButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (data?.onboarding.completed) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to City Discover</Text>
      <Text style={styles.subtitle}>Confirm your city to initialize your street graph and discovery denominator.</Text>

      <View style={styles.card}>
        <Text style={styles.label}>City setup</Text>
        <View style={styles.switchRow}>
          <Text style={styles.value}>Auto-detect city</Text>
          <Switch value={autoDetectCityEnabled} onValueChange={setAutoDetectCityEnabled} />
        </View>
        <Pressable
          style={styles.secondaryButton}
          disabled={!autoDetectCityEnabled || detectingCity}
          onPress={() => {
            void detectCity();
          }}
        >
          <Text style={styles.secondaryButtonText}>{detectingCity ? 'Detecting…' : 'Detect city now'}</Text>
        </Pressable>
        <TextInput
          style={styles.input}
          placeholder="City name"
          value={cityName}
          onChangeText={setCityName}
          autoCapitalize="words"
        />
        <TextInput
          style={styles.input}
          placeholder="Country code (optional)"
          value={countryCode}
          onChangeText={setCountryCode}
          autoCapitalize="characters"
          maxLength={3}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Permissions guidance</Text>
        <Text style={styles.value}>Enable foreground location so walk sessions can capture discovered segments.</Text>
        <Pressable style={styles.secondaryButton} onPress={() => void requestForegroundPermission()}>
          <Text style={styles.secondaryButtonText}>Request foreground permission</Text>
        </Pressable>
      </View>

      {submitError ? <Text style={styles.errorText}>{submitError}</Text> : null}

      <Pressable
        style={styles.primaryButton}
        onPress={() => {
          void submit();
        }}
      >
        <Text style={styles.primaryButtonText}>Finish onboarding</Text>
      </Pressable>
    </View>
  );

  async function submit(): Promise<void> {
    try {
      await completeOnboarding({
        cityName,
        countryCode,
        autoDetectCityEnabled,
      });
      router.replace('/(tabs)');
    } catch (submitFailure) {
      setSubmitError(submitFailure instanceof Error ? submitFailure.message : 'Failed to complete onboarding.');
    }
  }

  async function detectCity(): Promise<void> {
    setDetectingCity(true);
    setSubmitError(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setSubmitError('Location permission is required for auto-detection.');
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const candidates = await Location.reverseGeocodeAsync({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
      const candidate = candidates[0];
      if (!candidate?.city) {
        setSubmitError('Could not auto-detect city on this device.');
        return;
      }

      setCityName(candidate.city);
      setCountryCode((candidate.isoCountryCode ?? '').toUpperCase());
    } catch (detectError) {
      setSubmitError(detectError instanceof Error ? detectError.message : 'Failed to auto-detect city.');
    } finally {
      setDetectingCity(false);
    }
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  title: {
    fontSize: 28,
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
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d0d0d0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  secondaryButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#111827',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 14,
  },
});
