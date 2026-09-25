import { StyleSheet } from "react-native";
import { fonts } from "@/theme/tokens";
import { mojang } from "@/theme/minecraft";
import { px, pxFont } from "@/theme/scale";

/**
 * Login, in the same language as the tabs: the key art as a hero fading into
 * the page, then a plain form on the page itself — no floating card, so it
 * follows light and dark like everything else instead of being a fixed light
 * box pasted onto a poster.
 */
export const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: { marginHorizontal: -px(24), overflow: "hidden" },
  safeArea: { flex: 1 },
  keyboardAvoid: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: px(24), paddingBottom: px(28) },
  form: { width: "100%", maxWidth: px(440), alignSelf: "center" },

  eyebrow: {
    fontFamily: fonts.pixelBold,
    fontSize: pxFont(11),
    lineHeight: Math.round(pxFont(11) * 1.25),
    letterSpacing: px(1.2),
  },
  title: { fontFamily: fonts.display, fontSize: px(32), lineHeight: px(38), marginTop: px(4) },
  sub: { fontFamily: fonts.body, fontSize: px(14.5), lineHeight: px(20), marginTop: px(4), marginBottom: px(10) },

  label: {
    fontFamily: fonts.pixelBold,
    fontSize: pxFont(10),
    lineHeight: Math.round(pxFont(10) * 1.25),
    letterSpacing: px(1),
    marginTop: px(8),
    marginBottom: px(6),
  },

  cta: { borderWidth: px(2), borderColor: "#000000", backgroundColor: "#000000" },
  ctaFace: {
    flexDirection: "row",
    alignItems: "center",
    gap: px(10),
    height: px(52),
    paddingHorizontal: px(16),
    backgroundColor: mojang.green5,
    borderTopWidth: px(3),
    borderLeftWidth: px(3),
    borderBottomWidth: px(3),
    borderRightWidth: px(3),
    borderTopColor: mojang.green3,
    borderLeftColor: mojang.green4,
    borderBottomColor: mojang.green6,
    borderRightColor: mojang.green6,
  },
  ctaFacePressed: {
    backgroundColor: mojang.green6,
    borderTopColor: "#1d4a14",
    borderLeftColor: "#1d4a14",
    borderBottomColor: mojang.green5,
    borderRightColor: mojang.green5,
  },
  ctaLip: { height: px(4), backgroundColor: "#1d4a14" },
  ctaLabel: {
    flex: 1,
    textAlign: "center",
    fontFamily: fonts.pixelBold,
    fontSize: pxFont(15),
    lineHeight: Math.round(pxFont(15) * 1.25),
    letterSpacing: px(1),
    color: "#ffffff",
  },
  signInSpinner: { flex: 1 },
  btnDisabled: { opacity: 0.6 },

  dividerRow: { flexDirection: "row", alignItems: "center", marginVertical: px(18) },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth },
  dividerText: { marginHorizontal: px(10), fontFamily: fonts.bodyMedium, fontSize: px(12), letterSpacing: px(1) },

  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: px(10),
    height: px(50),
    borderWidth: StyleSheet.hairlineWidth,
  },
  googleText: { fontFamily: fonts.bodySemi, fontSize: px(15) },

  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: px(8),
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: px(10),
    paddingHorizontal: px(12),
    marginBottom: px(6),
  },
  toastText: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: px(13) },

  footer: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: px(8), marginTop: px(20) },
  footerText: { fontFamily: fonts.body, fontSize: px(12) },
});
