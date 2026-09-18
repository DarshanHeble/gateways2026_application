import { Directory, File, Paths } from "expo-file-system";

import { remoteUrlFor } from "./registry";
import type { AssetEntry, AssetManifest, AssetProgress } from "./types";

/**
 * Downloads the CDN bundle to persistent storage and reports progress.
 *
 * Two decisions shape everything here.
 *
 * **`Paths.document`, not `Paths.cache`.** The cache directory is evictable by
 * the OS under storage pressure. Using it would mean a user who has had the app
 * installed for a month, opened it on fest morning on hotel Wi-Fi, could be made
 * to re-download the whole bundle. The document directory survives relaunches,
 * reboots and app updates, and is cleared only on uninstall.
 *
 * **A flat layout keyed by the content-hashed basename.** Manifest paths are
 * nested (`images/events/promptx.a1b2c3d4.webp`) but the basename already
 * contains a SHA-256 prefix, so it is globally unique. Flattening removes all
 * intermediate-directory handling, and makes "a file with this name exists" a
 * complete integrity check — no re-hashing megabytes on every launch.
 */

const ASSET_DIR = "assets";
const MAX_CONCURRENT = 3;

export interface DownloadOutcome {
  /** Files actually fetched over the network this run. */
  downloaded: number;
  /** Files already present on disk and left untouched. */
  reused: number;
  failed: { path: string; error: string }[];
  /** key -> local `file://` URI, for everything now resolvable offline. */
  localUris: Record<string, string>;
}

export function assetDirectory(): Directory {
  const dir = new Directory(Paths.document, ASSET_DIR);
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

/** Content-hashed basename — see the flat-layout note above. */
function basenameOf(entry: AssetEntry): string {
  const parts = entry.path.split("/");
  return parts[parts.length - 1];
}

function fileFor(entry: AssetEntry): File {
  return new File(assetDirectory(), basenameOf(entry));
}

/**
 * Which manifest entries are already satisfied on disk.
 *
 * Synchronous on purpose: `exists` is a plain property, so startup can decide
 * "is everything here?" without an await, and a warm launch never blocks.
 */
export function scanInstalled(manifest: AssetManifest): Record<string, string> {
  const found: Record<string, string> = {};
  for (const entry of manifest.assets) {
    try {
      const file = fileFor(entry);
      if (file.exists) found[entry.key] = file.uri;
    } catch {
      // A malformed path must not take down the whole scan; treat as missing.
    }
  }
  return found;
}

/** Unique files still to fetch. Several keys can share one file after dedup. */
export function missingFiles(manifest: AssetManifest): AssetEntry[] {
  const seen = new Set<string>();
  const missing: AssetEntry[] = [];

  for (const entry of manifest.assets) {
    // 19 keys resolve to 12 files in the current bundle; without this the
    // shared artwork would be pulled down once per key.
    if (seen.has(entry.path)) continue;
    seen.add(entry.path);

    try {
      if (!fileFor(entry).exists) missing.push(entry);
    } catch {
      missing.push(entry);
    }
  }
  return missing;
}

/** Distinct files in a manifest, after dedup collapses shared artwork. */
function uniqueFileCount(manifest: AssetManifest): number {
  return new Set(manifest.assets.map((entry) => entry.path)).size;
}

export interface DownloadOptions {
  onProgress?: (progress: AssetProgress) => void;
  signal?: AbortSignal;
}

/**
 * Fetch everything the manifest lists that isn't already on disk.
 *
 * Progress is weighted by bytes rather than file count, because the splash video
 * is ~85% of the payload — a file-count bar would sit at 92% for almost the
 * entire download and then finish instantly, which reads as a hang.
 *
 * Failures are collected rather than thrown: one dead URL should not deny the
 * user the other eleven assets, and anything missing still resolves to its CDN
 * URL at render time.
 */
export async function downloadManifest(
  manifest: AssetManifest,
  options: DownloadOptions = {},
): Promise<DownloadOutcome> {
  const { onProgress, signal } = options;

  assetDirectory();

  const queue = missingFiles(manifest);
  const bytesTotal = queue.reduce((sum, entry) => sum + entry.bytes, 0);
  const filesTotal = queue.length;

  const failed: DownloadOutcome["failed"] = [];
  const completedPaths = new Set<string>();

  // Byte accounting has to span concurrent downloads: `settled` is what finished
  // files contributed, `inFlight` is the live partial total of the rest.
  let settledBytes = 0;
  const inFlight = new Map<string, number>();

  const emit = () => {
    if (!onProgress) return;
    let live = 0;
    for (const written of inFlight.values()) live += written;
    const bytesDone = Math.min(settledBytes + live, bytesTotal);
    onProgress({
      fraction: bytesTotal > 0 ? Math.min(bytesDone / bytesTotal, 1) : 1,
      bytesDone,
      bytesTotal,
      filesDone: completedPaths.size + failed.length,
      filesTotal,
    });
  };

  emit();

  let cursor = 0;
  const runWorker = async () => {
    while (cursor < queue.length) {
      if (signal?.aborted) return;

      const entry = queue[cursor++];
      const url = remoteUrlFor(manifest, entry);

      try {
        const task = File.createDownloadTask(url, fileFor(entry), {
          signal,
          onProgress: ({ bytesWritten }) => {
            inFlight.set(entry.path, bytesWritten);
            emit();
          },
        });
        await task.downloadAsync();

        completedPaths.add(entry.path);
        settledBytes += entry.bytes;
      } catch (error: any) {
        if (signal?.aborted) return;
        failed.push({ path: entry.path, error: error?.message ?? String(error) });
        // Charge the budget anyway so a failure can't strand the bar short of
        // 100% and make a finished run look stuck.
        settledBytes += entry.bytes;
      } finally {
        inFlight.delete(entry.path);
        emit();
      }
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(MAX_CONCURRENT, queue.length) }, runWorker),
  );

  // Re-scan rather than trusting the bookkeeping: this is what the registry and
  // the "are we ready?" check are built on, so it should reflect the disk.
  const localUris = scanInstalled(manifest);

  return {
    downloaded: completedPaths.size,
    // Files that were already on disk when this run started — the number that
    // should be everything on a warm launch.
    reused: uniqueFileCount(manifest) - filesTotal,
    failed,
    localUris,
  };
}

