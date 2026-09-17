import { resolveAsset } from "./assets";
import type { AssetSource } from "./assets";

/**
 * Event title -> CDN asset key.
 *
 * These used to be `require()`s of files in `assets/images/events/`. Seven of
 * them pointed at "SVG"s that were really a 163x162 circle wrapping a base64
 * 1024x1016 bitmap — ~2.6 MB each, and unrenderable: this project has no
 * `react-native-svg-transformer`, so expo-image could not rasterize them and
 * those events showed a blank tile. They are now WebP in the CDN bundle, which
 * both fixes the rendering and removed ~18 MB from the app binary.
 *
 * Keys are the slugified titles, matching `scripts/build-assets.py`.
 */
const EVENT_ASSET_KEYS: Record<string, string> = {
  "24° shift": "event/24-shift",
  "alternate thesis": "event/alternate-thesis",
  "arcadia x": "event/arcadia-x",
  deviation: "event/deviation",
  "in perspective": "event/in-perspective",
  "mystery block": "event/mystery-block",
  "pixel paradox": "event/pixel-paradox",
  "pixel quest": "event/pixel-quest",
  promptx: "event/promptx",
  "render rush": "event/render-rush",
  "the last commit": "event/the-last-commit",
  "the twin directive": "event/the-twin-directive",
  "twin protocol": "event/twin-protocol",
};

/** Title -> asset key, tolerant of the backend's inconsistent event naming. */
function assetKeyForTitle(title: string): string | null {
  const normalized = title.toLowerCase().trim();
  if (EVENT_ASSET_KEYS[normalized]) return EVENT_ASSET_KEYS[normalized];

  for (const [name, key] of Object.entries(EVENT_ASSET_KEYS)) {
    if (normalized.includes(name) || name.includes(normalized)) return key;
  }
  return null;
}

/**
 * Artwork for an event, or `null` if we have none.
 *
 * `null` is meaningful and callers rely on it: `events.tsx` falls back to the
 * backend's `image_url`, and `TimelineCard` omits the thumbnail entirely rather
 * than reserving space for an image that will never arrive.
 *
 * Resolution is synchronous — this is called inline from `renderItem` — and
 * degrades in order: local file, then CDN URL (expo-image streams and disk-caches
 * it), then `null`.
 */
export const getEventImage = (title?: string): AssetSource | null => {
  if (!title) return null;
  const key = assetKeyForTitle(title);
  return key ? resolveAsset(key) : null;
};
