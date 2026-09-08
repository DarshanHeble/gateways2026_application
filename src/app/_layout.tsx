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
import { MobConvergenceOverlay } from "@/features/splash/MobConvergenceOverlay";
import { AuthProvider, useAuth } from "@/features/auth/AuthContext";
import { NotificationsProvider } from "@/features/notifications/NotificationsContext";
import { PaperProvider } from 'react-native-paper';
import { minecraftTheme } from '@/theme/minecraftTheme';
import { ConnectionStatus } from '@/components/ConnectionStatus';

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { isReady } = useAuth();

  useEffect(() => {
    if (isReady) {
      SplashScreen.hideAsync();
    }
  }, [isReady]);

  if (!isReady) return null;

  return (
    <NotificationsProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.stage },
          animation: "fade",
        }}
      />
      <ConnectionStatus />
      <MobConvergenceOverlay />
    </NotificationsProvider>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Silkscreen_400Regular,
    Silkscreen_700Bold,
    Rubik_400Regular,
    Rubik_500Medium,
    Rubik_600SemiBold,
    Rubik_700Bold,
  });

  if (!loaded && !error) return null;

  return (
    <PaperProvider theme={minecraftTheme}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <AuthProvider>
          <RootLayoutNav />
        </AuthProvider>
      </SafeAreaProvider>
    </PaperProvider>
  );
}
