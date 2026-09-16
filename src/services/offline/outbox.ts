import AsyncStorage from "@react-native-async-storage/async-storage";

import { API_BASE_URL, apiClient, getOnlineHint } from "@/services/api";

/**
 * A durable queue for mutations made while offline.
 *
 * Before this, the one write in the app (`handleSaveProfile`) did
 * `.catch(() => {})` — offline it reported success and the server never heard
 * about the change. Writes now go in here, survive a restart, and replay when
 * connectivity returns.
 *
 * Registrations and payments are not wired into the app yet; when they are,
 * they enqueue through the same `enqueue()` and need no new plumbing.
 */
const STORAGE_KEY = "@gateways_outbox_v1";

/** Give up after this many attempts and mark the entry dead rather than retrying forever. */
const MAX_ATTEMPTS = 8;
const BASE_BACKOFF_MS = 5_000;
const MAX_BACKOFF_MS = 5 * 60_000;

export interface OutboxEntry {
  id: string;
  /** Path relative to API_BASE_URL, e.g. "/profile". */
  endpoint: string;
  method: "POST" | "PUT" | "PATCH" | "DELETE";
  body: unknown;
  createdAt: number;
  attempts: number;
  nextAttemptAt: number;
  lastError?: string;
  /** Set once attempts are exhausted; kept for display rather than dropped silently. */
  dead?: boolean;
  /** Human label for the UI, e.g. "Profile update". */
  label: string;
}

async function readAll(): Promise<OutboxEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeAll(entries: OutboxEntry[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (err) {
    console.warn("[outbox] Failed to persist queue:", err);
  }
}

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Queue a mutation. `dedupeKey` collapses repeated edits of the same thing —
 * saving your profile five times offline should send one request, not five.
 */
export async function enqueue(input: {
  endpoint: string;
  method: OutboxEntry["method"];
  body: unknown;
  label: string;
  dedupeKey?: string;
}): Promise<void> {
  const all = await readAll();

  const entry: OutboxEntry = {
    id: input.dedupeKey ? `dedupe:${input.dedupeKey}` : makeId(),
    endpoint: input.endpoint,
    method: input.method,
    body: input.body,
    createdAt: Date.now(),
    attempts: 0,
    nextAttemptAt: 0,
    label: input.label,
  };

  const existing = all.findIndex((e) => e.id === entry.id);
  if (existing >= 0) {
    // Replace the payload but keep the original queue position.
    all[existing] = { ...entry, createdAt: all[existing].createdAt };
  } else {
    all.push(entry);
  }

  await writeAll(all);
}

/** Entries still waiting to sync (excludes dead ones). */
export async function pending(): Promise<OutboxEntry[]> {
  return (await readAll()).filter((e) => !e.dead);
}

export async function deadLettered(): Promise<OutboxEntry[]> {
  return (await readAll()).filter((e) => e.dead);
}

export async function clearDead(): Promise<void> {
  await writeAll((await readAll()).filter((e) => !e.dead));
}

function backoffFor(attempts: number): number {
  return Math.min(BASE_BACKOFF_MS * 2 ** attempts, MAX_BACKOFF_MS);
}

let flushing = false;

/**
 * Attempt every due entry. Safe to call from several triggers at once — a
 * second concurrent call is a no-op rather than a double-send.
 *
 * Returns how many entries were successfully delivered.
 */
export async function flush(): Promise<number> {
  if (flushing || !getOnlineHint()) return 0;
  flushing = true;

  try {
    const all = await readAll();
    if (all.length === 0) return 0;

    const now = Date.now();
    let delivered = 0;
    const remaining: OutboxEntry[] = [];

    for (const entry of all) {
      if (entry.dead || entry.nextAttemptAt > now) {
        remaining.push(entry);
        continue;
      }

      try {
        await apiClient(`${API_BASE_URL}${entry.endpoint}`, {
          method: entry.method,
          body: JSON.stringify(entry.body),
          timeout: 10_000,
          skipAuthRedirect: true,
        });
        delivered += 1;
        // Success: drop it by not carrying it into `remaining`.
      } catch (err: any) {
        const attempts = entry.attempts + 1;
        const isDead = attempts >= MAX_ATTEMPTS;
        remaining.push({
          ...entry,
          attempts,
          nextAttemptAt: Date.now() + backoffFor(attempts),
          lastError: err?.message || "unknown error",
          dead: isDead,
        });
        if (isDead) {
          console.warn(`[outbox] "${entry.label}" gave up after ${attempts} attempts.`);
        }
        // Stop on the first offline error — the rest will fail identically.
        if (err?.isOffline) {
          const idx = all.indexOf(entry);
          remaining.push(...all.slice(idx + 1));
          break;
        }
      }
    }

    await writeAll(remaining);
    return delivered;
  } finally {
    flushing = false;
  }
}
