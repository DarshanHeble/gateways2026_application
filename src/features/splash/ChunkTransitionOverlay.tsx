import { useEffect, useMemo } from "react";
import Animated, {
  Easing,
  interpolateColor,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";

import { colors } from "@/theme/tokens";
import { FILL, SCREEN_WIDTH, SCREEN_HEIGHT } from "@/theme/scale";
import { rand } from "@/features/login/scene/useAmbient";
import { registerChunkTransitionHandlers } from "./chunkTransition";

/**
 * The "blank screen" between the splash video ending and the login screen
 * appearing is the login route's heavy scene (SVG layers, fonts, ambient
 * animations) taking a moment to mount after `router.replace` swaps routes.
 *
 * This covers that gap with a Minecraft-flavored chunk-load wipe: a grid of
 * solid pixel blocks (grass/dirt/stone, the same palette already used for the
 * scene) pops in to fully solid, the next route mounts hidden behind it, then
 * the blocks pop back out to reveal it. Each block also shimmers gently the
 * whole time it's on screen — a static wall of color while the login route
 * mounts would read as the app hanging, so instead of a fixed pause we get a
 * visibly "generating the world" beat that never looks stuck.
 */

// Device points, not run through px() — chunk size should read consistently
// blocky across devices rather than scale with the login canvas.
const CELL = 48;
const COVER_MS = 380;
const REVEAL_MS = 420;
const MAX_DELAY_FRAC = 0.55;

// Base material colors, each paired with a lighter tone of the same material
// (a block's top face catching light) for the shimmer to blend toward.
const PALETTE: [string, string][] = [
  [colors.grass.bright, colors.grass.tuft],
  [colors.dirt.clay, colors.dirt.light],
  [colors.stone.base, colors.stone.light],
  [colors.grass.mid, colors.grass.bright],
  [colors.dirt.loam, colors.dirt.clay],
  [colors.stone.light, colors.stone.screw],
];

type CellSpec = {
  x: number;
  y: number;
  color: string;
  altColor: string;
  delay: number;
  shimmerDelay: number;
  shimmerDuration: number;
};

function buildGrid(): CellSpec[] {
  const cols = Math.ceil(SCREEN_WIDTH / CELL) + 1;
  const rows = Math.ceil(SCREEN_HEIGHT / CELL) + 1;
  const cells: CellSpec[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const seed = r * cols + c;
      const [color, altColor] = PALETTE[Math.floor(rand(seed * 7.31) * PALETTE.length)];
      cells.push({
        x: c * CELL,
        y: r * CELL,
        color,
        altColor,
        delay: rand(seed * 3.71) * MAX_DELAY_FRAC,
        shimmerDelay: rand(seed * 5.13) * 600,
        shimmerDuration: 500 + rand(seed * 9.47) * 500,
      });
    }
  }
  return cells;
}

function Cell({
  x,
  y,
  color,
  altColor,
  delay,
  shimmerDelay,
  shimmerDuration,
  progress,
}: CellSpec & { progress: SharedValue<number> }) {
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withDelay(
      shimmerDelay,
      withRepeat(
        withTiming(1, { duration: shimmerDuration, easing: Easing.inOut(Easing.quad) }),
        -1,
        true,
      ),
    );
  }, [shimmer, shimmerDelay, shimmerDuration]);

  const style = useAnimatedStyle(() => {
    "worklet";
    const local = Math.max(0, Math.min(1, (progress.value - delay) / (1 - delay)));
    return {
      opacity: local,
      transform: [{ scale: 0.5 + 0.5 * local }],
      backgroundColor: interpolateColor(shimmer.value, [0, 1], [color, altColor]),
    };
  });

  return (
    <Animated.View
      style={[
        { position: "absolute", left: x, top: y, width: CELL + 1, height: CELL + 1 },
        style,
      ]}
    />
  );
}

export function ChunkTransitionOverlay() {
  const progress = useSharedValue(0);
  const cells = useMemo(() => buildGrid(), []);

  useEffect(() => {
    return registerChunkTransitionHandlers({
      cover: (onCovered) => {
        progress.value = withTiming(
          1,
          { duration: COVER_MS, easing: Easing.out(Easing.quad) },
          (done) => {
            "worklet";
            if (done) runOnJS(onCovered)();
          },
        );
      },
      reveal: () => {
        progress.value = withTiming(0, { duration: REVEAL_MS, easing: Easing.in(Easing.quad) });
      },
    });
  }, [progress]);

  return (
    <Animated.View style={[FILL, { zIndex: 999 }]} pointerEvents="none">
      {cells.map((cell, i) => (
        <Cell key={i} {...cell} progress={progress} />
      ))}
    </Animated.View>
  );
}
