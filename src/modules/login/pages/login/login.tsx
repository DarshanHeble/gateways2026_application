import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Pressable,
  StatusBar,
  StyleSheet,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useAuth } from "@/modules/auth";
import { px, SCREEN_HEIGHT } from "@/theme/scale";
import { Image } from "expo-image";
import Animated, { FadeInDown } from "react-native-reanimated";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { useAssetSource } from "@/modules/assets";
import { API_BASE_URL, apiClient } from "@/services/api";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { coverScreen, revealScreen } from "@/modules/splash";

import { GlassInput } from "./components/GlassInput";
import { CreeperFaceIcon, GoogleGIcon } from "./components/PixelIcons";
import { useLoginForm } from "./hooks/useLoginForm";
import { styles } from "./login.styles";
import { McGlyph, PixelIcon } from "@/components/mc/PixelIcon";
import { useBlockTheme } from "@/theme/BlockThemeContext";
import { mcTextShadow } from "@/theme/minecraft";

WebBrowser.maybeCompleteAuthSession();

/**
 * Google Sign-In is configured only where it can actually succeed.
 *
 * On iOS the native `configure()` rejects unless a `GoogleService-Info.plist` is
 * bundled or an `iosClientId` is supplied, and this project has neither. The
 * rejection is raised on a promise the library never returns to us, so it cannot
 * be caught at the call site — it surfaced as a full-screen redbox on *every*
 * iOS launch, for a provider whose button is still a "coming soon" stub (see
 * `handleGoogleSignIn` below). Skipping the call is the only way to avoid it.
 *
 * Set `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` (or add the plist) and iOS configures
 * itself normally.
 */
const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
if (Platform.OS !== "ios" || googleIosClientId) {
  GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: googleIosClientId,
  });
} else if (__DEV__) {
  console.warn(
    "[auth] Google Sign-In not configured on iOS: set EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID.",
  );
}

