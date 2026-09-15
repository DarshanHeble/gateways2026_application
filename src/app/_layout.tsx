import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PixelifySans_400Regular, PixelifySans_500Medium, PixelifySans_700Bold } from "@expo-google-fonts/pixelify-sans";
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_700Bold,
} from "@expo-google-fonts/space-grotesk";
import { colors } from "@/theme/tokens";
import { MobConvergenceOverlay } from "@/modules/splash";
import { AuthProvider, useAuth } from "@/modules/auth";
import { NotificationsProvider } from "@/modules/notifications";
import { DataProvider } from "@/modules/core/DataProvider";
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
    PixelifySans_400Regular,
    PixelifySans_500Medium,
    PixelifySans_700Bold,
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
  });

  if (!loaded && !error) return null;

  return (
    <PaperProvider theme={minecraftTheme}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <M3ThemeProvider>
          <AuthProvider>
            <NotificationsProvider>
              <DataProvider>
                <RootLayoutNav />
              </DataProvider>
            </NotificationsProvider>
          </AuthProvider>
        </M3ThemeProvider>
      </SafeAreaProvider>
    </PaperProvider>
  );
}
