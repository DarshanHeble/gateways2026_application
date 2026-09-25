import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { CACHE_KEYS, readCache, writeCache } from "./offline/cache";
import { SEED_EVENTS, SEED_SCHEDULE, SEED_GENERATED_AT } from "./offline/seed";
import { cleanText } from "@/utils/fest";

// Determine the active API URL:
// 1. If EXPO_PUBLIC_API_URL is set and not a broken/expired tunnel, use it
// 2. On Android with USB debugging (adb reverse) or emulator, localhost:5000 connects directly
const rawUrl = process.env.EXPO_PUBLIC_API_URL;
export const API_BASE_URL: string = rawUrl && rawUrl.trim().length > 0
  ? rawUrl
  : Platform.select({
      android: "http://localhost:5000/api/v1",
      ios: "http://localhost:5000/api/v1",
      default: "http://localhost:5000/api/v1",
    });

// Raw host for the health check which is at the root, not /api/v1
export const API_ROOT_URL = API_BASE_URL.replace(/\/api\/v1\/?$/, '');

export interface EventHead {
  name: string;
  role: string;
  phone: string;
  email: string;
}

export interface EventItem {
  id: string;
  title: string;
  subtitle?: string;
  date: string;
  from_time: string;
  end_time: string;
  venue: string;
  type: string;
  participation_type?: string;
  /** Entries the organisers will take, from the sheet's "Maximum Slots". */
  max_slots?: number | null;
  image_url?: string;
  description: string;
  rules: string[];
  rules_pdf_url?: string;
  eligibility: string[];
  prizes: {
    pool?: string;
    winner?: string;
    runner_up?: string;
    second_runner_up?: string;
    description?: string;
  };
  event_heads: EventHead[];
}

export interface ScheduleItem {
  id: string;
  title: string;
  subtitle?: string;
  date: string;
  from_time: string;
  end_time: string;
  venue: string;
  category: string;
  is_competition: boolean;
}

export interface ScheduleDay {
  day_number: number;
  date: string;
  display_date: string;
  timeline: ScheduleItem[];
}

export interface ScheduleResponse {
  days: ScheduleDay[];
}


/** Where a payload came from — drives the staleness banner. */
export type DataSource = "network" | "cache" | "seed";

export interface FetchResult<T> {
  data: T;
  source: DataSource;
  /** When this data was captured. `null` for a fresh network response. */
  savedAt: number | null;
}

/**
 * Cheap, synchronous-ish connectivity hint for the request layer.
 *
 * `NetworkProvider` owns connectivity for the UI, but `apiClient` is called from
 * plain functions outside React, so it can't read a hook. This module-level
 * mirror is kept up to date by the provider and lets a request skip a doomed
 * network round-trip and go straight to cache.
 */
let onlineHint = true;
export function setOnlineHint(online: boolean) {
  onlineHint = online;
}
export function getOnlineHint(): boolean {
  return onlineHint;
}

/**
 * Lightweight native fetch client with timeout, JSON parsing, credentials, and 401 interceptor.
 */
export async function apiClient<T = any>(
  url: string,
  options: RequestInit & { timeout?: number; skipAuthRedirect?: boolean } = {}
): Promise<{ data: T; status: number }> {
  const { timeout = 10000, skipAuthRedirect = false, ...customConfig } = options;

  // When we already know we're offline, don't burn the caller's timeout budget
  // waiting for an abort that's guaranteed to happen.
  if (!onlineHint) {
    const err: any = new Error("Offline — request skipped");
    err.isOffline = true;
    throw err;
  }

  const doFetch = async (targetUrl: string) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(targetUrl, {
        ...customConfig,
        signal: controller.signal,
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(customConfig.headers || {}),
        },
      });
      clearTimeout(id);
      return response;
    } catch (e) {
      clearTimeout(id);
      throw e;
    }
  };

  try {
    let response: Response;
    try {
      response = await doFetch(url);
    } catch (primaryErr) {
      // Retry against the adb-reverse port. This only ever made sense on a dev
      // machine with `adb reverse` set up — in production it just doubled the
      // wait before falling back to cache (~30s on a dead tunnel), so it's now
      // gated to development builds.
      if (__DEV__ && !url.startsWith("http://localhost:5000") && url.includes("/api/v1")) {
        const localFallback = url.replace(/https?:\/\/[^/]+/, "http://localhost:5000");
        response = await doFetch(localFallback);
      } else {
        throw primaryErr;
      }
    }

    if (response.status === 401) {
      if (!skipAuthRedirect) {
        await AsyncStorage.removeItem("auth_role");
        router.replace("/login");
      }
      const err: any = new Error("Unauthorized (401)");
      err.status = 401;
      throw err;
    }

    let data: any = null;
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      const err: any = new Error(data?.message || response.statusText || "Request failed");
      err.status = response.status;
      err.data = data;
      throw err;
    }

    return { data, status: response.status };
  } catch (error: any) {
    throw error;
  }
}

/**
 * Offline-first read: network → device cache → bundled seed.
 *
 * The seed is a real snapshot of the fest (see `offline/seed.ts`), not the
 * invented mock data this used to fall back to, so even a first launch with no
 * connectivity shows the actual programme.
 */
async function fetchWithFallback<T>(
  path: string,
  cacheKey: string,
  isValid: (value: T) => boolean,
  seed: T,
  seedSavedAt: number,
  timeout: number,
): Promise<FetchResult<T>> {
  try {
    const response = await apiClient<T>(`${API_BASE_URL}${path}`, { method: "GET", timeout });
    if (isValid(response.data)) {
      // Fire-and-forget: a slow disk write shouldn't delay the render.
      writeCache(cacheKey, response.data).catch(() => {});
      return { data: response.data, source: "network", savedAt: Date.now() };
    }
  } catch (error: any) {
    if (!error?.isOffline) {
      console.warn(`[api] Live fetch of ${path} failed, falling back to cache…`, error?.message);
    }
  }

  const cached = await readCache<T>(cacheKey);
  if (cached && isValid(cached.data)) {
    return { data: cached.data, source: "cache", savedAt: cached.savedAt };
  }

  return { data: seed, source: "seed", savedAt: seedSavedAt };
}

export async function fetchEvents(): Promise<FetchResult<EventItem[]>> {
  const result = await fetchWithFallback<EventItem[]>(
    "/events",
    CACHE_KEYS.EVENTS,
    (value) => Array.isArray(value) && value.length > 0,
    SEED_EVENTS,
    SEED_GENERATED_AT,
    // A cold fetch pulls two live Google Sheets through the dev tunnel, which
    // can take 8-12s. A tighter timeout here used to drop real data for mocks.
    15000,
  );
  // Whatever the source — network, cache or seed — titles reach the screens clean.
  return {
    ...result,
    data: result.data.map((e) => ({ ...e, title: cleanText(e.title), subtitle: cleanText(e.subtitle) })),
  };
}

export async function fetchSchedule(): Promise<FetchResult<ScheduleResponse>> {
  const result = await fetchWithFallback<ScheduleResponse>(
    "/events/schedule",
    CACHE_KEYS.SCHEDULE,
    (value) => Array.isArray(value?.days) && value.days.length > 0,
    SEED_SCHEDULE,
    SEED_GENERATED_AT,
    15000,
  );
  return {
    ...result,
    data: {
      ...result.data,
      days: result.data.days.map((d) => ({
        ...d,
        timeline: d.timeline.map((t) => ({ ...t, title: cleanText(t.title), subtitle: cleanText(t.subtitle) })),
      })),
    },
  };
}
