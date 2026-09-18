import { useSyncExternalStore } from "react";

import {
  getAssetsVersion,
  resolveAsset,
  subscribeToAssets,
  type AssetSource,
} from "@/services/assets";

/**
 * Re-render the caller whenever the asset registry changes.
 *
 * Use this in any component that resolves assets but doesn't otherwise re-render
 * on its own — most importantly anything that can mount *before* `AssetsProvider`
 * has finished priming, and anything holding a list whose items resolve assets
 * inside `renderItem` (a `renderItem` callback can't call hooks, so the screen
 * subscribes on its behalf).
 */
export function useAssetsVersion(): number {
  return useSyncExternalStore(subscribeToAssets, getAssetsVersion, getAssetsVersion);
}

/**
 * Reactive `resolveAsset`: same resolution order (local file -> CDN URL -> null),
 * but the component updates when the answer changes — when the download lands,
 * or when a background top-up swaps in newer artwork.
 */
export function useAssetSource(key: string): AssetSource | null {
  useAssetsVersion();
  return resolveAsset(key);
}
