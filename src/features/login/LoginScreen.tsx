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
import axios from "axios";
import { useAuth } from "@/features/auth/AuthContext";
import { colors, fonts } from "@/theme/tokens";
import { px } from "@/theme/scale";
import { PixelInput } from "@/components/pixel/PixelInput";
import { PixelCard } from "@/components/pixel/PixelCard";
import { useLoginForm } from "./useLoginForm";
import { API_BASE_URL } from "@/services/api";
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { MinecraftButton } from "@/components/MaterialCraft/MinecraftButton";

WebBrowser.maybeCompleteAuthSession();

GoogleSignin.configure({
  webClientId: "848035972456-uavvadlpdpvaje7vavs1c5h7enna8790.apps.googleusercontent.com",
});

export function LoginScreen() {
  const { login } = useAuth();
  const params = useLocalSearchParams<{ handoffCode?: string }>();
  const form = useLoginForm((role) => {
    login(role);
    router.replace("/(tabs)");
  });

  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (params.handoffCode) {
      axios.post(`${API_BASE_URL}/auth/website-handoff/exchange`, { code: params.handoffCode })
        .then(() => {
          login("participant");
          router.replace("/(tabs)");
        })
        .catch(err => {
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
      const res = await axios.post(`${API_BASE_URL}/auth/signin/google/native`, { idToken });
      
      // 4. Handle response (usually requires OTP verification in our system)
      if (res.data.requiresVerification) {
        form.say("CHECK EMAIL FOR OTP");
        // router.push({ pathname: '/verify', params: { email: res.data.user.email } });
        // Assuming OTP screen is implemented or handled
      } else {
        login("participant");
        router.replace("/(tabs)");
      }
    } catch (err) {
      console.error("Native Google OAuth error", err);
      form.say("GOOGLE SIGN-IN FAILED");
    }
  };

  return (
    <ImageBackground
      source={require("../../../assets/images/minecraft_bg.png")}
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
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: px(16),
    paddingVertical: px(24),
  },
  cardWrapper: {
    width: "100%",
    maxWidth: px(350),
    marginTop: px(80), // Lifted up to show full card over the background
  },
  welcomeSubtitle: {
    fontFamily: fonts.pixelBold,
    fontSize: px(12), // Larger subtitle
    color: colors.gold.bright,
    textAlign: "center",
    marginBottom: px(18),
    letterSpacing: px(1.5),
  },
  formGroup: {
    marginTop: px(6),
  },
  forgotBtn: {
    alignSelf: "flex-end",
    marginTop: px(10),
    marginBottom: px(20),
  },
  forgotText: {
    fontFamily: fonts.pixelBold,
    fontSize: px(11), // Larger, readable link
    color: colors.gold.title,
    textDecorationLine: "underline",
  },
  submitBtn: {
    backgroundColor: colors.cta.lit,
    paddingVertical: px(14), // Taller button
    borderRadius: px(4),
    borderWidth: px(2),
    borderColor: colors.cta.glow,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.cta.deep,
    shadowOffset: { width: 0, height: px(4) },
    shadowOpacity: 0.8,
    shadowRadius: 0,
    elevation: 4,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontFamily: fonts.pixelBold,
    fontSize: px(16), // Large punchy text
    color: colors.cta.ink,
    letterSpacing: px(1.5),
  },
  googleBtn: {
    backgroundColor: colors.google.lit,
    paddingVertical: px(14), // Taller button
    borderRadius: px(4),
    borderWidth: px(1),
    borderColor: colors.google.base,
    alignItems: "center",
    justifyContent: "center",
    marginTop: px(12),
  },
  googleBtnText: {
    fontFamily: fonts.pixelBold,
    fontSize: px(13), // Larger Google button text
    color: colors.google.ink,
    letterSpacing: px(1),
  },
});
