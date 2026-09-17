/**
 * Runtime asset pipeline: CDN manifest -> local download -> synchronous lookup.
 *
 * Consumers only ever need `resolveAsset(key)`. Everything else here is used by
 * `AssetsProvider` in `@/modules/assets` to populate that lookup.
 */

export {
  BUNDLED_MANIFEST,
  MANIFEST_URL,
  fetchRemoteManifest,
  isValidManifest,
  loadLocalManifest,
  readCachedManifest,
  writeCachedManifest,
} from "./manifest";

export {
  assetDirectory,
  clearDownloadedAssets,
  downloadManifest,
  installedBytes,
  missingFiles,
  scanInstalled,
  type DownloadOptions,
  type DownloadOutcome,
} from "./downloader";

export {
  isLocal,
  markLocal,
  primeLocal,
  primeRemote,
  remoteUrlFor,
  resetRegistry,
  resolveAsset,
  resolveAssetUri,
} from "./registry";

export {
  EMPTY_PROGRESS,
  type AssetEntry,
  type AssetManifest,
  type AssetProgress,
  type AssetSource,
  type AssetStatus,
} from "./types";
