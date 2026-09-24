import { StyleSheet } from "react-native";
import { fonts, typography } from "@/theme/tokens";
import { mcTextShadow, mojang } from "@/theme/minecraft";
import { px, SCREEN_HEIGHT } from "@/theme/scale";

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
    alignItems: "center",
    paddingHorizontal: px(24),
    paddingBottom: px(32),
  },
  cardWrapper: {
    width: "100%",
    maxWidth: px(252),
    alignItems: "center",
    // Clears the "GATEWAYS 2026 / #PARALLEX" title that's baked into the
    // background art, landing the card in the empty sky gap above the
    // campus scene below — proportional to screen height so it tracks the
    // same spot on the source poster across device sizes.
    marginTop: SCREEN_HEIGHT * 0.335,
  },
  /*
   * The sign-in panel.
   *
   * Stays light in both colour modes, deliberately: it sits on the fest's
   * daytime poster, which does not change, so a dark panel here would be
   * fighting the sky rather than following the app. It is now built like every
   * other surface — opaque fill, 1px stamped outline, light edge top-left — via
   * `Frame` in the component, rather than the translucent 1.5px-bordered glass
   * card it was, which belonged to no system at all.
   */
  card: {
    width: "100%",
    backgroundColor: "#f4efec",
    borderRadius: 0,
    paddingHorizontal: px(16),
    paddingVertical: px(16),
    overflow: "hidden",
  },
  signInBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: px(6),
    // Mojang's Vanilla green, not a stock Material `#4caf50`.
    backgroundColor: mojang.green5,
    borderRadius: 0,
    height: px(42),
    paddingHorizontal: px(12),
    marginTop: px(4),
    overflow: "hidden",
  },
  signInDither: {
    borderRadius: 0,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  /** The spinner takes the label's slot, and only its layout. */
  signInSpinner: {
    flex: 1,
  },
  signInText: {
    flex: 1,
    textAlign: "center",
    fontFamily: typography.kicker.fontFamily,
    fontSize: px(typography.kicker.fontSize),
    color: "#ffffff",
    letterSpacing: typography.kicker.letterSpacing,
    // The derived Minecraft shadow, not a soft blurred one.
    ...mcTextShadow("#ffffff", typography.kicker.fontSize),
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: px(10),
  },
  dividerLine: {
    flex: 1,
    height: px(1),
    backgroundColor: "rgba(60,55,40,0.18)",
  },
  dividerText: {
    marginHorizontal: px(8),
    fontFamily: fonts.bodyMedium,
    fontSize: px(9.5),
    letterSpacing: px(1),
    color: "#6b6a63",
  },
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: px(6),
    backgroundColor: "#ffffff",
    borderRadius: 0,
    height: px(40),
    borderWidth: px(1),
    borderColor: "rgba(0,0,0,0.08)",
  },
  googleText: {
    fontFamily: fonts.bodySemi,
    fontSize: px(12),
    color: "#1f1f1f",
  },
  toast: {
    marginTop: px(16),
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 0,
    paddingVertical: px(8),
    paddingHorizontal: px(14),
  },
  toastText: {
    fontFamily: fonts.bodyMedium,
    fontSize: px(12),
    color: "#ffe9b8",
    textAlign: "center",
  },
});
