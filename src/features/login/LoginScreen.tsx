import React from "react";
import { View, StyleSheet, ImageBackground, Text, SafeAreaView } from "react-native";
import { colors, fonts } from "@/theme/tokens";
import { px } from "@/theme/scale";

export function LoginScreen() {
  return (
    <ImageBackground
      source={require("../../../assets/images/minecraft_bg.png")}
      style={styles.background}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.overlay}>
          <Text style={styles.placeholderText}>NEW LOGIN SCREEN</Text>
          <Text style={styles.subtitleText}>Ready for your instructions!</Text>
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
  },
});
