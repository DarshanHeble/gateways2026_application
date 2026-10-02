import { useCallback, useEffect } from "react";
import { router } from "expo-router";

import { AssetLoadingScreen } from "@/modules/assets";
import { useAuth } from "@/modules/auth";

export default function Index() {
  const { role, isReady } = useAuth();

  const handleDone = useCallback(() => {
    if (isReady && role) {
      router.replace("/(tabs)");
    } else {
      router.replace("/login");
    }
  }, [isReady, role]);

  return <AssetLoadingScreen onDone={handleDone} />;
}
