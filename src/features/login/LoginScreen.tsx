import React from "react";
import { View, StyleSheet, ImageBackground, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAuth } from "@/features/auth/AuthContext";
import { colors, fonts } from "@/theme/tokens";
import { px } from "@/theme/scale";

export function LoginScreen() {
  const { login } = useAuth();

  const handleEnter = () => {
    login("participant");
    router.replace("/(tabs)");
  };

  return (
    <ImageBackground
      source={require("../../../assets/images/minecraft_bg.png")}
      style={styles.background}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.overlay}>
          <Text style={styles.placeholderText}>GATEWAYS 2026</Text>
          <Text style={styles.subtitleText}>Explore Fest Events & Timeline</Text>
          <TouchableOpacity style={styles.enterButton} onPress={handleEnter}>
            <Text style={styles.enterButtonText}>ENTER FEST</Text>
          </TouchableOpacity>
        </View>
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
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  overlay: {
    backgroundColor: "rgba(13, 16, 24, 0.75)",
    paddingVertical: px(20),
    paddingHorizontal: px(24),
    borderRadius: px(8),
    borderWidth: px(2),
    borderColor: colors.gold.bright,
    alignItems: "center",
  },
  placeholderText: {
    fontFamily: fonts.pixelBold,
    fontSize: px(18),
    color: colors.gold.title,
    marginBottom: px(8),
  },
  subtitleText: {
    fontFamily: fonts.body,
    fontSize: px(14),
    color: colors.body,
    marginBottom: px(16),
  },
  enterButton: {
    backgroundColor: colors.cta.base,
    paddingVertical: px(10),
    paddingHorizontal: px(24),
    borderRadius: px(4),
    borderWidth: px(1),
    borderColor: colors.cta.glow,
  },
  enterButtonText: {
    fontFamily: fonts.pixelBold,
    fontSize: px(14),
    color: colors.gold.text,
  },
});
