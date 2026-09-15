import { StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle, type SharedValue } from "react-native-reanimated";

import { colors } from "@/theme/tokens";
import { px, SCREEN_HEIGHT } from "@/theme/scale";
import { RadialGlow } from "@/components/pixel/Primitives";
import { rand, useLoop, useReducedMotion } from "./useAmbient";

/**
 * Fireflies and falling leaves, seeded exactly like the design's `seed()`
 * helper (22 and 12 particles, randomised size, position, duration and phase).
 *
 * All of them read from one 60s clock rather than owning a timer each — the
 * per-particle period and phase are applied in the worklet, so the whole layer
 * costs a single driver on the UI thread.
 */

const CLOCK_PERIOD = 60_000;
const CLOCK_SECONDS = CLOCK_PERIOD / 1000;

type Spec = {
  size: number;
  left: number;
  top: number;
  color: string;
  duration: number;
  phase: number;
};

function buildSpecs(
  n: number,
  seedBase: number,
  palette: readonly string[],
  baseSize: number,
  topStart: number,
  topSpread: number,
  durBase: number,
  durVar: number,
): Spec[] {
  return Array.from({ length: n }, (_, i) => {
    const r1 = rand(seedBase + i * 4 + 1);
    const r2 = rand(seedBase + i * 4 + 2);
    const r3 = rand(seedBase + i * 4 + 3);
    const r4 = rand(seedBase + i * 4 + 4);
    return {
      size: baseSize + (r1 < 0.3 ? 2 : 0),
      left: r2 * 96,
      top: topStart + r3 * topSpread,
      color: palette[i % palette.length],
      duration: (durBase + r4 * durVar) * 1000,
      phase: r1,
    };
  });
}

const FIREFLIES = buildSpecs(22, 11, colors.firefly, 3, 40, 55, 7, 5);
const LEAVES = buildSpecs(12, 77, colors.leaf, 5, 0, 30, 11, 7);

function Firefly({ spec, clock }: { spec: Spec; clock: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    "worklet";
    const t = ((clock.value * CLOCK_SECONDS * 1000) / spec.duration + spec.phase) % 1;
    // 0% (0,0) a=0 — 15% a=1 — 50% (26,-34) — 85% a=1 — 100% (-14,-70) a=0
    const x = t < 0.5 ? 26 * (t / 0.5) : 26 + (-14 - 26) * ((t - 0.5) / 0.5);
    const y = t < 0.5 ? -34 * (t / 0.5) : -34 + (-70 + 34) * ((t - 0.5) / 0.5);
    const opacity = t < 0.15 ? t / 0.15 : t > 0.85 ? (1 - t) / 0.15 : 1;
    return { opacity, transform: [{ translateX: px(x) }, { translateY: px(y) }] };
  });

  const s = px(spec.size);
  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: `${spec.left}%`,
          top: `${spec.top}%`,
          width: s,
          height: s,
          backgroundColor: spec.color,
          boxShadow: `0 0 ${px(8)}px ${px(4)}px ${spec.color}`,
        },
        style,
      ]}
    />
  );
}

function Leaf({ spec, clock }: { spec: Spec; clock: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    "worklet";
    const t = ((clock.value * CLOCK_SECONDS * 1000) / spec.duration + spec.phase) % 1;
    // 0% (0,-30) rot 0 a=0 — 12% a=1 — 90% a=.9 — 100% (-70,320) rot 320 a=0
    const x = -70 * t;
    const y = -30 + 350 * t;
    const rotate = 320 * t;
    const opacity = t < 0.12 ? t / 0.12 : t > 0.9 ? 0.9 * ((1 - t) / 0.1) : 1;
    return {
      opacity,
      transform: [{ translateX: px(x) }, { translateY: px(y) }, { rotate: `${rotate}deg` }],
    };
  });

  const s = px(spec.size);
  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: `${spec.left}%`,
          top: `${spec.top}%`,
          width: s,
          height: s,
          backgroundColor: spec.color,
        },
        style,
      ]}
    />
  );
}

export function ParticleLayer() {
  const reduced = useReducedMotion();
  const clock = useLoop(CLOCK_PERIOD);

  // Static particles read as specks of grit rather than atmosphere, so under
  // Reduce Motion we drop the layer entirely instead of freezing it.
  if (reduced) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {LEAVES.map((spec, i) => (
        <Leaf key={`l${i}`} spec={spec} clock={clock} />
      ))}
      {FIREFLIES.map((spec, i) => (
        <Firefly key={`f${i}`} spec={spec} clock={clock} />
      ))}
    </View>
  );
}

/** Radial darkening that pulls focus to the notice board. */
export function VignetteLayer() {
  return (
    <View style={[StyleSheet.absoluteFill, { height: SCREEN_HEIGHT }]} pointerEvents="none">
      <RadialGlow
        cx="50%"
        cy="40%"
        rx="60%"
        ry="40%"
        stops={[
          { offset: 40, color: "#281409", opacity: 0 },
          { offset: 100, color: "#281409", opacity: 0.5 },
        ]}
      />
    </View>
  );
}