export function LoginScreen() {
  const loginBackground = useAssetSource("ui/login-bg");
  const { theme, isDark } = useBlockTheme();
  const HERO_H = Math.round(SCREEN_HEIGHT * 0.58);
  // With the keyboard up the form doesn't fit under the art, so focusing a
  // field scrolls the form's heading to the top — both fields and the button
  // stay visible above the keyboard instead of the password hiding under it.
  const scrollRef = useRef<ScrollView>(null);
  const formTop = HERO_H * 0.72;
  const insets = useSafeAreaInsets();
  const liftForm = () =>
    setTimeout(() => scrollRef.current?.scrollTo({ y: Math.max(0, formTop - insets.top - px(8)), animated: true }), 60);
  const { login, role, isReady } = useAuth();
  const params = useLocalSearchParams<{ handoffCode?: string }>();
  const form = useLoginForm((newRole) => {
    coverScreen(() => {
      login(newRole);
      router.replace("/(tabs)");
      setTimeout(revealScreen, 300);
    });
  });

  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isReady && role) {
      router.replace("/(tabs)");
    }
  }, [isReady, role]);

  useEffect(() => {
    if (params.handoffCode) {
      apiClient(`${API_BASE_URL}/auth/website-handoff/exchange`, {
        method: "POST",
        body: JSON.stringify({ code: params.handoffCode }),
      })
        .then(() => {
          coverScreen(() => {
            login("participant");
            router.replace("/(tabs)");
            setTimeout(revealScreen, 300);
          });
        })
        .catch((err) => {
          console.error("Exchange error", err);
          form.say("GOOGLE SIGN-IN FAILED");
        });
    }
  }, [params.handoffCode, login, form]);

  // Wired up and ready, but the backend has no POST /auth/signin/google/native
  // yet, so the button below deliberately doesn't call this. Swap the onPress
  // back to `handleGoogleSignIn` once that endpoint exists.
  const handleGoogleSignIn = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.data?.idToken;

      if (!idToken) throw new Error("No idToken received");

      const res = await apiClient<{ requiresVerification?: boolean; user?: { email: string } }>(
        `${API_BASE_URL}/auth/signin/google/native`,
        {
          method: "POST",
          body: JSON.stringify({ idToken }),
        }
      );

      if (res.data.requiresVerification) {
        form.say("CHECK EMAIL FOR OTP");
      } else {
        coverScreen(() => {
          login("participant");
          router.replace("/(tabs)");
          setTimeout(revealScreen, 300);
        });
      }
    } catch (err) {
      console.error("Native Google OAuth error", err);
      form.say("GOOGLE SIGN-IN FAILED");
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardAvoid}>
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* ── Key art, fading into the page — the same hero as Home ─────────── */}
            <View style={[styles.hero, { height: HERO_H }]} pointerEvents="none">
              {loginBackground ? (
                // expo-image: while the asset downloads it resolves to a CDN URL,
                // and only expo-image fetches (and caches) a remote source here.
                <Image source={loginBackground} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition="top" transition={250} />
              ) : null}
              <Svg style={StyleSheet.absoluteFill} width="100%" height={HERO_H}>
                <Defs>
                  <LinearGradient id="loginFade" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor={theme.background} stopOpacity={0.15} />
                    <Stop offset="55%" stopColor={theme.background} stopOpacity={0} />
                    <Stop offset="82%" stopColor={theme.background} stopOpacity={0.88} />
                    <Stop offset="96%" stopColor={theme.background} stopOpacity={1} />
                    <Stop offset="100%" stopColor={theme.background} stopOpacity={1} />
                  </LinearGradient>
                </Defs>
                <Rect width="100%" height={HERO_H} fill="url(#loginFade)" />
              </Svg>
            </View>

            {/* The form rises into the art's faded foot; the art scrolls with it,
                so text never lands on the logo. */}
            <Animated.View entering={FadeInDown.duration(480)} style={[styles.form, { marginTop: formTop - HERO_H }]}>
              <Text style={[styles.eyebrow, { color: theme.primary }]}>PLAYER LOGIN</Text>
              <Text style={[styles.title, { color: theme.text }, mcTextShadow(theme.text, 30)]}>Enter the realm</Text>
              <Text style={[styles.sub, { color: theme.textDim }]}>
                Sign in with the college email you registered for Gateways with.
              </Text>

              {form.toast ? (
                <View style={[styles.toast, { borderColor: theme.primary, backgroundColor: theme.primaryContainer }]}>
                  <McGlyph name="bellOff" size={px(13)} color={theme.primary} />
                  <Text style={[styles.toastText, { color: theme.text }]}>{form.toast}</Text>
                </View>
              ) : null}

              <Text style={[styles.label, { color: theme.textDim }]}>COLLEGE EMAIL</Text>
              <GlassInput
                icon="mail"
                value={form.email}
                onChangeText={form.setEmail}
                placeholder="you@college.edu"
                onFocus={liftForm}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="emailAddress"
                autoComplete="email"
                editable={!form.busy}
                returnKeyType="next"
                onSubmitEditing={() => form.passwordRef.current?.focus()}
              />

              <Text style={[styles.label, { color: theme.textDim }]}>PASSWORD</Text>
              <GlassInput
                ref={form.passwordRef}
                icon="lock"
                value={form.password}
                onChangeText={form.setPassword}
                placeholder="Your password"
                onFocus={liftForm}
                secureTextEntry={!showPassword}
                textContentType="password"
                autoComplete="password"
                editable={!form.busy}
                returnKeyType="done"
                onSubmitEditing={form.submit}
                rightAccessory={
                  <TouchableOpacity
                    onPress={() => setShowPassword((v) => !v)}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                  >
                    <McGlyph name={showPassword ? "eyeOff" : "eye"} size={px(16)} color={theme.textDim} />
                  </TouchableOpacity>
                }
              />

              {/* The game's own button, as on Home: black outline, lit bevel,
                  a lip it sinks into when pressed. */}
              <Pressable
                onPress={form.submit}
                disabled={form.busy}
                accessibilityRole="button"
                accessibilityLabel="Sign in"
                style={({ pressed }) => [styles.cta, form.busy && styles.btnDisabled, { marginTop: pressed ? px(22) : px(18) }]}
              >
                {({ pressed }) => (
                  <>
                    <View style={[styles.ctaFace, pressed && styles.ctaFacePressed]}>
                      <CreeperFaceIcon size={18} />
                      {form.busy ? (
                        <ActivityIndicator color="#ffffff" style={styles.signInSpinner} />
                      ) : (
                        <Text style={[styles.ctaLabel, mcTextShadow("#ffffff", 15)]}>SIGN IN</Text>
                      )}
                      <McGlyph name="arrowRight" size={px(14)} color="#ffffff" />
                    </View>
                    {pressed ? null : <View style={styles.ctaLip} />}
                  </>
                )}
              </Pressable>

              <View style={styles.dividerRow}>
                <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
                <Text style={[styles.dividerText, { color: theme.textDim }]}>OR</Text>
                <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
              </View>

              {/* See handleGoogleSignIn above — kept as a "coming soon" stub
                  until the backend endpoint lands. */}
              <TouchableOpacity
                style={[
                  styles.googleBtn,
                  { backgroundColor: theme.surfaceElevated, borderColor: theme.border },
                  form.busy && styles.btnDisabled,
                ]}
                onPress={() => form.say("GOOGLE SIGN-IN — COMING SOON")}
                disabled={form.busy}
                activeOpacity={0.8}
              >
                <GoogleGIcon size={16} />
                <Text style={[styles.googleText, { color: theme.text }]}>Continue with Google</Text>
              </TouchableOpacity>

              <View style={styles.footer}>
                <PixelIcon name="home" size={px(13)} />
                <Text style={[styles.footerText, { color: theme.textDim }]}>Gateways 2026 · Christ University</Text>
              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
