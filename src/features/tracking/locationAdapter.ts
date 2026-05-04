import type { RawTrackPoint } from '@/src/features/tracking/session';

export type LocationPermissionState = 'granted' | 'denied' | 'undetermined';

export type LocationSubscription = {
  stop: () => Promise<void>;
};

export type ExpoLocationPermissionResponse = {
  status: string;
};

export type ExpoLocationPayload = {
  coords: {
    latitude: number;
    longitude: number;
    accuracy: number | null;
    speed: number | null;
  };
  timestamp: number;
};

export type ExpoLocationOptions = {
  accuracy: number;
  timeInterval: number;
  distanceInterval: number;
};

export type ExpoLocationFacade = {
  getForegroundPermissionsAsync: () => Promise<ExpoLocationPermissionResponse>;
  requestForegroundPermissionsAsync: () => Promise<ExpoLocationPermissionResponse>;
  watchPositionAsync: (
    options: ExpoLocationOptions,
    onLocation: (location: ExpoLocationPayload) => void
  ) => Promise<{ remove: () => Promise<void> | void }>;
};

type ExpoLocationLoader = () => Promise<ExpoLocationFacade>;

const DEFAULT_WATCH_OPTIONS: ExpoLocationOptions = {
  accuracy: 5,
  timeInterval: 3000,
  distanceInterval: 5,
};

export function createExpoLocationAdapter(loader: ExpoLocationLoader = loadExpoLocationFacade) {
  return {
    async getForegroundPermissionState(): Promise<LocationPermissionState> {
      const location = await loader();
      const result = await location.getForegroundPermissionsAsync();
      return mapPermissionState(result.status);
    },

    async requestForegroundPermission(): Promise<LocationPermissionState> {
      const location = await loader();
      const result = await location.requestForegroundPermissionsAsync();
      return mapPermissionState(result.status);
    },

    async startForegroundUpdates(onPoint: (point: RawTrackPoint) => void): Promise<LocationSubscription> {
      const location = await loader();
      const subscription = await location.watchPositionAsync(DEFAULT_WATCH_OPTIONS, (payload) => {
        onPoint({
          lat: payload.coords.latitude,
          lon: payload.coords.longitude,
          accuracyMeters: payload.coords.accuracy ?? Number.POSITIVE_INFINITY,
          speedMps: payload.coords.speed ?? 0,
          timestampIso: new Date(payload.timestamp).toISOString(),
        });
      });

      return {
        async stop() {
          await subscription.remove();
        },
      };
    },
  };
}

function mapPermissionState(status: string): LocationPermissionState {
  if (status === 'granted') {
    return 'granted';
  }
  if (status === 'denied') {
    return 'denied';
  }
  return 'undetermined';
}

async function loadExpoLocationFacade(): Promise<ExpoLocationFacade> {
  try {
    const module = await import('expo-location');
    return {
      getForegroundPermissionsAsync: module.getForegroundPermissionsAsync,
      requestForegroundPermissionsAsync: module.requestForegroundPermissionsAsync,
      watchPositionAsync: module.watchPositionAsync,
    };
  } catch (error) {
    throw new Error(`expo-location runtime is unavailable: ${String(error)}`);
  }
}
