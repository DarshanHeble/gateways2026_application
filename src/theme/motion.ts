import { Platform } from "react-native";
import { Easing, FadeIn, FadeInDown, FadeInUp } from "react-native-reanimated";

/**
 * How things move in Minecraft.
 *
 * The rule that matters, and the one this codebase was breaking everywhere:
 * **Minecraft's UI has no easing.** Vanilla screens do not spring, do not
 * overshoot, and do not ease-in-out. A button's hover state appears on the
 * frame the cursor enters it; a screen appears on the frame it opens; the only
 * curve in the entire interface is the linear fade behind the pause menu. Every
 * `withSpring(..., { damping: 16 })` in this app was a Material 3 gesture
 * wearing pixel art, and springiness is what made the UI feel like an app
 * rather than a game no matter how square the corners were.
 *
 * So: linear, short, and where something must move over time, **stepped** —
 * quantised to a low frame rate so the motion itself looks like pixels. That
 * last part is what sells it. A 60fps linear slide still reads as smooth
 * software; the same slide quantised to 12 steps reads as a sprite animation.
 */

/** Durations, in ms. Short: nothing in a game menu takes half a second. */
export const duration = {
  /** Press feedback. Effectively instant — one or two frames. */
  instant: 40,
  /** Hover / selection change. */
  quick: 90,
  /** Screen and sheet transitions. */
  screen: 180,
  /** The one slow thing: a full-screen cover fade. */
  cover: 260,
} as const;

/**
 * Quantise progress to `steps` discrete levels.
 *
 * `Easing.steps` is exposed by Reanimated and does exactly this. Applied to a
 * translate or an opacity it produces sprite-sheet motion rather than a smooth
 * interpolation — the difference between a modern app and a 2011 game menu.
 */
export const stepped = (steps = 8) => Easing.steps(steps, true);

/** The default: dead linear, no curve at all. */
export const linear = Easing.linear;

/** Timing configs, ready to hand to `withTiming`. */
export const timing = {
  press: { duration: duration.instant, easing: linear },
  select: { duration: duration.quick, easing: linear },
  /** Screen-level movement: smooth and responsive. */
  screen: { duration: duration.screen, easing: Easing.out(Easing.cubic) },
  /** A sheet sliding up: fluid 60/120fps ease-out curve. */
  sheet: { duration: 220, easing: Easing.out(Easing.cubic) },
  cover: { duration: duration.cover, easing: linear },
} as const;

/**
 * Screen transition for expo-router's `Stack` / `Tabs`.
 *
 * `"fade"` over `"slide_from_right"` on purpose: a horizontal push is an iOS
 * navigation idiom with no counterpart in game, whereas swapping one full
 * screen for another with a short fade is exactly what happens when a Minecraft
 * screen opens.
 */
export const SCREEN_ANIMATION = "fade" as const;
export const SCREEN_ANIMATION_DURATION = duration.screen;

/**
 * Entry animations for content, safe on Android.
 *
 * On Android the slide-in variants (FadeInDown / FadeInUp) were seen stopping
 * part-way — on a Motorola Edge 40, a banner, a section and grid tiles were
 * left ~25pt below where they belong, overlapping what came next, until the
 * screen remounted. Android gets a plain fade instead; iOS keeps the slide.
 * Same builder API (.duration, .delay, .easing) either way.
 */
export const EnterFromBelow = Platform.OS === "android" ? FadeIn : FadeInDown;
export const EnterFromAbove = Platform.OS === "android" ? FadeIn : FadeInUp;
