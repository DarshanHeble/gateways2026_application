import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppNotification } from "./notificationTypes";

const STORAGE_KEY = "gateways.notifications.v1";

async function readAll(): Promise<AppNotification[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as AppNotification[];
  } catch {
    return [];
  }
}

async function writeAll(notifications: AppNotification[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
}

export const notificationStore = {
  async getAll(): Promise<AppNotification[]> {
    const all = await readAll();
    return all.sort((a, b) => b.createdAt - a.createdAt);
  },

  async add(notification: AppNotification): Promise<void> {
    const all = await readAll();
    all.push(notification);
    await writeAll(all);
  },

  async markRead(id: string): Promise<void> {
    const all = await readAll();
    const next = all.map((n) => (n.id === id ? { ...n, read: true } : n));
    await writeAll(next);
  },

  async markAllRead(): Promise<void> {
    const all = await readAll();
    await writeAll(all.map((n) => ({ ...n, read: true })));
  },
};
