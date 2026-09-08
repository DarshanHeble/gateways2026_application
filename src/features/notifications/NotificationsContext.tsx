import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";

import { useAuth } from "@/features/auth/AuthContext";
import {
  configureNotificationHandler,
  fetchNotifications,
  registerForPushNotificationsAsync,
  sendNotification as sendNotificationRequest,
} from "@/services/notifications";
import { notificationStore } from "@/services/notificationStore";
import { AppNotification, NotificationTarget, matchesTarget } from "@/services/notificationTypes";

interface NotificationsContextType {
  /** Already filtered to what the current role should see. */
  notifications: AppNotification[];
  unreadCount: number;
  refresh: () => Promise<void>;
  markAllRead: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  sendNotification: (input: { title: string; body: string; target: NotificationTarget; route?: string }) => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { role } = useAuth();
  const [all, setAll] = useState<AppNotification[]>([]);

  const refresh = useCallback(async () => {
    const list = await fetchNotifications();
    setAll(list);
  }, []);

  /** Local mutations (mark read, a mocked send) already know the answer — skip the network-first round-trip. */
  const syncFromLocal = useCallback(async () => {
    setAll(await notificationStore.getAll());
  }, []);

  useEffect(() => {
    configureNotificationHandler();
    registerForPushNotificationsAsync();
    refresh();

    const receivedSub = Notifications.addNotificationReceivedListener(() => {
      refresh();
    });

    const responseSub = Notifications.addNotificationResponseReceivedListener(async (response) => {
      const data = response.notification.request.content.data as { route?: string } | undefined;
      if (data?.route) router.push(data.route as never);
      else router.push("/(tabs)/notifications" as never);
    });

    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const notifications = useMemo(() => {
    const activeRole = role || "participant";
    return all.filter((n) => matchesTarget(n.target, activeRole));
  }, [all, role]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const markAllRead = useCallback(async () => {
    await notificationStore.markAllRead();
    await syncFromLocal();
  }, [syncFromLocal]);

  const markRead = useCallback(
    async (id: string) => {
      await notificationStore.markRead(id);
      await syncFromLocal();
    },
    [syncFromLocal],
  );

  const sendNotification = useCallback(
    async (input: { title: string; body: string; target: NotificationTarget; route?: string }) => {
      await sendNotificationRequest(input);
      await syncFromLocal();
    },
    [syncFromLocal],
  );

  const value = useMemo(
    () => ({ notifications, unreadCount, refresh, markAllRead, markRead, sendNotification }),
    [notifications, unreadCount, refresh, markAllRead, markRead, sendNotification],
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationsProvider");
  }
  return context;
}
