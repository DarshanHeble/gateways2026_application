import { useEffect } from "react";
import { StyleSheet, Text } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from "react-native-reanimated";

import { fonts, type } from "@/theme/tokens";
import { px } from "@/theme/scale";
import { Bevel } from "./Primitives";

/**
 * The design's `toastIn` notice — a dark slab with a mint hairline outline,
 * pinned above the bottom of the scene.
 */
export function PixelToast({ message, bottom = 112 }: { message: string | null; bottom?: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(message ? 1 : 0, {
      duration: 280,
      easing: Easing.out(Easing.quad),
    });
  }, [message, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * px(14) }],
  }));

  if (!message) return null;

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={[styles.root, { bottom: px(bottom) }, animatedStyle]}
    >
      <Bevel top={{ color: "rgba(255,255,255,0.14)", size: 2 }} />
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: "absolute",
    alignSelf: "center",
    zIndex: 75,
    paddingVertical: px(10),
    paddingHorizontal: px(16),
    backgroundColor: "rgba(10,16,26,0.94)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(125,255,192,0.35)",
    boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
  },
  text: {
    fontFamily: fonts.pixel,
    fontSize: px(type.toast.size),
    letterSpacing: px(type.toast.tracking),
    color: "#7dffc0",
  },
});
