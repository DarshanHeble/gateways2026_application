import React from "react";
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
import { router } from "expo-router";
import { useAuth } from "@/features/auth/AuthContext";
import { colors, fonts } from "@/theme/tokens";
import { px } from "@/theme/scale";
import { PixelInput } from "@/components/pixel/PixelInput";
import { PixelCard } from "@/components/pixel/PixelCard";
import { useLoginForm } from "./useLoginForm";

export function LoginScreen() {
  const { login } = useAuth();
  const form = useLoginForm((role) => {
    login(role);
    router.replace("/(tabs)");
  });

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
                    secureTextEntry
                    editable={!form.busy}
                    onSubmitEditing={form.submit}
                  />

                  <TouchableOpacity style={styles.forgotBtn} onPress={() => form.say("RAVEN SENT · CHECK YOUR INBOX")}>
                    <Text style={styles.forgotText}>FORGOT PASSWORD?</Text>
                  </TouchableOpacity>

                  {/* Primary Sign In Button */}
                  <TouchableOpacity
                    style={[styles.submitBtn, form.busy && styles.btnDisabled]}
                    onPress={form.submit}
                    disabled={form.busy}
                  >
                    {form.busy ? (
                      <ActivityIndicator color={colors.cta.ink} />
                    ) : (
                      <Text style={styles.submitBtnText}>ENTER FEST</Text>
                    )}
                  </TouchableOpacity>

                  {/* Google OAuth Button */}
                  <TouchableOpacity
                    style={styles.googleBtn}
                    onPress={() => form.say("GOOGLE SIGN-IN OPENS IN NEXT BUILD")}
                    disabled={form.busy}
                  >
                    <Text style={styles.googleBtnText}>CONTINUE WITH GOOGLE</Text>
                  </TouchableOpacity>
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
