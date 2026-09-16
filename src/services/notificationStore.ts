import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppNotification } from "./notificationTypes";

const STORAGE_KEY = "gateways.notifications.v1";

/**
 * Local persistence for announcements.
 *
 * This used to seed four invented alerts ("CODE COMBAT: VENUE ANNOUNCEMENT" and
 * friends) into this store on first launch. Because they were written into the
 * *live* store rather than held as a read-only fallback, they persisted forever
 * and interleaved with real announcements pulled from the sheet — the app would
 * confidently show fest-goers venue instructions that no organiser ever sent.
 *
 * The store now starts genuinely empty. The offline fallback is the bundled
 * snapshot in `offline/seed.ts`, which is rendered but never written here.
 */
async function readAll(): Promise<AppNotification[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AppNotification[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeAll(notifications: AppNotification[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  } catch (err) {
    console.warn("[notifications] Failed to persist:", err);
  }
}

export const notificationStore = {
  async getAll(): Promise<AppNotification[]> {
    const all = await readAll();
    return [...all].sort((a, b) => b.createdAt - a.createdAt);
  },

  /** Replace the stored set wholesale — used when a live sync returns announcements. */
  async replaceAll(notifications: AppNotification[]): Promise<void> {
    await writeAll(notifications);
  },

  async add(notification: AppNotification): Promise<void> {
    const all = await readAll();
    all.push(notification);
    await writeAll(all);
  },

  async markRead(id: string): Promise<void> {
    const all = await readAll();
    await writeAll(all.map((n) => (n.id === id ? { ...n, read: true } : n)));
  },

  async markAllRead(): Promise<void> {
    const all = await readAll();
    await writeAll(all.map((n) => ({ ...n, read: true })));
  },
};
