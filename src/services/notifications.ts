import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { API_BASE_URL, apiClient } from "./api";
import { notificationStore } from "./notificationStore";
import { AppNotification, NotificationTarget } from "./notificationTypes";
import { SEED_ANNOUNCEMENTS } from "./offline/seed";

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

export async function registerForPushNotificationsAsync(role?: string | null): Promise<string | null> {
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
  // in app.json plus a google-services.json. Detect that up front and
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
      body: JSON.stringify({ token, platform: Platform.OS, role: role || "all" }),
    }).catch((err) => {
      console.warn("[notifications] Failed to register push token with backend:", err);
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

/** Normalise a raw sheet/seed announcement row into an AppNotification. */
/**
 * "30/09/2026", "30-09-2026", "2026-09-30", "30 Sep 2026", "30th September 2026"
 * → the end of that day, local time. `null` for blank or unreadable.
 */
export function parseExpiry(value: unknown): number | null {
  const v = String(value ?? "").trim();
  if (!v) return null;
  let y: number | undefined, m: number | undefined, d: number | undefined;
  const iso = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  const dmy = v.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
  if (iso) [y, m, d] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
  else if (dmy) [d, m, y] = [Number(dmy[1]), Number(dmy[2]), Number(dmy[3])];
  else {
    const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    const words = v.toLowerCase().match(/(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]{3})[a-z]*,?\s+(\d{4})/);
    if (words) [d, m, y] = [Number(words[1]), months.indexOf(words[2]) + 1, Number(words[3])];
  }
  if (!y || !m || !d) return null;
  if (y < 100) y += 2000;
  const end = new Date(y, m - 1, d, 23, 59, 59).getTime();
  return Number.isFinite(end) ? end : null;
}

function toAppNotification(
  item: any,
  known: Map<string, AppNotification>,
  now: number = Date.now(),
): AppNotification {
  const audience = String(item.target || "").trim();
  const rawTarget = audience.toLowerCase();
  let target: NotificationTarget = "all";
  if (rawTarget.startsWith("participant")) {
    target = "participant";
  } else if (rawTarget.startsWith("team") || rawTarget.startsWith("admin")) {
    target = "team";
  }

  const id = String(item.id || `announcement-${item.sr_no ?? item.title ?? "unknown"}`);
  const seen = known.get(id);
  return {
    id,
    title: item.title || "ANNOUNCEMENT",
    body: item.body || item.content || "",
    target,
    audience: audience && !/^all$/i.test(audience) ? audience : undefined,
    expiresAt: parseExpiry(item.expiry),
    // Keep the first time this device saw it; a new one is "now".
    createdAt: seen?.createdAt ?? now,
    read: seen?.read ?? false,
  };
}

/**
 * Offline-first announcements: network → local store → bundled seed.
 *
 * Read/unread state is preserved across syncs, and the seed is only rendered —
 * never written into the local store — so a bundled snapshot can't masquerade
 * as a live announcement.
 */
export async function fetchNotifications(): Promise<AppNotification[]> {
  const stored = await notificationStore.getAll();
  const known = new Map(stored.map((n) => [n.id, n]));
  const now = Date.now();
  // An announcement past its expiry date no longer applies.
  const current = (list: AppNotification[]) => list.filter((n) => !n.expiresAt || n.expiresAt >= now);

  try {
    const { data } = await apiClient<any[]>(`${API_BASE_URL}/events/announcements`, {
      method: "GET",
      timeout: 15000,
    });

    if (Array.isArray(data)) {
      // Rows with no text are placeholders in the sheet, not announcements.
      const live = data
        .filter((item) => String(item?.body || item?.content || "").trim())
        .map((item, i) => toAppNotification(item, known, now - i));
      // Persist so the next cold start has them without a network round-trip.
      await notificationStore.replaceAll(live);
      return current(live);
    }
  } catch (err: any) {
    if (!err?.isOffline) {
      console.warn("[notifications] Live announcements fetch failed, using local data.", err?.message);
    }
  }

  if (stored.length > 0) return current(stored);

  // Nothing synced yet and no network: fall back to the bundled snapshot.
  return current(
    SEED_ANNOUNCEMENTS.filter((item) => String(item?.body || item?.content || "").trim()).map((item, i) =>
      toAppNotification(item, known, now - i),
    ),
  );
}
