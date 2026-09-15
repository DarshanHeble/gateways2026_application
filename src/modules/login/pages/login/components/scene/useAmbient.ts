import { useEffect } from "react";
import {
  Easing,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
  useReducedMotion,
  type SharedValue,
} from "react-native-reanimated";

/**
 * The scene runs a dozen or so independent CSS keyframe loops. These helpers
 * express each as a single shared value driven on the UI thread, and freeze
 * them at a pleasant static frame when Reduce Motion is on.
 *
 * Phase offsets (the source's negative `animation-delay`s) are applied at read
 * time in the consuming worklet — `(loop.value + phase) % 1` — which is exact
 * and avoids juggling timers.
 */

/** 0 -> 1, restarting. Mirrors `animation: X Ns linear infinite`. */
export function useLoop(duration: number): SharedValue<number> {
  const reduced = useReducedMotion();
  const v = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;
    v.value = withRepeat(withTiming(1, { duration, easing: Easing.linear }), -1, false);
  }, [duration, reduced, v]);

  return v;
}

/** 0 <-> 1, reversing. Mirrors the `ease-in-out infinite` pulses. */
export function usePulse(duration: number, delay = 0): SharedValue<number> {
  const reduced = useReducedMotion();
  const v = useSharedValue(reduced ? 0.65 : 0);

  useEffect(() => {
    if (reduced) return;
    v.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration: duration / 2, easing: Easing.inOut(Easing.quad) }),
        -1,
        true,
      ),
    );
  }, [duration, delay, reduced, v]);

  return v;
}

/** 0 -> 1 in hard jumps. Mirrors `steps(n)` timing — the pixel-art flicker. */
export function useStepped(duration: number, steps: number, delay = 0): SharedValue<number> {
  const reduced = useReducedMotion();
  const v = useSharedValue(reduced ? 0.85 : 0);

  useEffect(() => {
    if (reduced) return;
    v.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration, easing: Easing.steps(steps, true) }), -1, false),
    );
  }, [duration, steps, delay, reduced, v]);

  return v;
}

/** Deterministic 0..1 pseudo-random, so particle layouts are stable across renders. */
export function rand(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

export { useReducedMotion };
