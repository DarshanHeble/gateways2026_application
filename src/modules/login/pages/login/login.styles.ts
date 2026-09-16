import { StyleSheet } from "react-native";
import { fonts } from "@/theme/tokens";
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
  // Light frosted-glass card — this background is a bright daytime shot, so
  // (unlike the dark stone-framed version built for an earlier night-time
  // background) a light, minimal panel reads correctly against it instead of
  // fighting the sky for contrast. Toned down from a near-white first pass
  // to a deeper, warmer stone-cream so it doesn't glow against the sky —
  // then pulled back toward white on request, keeping just enough warmth
  // to read as glass rather than a flat white card.
  card: {
    width: "100%",
    backgroundColor: "rgba(242,240,232,0.90)",
    borderRadius: px(16),
    borderWidth: px(1.5),
    borderColor: "rgba(255,255,255,0.75)",
    paddingHorizontal: px(13),
    paddingVertical: px(14),
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: px(10) },
    shadowOpacity: 0.3,
    shadowRadius: px(20),
    elevation: 12,
  },
  signInBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: px(6),
    backgroundColor: "#4caf50",
    borderRadius: px(9),
    height: px(40),
    paddingHorizontal: px(12),
    marginTop: px(2),
    overflow: "hidden",
    shadowColor: "#0b3d1f",
    shadowOffset: { width: 0, height: px(3) },
    shadowOpacity: 0.35,
    shadowRadius: px(5),
    elevation: 4,
  },
  signInDither: {
    borderRadius: px(9),
  },
  btnDisabled: {
    opacity: 0.6,
  },
  signInText: {
    flex: 1,
    textAlign: "center",
    fontFamily: fonts.bodyBold,
    fontSize: px(12.5),
    color: "#ffffff",
    letterSpacing: px(0.8),
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
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
    borderRadius: px(9),
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
    borderRadius: px(10),
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
