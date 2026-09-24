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
import { SCREEN_ANIMATION, SCREEN_ANIMATION_DURATION } from "@/theme/motion";
import { MobConvergenceOverlay } from "@/modules/splash";
import { AuthProvider, useAuth } from "@/modules/auth";
import { AssetsProvider } from "@/modules/assets";
import { NotificationsProvider } from "@/modules/notifications";
import { DataProvider } from "@/modules/core/DataProvider";
import { NetworkProvider } from "@/modules/core/NetworkProvider";
import { BlockThemeProvider } from "@/theme/BlockThemeContext";
import { PaperProvider } from 'react-native-paper';
import { minecraftTheme } from '@/theme/minecraftTheme';
import { ServerStatus } from '@/components/ServerStatus';

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
          // See @/theme/motion: a horizontal push is an iOS idiom with no
          // counterpart in game. A Minecraft screen is swapped, not slid.
          animation: SCREEN_ANIMATION,
          animationDuration: SCREEN_ANIMATION_DURATION,
        }}
      />
      {/* One status surface for the whole app. See ServerStatus. */}
      <ServerStatus />
      <MobConvergenceOverlay />
    </>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    /*
     * The actual Minecraft UI typeface, as a faithful OFL-1.1 recreation
     * (IdreesInc/minecraft-font). It contains no Mojang assets — it is a vector
     * redraw of the bitmap font's letterforms, with the original's kerning and
     * weight. Pixelify Sans, which the app used before, is a generic pixel face
     * and reads as "retro game" rather than as this game; side by side the
     * difference is immediate.
     *
     * The licence ships beside the files in assets/fonts/.
     */
    Minecraft: require("../../assets/fonts/Minecraft.otf"),
    MinecraftBold: require("../../assets/fonts/Minecraft-Bold.otf"),
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
        <BlockThemeProvider>
          <NetworkProvider>
            {/*
              Above the router so `resolveAsset` is primed before any screen
              renders, and outside AuthProvider because artwork has nothing to do
              with who is signed in.
            */}
            <AssetsProvider>
              <AuthProvider>
                <NotificationsProvider>
                  <DataProvider>
                    <RootLayoutNav />
                  </DataProvider>
                </NotificationsProvider>
              </AuthProvider>
            </AssetsProvider>
          </NetworkProvider>
        </BlockThemeProvider>
      </SafeAreaProvider>
    </PaperProvider>
  );
}
