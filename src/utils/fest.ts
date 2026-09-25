/**
 * Fest calendar helpers, shared by Home and Schedule.
 *
 * Dates are the backend's `YYYY-MM-DD` strings and are compared as calendar
 * days, in UTC arithmetic, so a timezone can never move an event to the
 * wrong day.
 */

/** Where the lineup (events the user is tracking) is kept on the device. */
export const LINEUP_STORAGE_KEY = "@gateways_my_events";

/** Local calendar date as `YYYY-MM-DD`. */
export function localIso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Whole days between two `YYYY-MM-DD` dates. */
export function daysBetween(a: string, b: string) {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000);
}

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Oct 8 - 9" style range, and where today sits relative to it. */
export function festStatus(start: string, end: string, today: string) {
  const [, sm, sd] = start.split("-").map(Number);
  const [, em, ed] = end.split("-").map(Number);
  const range =
    start === end
      ? `${MONTHS[sm - 1]} ${sd}`
      : sm === em
        ? `${MONTHS[sm - 1]} ${sd} - ${ed}`
        : `${MONTHS[sm - 1]} ${sd} - ${MONTHS[em - 1]} ${ed}`;

  const toStart = daysBetween(today, start);
  if (toStart > 1) return { range, label: `${toStart} days to go` };
  if (toStart === 1) return { range, label: "Starts tomorrow" };
  if (daysBetween(today, end) >= 0) return { range, label: `Day ${daysBetween(start, today) + 1} · Live now` };
  return { range, label: "That's a wrap" };
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** `2026-10-08` → `Thu 8 Oct`. */
export function shortDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]} ${d} ${MONTHS[m - 1]}`;
}

/**
 * `"9:00 AM"` → minutes after midnight, or `null` for "TBA", blanks and
 * anything else that isn't a clock time.
 */
export function clockMinutes(value?: string | null): number | null {
  const m = String(value ?? "").trim().match(/^(\d{1,2}):(\d{2})\s*([AP])\.?M\.?$/i);
  if (!m) return null;
  let h = Number(m[1]) % 12;
  if (m[3].toUpperCase() === "P") h += 12;
  return h * 60 + Number(m[2]);
}

// ── Event facts, read the same way on every screen ──────────────────────────

/** "₹65,000" → 65000. Anything unparseable is 0. */
export function rupees(value?: string | null): number {
  const n = Number(String(value ?? "").replace(/[^\d]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** 250000 → "₹2.5L", 65000 → "₹65K", 900 → "₹900". */
export function shortRupees(n: number): string {
  if (n >= 100000) return `₹${(n / 100000).toFixed(n % 100000 ? 1 : 0)}L`;
  // One decimal under 10K so ₹2,500 reads ₹2.5K, not a rounded-up ₹3K.
  if (n >= 10000) return `₹${Math.round(n / 1000)}K`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(n % 1000 ? 1 : 0)}K`;
  return `₹${n}`;
}

/** "Team of 2-4 Members" → "Team 2–4"; "Team of 2" → "Team 2"; "Individual" → "Solo". */
export function teamLabel(value?: string | null): string | null {
  const v = String(value ?? "").trim();
  if (!v) return null;
  if (/individual|solo|single/i.test(v)) return "Solo";
  const range = v.match(/(\d+)\s*(?:-|–|to)\s*(\d+)/);
  if (range) return `Team ${range[1]}–${range[2]}`;
  const one = v.match(/(\d+)/);
  return one ? `Team ${one[1]}` : v;
}

/**
 * Invisible characters the organisers' sheet carries in some titles — a
 * U+2060 word joiner before "RenderRush" and "Twin Protocol". They break
 * search, sorting and matching, and are never meant to be there.
 */
export function cleanText<T extends string | undefined | null>(value: T): T {
  if (typeof value !== "string") return value;
  return value.replace(/[​-‍⁠﻿]/g, "").trim() as T;
}

/**
 * Which of the fest's days an event's own date text names.
 *
 * The sheet dates events in prose — "8th & 9th October 2026", "9th Oct 2026",
 * "30th September - 01st October, 2026" — and the backend files every
 * two-day event under Day 1 only. Reading the day numbers back out puts each
 * event on every day it actually runs. Returns `null` when the text says
 * nothing (keep the backend's placement), and `[]` when it names only other
 * dates (the event isn't on any fest day).
 */
export function festDaysIn(dateText: string | undefined | null, festDates: string[]): string[] | null {
  const text = String(dateText ?? "").toLowerCase();
  if (!/\d/.test(text)) return null;
  return festDates.filter((iso) => {
    const [, m, d] = iso.split("-").map(Number);
    const monthNamed = new RegExp(`\\b${MONTHS[m - 1].toLowerCase()}`).test(text);
    const dayNamed = new RegExp(`(^|[^\\d])0?${d}(st|nd|rd|th)?([^\\d]|$)`).test(text);
    // "30th September - 01st October": the 1 belongs to October, but no fest day
    // is the 1st, so matching the day number alone is enough as long as the
    // fest's month is named somewhere in the text.
    return dayNamed && monthNamed;
  });
}
