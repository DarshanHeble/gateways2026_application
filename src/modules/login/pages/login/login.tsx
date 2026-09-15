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
import * as Linking from "expo-linking";
import { useAuth } from "@/modules/auth";
import { colors, fonts } from "@/theme/tokens";
import { px } from "@/theme/scale";
import { PixelInput } from "@/components/pixel/PixelInput";
import { PixelCard } from "@/components/pixel/PixelCard";
import { useLoginForm } from "./hooks/useLoginForm";
import { API_BASE_URL, apiClient } from "@/services/api";
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { MinecraftButton } from "@/components/MaterialCraft/MinecraftButton";

WebBrowser.maybeCompleteAuthSession();

import { coverScreen, revealScreen } from "@/modules/splash";
import { styles } from "./login.styles";

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
      source={require("../../../../../assets/images/minecraft_bg.webp")}
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
            {/* Positioned nicely over the vertical background image */}
            <View style={styles.cardWrapper}>
              <PixelCard headerTitle="GATEWAYS 2026" badge="PARALLAX">
                <Text style={styles.welcomeSubtitle}>ENTER THE DIGITAL MIRROR</Text>

                <View style={styles.formGroup}>
                  <PixelInput
                    label="EMAIL ADDRESS"
                    value={form.email}
                    onChangeText={form.setEmail}
                    placeholder="adventurer@christuniversity.in"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!form.busy}
                    onSubmitEditing={() => form.passwordRef.current?.focus()}
                  />

                  <View style={{ height: px(12) }} />

                  <PixelInput
                    ref={form.passwordRef}
                    label="PASSWORD"
                    value={form.password}
                    onChangeText={form.setPassword}
                    placeholder="••••••••••••"
                    secureTextEntry={!showPassword}
                    editable={!form.busy}
                    onSubmitEditing={form.submit}
                    rightAccessory={
                      <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: px(4) }}>
                        <Ionicons name={showPassword ? "eye-off" : "eye"} size={px(20)} color={colors.gold.muted} />
                      </TouchableOpacity>
                    }
                  />

                  <TouchableOpacity style={styles.forgotBtn} onPress={() => form.say("RAVEN SENT · CHECK YOUR INBOX")}>
                    <Text style={styles.forgotText}>FORGOT PASSWORD?</Text>
                  </TouchableOpacity>

                  {/* Primary Sign In Button */}
                  <MinecraftButton
                    mode="contained"
                    onPress={form.submit}
                    disabled={form.busy}
                    loading={form.busy}
                  >
                    ENTER FEST
                  </MinecraftButton>

                  {/* Google OAuth Button */}
                  <MinecraftButton
                    mode="outlined"
                    onPress={handleGoogleSignIn}
                    disabled={form.busy}
                  >
                    CONTINUE WITH GOOGLE
                  </MinecraftButton>
                </View>
              </PixelCard>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
}


