import { useCallback } from "react";
import { router } from "expo-router";

import { VideoSplashScreen } from "@/features/splash/VideoSplashScreen";

export default function Index() {
  const onDone = useCallback(() => router.replace("/login"), []);
  return <VideoSplashScreen onDone={onDone} />;
}
