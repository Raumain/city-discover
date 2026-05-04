import type { ConfigContext, ExpoConfig } from 'expo/config';

// Expo evaluates app config with Node/CJS module resolution.
const { getAppProfile, getRuntimeExtra } = require('./src/config/env.ts') as typeof import('./src/config/env');

export default ({ config }: ConfigContext): ExpoConfig => {
  const appProfile = getAppProfile();
  const appName = config.name ?? 'city-discover-app';
  const appSlug = config.slug ?? 'city-discover-app';
  const appVersion = config.version ?? '1.0.0';

  return {
    ...config,
    slug: appSlug,
    version: appVersion,
    name: appProfile === 'production' ? appName : `${appName} (${appProfile})`,
    extra: {
      ...(config.extra ?? {}),
      ...getRuntimeExtra(),
    },
  };
};
