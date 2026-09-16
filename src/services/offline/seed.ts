import type { EventItem, ScheduleResponse } from "@/services/api";
import seedJson from "./seed.json";

/**
 * A real snapshot of the fest data, baked into the bundle by
 * `scripts/generate-seed.mjs` (`npm run seed`).
 *
 * This is the last-resort fallback: it is only reached on a first launch with
 * no network and no cache yet. It replaces the old `MOCK_EVENTS`, which was
 * nine invented events bearing no relation to the real programme — so an
 * offline first launch used to show a fest that didn't exist.
 *
 * It is deliberately *read-only*. Nothing here is ever written into the live
 * caches or the notification store; it's rendered, labelled as a snapshot, and
 * replaced by real data on the first successful sync.
 */
export interface SeedAnnouncement {
  id?: string | number;
  sr_no?: string | number;
  title?: string;
  body?: string;
  content?: string;
  target?: string;
  createdAt?: number;
}

interface Seed {
  generatedAt: string;
  source: string;
  events: EventItem[];
  schedule: ScheduleResponse;
  announcements: SeedAnnouncement[];
}

const seed = seedJson as unknown as Seed;

export const SEED_EVENTS: EventItem[] = seed.events ?? [];
export const SEED_SCHEDULE: ScheduleResponse = seed.schedule ?? { days: [] };
export const SEED_ANNOUNCEMENTS: SeedAnnouncement[] = seed.announcements ?? [];

/** When the snapshot was taken — surfaced in the UI so it can't pass for live data. */
export const SEED_GENERATED_AT: number = (() => {
  const parsed = Date.parse(seed.generatedAt);
  return Number.isFinite(parsed) ? parsed : 0;
})();
