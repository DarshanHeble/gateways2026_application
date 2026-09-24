import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { colors, fonts } from "@/theme/tokens";
import { px } from "@/theme/scale";

interface PixelCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  headerTitle?: string;
  badge?: string;
}

import { useBlockTheme } from "@/theme/BlockThemeContext";
export function PixelCard({ children, style, headerTitle, badge }: PixelCardProps) {
  const { theme } = useBlockTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }, style]}>
      {/* Top Pixel Border Frame */}
      <View style={[styles.topCap, { backgroundColor: theme.primary }]} />
      <View style={styles.contentContainer}>
        {(headerTitle || badge) && (
          <View style={[styles.headerRow, { borderBottomColor: theme.border }]}>
            {headerTitle ? <Text style={[styles.headerTitle, { color: theme.text }]}>{headerTitle}</Text> : <View />}
            {badge ? (
              <View style={[styles.badgeContainer, { backgroundColor: theme.primaryContainer, borderColor: theme.primary }]}>
                <Text style={[styles.badgeText, { color: theme.primary }]}>{badge}</Text>
              </View>
            ) : null}
          </View>
        )}
        {children}
      </View>
      {/* Bottom Pixel Border Frame */}
      <View style={[styles.bottomCap, { backgroundColor: theme.surfaceTint }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.dirt.mid,
    borderWidth: px(2),
    borderColor: colors.gold.muted,
    borderRadius: 0,
    marginVertical: px(8),
    overflow: "hidden",
  },
  topCap: {
    height: px(4),
    backgroundColor: colors.gold.label,
  },
  bottomCap: {
    height: px(4),
    backgroundColor: colors.dirt.shadow,
  },
  contentContainer: {
    padding: px(12),
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: px(8),
    borderBottomWidth: px(1),
    borderBottomColor: colors.dirt.light,
    paddingBottom: px(6),
  },
  headerTitle: {
    fontFamily: fonts.pixelBold,
    fontSize: px(14),
    color: colors.gold.title,
  },
  badgeContainer: {
    backgroundColor: colors.cta.base,
    paddingHorizontal: px(6),
    paddingVertical: px(2),
    borderRadius: 0,
    borderWidth: px(1),
    borderColor: colors.cta.glow,
  },
  badgeText: {
    fontFamily: fonts.pixel,
    fontSize: px(9),
    color: colors.gold.text,
    textTransform: "uppercase",
  },
});
