import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Silkscreen_400Regular, Silkscreen_700Bold } from "@expo-google-fonts/silkscreen";
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
} from "@expo-google-fonts/dm-sans";
import { colors } from "@/theme/tokens";
import { MobConvergenceOverlay } from "@/features/splash/MobConvergenceOverlay";
import { AuthProvider, useAuth } from "@/features/auth/AuthContext";
import { NotificationsProvider } from "@/features/notifications/NotificationsContext";
import { M3ThemeProvider } from "@/theme/M3ThemeContext";
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
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.stage },
          animation: "fade",
        }}
      />
      <ConnectionStatus />
      <MobConvergenceOverlay />
    </>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Silkscreen_400Regular,
    Silkscreen_700Bold,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });

  if (!loaded && !error) return null;

  return (
    <PaperProvider theme={minecraftTheme}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <M3ThemeProvider>
          <AuthProvider>
            <NotificationsProvider>
              <RootLayoutNav />
            </NotificationsProvider>
          </AuthProvider>
        </M3ThemeProvider>
      </SafeAreaProvider>
    </PaperProvider>
  );
}
