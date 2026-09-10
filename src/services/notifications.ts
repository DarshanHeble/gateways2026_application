import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { API_BASE_URL, apiClient } from "./api";
import { notificationStore } from "./notificationStore";
import { AppNotification, NotificationTarget } from "./notificationTypes";

/**
 * The EAS projectId is real (see app.json), so this returns a genuine, working
 * Expo push token on a dev-client build. What's mocked is the *delivery* leg —
 * there's no backend yet to relay a token to Expo's push API, so `sendNotification`
 * below falls back to a local simulation. Both network calls in this file target
 * endpoints the backend doesn't implement yet; they're written so that once it
 * does (`POST /push/register-token`, `POST /push/send`, `GET /push/notifications`),
 * this file needs no changes — same pattern as `fetchEvents` in `api.ts`.
 */

export function configureNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Gateways 2026",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== "granted") {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }
  if (status !== "granted") return null;

  // Remote push on Android requires a Firebase (FCM) config — `android.googleServicesFile`
  // in app.json plus a google-services.json. Without it, getExpoPushTokenAsync throws
  // "Default FirebaseApp is not initialized" on every launch. Detect that up front and
  // skip cleanly: the app only uses local notifications (scheduleNotificationAsync),
  // which work fine without FCM.
  const hasFcmConfig =
    Platform.OS !== "android" || Boolean(Constants.expoConfig?.android?.googleServicesFile);
  if (!hasFcmConfig) {
    console.info(
      "[notifications] Remote push disabled — no Firebase/FCM config (android.googleServicesFile). Local notifications remain active.",
    );
    return null;
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });

    apiClient(`${API_BASE_URL}/push/register-token`, {
      method: "POST",
      body: JSON.stringify({ token, platform: Platform.OS }),
    }).catch(() => {
      // No backend endpoint yet — the token still works locally for the
      // demo (local notifications), it just isn't registered server-side.
    });

    return token;
  } catch (error) {
    console.warn("Push token registration failed:", error);
    return null;
  }
}

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export async function sendNotification(input: {
  title: string;
  body: string;
  target: NotificationTarget;
  route?: string;
}): Promise<void> {
  try {
    await apiClient(`${API_BASE_URL}/push/send`, {
      method: "POST",
      body: JSON.stringify(input),
      timeout: 2000,
    });
    return;
  } catch {
    // Fall through to the local mock below.
  }

  const notification: AppNotification = {
    id: makeId(),
    title: input.title,
    body: input.body,
    target: input.target,
    route: input.route,
    createdAt: Date.now(),
    read: false,
  };

  await notificationStore.add(notification);

  await Notifications.scheduleNotificationAsync({
    content: {
      title: notification.title,
      body: notification.body,
      data: notification.route ? { route: notification.route } : undefined,
    },
    trigger: null,
  });
}

export async function fetchNotifications(): Promise<AppNotification[]> {
  try {
    const { data } = await apiClient<any[]>(`${API_BASE_URL}/events/announcements`, {
      method: "GET",
      timeout: 15000,
    });
    if (Array.isArray(data) && data.length > 0) {
      // Get previously stored notifications so we retain the read/unread state
      const existingStored = await notificationStore.getAll();
      const readSet = new Set(existingStored.filter((n) => n.read).map((n) => n.id));

      const liveAnnouncements: AppNotification[] = data.map((item) => {
        const rawTarget = (item.target || "").toString().toLowerCase().trim();
        let target: NotificationTarget = "all";
        if (rawTarget.startsWith("participant")) {
          target = "participant";
        } else if (rawTarget.startsWith("team") || rawTarget.startsWith("admin")) {
          target = "team";
        }

        const id = String(item.id || `announcement-${item.sr_no || Math.random()}`);
        return {
          id,
          title: item.title || "ANNOUNCEMENT",
          body: item.body || item.content || "",
          target,
          createdAt: item.createdAt || Date.now(),
          read: readSet.has(id),
        };
      });

      // Persist to local device storage for offline caching
      AsyncStorage.setItem("gateways.notifications.v1", JSON.stringify(liveAnnouncements)).catch(() => {});

      return liveAnnouncements;
    }
  } catch (err) {
    console.warn("Live announcements fetch failed, falling back to local storage...", err);
  }
  return notificationStore.getAll();
}
