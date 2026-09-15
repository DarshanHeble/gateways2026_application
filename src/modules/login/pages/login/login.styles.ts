import { StyleSheet } from "react-native";
import { colors, fonts } from "@/theme/tokens";
import { px } from "@/theme/scale";

export const styles = StyleSheet.create({
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
