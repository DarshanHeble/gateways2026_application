import { StyleSheet } from "react-native";
import { colors, fonts } from "@/theme/tokens";
import { px, pxFont } from "@/theme/scale";

export const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.stage },
  mute: { position: "absolute", zIndex: 10 },
  skip: { position: "absolute", zIndex: 10 },
  chip: {
    paddingVertical: px(8),
    paddingHorizontal: px(12),
    backgroundColor: "rgba(10,16,26,0.72)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.2)",
  },
  chipText: {
    fontFamily: fonts.pixel,
    fontSize: pxFont(9), lineHeight: Math.round(pxFont(9) * 1.25),
    letterSpacing: px(1),
    color: colors.gold.text,
  },
});
