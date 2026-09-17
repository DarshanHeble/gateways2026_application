import { useCallback } from "react";
import { router } from "expo-router";

import { AssetLoadingScreen } from "@/modules/assets";

/**
 * Entry route: make sure the downloadable art is on disk, then start the intro.
 *
 * On every launch after the first this settles within a frame or two and renders
 * nothing at all, so the user goes straight through to the splash video.
 */
export default function Index() {
  const onDone = useCallback(() => router.replace("/splash"), []);
  return <AssetLoadingScreen onDone={onDone} />;
}
