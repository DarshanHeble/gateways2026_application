import type { AssetEntry, AssetManifest, AssetSource } from "./types";

/**
 * Synchronous lookup table for "where do I get `event/promptx` right now?".
 *
 * Render paths cannot await. `getEventImage()` is called inline inside a
 * `renderItem`, so resolution has to be a plain synchronous read — which means
 * the answer must already be in memory. `AssetsProvider` primes this table once
 * at boot and re-primes it after a download completes.
 *
 * It deliberately lives at module scope rather than in a context, for the same
 * reason `setOnlineHint`/`getOnlineHint` in `services/api.ts` does: plain
 * non-React helpers (`services/EventAssets.ts`) need to read it too, and they
 * cannot call a hook.
 */

/** key -> `file://` URI of a verified local copy. */
let localUris: Record<string, string> = {};

/** key -> absolute CDN URL. Known as soon as *any* manifest is available. */
let remoteUrls: Record<string, string> = {};

/**
 * Bumped whenever the tables above change, so React can be told to look again.
 *
 * Without this, anything that rendered before the provider finished priming
 * would resolve to `null` and stay blank *forever*, because module-level state
 * can't trigger a re-render. `MobConvergenceOverlay` is the sharp edge: it is
 * root-mounted and its items take no changing props, so a single early render
 * would leave the transition characters permanently invisible. Priming and auth
 * hydration are independent async AsyncStorage reads, so which lands first is a
 * race — and a race is not something to leave load-bearing.
 */
let version = 0;
const listeners = new Set<() => void>();

function publish(): void {
  version += 1;
  for (const listener of listeners) listener();
}

/** Subscribe to registry changes. Pairs with `getAssetsVersion` for `useSyncExternalStore`. */
export function subscribeToAssets(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getAssetsVersion(): number {
  return version;
}

function joinUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

/** Record the CDN location of every asset in a manifest. */
export function primeRemote(manifest: AssetManifest | null): void {
  if (!manifest) return;
  const next: Record<string, string> = {};
  for (const entry of manifest.assets) {
    next[entry.key] = joinUrl(manifest.baseUrl, entry.path);
  }
  remoteUrls = next;
  publish();
}

/** Record which assets are confirmed present on disk. */
export function primeLocal(map: Record<string, string>): void {
  localUris = map;
  publish();
}

export function markLocal(key: string, uri: string): void {
  localUris = { ...localUris, [key]: uri };
  publish();
}

/**
 * Resolve an asset to something `expo-image` / `expo-video` can consume.
 *
 * Order matters: a local file is instant and works offline; the CDN URL is the
 * graceful degradation for a user who skipped the download or is mid-download —
 * expo-image will stream it and populate its own disk cache, so the second view
 * is fast even though we never pre-fetched it.
 *
 * Returns `null` when nothing is known yet, which is the signal for the caller
 * to render its bundled placeholder rather than an empty box.
 */
export function resolveAsset(key: string): AssetSource | null {
  const local = localUris[key];
  if (local) return { uri: local };

  const remote = remoteUrls[key];
  if (remote) return { uri: remote };

  return null;
}

/** Same as `resolveAsset` but flattened, for APIs that take a bare URI string. */
export function resolveAssetUri(key: string): string | null {
  return resolveAsset(key)?.uri ?? null;
}

/** True once this key is served from disk rather than the network. */
export function isLocal(key: string): boolean {
  return Boolean(localUris[key]);
}

/** Absolute CDN URL for an entry, without consulting local state. */
export function remoteUrlFor(manifest: AssetManifest, entry: AssetEntry): string {
  return joinUrl(manifest.baseUrl, entry.path);
}

/** Test seam — drops everything the registry knows. */
export function resetRegistry(): void {
  localUris = {};
  remoteUrls = {};
  publish();
}
