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
    maxWidth: px(340),
    marginTop: px(120), // Positioned below the main GATEWAYS logo in image
  },
  welcomeSubtitle: {
    fontFamily: fonts.pixel,
    fontSize: px(10),
    color: colors.gold.muted,
    textAlign: "center",
    marginBottom: px(16),
    letterSpacing: px(1),
  },
  formGroup: {
    marginTop: px(4),
  },
  forgotBtn: {
    alignSelf: "flex-end",
    marginTop: px(8),
    marginBottom: px(16),
  },
  forgotText: {
    fontFamily: fonts.pixel,
    fontSize: px(9),
    color: colors.link,
  },
  submitBtn: {
    backgroundColor: colors.cta.lit,
    paddingVertical: px(12),
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
    fontSize: px(14),
    color: colors.cta.ink,
    letterSpacing: px(1),
  },
  googleBtn: {
    backgroundColor: colors.google.lit,
    paddingVertical: px(11),
    borderRadius: px(4),
    borderWidth: px(1),
    borderColor: colors.google.base,
    alignItems: "center",
    justifyContent: "center",
    marginTop: px(10),
  },
  googleBtnText: {
    fontFamily: fonts.pixelBold,
    fontSize: px(11),
    color: colors.google.ink,
    letterSpacing: px(1),
  },
});
