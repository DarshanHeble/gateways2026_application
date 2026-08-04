import { type ReactNode, useCallback, useEffect } from "react";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { ClipPath, Defs, G, LinearGradient, Polygon, Rect, Stop } from "react-native-svg";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  useReducedMotion,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { px, FILL } from "@/theme/scale";
import { motion } from "@/theme/tokens";

let uid = 0;
const nextId = (p: string) => `${p}${uid++}`;

/** Octagon with 45-degree corner chamfers; a plain rect when `cut` is 0. */
function octagon(w: number, h: number, cut: number, dy = 0) {
  if (!cut) return `0,${dy} ${w},${dy} ${w},${h + dy} 0,${h + dy}`;
  return [
    `${cut},${dy}`,
    `${w - cut},${dy}`,
    `${w},${cut + dy}`,
    `${w},${h - cut + dy}`,
    `${w - cut},${h + dy}`,
    `${cut},${h + dy}`,
    `0,${h - cut + dy}`,
    `0,${cut + dy}`,
  ].join(" ");
}

export type PixelButtonProps = {
  /** Design units. */
  width: number;
  height: number;
  /** Vertical gradient stops, top to bottom: [offset%, color]. */
  gradient: [number, string][];
  /** Solid block under the face; the button sinks into it when pressed. */
  baseColor: string;
  baseDepth: number;
  bevelTop: { color: string; size: number };
  bevelBottom: { color: string; size: number };
  cut?: number;
  shimmer?: boolean;
  disabled?: boolean;
  onPress: () => void;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel: string;
};

/**
 * The design's chunky 3D game button: a gradient face with solid bevel strips,
 * sitting on a darker base block that it sinks into on press.
 *
 * Note on the base: in the browser the ENTER WORLD button's `clip-path` also
 * clips away its `0 7px 0` drop shadow, so the base never renders there. We
 * keep it — the author clearly intended it (the press state animates that exact
 * shadow, and the unclipped Google button shows the same language), and without
 * it pressing on a touch screen would just expose the wood behind.
 */
export function PixelButton({
  width,
  height,
  gradient,
  baseColor,
  baseDepth,
  bevelTop,
  bevelBottom,
  cut = 0,
  shimmer = false,
  disabled = false,
  onPress,
  children,
  style,
  accessibilityLabel,
}: PixelButtonProps) {
  const reduced = useReducedMotion();
  const pressed = useSharedValue(0);
  const sweep = useSharedValue(0);

  const w = px(width);
  const h = px(height);
  const c = px(cut);
  const depth = px(baseDepth);
  const sink = depth - px(2); // pressed state leaves a 2px lip, matching the CSS

  const gradientId = nextId("btnGrad");
  const faceClipId = nextId("btnFaceClip");
  const baseClipId = nextId("btnBaseClip");
  const shimmerId = nextId("btnShim");

  useEffect(() => {
    if (!shimmer || reduced) return;
    sweep.value = withRepeat(
      withTiming(1, { duration: motion.shimmer, easing: Easing.linear }),
      -1,
      false,
    );
  }, [shimmer, reduced, sweep]);

  const faceStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: pressed.value * sink }],
  }));

  const sweepStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -px(120) + sweep.value * px(320) }],
  }));

  // Reanimated shared values are mutable containers by design; `.value =` in
  // an event handler is the documented way to drive them, but the React
  // Compiler lint rule doesn't recognize that exception yet.
  const onPressIn = useCallback(() => {
    // eslint-disable-next-line react-hooks/immutability
    pressed.value = withTiming(1, { duration: 60 });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, [pressed]);

  const onPressOut = useCallback(() => {
    // eslint-disable-next-line react-hooks/immutability -- see onPressIn above.
    pressed.value = withTiming(0, { duration: 90 });
  }, [pressed]);

  return (
    <Pressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      hitSlop={px(8)}
      style={[{ width: w, height: h + depth, opacity: disabled ? 0.6 : 1 }, style]}
    >
      {/* Base: the same silhouette, pushed down by `depth`. */}
      <Svg width={w} height={h + depth} style={StyleSheet.absoluteFill}>
        <Defs>
          <ClipPath id={baseClipId}>
            <Polygon points={octagon(w, h, c, depth)} />
          </ClipPath>
        </Defs>
        <G clipPath={`url(#${baseClipId})`}>
          <Rect width={w} height={h + depth} fill={baseColor} />
        </G>
      </Svg>

      <Animated.View style={[{ width: w, height: h }, faceStyle]}>
        <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              {gradient.map(([offset, color], i) => (
                <Stop key={i} offset={`${offset}%`} stopColor={color} />
              ))}
            </LinearGradient>
            <ClipPath id={faceClipId}>
              <Polygon points={octagon(w, h, c)} />
            </ClipPath>
          </Defs>
          <G clipPath={`url(#${faceClipId})`}>
            <Rect width={w} height={h} fill={`url(#${gradientId})`} />
            <Rect width={w} height={px(bevelTop.size)} fill={bevelTop.color} />
            <Rect
              y={h - px(bevelBottom.size)}
              width={w}
              height={px(bevelBottom.size)}
              fill={bevelBottom.color}
            />
          </G>
        </Svg>

        {shimmer ? (
          // Inset by the chamfer so the sweep can never spill past a cut corner,
          // which lets us clip with a plain View instead of an animated SVG node.
          <View
            style={{ position: "absolute", left: c, right: c, top: 0, bottom: 0, overflow: "hidden" }}
            pointerEvents="none"
          >
            <Animated.View
              style={[{ position: "absolute", top: 0, bottom: 0, width: px(200) }, sweepStyle]}
            >
              <Svg width={px(200)} height={h}>
                <Defs>
                  <LinearGradient id={shimmerId} x1="0" y1="1" x2="1" y2="0">
                    <Stop offset="40%" stopColor="#ffffff" stopOpacity={0} />
                    <Stop offset="50%" stopColor="#ffffff" stopOpacity={0.4} />
                    <Stop offset="60%" stopColor="#ffffff" stopOpacity={0} />
                  </LinearGradient>
                </Defs>
                <Rect width={px(200)} height={h} fill={`url(#${shimmerId})`} />
              </Svg>
            </Animated.View>
          </View>
        ) : null}

        <View style={styles.content} pointerEvents="none">
          {children}
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    ...FILL,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
});
