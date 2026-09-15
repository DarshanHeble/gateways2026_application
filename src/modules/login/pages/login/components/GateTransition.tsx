import { useCallback } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type AnimatedStyle,
  type SharedValue,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { motion } from "@/theme/tokens";
import { px, FILL } from "@/theme/scale";
import { RadialGlow } from "@/components/pixel/Primitives";
import { useReducedMotion } from "./scene/useAmbient";

const PUSH = Easing.bezier(0.55, 0, 0.85, 0.35);
const OPEN = Easing.bezier(0.6, 0, 0.85, 0.4);

export type GateState = {
  play: () => void;
  sceneStyle: AnimatedStyle<ViewStyle>;
  push: SharedValue<number>;
  open: SharedValue<number>;
  flash: SharedValue<number>;
  reduced: boolean;
};

/**
 * The `camPush` / `gateOpen` / `flashIn` choreography from the design: the
 * camera drives straight through the world into a wall of sunrise.
 *
 * Each of the three has its own easing in the source, so each gets its own
 * driver rather than being derived from a shared clock.
 *
 * The source also blurs the scene at the end, but RN's `filter: blur` is
 * Android-only. The keyframe already fades the scene out under the flash, so
 * dropping the blur costs nothing visually and keeps both platforms identical.
 */
export function useGateTransition(onArrive: () => void): GateState {
  const push = useSharedValue(0);
  const open = useSharedValue(0);
  const flash = useSharedValue(0);
  const reduced = useReducedMotion();

  // Reanimated shared values are mutable containers by design; `.value =` in
  // an event handler is the documented way to drive them, but the React
  // Compiler lint rule doesn't know that exception yet (see PixelButton for
  // the same pattern) — disabled per-line below rather than for the file.
  const play = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    if (reduced) {
      // eslint-disable-next-line react-hooks/immutability
      flash.value = withTiming(1, { duration: 250, easing: Easing.linear }, (done) => {
        "worklet";
        if (done) runOnJS(onArrive)();
      });
      return;
    }

    // eslint-disable-next-line react-hooks/immutability
    open.value = withTiming(1, { duration: motion.gate, easing: OPEN });
    flash.value = withTiming(1, { duration: motion.gate, easing: Easing.in(Easing.quad) });
    // eslint-disable-next-line react-hooks/immutability
    push.value = withTiming(1, { duration: motion.gate, easing: PUSH }, (done) => {
      "worklet";
      if (done) runOnJS(onArrive)();
    });
  }, [push, open, flash, reduced, onArrive]);

  const sceneStyle = useAnimatedStyle(() => {
    "worklet";
    if (reduced) return {};
    const t = push.value;
    // camPush: 0% scale 1 — 60% scale 2.4 — 100% scale 7, fading out under the flash
    const scale = t < 0.6 ? 1 + 1.4 * (t / 0.6) : 2.4 + 4.6 * ((t - 0.6) / 0.4);
    return { transform: [{ scale }], opacity: t > 0.75 ? 1 - (t - 0.75) / 0.25 : 1 };
  });

  return { play, sceneStyle, push, open, flash, reduced };
}

/** The gate flare and the full-bleed flash, drawn above everything. */
export function GateTransition({ open, flash, reduced }: Omit<GateState, "play" | "sceneStyle" | "push">) {
  const gateStyle = useAnimatedStyle(() => {
    "worklet";
    const t = open.value;
    // gateOpen: scale .2 -> 9; opacity ramps in by 35%, then out
    return {
      transform: [{ scale: 0.2 + 8.8 * t }],
      opacity: t === 0 ? 0 : t < 0.35 ? t / 0.35 : 1 - (t - 0.35) / 0.65,
    };
  });

  const flashStyle = useAnimatedStyle(() => {
    "worklet";
    const t = flash.value;
    // flashIn: 0 -> .92 at 70% -> 0
    return { opacity: t < 0.7 ? 0.92 * (t / 0.7) : 0.92 * (1 - (t - 0.7) / 0.3) };
  });

  return (
    <View style={styles.root} pointerEvents="none">
      {!reduced ? (
        <Animated.View style={[styles.gate, gateStyle]}>
          <RadialGlow
            cx="50%"
            cy="60%"
            stops={[
              { offset: 0, color: "#fff3cf", opacity: 1 },
              { offset: 45, color: "#ffb457", opacity: 1 },
              { offset: 72, color: "#ff8c3c", opacity: 0 },
            ]}
          />
        </Animated.View>
      ) : null}

      <Animated.View style={[StyleSheet.absoluteFill, flashStyle]}>
        <RadialGlow
          cx="50%"
          cy="46%"
          stops={[
            { offset: 0, color: "#fff8e6", opacity: 1 },
            { offset: 30, color: "#ffcf85", opacity: 1 },
            { offset: 70, color: "#7a4a1e", opacity: 1 },
            { offset: 100, color: "#12060a", opacity: 1 },
          ]}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...FILL, zIndex: 80, overflow: "hidden" },
  gate: {
    position: "absolute",
    top: "46%",
    left: "50%",
    width: px(120),
    height: px(150),
    marginTop: px(-75),
    marginLeft: px(-60),
    borderTopLeftRadius: px(60),
    borderTopRightRadius: px(60),
    overflow: "hidden",
  },
});
