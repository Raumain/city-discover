import {
  createExpoLocationAdapter,
  type ExpoLocationFacade,
  type LocationPermissionState,
} from '@/src/features/tracking/locationAdapter';
import type { RawTrackPoint } from '@/src/features/tracking/session';

describe('locationAdapter', () => {
  test('maps runtime permission status to app permission state', async () => {
    const permissionState = await createExpoLocationAdapter(async () => ({
      async getForegroundPermissionsAsync() {
        return { status: 'granted' };
      },
      async requestForegroundPermissionsAsync() {
        return { status: 'granted' };
      },
      async watchPositionAsync() {
        return {
          async remove() {},
        };
      },
    })).getForegroundPermissionState();

    expect(permissionState).toBe<LocationPermissionState>('granted');
  });

  test('converts runtime updates to track points', async () => {
    const points: RawTrackPoint[] = [];
    const adapter = createExpoLocationAdapter(async () => {
      const facade: ExpoLocationFacade = {
        async getForegroundPermissionsAsync() {
          return { status: 'granted' };
        },
        async requestForegroundPermissionsAsync() {
          return { status: 'granted' };
        },
        async watchPositionAsync(_options, callback) {
          callback({
            coords: {
              latitude: 48.2,
              longitude: 2.3,
              accuracy: 8,
              speed: 1.8,
            },
            timestamp: Date.parse('2026-05-01T10:00:00.000Z'),
          });
          return {
            async remove() {},
          };
        },
      };
      return facade;
    });

    const subscription = await adapter.startForegroundUpdates((point) => {
      points.push(point);
    });

    expect(points).toEqual([
      {
        lat: 48.2,
        lon: 2.3,
        accuracyMeters: 8,
        speedMps: 1.8,
        timestampIso: '2026-05-01T10:00:00.000Z',
      },
    ]);

    await subscription.stop();
  });
});
