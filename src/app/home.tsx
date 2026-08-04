import { View, Text, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, fonts } from "@/theme/tokens";
import { px } from "@/theme/scale";

/**
 * Placeholder landing so the gate transition has somewhere to arrive.
 * The real home screen is a separate slice of the design.
 */
export default function Home() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <Text style={styles.eyebrow}>YOU ARE THROUGH THE GATE</Text>
      <Text style={styles.title}>GATEWAYS</Text>
      <Text style={styles.year}>2026</Text>
      <Text style={styles.note}>Home screen lands here next.</Text>

      <Pressable
        onPress={() => router.replace("/login")}
        accessibilityRole="button"
        accessibilityLabel="Return to login"
        hitSlop={12}
        style={styles.back}
      >
        <Text style={styles.backLabel}>← BACK TO GATE</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: px(8),
    backgroundColor: colors.stage,
  },
  eyebrow: {
    fontFamily: fonts.pixel,
    fontSize: px(9),
    letterSpacing: px(3),
    color: colors.gold.muted,
  },
  title: {
    fontFamily: fonts.pixelBold,
    fontSize: px(31),
    letterSpacing: px(1),
    color: colors.gold.title,
  },
  year: {
    fontFamily: fonts.pixel,
    fontSize: px(13),
    letterSpacing: px(5),
    color: colors.cyan,
  },
  note: {
    fontFamily: fonts.body,
    fontSize: px(11),
    color: colors.body,
    marginTop: px(6),
  },
  back: { marginTop: px(28) },
  backLabel: {
    fontFamily: fonts.pixel,
    fontSize: px(9),
    letterSpacing: px(1),
    color: colors.link,
  },
});
