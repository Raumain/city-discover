import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const appName = config.name ?? 'city-discover-app';
  const appSlug = config.slug ?? 'city-discover-app';
  const appVersion = config.version ?? '1.0.0';

  return {
    ...config,
    slug: appSlug,
    version: appVersion,
    name: appName ,
    // extra: {
    //   ...(config.extra ?? {}),
    // },
  };
};
