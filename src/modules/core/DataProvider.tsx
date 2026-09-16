import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { Image } from "expo-image";

import {
  fetchEvents,
  fetchSchedule,
  setOnlineHint,
  type DataSource,
  type EventItem,
  type ScheduleResponse,
} from "@/services/api";
import { SEED_EVENTS, SEED_SCHEDULE, SEED_GENERATED_AT } from "@/services/offline/seed";
import { readLastSyncAt, writeLastSyncAt } from "@/services/offline/cache";
import { flush as flushOutbox, pending as outboxPending } from "@/services/offline/outbox";
import { getEventImage } from "@/services/EventAssets";
import { useNetwork } from "./NetworkProvider";

/**
 * Coarse state of the sync pipeline, for the status pill.
 *
 * Deliberately excludes "offline"/"connecting": those are conditions derived
 * from NetworkProvider, not events this layer produces, and storing them here
 * too would let the two drift apart.
 */
export type SyncState = "idle" | "syncing" | "synced" | "failed";

interface DataContextType {
  events: EventItem[];
  schedule: ScheduleResponse;
  eventsLoading: boolean;
  scheduleLoading: boolean;
  refreshData: () => Promise<void>;
  eventsSource: DataSource;
  scheduleSource: DataSource;
  /** When the displayed data was captured — drives "synced Xm ago". */
  eventsSavedAt: number | null;
  scheduleSavedAt: number | null;
  /** Last time any sync succeeded, across app launches. */
  lastSyncedAt: number | null;
  /** Writes still waiting to reach the server. */
  pendingWrites: number;
  /** Re-read the outbox count (call after enqueuing a write). */
  refreshPending: () => Promise<void>;
  syncState: SyncState;
}

const DataContext = createContext<DataContextType>({
  events: SEED_EVENTS,
  schedule: SEED_SCHEDULE,
  eventsLoading: true,
  scheduleLoading: true,
  refreshData: async () => {},
  eventsSource: "seed",
  scheduleSource: "seed",
  eventsSavedAt: SEED_GENERATED_AT,
  scheduleSavedAt: SEED_GENERATED_AT,
  lastSyncedAt: null,
  pendingWrites: 0,
  refreshPending: async () => {},
  syncState: "idle",
});

/**
 * Warm the disk cache for event artwork that isn't bundled.
 *
 * Most events resolve to a local asset via `getEventImage`, which needs no
 * network at all. This covers the remainder: without it, an event image the
 * user never happened to scroll past while online is simply missing offline.
 */
function prefetchEventImages(events: EventItem[]) {
  const urls = events
    .filter((e) => !getEventImage(e.title) && e.image_url)
    .map((e) => e.image_url as string);

  if (urls.length === 0) return;
  Image.prefetch(urls, "memory-disk").catch(() => {
    // Best-effort warming; a failure just means we fall back to the placeholder.
  });
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { isOnline } = useNetwork();

  const [events, setEvents] = useState<EventItem[]>(SEED_EVENTS);
  const [schedule, setSchedule] = useState<ScheduleResponse>(SEED_SCHEDULE);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [scheduleLoading, setScheduleLoading] = useState(true);
  const [eventsSource, setEventsSource] = useState<DataSource>("seed");
  const [scheduleSource, setScheduleSource] = useState<DataSource>("seed");
  const [eventsSavedAt, setEventsSavedAt] = useState<number | null>(SEED_GENERATED_AT);
  const [scheduleSavedAt, setScheduleSavedAt] = useState<number | null>(SEED_GENERATED_AT);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [pendingWrites, setPendingWrites] = useState(0);
  const [syncState, setSyncState] = useState<SyncState>("idle");

  const mounted = useRef(true);
  // One sync at a time: mount, reconnect, foreground and pull-to-refresh can
  // all fire within the same moment and would otherwise stampede the backend.
  const syncing = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Mirror connectivity into the request layer so plain (non-React) fetch
  // helpers can skip doomed round-trips instead of waiting out a timeout.
  useEffect(() => {
    setOnlineHint(isOnline);
  }, [isOnline]);

  const refreshPending = useCallback(async () => {
    const queued = await outboxPending();
    if (mounted.current) setPendingWrites(queued.length);
  }, []);

  useEffect(() => {
    readLastSyncAt().then((at) => {
      if (mounted.current) setLastSyncedAt(at);
    });
    refreshPending();
  }, [refreshPending]);

  const runSync = useCallback(async () => {
    if (syncing.current) return;
    syncing.current = true;
    setSyncState("syncing");

    try {
      const [evRes, schRes] = await Promise.all([fetchEvents(), fetchSchedule()]);
      if (!mounted.current) return;

      setEvents(evRes.data);
      setEventsSource(evRes.source);
      setEventsSavedAt(evRes.savedAt);
      setEventsLoading(false);

      setSchedule(schRes.data);
      setScheduleSource(schRes.source);
      setScheduleSavedAt(schRes.savedAt);
      setScheduleLoading(false);

      if (evRes.source === "network") {
        prefetchEventImages(evRes.data);
      }

      // Only a genuine network round-trip counts as a sync; serving cache or
      // seed must not make the app look freshly up to date.
      if (evRes.source === "network" || schRes.source === "network") {
        const at = Date.now();
        await writeLastSyncAt(at);
        if (mounted.current) setLastSyncedAt(at);
      }

      // Deliver anything queued while offline, then refresh the badge count.
      const delivered = await flushOutbox();
      if (delivered > 0) console.info(`[sync] Delivered ${delivered} queued write(s).`);
      await refreshPending();

      if (mounted.current) {
        // Reaching cache/seed instead of the network isn't a success — say so,
        // rather than flashing "synced" over stale data.
        const live = evRes.source === "network" || schRes.source === "network";
        setSyncState(live ? "synced" : "failed");
      }
    } catch (err) {
      console.warn("[sync] Refresh failed:", err);
      if (mounted.current) {
        setEventsLoading(false);
        setScheduleLoading(false);
        setSyncState("failed");
      }
    } finally {
      syncing.current = false;
    }
  }, [refreshPending]);

  // Initial load. `runSync` is async and every setState inside it happens after
  // an await, so this can't actually cascade renders — the rule can't see
  // through the async boundary.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    runSync();
  }, [runSync]);

  // Resync the moment connectivity comes back — the core of the patchy-Wi-Fi
  // case. The user shouldn't have to know to pull-to-refresh.
  const wasOnline = useRef(isOnline);
  useEffect(() => {
    if (isOnline && !wasOnline.current) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      runSync();
    }
    wasOnline.current = isOnline;
  }, [isOnline, runSync]);

  // Resync when the user returns to the app; connectivity and the sheet data
  // both commonly changed while it was backgrounded.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (status: AppStateStatus) => {
      if (status === "active") runSync();
    });
    return () => sub.remove();
  }, [runSync]);

  const refreshData = useCallback(async () => {
    setEventsLoading(true);
    setScheduleLoading(true);
    await runSync();
  }, [runSync]);

  return (
    <DataContext.Provider
      value={{
        events,
        schedule,
        eventsLoading,
        scheduleLoading,
        refreshData,
        eventsSource,
        scheduleSource,
        eventsSavedAt,
        scheduleSavedAt,
        lastSyncedAt,
        pendingWrites,
        refreshPending,
        syncState,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export const useAppData = () => useContext(DataContext);
