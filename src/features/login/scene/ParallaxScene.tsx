import type { ReactNode } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, type AnimatedStyle } from "react-native-reanimated";

import { colors } from "@/theme/tokens";
import { px, FILL } from "@/theme/scale";
import { SkyLayer } from "./SkyLayer";
import { CastleLayer, RidgeLayer } from "./CastleLayer";
import { Canopies, MidGround, Pillars, TopBushes } from "./FrameLayer";
import { GroundLayer } from "./GroundLayer";
import { ParticleLayer, VignetteLayer } from "./ParticleLayer";
import { useGyroParallax, type Tilt } from "./useGyroParallax";

/**
 * Per-plane travel in design units. The board itself stays locked at 0 — it is
 * UI, not scenery, and moving it would make the fields feel unstable.
 */
const DEPTH = {
  sky: 2,
  ridge: 8,
  castle: 12,
  frame: 18,
  ground: 26,
} as const;

function Plane({ depth, tilt, children }: { depth: number; tilt: Tilt; children: ReactNode }) {
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: -tilt.x.value * px(depth) },
      { translateY: -tilt.y.value * px(depth * 0.5) },
    ],
  }));
  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      {children}
    </Animated.View>
  );
}

/**
 * The full login diorama. `sceneStyle` is supplied by the gate transition so
 * the whole world can be pushed through on sign-in.
 */
export function ParallaxScene({ sceneStyle }: { sceneStyle?: AnimatedStyle<ViewStyle> }) {
  const tilt = useGyroParallax();

  return (
    <Animated.View
      style={[styles.root, sceneStyle]}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Plane depth={DEPTH.sky} tilt={tilt}>
        <SkyLayer />
      </Plane>

      <Plane depth={DEPTH.ridge} tilt={tilt}>
        <RidgeLayer />
      </Plane>

      <Plane depth={DEPTH.castle} tilt={tilt}>
        <CastleLayer />
      </Plane>

      <Plane depth={DEPTH.frame} tilt={tilt}>
        <TopBushes />
        <MidGround />
      </Plane>

      <Plane depth={DEPTH.ground} tilt={tilt}>
        <GroundLayer />
      </Plane>

      {/* The hut frame is nearest the camera and stays put — it is the window. */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Pillars />
        <Canopies />
      </View>

      <ParticleLayer />
      <VignetteLayer />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...FILL,
    backgroundColor: colors.stage,
    overflow: "hidden",
    // The camera push on sign-in scales about this point, matching the source's
    // `transform-origin: 50% 62%`.
    transformOrigin: "50% 62%",
  },
});
