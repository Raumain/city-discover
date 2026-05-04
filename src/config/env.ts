export type AppProfile = 'development' | 'staging' | 'production';

const APP_PROFILE_ENV = 'EXPO_PUBLIC_APP_PROFILE';
const API_BASE_URL_ENV = 'EXPO_PUBLIC_API_BASE_URL';

const DEFAULT_APP_PROFILE: AppProfile = 'development';

export function getAppProfile(rawValue = process.env[APP_PROFILE_ENV]): AppProfile {
  if (!rawValue) {
    return DEFAULT_APP_PROFILE;
  }

  const value = rawValue.trim().toLowerCase();
  if (value === 'development' || value === 'staging' || value === 'production') {
    return value;
  }

  return DEFAULT_APP_PROFILE;
}

export type RuntimeExtra = {
  appProfile: AppProfile;
  apiBaseUrl?: string;
};

export function getRuntimeExtra(env: NodeJS.ProcessEnv = process.env): RuntimeExtra {
  const apiBaseUrl = env[API_BASE_URL_ENV]?.trim();

  return {
    appProfile: getAppProfile(env[APP_PROFILE_ENV]),
    ...(apiBaseUrl ? { apiBaseUrl } : {}),
  };
}
