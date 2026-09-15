import { useEffect } from "react";
import { DeviceMotion } from "expo-sensors";
import { useSharedValue, withTiming, type SharedValue } from "react-native-reanimated";

import { useReducedMotion } from "./useAmbient";

export type Tilt = { x: SharedValue<number>; y: SharedValue<number> };

const CLAMP = 0.6; // radians of tilt that map to full deflection
const SMOOTHING = 0.12;

/**
 * Device tilt, normalised to -1..1 on each axis and heavily smoothed.
 *
 * The web design is called "Parallax" but has no motion input; on a phone the
 * diorama reads as genuinely layered once the planes separate with the device,
 * so we add it here. Silently inert when no sensor is available, and skipped
 * entirely under Reduce Motion.
 */
export function useGyroParallax(): Tilt {
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;

    let cancelled = false;
    let sub: { remove: () => void } | undefined;

    DeviceMotion.isAvailableAsync()
      .then((available) => {
        if (!available || cancelled) return;
        DeviceMotion.setUpdateInterval(32);
        sub = DeviceMotion.addListener(({ rotation }) => {
          if (!rotation) return;
          const nx = Math.max(-1, Math.min(1, rotation.gamma / CLAMP));
          const ny = Math.max(-1, Math.min(1, (rotation.beta - 0.6) / CLAMP));
          // Low-pass so hand tremor doesn't jitter the whole scene.
          x.value = x.value + (nx - x.value) * SMOOTHING;
          y.value = y.value + (ny - y.value) * SMOOTHING;
        });
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      sub?.remove();
      x.value = withTiming(0);
      y.value = withTiming(0);
    };
  }, [reduced, x, y]);

  return { x, y };
}
