import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import axios from "axios";

import { API_BASE_URL } from "./api";
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

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });

    axios
      .post(`${API_BASE_URL}/push/register-token`, { token, platform: Platform.OS })
      .catch(() => {
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
    await axios.post(`${API_BASE_URL}/push/send`, input, { timeout: 2000 });
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
    const { data } = await axios.get<AppNotification[]>(`${API_BASE_URL}/push/notifications`, {
      timeout: 2000,
    });
    if (Array.isArray(data)) return data;
  } catch {
    // No backend endpoint yet — read the local mock log instead.
  }
  return notificationStore.getAll();
}
