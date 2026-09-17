import { StyleSheet } from "react-native";

import { colors, fonts } from "@/theme/tokens";
import { px } from "@/theme/scale";

export const CHUNKS = 20;

export const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.stage,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: px(28),
  },

  wordmark: {
    fontFamily: fonts.pixelBold,
    fontSize: px(26),
    letterSpacing: px(1),
    color: colors.gold.title,
    textAlign: "center",
  },
  year: {
    fontFamily: fonts.pixel,
    fontSize: px(12),
    letterSpacing: px(5),
    color: colors.cyan,
    marginTop: px(4),
    textAlign: "center",
  },

  headline: {
    fontFamily: fonts.pixelBold,
    fontSize: px(12),
    letterSpacing: px(2),
    color: colors.gold.bright,
    marginTop: px(40),
    textAlign: "center",
  },
  subline: {
    fontFamily: fonts.body,
    fontSize: px(12),
    color: colors.gold.label,
    marginTop: px(8),
    textAlign: "center",
    lineHeight: px(18),
  },

  // ── Chunky segmented bar: discrete blocks rather than a smooth fill, which
  // reads as Minecraft and also makes slow progress visibly *move* one block at
  // a time instead of creeping imperceptibly.
  barFrame: {
    flexDirection: "row",
    marginTop: px(26),
    padding: px(3),
    borderWidth: px(2),
    borderColor: colors.dirt.light,
    backgroundColor: colors.dirt.shadow,
    gap: px(2),
    alignSelf: "stretch",
  },
  chunk: {
    flex: 1,
    height: px(18),
  },
  chunkEmpty: {
    backgroundColor: "#1c2230",
  },
  chunkFilled: {
    backgroundColor: colors.cta.lit,
  },
  chunkFailed: {
    backgroundColor: colors.rule,
  },

  readout: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignSelf: "stretch",
    marginTop: px(10),
  },
  percent: {
    fontFamily: fonts.pixelBold,
    fontSize: px(13),
    color: colors.gold.text,
  },
  bytes: {
    fontFamily: fonts.body,
    fontSize: px(12),
    color: colors.gold.label,
  },

  actions: {
    flexDirection: "row",
    gap: px(12),
    marginTop: px(34),
  },
  button: {
    paddingVertical: px(11),
    paddingHorizontal: px(22),
    borderWidth: px(2),
    borderColor: colors.gold.muted,
    backgroundColor: colors.dirt.mid,
  },
  buttonPressed: {
    backgroundColor: colors.dirt.light,
  },
  buttonPrimary: {
    borderColor: colors.cta.glow,
    backgroundColor: colors.cta.base,
  },
  buttonText: {
    fontFamily: fonts.pixelBold,
    fontSize: px(12),
    letterSpacing: px(1.5),
    color: colors.gold.title,
  },
  buttonTextPrimary: {
    color: colors.gold.text,
  },

  note: {
    fontFamily: fonts.body,
    fontSize: px(11),
    color: colors.gold.label,
    marginTop: px(22),
    textAlign: "center",
    lineHeight: px(16),
  },
  noteWarn: {
    color: colors.rule,
  },
});
