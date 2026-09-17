import { useCallback } from "react";
import { router } from "expo-router";

import { VideoSplashScreen } from "@/modules/splash";

/**
 * The intro clip, reached from `/` once the asset bundle is settled.
 *
 * This used to live on `/` itself; it moved here so the asset loading page could
 * take the entry slot without nesting two very different screens in one route.
 */
export default function Splash() {
  const onDone = useCallback(() => router.replace("/login"), []);
  return <VideoSplashScreen onDone={onDone} />;
}
