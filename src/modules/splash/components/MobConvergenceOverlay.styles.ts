import { StyleSheet, Dimensions } from "react-native";
// Glows removed: Minecraft's UI has no bloom. Depth here is the bevel and the
// 1px outline, and a cyan halo around a pixel panel is the loudest possible
// contradiction of that.
import { colors, fonts } from "@/theme/tokens";
import { px } from "@/theme/scale";

const { height: SCREEN_H } = Dimensions.get("window");

export const styles = StyleSheet.create({
  container: {
    zIndex: 99999,
    backgroundColor: "#07080c",
    overflow: "hidden",
  },
  mobWrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    borderRadius: 0,
  },
  mobImage: {
    width: "100%",
    height: "100%",
  },
  mobBorder: {
    ...StyleSheet.absoluteFill,
    borderWidth: 3,
    borderColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 0,
  },
  centerEmblem: {
    position: "absolute",
    zIndex: 9999,
    alignSelf: "center",
    top: SCREEN_H / 2 - px(34),
    width: px(180),
    height: px(68),
    backgroundColor: "#0f1522",
    borderWidth: 3,
    borderColor: colors.gold.bright,
    alignItems: "center",
    justifyContent: "center",
  },
  emblemTitle: {
    fontFamily: fonts.pixelBold,
    fontSize: px(13),
    color: colors.gold.bright,
    letterSpacing: px(2),
  },
  emblemSub: {
    fontFamily: fonts.pixel,
    fontSize: px(9),
    color: colors.cta.glow,
    letterSpacing: px(1.5),
    marginTop: px(4),
  },
});
