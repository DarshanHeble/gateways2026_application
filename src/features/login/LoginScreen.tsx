import React, { useState, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  View,
  StyleSheet,
  ImageBackground,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useAuth } from "@/features/auth/AuthContext";
import { fonts } from "@/theme/tokens";
import { px, SCREEN_HEIGHT } from "@/theme/scale";
import { Bevel } from "@/components/pixel/Primitives";
import { DitherFill } from "@/components/pixel/Fills";
import { GlassInput } from "./GlassInput";
import { CreeperFaceIcon, GoogleGIcon } from "./PixelIcons";
import { useLoginForm } from "./useLoginForm";
import { API_BASE_URL, apiClient } from "@/services/api";
import { GoogleSignin } from '@react-native-google-signin/google-signin';

WebBrowser.maybeCompleteAuthSession();

import { coverScreen, revealScreen } from "@/features/splash/chunkTransition";

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
});

export function LoginScreen() {
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

  const handleGoogleSignIn = async () => {
    try {
      // 1. Check play services
      await GoogleSignin.hasPlayServices();
      // 2. Sign in and get idToken
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.data?.idToken;

      if (!idToken) throw new Error("No idToken received");

      // 3. Send idToken to our custom backend
      const res = await apiClient<{ requiresVerification?: boolean; user?: { email: string } }>(
        `${API_BASE_URL}/auth/signin/google/native`,
        {
          method: "POST",
          body: JSON.stringify({ idToken }),
        }
      );

      // 4. Handle response (usually requires OTP verification in our system)
      if (res.data.requiresVerification) {
        form.say("CHECK EMAIL FOR OTP");
        // router.push({ pathname: '/verify', params: { email: res.data.user.email } });
        // Assuming OTP screen is implemented or handled
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
    <ImageBackground
      source={require("../../../assets/images/login-parallax-bg.webp")}
      style={styles.background}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardAvoid}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Positioned over the empty band the background reserves between the
                #PARALLEX title and the campus scene below — a plain light
                glass card this time, matching this brighter daytime poster. */}
            <View style={styles.cardWrapper}>
                  <View style={styles.card}>
                    <GlassInput
                      icon="mail-outline"
                      value={form.email}
                      onChangeText={form.setEmail}
                      placeholder="College Email"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!form.busy}
                      returnKeyType="next"
                      onSubmitEditing={() => form.passwordRef.current?.focus()}
                    />

                    <GlassInput
                      ref={form.passwordRef}
                      icon="lock-closed-outline"
                      value={form.password}
                      onChangeText={form.setPassword}
                      placeholder="Password"
                      secureTextEntry={!showPassword}
                      editable={!form.busy}
                      returnKeyType="done"
                      onSubmitEditing={form.submit}
                      rightAccessory={
                        <TouchableOpacity onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
                          <Ionicons
                            name={showPassword ? "eye-off-outline" : "eye-outline"}
                            size={px(15)}
                            color="#8d93ab"
                          />
                        </TouchableOpacity>
                      }
                    />

                    {/* Primary Sign In — a grass-block-textured Minecraft button:
                        dither noise for the grainy grass look, a light top/left
                        bevel and dark bottom/right one for the chunky 3D-pixel edge. */}
                    <TouchableOpacity
                      style={[styles.signInBtn, form.busy && styles.btnDisabled]}
                      onPress={form.submit}
                      disabled={form.busy}
                      activeOpacity={0.85}
                    >
                      <DitherFill style={styles.signInDither} light={0.14} dark={0.16} size={3} />
                      <Bevel
                        top={{ color: "rgba(255,255,255,0.4)", size: 3 }}
                        left={{ color: "rgba(255,255,255,0.25)", size: 3 }}
                        bottom={{ color: "rgba(6,40,20,0.55)", size: 4 }}
                        right={{ color: "rgba(6,40,20,0.4)", size: 4 }}
                      />
                      <CreeperFaceIcon size={17} />
                      {form.busy ? (
                        <ActivityIndicator color="#ffffff" style={styles.signInText} />
                      ) : (
                        <Text style={styles.signInText}>SIGN IN</Text>
                      )}
                      <Ionicons name="arrow-forward" size={px(15)} color="#ffffff" />
                    </TouchableOpacity>

                    <View style={styles.dividerRow}>
                      <View style={styles.dividerLine} />
                      <Text style={styles.dividerText}>OR</Text>
                      <View style={styles.dividerLine} />
                    </View>

                    {/* Google OAuth is wired up (handleGoogleSignIn) but the backend
                        doesn't have POST /auth/signin/google/native yet — show
                        "coming soon" instead of actually attempting it for now.
                        Swap the onPress back to handleGoogleSignIn once that
                        endpoint exists; nothing else here needs to change. */}
                    <TouchableOpacity
                      style={[styles.googleBtn, form.busy && styles.btnDisabled]}
                      onPress={() => form.say("GOOGLE SIGN-IN — COMING SOON")}
                      disabled={form.busy}
                      activeOpacity={0.85}
                    >
                      <GoogleGIcon size={15} />
                      <Text style={styles.googleText}>Continue with Google</Text>
                    </TouchableOpacity>

                    {form.toast ? (
                      <View style={styles.toast}>
                        <Text style={styles.toastText}>{form.toast}</Text>
                      </View>
                    ) : null}
                  </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  safeArea: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: px(24),
    paddingBottom: px(32),
  },
  cardWrapper: {
    width: "100%",
    maxWidth: px(252),
    alignItems: "center",
    // Clears the "GATEWAYS 2026 / #PARALLEX" title that's baked into the
    // background art, landing the card in the empty sky gap above the
    // campus scene below — proportional to screen height so it tracks the
    // same spot on the source poster across device sizes.
    marginTop: SCREEN_HEIGHT * 0.335,
  },
  // Light frosted-glass card — this background is a bright daytime shot, so
  // (unlike the dark stone-framed version built for an earlier night-time
  // background) a light, minimal panel reads correctly against it instead of
  // fighting the sky for contrast. Toned down from a near-white first pass
  // to a deeper, warmer stone-cream so it doesn't glow against the sky —
  // then pulled back toward white on request, keeping just enough warmth
  // to read as glass rather than a flat white card.
  card: {
    width: "100%",
    backgroundColor: "rgba(242,240,232,0.90)",
    borderRadius: px(16),
    borderWidth: px(1.5),
    borderColor: "rgba(255,255,255,0.75)",
    paddingHorizontal: px(13),
    paddingVertical: px(14),
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: px(10) },
    shadowOpacity: 0.3,
    shadowRadius: px(20),
    elevation: 12,
  },
  signInBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: px(6),
    backgroundColor: "#4caf50",
    borderRadius: px(9),
    height: px(40),
    paddingHorizontal: px(12),
    marginTop: px(2),
    overflow: "hidden",
    shadowColor: "#0b3d1f",
    shadowOffset: { width: 0, height: px(3) },
    shadowOpacity: 0.35,
    shadowRadius: px(5),
    elevation: 4,
  },
  signInDither: {
    borderRadius: px(9),
  },
  btnDisabled: {
    opacity: 0.6,
  },
  signInText: {
    flex: 1,
    textAlign: "center",
    fontFamily: fonts.bodyBold,
    fontSize: px(12.5),
    color: "#ffffff",
    letterSpacing: px(0.8),
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: px(10),
  },
  dividerLine: {
    flex: 1,
    height: px(1),
    backgroundColor: "rgba(60,55,40,0.18)",
  },
  dividerText: {
    marginHorizontal: px(8),
    fontFamily: fonts.bodyMedium,
    fontSize: px(9.5),
    letterSpacing: px(1),
    color: "#6b6a63",
  },
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: px(6),
    backgroundColor: "#ffffff",
    borderRadius: px(9),
    height: px(40),
    borderWidth: px(1),
    borderColor: "rgba(0,0,0,0.08)",
  },
  googleText: {
    fontFamily: fonts.bodySemi,
    fontSize: px(12),
    color: "#1f1f1f",
  },
  toast: {
    marginTop: px(16),
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: px(10),
    paddingVertical: px(8),
    paddingHorizontal: px(14),
  },
  toastText: {
    fontFamily: fonts.bodyMedium,
    fontSize: px(12),
    color: "#ffe9b8",
    textAlign: "center",
  },
});