/**
 * Delete downloaded files the current manifest no longer references.
 *
 * Content-hashed names mean a re-exported asset arrives as a *new* file and the
 * old one is simply orphaned — nothing overwrites it. Without this, every
 * artwork update leaks its predecessor and the directory grows without bound
 * (observed: three stale badges after a single re-encode). Safe by construction:
 * it only ever removes names absent from the manifest we just installed, inside
 * our own directory.
 */
export function pruneOrphans(manifest: AssetManifest): string[] {
  const keep = new Set(manifest.assets.map(basenameOf));
  const removed: string[] = [];

  try {
    for (const item of assetDirectory().list()) {
      // The layout is deliberately flat, so anything that isn't a file we wrote
      // is left well alone.
      if (item instanceof Directory) continue;
      if (keep.has(item.name)) continue;
      try {
        item.delete();
        removed.push(item.name);
      } catch {
        // A file we can't delete is wasted space, not a failure worth raising.
      }
    }
  } catch {
    // Directory unreadable — nothing to prune.
  }
  return removed;
}

/** Wipe every downloaded asset. Used by a "clear cache" action and by tests. */
export function clearDownloadedAssets(): void {
  const dir = new Directory(Paths.document, ASSET_DIR);
  if (dir.exists) dir.delete();
}

/** Bytes currently occupied on disk by the asset bundle. */
export function installedBytes(manifest: AssetManifest): number {
  let total = 0;
  const seen = new Set<string>();
  for (const entry of manifest.assets) {
    if (seen.has(entry.path)) continue;
    seen.add(entry.path);
    try {
      const file = fileFor(entry);
      if (file.exists) total += file.size ?? 0;
    } catch {
      // Ignore unreadable entries in a size estimate.
    }
  }
  return total;
}
