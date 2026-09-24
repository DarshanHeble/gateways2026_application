import { StyleSheet } from "react-native";

import { colors, fonts, typography } from "@/theme/tokens";
import { px } from "@/theme/scale";
import { mojang } from "@/theme/minecraft";

export const CHUNKS = 20;

export const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: mojang.offBlack,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: px(28),
  },

  /** Display type at Mojang's metrics: large, tight, interlocking. */
  wordmark: {
    fontFamily: typography.hero.fontFamily,
    fontSize: px(44),
    lineHeight: px(37),
    letterSpacing: -1.4,
    color: mojang.offWhite,
    textAlign: "center",
  },
  year: {
    fontFamily: typography.hero.fontFamily,
    fontSize: px(44),
    lineHeight: px(40),
    letterSpacing: -1.4,
    color: mojang.goldDeep,
    textAlign: "center",
  },

  headline: {
    fontFamily: typography.eyebrow.fontFamily,
    fontSize: px(typography.eyebrow.fontSize),
    letterSpacing: typography.eyebrow.letterSpacing,
    color: mojang.green3,
    marginTop: px(44),
    textAlign: "center",
  },
  subline: {
    fontFamily: fonts.body,
    fontSize: px(14),
    color: mojang.greySoft,
    marginTop: px(8),
    textAlign: "center",
    lineHeight: px(20),
  },

  // ── Chunky segmented bar: discrete blocks rather than a smooth fill, which
  // reads as Minecraft and also makes slow progress visibly *move* one block at
  // a time instead of creeping imperceptibly.
  barFrame: {
    flexDirection: "row",
    marginTop: px(30),
    padding: px(3),
    borderWidth: px(1),
    borderColor: "#000000",
    backgroundColor: "#141313",
    gap: px(2),
    alignSelf: "stretch",
  },
  chunk: {
    flex: 1,
    height: px(16),
  },
  chunkEmpty: {
    backgroundColor: mojang.surfaceMid,
  },
  /** The brand ramp, so progress reads as Minecraft green rather than as a
      generic success colour. */
  chunkFilled: {
    backgroundColor: mojang.green3,
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
    fontFamily: typography.eyebrow.fontFamily,
    fontSize: px(typography.eyebrow.fontSize),
    letterSpacing: typography.eyebrow.letterSpacing,
    color: mojang.offWhite,
  },
  bytes: {
    fontFamily: fonts.bodyMedium,
    fontSize: px(13),
    color: mojang.greySoft,
  },

  actions: {
    flexDirection: "row",
    gap: px(12),
    marginTop: px(34),
  },
  button: {
    paddingVertical: px(12),
    paddingHorizontal: px(26),
    borderWidth: px(1),
    borderColor: "#000000",
    backgroundColor: mojang.surfaceSoft,
  },
  buttonPressed: {
    backgroundColor: mojang.canvas,
  },
  buttonPrimary: {
    borderColor: colors.cta.glow,
    backgroundColor: colors.cta.base,
  },
  buttonText: {
    fontFamily: typography.kicker.fontFamily,
    fontSize: px(typography.kicker.fontSize),
    letterSpacing: typography.kicker.letterSpacing,
    color: mojang.greyWarm,
  },
  buttonTextPrimary: {
    color: colors.gold.text,
  },

  note: {
    fontFamily: fonts.body,
    fontSize: px(13),
    color: mojang.greySoft,
    marginTop: px(22),
    textAlign: "center",
    lineHeight: px(16),
  },
  noteWarn: {
    color: mojang.warning,
  },
});
