import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Silkscreen_400Regular, Silkscreen_700Bold } from "@expo-google-fonts/silkscreen";
import {
  Rubik_400Regular,
  Rubik_500Medium,
  Rubik_600SemiBold,
  Rubik_700Bold,
} from "@expo-google-fonts/rubik";

import { colors } from "@/theme/tokens";
import { ChunkTransitionOverlay } from "@/features/splash/ChunkTransitionOverlay";
import { AuthProvider } from "@/features/auth/AuthContext";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Silkscreen_400Regular,
    Silkscreen_700Bold,
    Rubik_400Regular,
    Rubik_500Medium,
    Rubik_600SemiBold,
    Rubik_700Bold,
  });

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  // Hold the splash rather than flash an unstyled frame — the login screen
  // leans entirely on Silkscreen, so an early paint would look broken.
  if (!loaded && !error) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AuthProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.stage },
            animation: "fade",
          }}
        />
        <ChunkTransitionOverlay />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
