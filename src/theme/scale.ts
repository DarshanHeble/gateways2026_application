import { Dimensions, PixelRatio } from "react-native";

/**
 * The design was authored on a fixed 390x844 canvas (iPhone 14 logical size).
 * Every literal lifted from `Gateways 2026 Parallax.dc.html` is expressed in
 * those units and passed through `px()` so the diorama keeps its proportions
 * on any device.
 */
export const DESIGN_WIDTH = 390;
export const DESIGN_HEIGHT = 844;

const { width, height } = Dimensions.get("window");

/** Uniform scale factor, capped so tablets don't balloon the pixel art. */
export const S = Math.min(width / DESIGN_WIDTH, 1.4);

export const SCREEN_WIDTH = width;
export const SCREEN_HEIGHT = height;

/**
 * Design units -> device points. Called from plain component render code and
 * from inside Reanimated `useAnimatedStyle` worklets alike, so it needs the
 * `'worklet'` directive itself — Reanimated 4's split JS/UI runtime only
 * auto-workletizes the callback passed directly to its hooks, not helper
 * functions those callbacks import from elsewhere.
 */
export const px = (n: number) => {
  "worklet";
  return n * S;
};

/**
 * Design units -> device points, for text in the Minecraft face.
 *
 * The typeface is drawn on a grid: one of its pixels is 1/9 of the font size.
 * Unless that lands on whole device pixels the glyphs render with uneven,
 * smeared edges — `px(20)` on a 3x phone is 6.87 device pixels per font pixel,
 * which is what made the first pass of pixel headings look blobby. This snaps
 * to the nearest size where each font pixel is an exact number of device
 * pixels (multiples of 3pt on a 3x screen, 4.5pt on 2x).
 */
const PIXEL_FONT_STEP = 9 / PixelRatio.get();
export const pxFont = (n: number) => Math.max(PIXEL_FONT_STEP, Math.round((n * S) / PIXEL_FONT_STEP) * PIXEL_FONT_STEP);

/**
 * The scene is anchored top and bottom (matching the source, which positions
 * sky from `top` and ground from `bottom`), so a screen taller than the design
 * simply shows more mid-ground. This is how much extra there is.
 */
export const EXTRA_HEIGHT = Math.max(0, height - DESIGN_HEIGHT * S);

/**
 * RN 0.86 dropped `StyleSheet.absoluteFillObject` from its types (only the
 * registered `absoluteFill` remains), so we keep the spreadable literal here.
 */
export const FILL = { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 } as const;
