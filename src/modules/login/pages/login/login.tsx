import React, { useState, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  View,
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
import { useAuth } from "@/modules/auth";
import { px } from "@/theme/scale";
import { resolveAsset } from "@/services/assets";
import { Bevel } from "@/components/pixel/Primitives";
import { DitherFill } from "@/components/pixel/Fills";
import { API_BASE_URL, apiClient } from "@/services/api";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { coverScreen, revealScreen } from "@/modules/splash";

import { GlassInput } from "./components/GlassInput";
import { CreeperFaceIcon, GoogleGIcon } from "./components/PixelIcons";
import { useLoginForm } from "./hooks/useLoginForm";
import { styles } from "./login.styles";

WebBrowser.maybeCompleteAuthSession();

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
    <ImageBackground
      source={resolveAsset("ui/login-bg") ?? undefined}
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

                {/* See handleGoogleSignIn above — kept as a "coming soon" stub
                    until the backend endpoint lands. */}
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
