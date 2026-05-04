# Release Checklist

This document details the steps required to deploy a new version of City Discover to production via Expo Application Services (EAS).

## 1. Version Bumping
- **App Version:** Bump the `version` string in `package.json` and `app.json` (e.g., from `"1.0.0"` to `"1.0.1"`).
- **Native Builds:** `eas.json` is configured with `"autoIncrement": true` for production builds, which automatically bumps the native build numbers (`versionCode` on Android, `buildNumber` on iOS) during `eas build`.
- **Commit:** Commit the version changes as `chore: bump version to 1.x.x`.

## 2. Triggering a Production Build
Run the following command to submit builds for both iOS and Android:
```bash
eas build --profile production --platform all
```
*Wait for both builds to complete successfully in the Expo dashboard.*

## 3. App Store Metadata & Privacy
Ensure the privacy rationale for background location tracking remains accurate in the App Store Connect and Google Play Console.
- **Location Justification:** "City Discover tracks your location in the background only when you start an active walk session. This allows the app to accurately map your movement to street segments even if your phone screen is off or you switch to another app."
- Update screenshots if new features require it.

## 4. Staged Rollout Strategy
When submitting the build (or managing OTA updates):
1. **Internal Testing (Preview):** Deploy to the internal TestFlight/Play Console testing track first. Test the background tracking behavior on physical devices.
2. **Staged Rollout (10%):** Start a staged rollout at 10%. Monitor Sentry for any new unhandled crashes.
3. **Full Rollout (100%):** If crash-free rates remain stable after 48 hours, proceed to a 100% rollout.

## 5. OTA (Over-The-Air) Updates and Rollbacks
If a critical JavaScript bug is discovered in production, you can push an OTA update via EAS Update:
```bash
eas update --branch production --message "Fixing critical JS crash in XYZ"
```
**Rollback Strategy:**
To rollback an OTA update to a previous known good version, republish the old branch or revert the bad commit and push a new update. Native crashes (e.g., in React Native Maps or Expo Location) cannot be fixed via OTA and require a new EAS Build submission (Steps 1 & 2).