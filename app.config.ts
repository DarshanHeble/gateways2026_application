import fs from "fs";
import path from "path";
import type { ConfigContext, ExpoConfig } from "expo/config";

/**
 * `app.json` holds the config; this only adjusts what depends on the machine.
 *
 * `google-services.json` (Firebase, for Android remote push) is git-ignored, so
 * a fresh clone or a cloud build doesn't have it — and pointing
 * `android.googleServicesFile` at a missing file fails the Android build. Only
 * reference it when it is actually there; without it the app skips remote push
 * and keeps local notifications (see `registerForPushNotificationsAsync`).
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const googleServices = config.android?.googleServicesFile;
  const hasGoogleServices = googleServices ? fs.existsSync(path.resolve(__dirname, googleServices)) : false;

  return {
    ...config,
    android: {
      ...config.android,
      googleServicesFile: hasGoogleServices ? googleServices : undefined,
    },
  } as ExpoConfig;
};
