import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * One storage envelope for every cached blob in the app.
 *
 * The old `fetchEvents`/`fetchSchedule` cache wrote bare JSON, so nothing
 * downstream could tell four-minute-old data from four-day-old data. Wrapping
 * the payload gives every consumer a `savedAt` to render staleness from, and a
 * `v` so a shape change invalidates old entries instead of crashing whatever
 * reads them.
 */
export interface CacheEnvelope<T> {
  v: number;
  savedAt: number;
  data: T;
}

export const CACHE_KEYS = {
  EVENTS: "@gateways_cache_events",
  SCHEDULE: "@gateways_cache_schedule",
  ANNOUNCEMENTS: "@gateways_cache_announcements",
  /** Set by `sync.ts` after any successful refresh — drives "synced Xm ago". */
  LAST_SYNC: "@gateways_last_sync_at",
  /**
   * Last CDN asset manifest we successfully fetched. Reading this on boot is
   * what lets the second and every later launch resolve artwork with no
   * network at all — see `services/assets/manifest.ts`.
   */
  ASSET_MANIFEST: "@gateways_cache_asset_manifest",
} as const;

/**
 * Bump when a cached payload's shape changes. A mismatch is treated as a miss,
 * so an app update never renders a stale entry against new parsing code.
 */
export const CACHE_VERSION = 1;

export async function readCache<T>(key: string): Promise<CacheEnvelope<T> | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<CacheEnvelope<T>>;
    if (parsed?.v !== CACHE_VERSION || typeof parsed.savedAt !== "number" || parsed.data == null) {
      return null;
    }
    return parsed as CacheEnvelope<T>;
  } catch {
    // Corrupt or half-written entry — treat as a miss rather than throwing into
    // a render path. The next successful sync overwrites it.
    return null;
  }
}

export async function writeCache<T>(key: string, data: T): Promise<void> {
  const envelope: CacheEnvelope<T> = { v: CACHE_VERSION, savedAt: Date.now(), data };
  try {
    await AsyncStorage.setItem(key, JSON.stringify(envelope));
  } catch (err) {
    // A failed cache write must never break the request that produced the data.
    console.warn(`[cache] Failed to persist ${key}:`, err);
  }
}

export async function readLastSyncAt(): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEYS.LAST_SYNC);
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function writeLastSyncAt(at: number = Date.now()): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEYS.LAST_SYNC, String(at));
  } catch {
    // Non-fatal: staleness display degrades, data is unaffected.
  }
}

/** Compact relative age for the staleness banner: "just now", "12m ago", "3d ago". */
export function formatAge(savedAt: number | null, now: number = Date.now()): string {
  if (savedAt == null) return "never";

  const seconds = Math.max(0, Math.round((now - savedAt) / 1000));
  if (seconds < 60) return "just now";

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  return `${Math.round(hours / 24)}d ago`;
}
