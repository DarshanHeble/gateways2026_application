import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppNotification } from "./notificationTypes";

const STORAGE_KEY = "gateways.notifications.v1";

const DEFAULT_NOTIFICATIONS: AppNotification[] = [
  {
    id: "welcome-gateways-2026",
    title: "WELCOME TO GATEWAYS 2026!",
    body: "The annual national computer science festival is now live. Explore events, customize your stage avatar, and gear up for the competitions!",
    target: "all",
    createdAt: Date.now() - 1000 * 60 * 30, // 30 mins ago
    read: false,
    route: "/(tabs)/events",
  },
  {
    id: "hackathon-venue-update",
    title: "CODE COMBAT: VENUE ANNOUNCEMENT",
    body: "Participants of Code Combat Hackathon, please report to Lab Block 3, 4th Floor at 9:00 AM sharp for team desk allocations and orientation.",
    target: "participant",
    createdAt: Date.now() - 1000 * 60 * 60 * 2, // 2 hours ago
    read: false,
    route: "/(tabs)/events",
  },
  {
    id: "food-token-alert",
    title: "REFRESHMENTS & LUNCH SERVICE",
    body: "Buffet lunch will be served from 12:30 PM to 2:00 PM at Central Dining Hall. Keep your digital Fest ID card handy at the food desk.",
    target: "all",
    createdAt: Date.now() - 1000 * 60 * 60 * 4, // 4 hours ago
    read: true,
  },
  {
    id: "quiz-prelims-starting",
    title: "IT QUIZ PRELIMS AT 11:00 AM",
    body: "The preliminary written round for IT Quiz begins at 11:00 AM in the Main Auditorium. Bring your registered team partner.",
    target: "participant",
    createdAt: Date.now() - 1000 * 60 * 60 * 6, // 6 hours ago
    read: true,
    route: "/(tabs)/events",
  },
];

async function readAll(): Promise<AppNotification[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) {
    // Seed with rich default alerts on first launch
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_NOTIFICATIONS));
    return DEFAULT_NOTIFICATIONS;
  }
  try {
    const parsed = JSON.parse(raw) as AppNotification[];
    if (Array.isArray(parsed) && parsed.length === 0) {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_NOTIFICATIONS));
      return DEFAULT_NOTIFICATIONS;
    }
    return parsed;
  } catch {
    return DEFAULT_NOTIFICATIONS;
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
