#!/usr/bin/env node
/**
 * Bakes a real snapshot of the fest data into the app bundle.
 *
 * The app previously shipped `MOCK_EVENTS` — nine invented events that shared
 * nothing with the real fest — as its no-network fallback, so a first launch
 * without connectivity showed a fictional programme. This writes the actual
 * backend response to `src/services/offline/seed.json` instead, so that same
 * launch shows real data.
 *
 * Run before cutting a release build:
 *   npm run seed                     # against localhost:5000
 *   API_URL=https://… npm run seed   # against a tunnel or deployed backend
 *
 * The output is committed on purpose: builds must not depend on a live backend.
 */
import { writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = resolve(__dirname, "../src/services/offline/seed.json");

const API_URL = (process.env.API_URL || "http://localhost:5000/api/v1").replace(/\/$/, "");
const TIMEOUT_MS = 30_000;

async function fetchJson(path) {
  const url = `${API_URL}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  console.log(`Generating seed from ${API_URL} …`);

  const [events, schedule, announcements] = await Promise.all([
    fetchJson("/events"),
    fetchJson("/events/schedule"),
    fetchJson("/events/announcements"),
  ]);

  // Refuse to write a seed that's worse than no seed. An empty events array
  // would silently ship an app that looks broken offline; empty announcements
  // are legitimate (the sheet tab is often empty), so those aren't checked.
  if (!Array.isArray(events) || events.length === 0) {
    throw new Error("Refusing to write seed: /events returned no events.");
  }
  if (!schedule?.days?.length) {
    throw new Error("Refusing to write seed: /events/schedule returned no days.");
  }

  const seed = {
    generatedAt: new Date().toISOString(),
    source: API_URL,
    events,
    schedule,
    announcements: Array.isArray(announcements) ? announcements : [],
  };

  await mkdir(dirname(OUT_PATH), { recursive: true });
  await writeFile(OUT_PATH, `${JSON.stringify(seed, null, 2)}\n`, "utf8");

  console.log(
    `Wrote ${OUT_PATH}\n` +
      `  events:        ${seed.events.length}\n` +
      `  schedule days: ${seed.schedule.days.length}\n` +
      `  announcements: ${seed.announcements.length}`,
  );
}

main().catch((err) => {
  console.error(`\nSeed generation failed: ${err.message}`);
  console.error("Is the backend running? Try: npm run dev (in gateways_dev_backend)");
  process.exit(1);
});
