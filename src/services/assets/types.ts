/**
 * Shapes shared by the CDN asset pipeline.
 *
 * The manifest is produced by `scripts/build-assets.py` and published to the
 * asset repo; see that script's header for why filenames carry a content hash.
 */

/** One logical asset. `key` is stable across artwork changes; `path` is not. */
export interface AssetEntry {
  /** What the app asks for, e.g. `event/promptx` or `video/splash`. */
  key: string;
  /** Bundle-relative path, content-hashed: `images/events/promptx.a1b2c3d4.webp`. */
  path: string;
  bytes: number;
  sha256: string;
}

export interface AssetManifest {
  version: number;
  generatedAt: string;
  /** Absolute CDN prefix that `path` is joined onto. */
  baseUrl: string;
  assets: AssetEntry[];
}

/** Accepted directly by expo-image's `source` and expo-video's `VideoSource`. */
export type AssetSource = { uri: string };

export type AssetStatus =
  /** Deciding what, if anything, needs fetching. Nothing is painted yet. */
  | "checking"
  /** Every asset in the manifest is on disk. The steady state after first run. */
  | "ready"
  | "downloading"
  /** Manifest or downloads failed; the app still runs, art streams or falls back. */
  | "failed"
  /** User pressed SKIP. Same consequences as `failed`, but deliberate. */
  | "skipped";

export interface AssetProgress {
  /** 0–1 across the whole download set, weighted by bytes rather than file count. */
  fraction: number;
  bytesDone: number;
  bytesTotal: number;
  filesDone: number;
  filesTotal: number;
}

export const EMPTY_PROGRESS: AssetProgress = {
  fraction: 0,
  bytesDone: 0,
  bytesTotal: 0,
  filesDone: 0,
  filesTotal: 0,
};
