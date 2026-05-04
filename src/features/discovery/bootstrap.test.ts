import { resolveBootstrapCitySelection } from '@/src/features/discovery/bootstrap';

describe('bootstrap city selection', () => {
  test('uses persisted onboarding city when available', async () => {
    const settings = {
      async getString(key: string, fallbackValue: string) {
        if (key === 'selectedCityName') {
          return 'Lyon';
        }
        if (key === 'selectedCountryCode') {
          return 'FR';
        }
        return fallbackValue;
      },
    };

    const city = await resolveBootstrapCitySelection(settings);

    expect(city.cityName).toBe('Lyon');
    expect(city.countryCode).toBe('FR');
  });

  test('falls back to default city when persisted city is empty', async () => {
    const settings = {
      async getString(_key: string, fallbackValue: string) {
        return fallbackValue;
      },
    };

    const city = await resolveBootstrapCitySelection(settings);

    expect(city.cityName).toBe('Paris');
    expect(city.countryCode).toBe('FR');
  });
});
