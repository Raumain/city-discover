import { DiscoveryOrchestrator } from '@/src/features/discovery/orchestrator';
import { createDemoDiscoveryProvider } from '@/src/features/discovery/mockData';
import { createLiveDiscoveryProvider } from '@/src/features/discovery/liveDiscoveryProvider';
import { createInitializedStorageDatabase } from '@/src/features/storage/client';
import { CitySnapshotRepository } from '@/src/features/storage/repositories/citySnapshotRepository';
import { DiscoveryRepository } from '@/src/features/storage/repositories/discoveryRepository';
import { NudgeRepository } from '@/src/features/storage/repositories/nudgeRepository';
import { SessionRepository } from '@/src/features/storage/repositories/sessionRepository';
import { SettingsRepository } from '@/src/features/storage/repositories/settingsRepository';
import { TrackingRepository } from '@/src/features/storage/repositories/trackingRepository';
import { createExpoLocationAdapter } from '@/src/features/tracking/locationAdapter';
import { createSessionManager } from '@/src/features/tracking/sessionManager';
import { createTrackingService } from '@/src/features/tracking/trackingService';

let orchestratorPromise: Promise<DiscoveryOrchestrator> | null = null;

export function getDiscoveryOrchestrator(): Promise<DiscoveryOrchestrator> {
  if (!orchestratorPromise) {
    orchestratorPromise = createOrchestrator();
  }
  return orchestratorPromise;
}

async function createOrchestrator(): Promise<DiscoveryOrchestrator> {
  const database = await createInitializedStorageDatabase();
  const citySnapshots = new CitySnapshotRepository(database);
  const discovery = new DiscoveryRepository(database);
  const sessions = new SessionRepository(database);
  const settings = new SettingsRepository(database);
  const citySelection = await resolveBootstrapCitySelection(settings);
  const locationAdapter = createExpoLocationAdapter();
  const sessionManager = createSessionManager({
    adapter: locationAdapter,
    persistence: {
      saveActiveSession: (session) => sessions.saveActiveSession(session),
      appendAcceptedPoint: (sessionId, point) => sessions.appendAcceptedPoint(sessionId, point),
      getActiveSession: () => sessions.getActiveSession(),
    },
  });
  const trackingService = createTrackingService({
    sessionManager,
    sessionRepository: sessions,
    trackingRepository: new TrackingRepository(database),
    locationAdapter,
    mapMatchOptions: {
      maxSnapDistanceMeters: 25,
      minConfidence: 0.2,
      mapCoordinates: (point) => ({ x: point.lon, y: point.lat }),
    },
  });
  const liveProvider = createLiveDiscoveryProvider({
    cityName: citySelection.cityName,
    countryCode: citySelection.countryCode,
    citySnapshots,
    discovery,
  });

  const provider = {
    async loadSeed() {
      try {
        return await liveProvider.loadSeed();
      } catch {
        return createDemoDiscoveryProvider().loadSeed();
      }
    },
  };

  return new DiscoveryOrchestrator(
    {
      citySnapshots,
      discovery,
      sessions,
      settings,
      nudges: new NudgeRepository(database),
    },
    provider,
    trackingService
  );
}

type SettingsStringReader = Pick<SettingsRepository, 'getString'>;

export async function resolveBootstrapCitySelection(settings: SettingsStringReader): Promise<{
  cityName: string;
  countryCode: string;
}> {
  const selectedCityName = (await settings.getString('selectedCityName', '')).trim();
  const selectedCountryCode = (await settings.getString('selectedCountryCode', 'FR')).trim().toUpperCase();
  if (selectedCityName.length > 0) {
    return {
      cityName: selectedCityName,
      countryCode: selectedCountryCode.length > 0 ? selectedCountryCode : 'FR',
    };
  }

  return {
    cityName: 'Paris',
    countryCode: 'FR',
  };
}
