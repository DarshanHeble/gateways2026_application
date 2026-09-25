/**
 * The Minecraft widget kit.
 *
 * Every widget here is the same sprite construction, measured out of the game's
 * own GUI textures (see `@/theme/minecraft` for the readings):
 *
 *     1px  black outline                    ← almost always the missing piece
 *     2px  light edge, top + left           ← near-white, not "slightly lighter"
 *     2px  dark edge, bottom + right
 *          face, with ±3/255 of grain       ← why a surface reads as material
 *
 * Inset widgets (slots, inputs, troughs) are that exact construction with the
 * light and dark edges swapped, which is how vanilla does it too.
 *
 * Nothing has a radius, nothing springs, and text is always drawn twice.
 */

import { type ReactNode, useCallback, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import * as Haptics from "expo-haptics";

import { DitherFill } from "@/components/pixel/Fills";
import { px, pxFont } from "@/theme/scale";
import { fonts } from "@/theme/tokens";
import { GRAIN, gap, mcTextShadow, mojang, schemes, slotSize } from "@/theme/minecraft";
import { useBlockTheme } from "@/theme/BlockThemeContext";

import { Frame, SelectionFrame, type FrameDepth } from "./Frame";

export * from "./Frame";
export * from "./DirtBackground";

/**
 * The face grain, at the measured strength. Used by every surface here.
 *
 * The bias flips with the colour mode: on a dark face the lighter speckle does
 * the work, on a light face it is invisible and the shading has to carry it.
 */
export function Grain({ style }: { style?: StyleProp<ViewStyle> }) {
  const { isDark } = useBlockTheme();
  const grain = schemes[isDark ? "dark" : "light"].surface.grain;
  return <DitherFill size={GRAIN.size} light={grain.light} dark={grain.dark} style={style} />;
}

/**
 * The surface palette for the active colour mode.
 *
 * Components take their fills from here rather than from the `material`
 * constant, because `StyleSheet.create` runs once at module load and cannot see
 * the theme.
 */
export function useSurface() {
  const { isDark } = useBlockTheme();
  return schemes[isDark ? "dark" : "light"].surface;
}

// ── Panel ─────────────────────────────────────────────────────────────────────

export type McPanelProps = {
  children?: ReactNode;
  depth?: FrameDepth;
  /** Surface colour. Defaults to the active scheme's stone. */
  fill?: string;
  padded?: boolean | number;
  style?: StyleProp<ViewStyle>;
};

export function McPanel({
  children,
  depth = "raised",
  fill,
  padded = true,
  style,
}: McPanelProps) {
  const surface = useSurface();
  const padding = padded === false ? 0 : padded === true ? gap.md : px(padded as number);
  const background = fill ?? surface.stone;

  return (
    <View style={[styles.square, { backgroundColor: background, padding }, style]}>
      <Grain />
      <Frame depth={depth} />
      {children}
    </View>
  );
}

// ── Button ────────────────────────────────────────────────────────────────────

export type McButtonProps = {
  label?: string;
  children?: ReactNode;
  onPress: () => void;
  /**
   * `primary` is the one gold action per screen, `confirm` the emerald
   * affirmative, `ghost` a plain stone widget. In game these are literally the
   * same widget with a different tint, so they are here too.
   */
  tone?: "primary" | "confirm" | "ghost" | "danger";
  disabled?: boolean;
  block?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
};

const TONES: Record<NonNullable<McButtonProps["tone"]>, { face: string; ink: string }> = {
  primary: { face: "#c89a2e", ink: "#2a1a04" },
  // The brand ramp, not a generic success green.
  confirm: { face: mojang.green5, ink: "#ffffff" },
  ghost: { face: mojang.surfaceSoft, ink: mojang.greyWarm },
  danger: { face: "#8f3634", ink: "#ffe8e8" },
};

/**
 * The in-game button.
 *
 * Press does two things, both taken from the sprites rather than from app
 * convention. The outline goes white — that is the whole of vanilla's hover
 * treatment, `button_highlighted.png` being `button.png` with `#000000` swapped
 * for `#ffffff` — and the bevel inverts so the face reads as pushed in. The
 * label moves down by the same two pixels the bevel does, so the whole widget
 * sinks as one object.
 *
 * There is no opacity fade and no scale. Both are app idioms; a button in a
 * game either is pressed or is not, on the frame you touch it.
 */
export function McButton({
  label,
  children,
  onPress,
  tone = "ghost",
  disabled = false,
  block = false,
  style,
  textStyle,
  accessibilityLabel,
}: McButtonProps) {
  const t = TONES[tone];
  const [pressed, setPressed] = useState(false);

  const handlePressIn = useCallback(() => {
    setPressed(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, []);
  const handlePressOut = useCallback(() => setPressed(false), []);

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      hitSlop={px(6)}
      style={[
        styles.square,
        styles.button,
        {
          backgroundColor: disabled ? mojang.surfaceMid : t.face,
          alignSelf: block ? "stretch" : "flex-start",
          // The two-pixel sink, as padding rather than a transform so the label
          // travels with the face and nothing escapes the frame.
          paddingTop: pressed ? px(12) : px(10),
          paddingBottom: pressed ? px(8) : px(10),
        },
        style,
      ]}
    >
      <Grain />
      {/*
        A disabled button keeps the plain stone edge.
        
        It was still drawing its tone's lit edge — a grey face inside a bright
        green frame, which reads as "loading" rather than "not yet".
      */}
      <Frame
        depth={
          disabled
            ? "raised"
            : pressed
              ? "sunken"
              : tone === "primary"
                ? "gold"
                : tone === "confirm"
                  ? "green"
                  : "raised"
        }
        focused={pressed && !disabled}
      />
      {label ? (
        <Text
          style={[
            styles.buttonLabel,
            { color: disabled ? mojang.greySoft : t.ink },
            mcTextShadow(disabled ? mojang.greySoft : t.ink, 15),
            textStyle,
          ]}
        >
          {label}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );
}

// ── Pressable surface ─────────────────────────────────────────────────────────

export type McCardProps = {
  children: ReactNode;
  onPress?: () => void;
  /** Edge treatment when at rest. Pressing always swaps to `sunken`. */
  depth?: FrameDepth;
  fill: string;
  haptic?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

/**
 * A card you can press, with the widget's press behaviour rather than an app's.
 *
 * `activeOpacity` — fading a card to 80% while your finger is down — is a
 * touch-app idiom with no counterpart in game, and it was on every card in this
 * codebase. A Minecraft widget does not fade: it **sinks**, the bevel inverts so
 * the lit edge moves to the bottom, and the outline goes white. That happens on
 * the frame you touch it and reverses on the frame you let go, with no easing,
 * because nothing in this interface eases.
 */
export function McCard({
  children,
  onPress,
  depth = "raised",
  fill,
  haptic = true,
  style,
  accessibilityLabel,
}: McCardProps) {
  const [pressed, setPressed] = useState(false);

  const handleIn = useCallback(() => {
    setPressed(true);
    if (haptic) Haptics.selectionAsync().catch(() => {});
  }, [haptic]);

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handleIn}
      onPressOut={() => setPressed(false)}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.square,
        { backgroundColor: fill },
        // The sink: one design pixel down while pressed, as a transform so it
        // never touches layout. It used to be paddingTop/paddingBottom, which
        // overrode any vertical padding a caller gave the card — every padded
        // card lost its top and bottom padding and its text sat on the edge.
        pressed && styles.cardPressed,
        style,
      ]}
    >
      <Grain />
      <Frame depth={pressed ? "sunken" : depth} focused={pressed} />
      {children}
    </Pressable>
  );
}

// ── Slot ──────────────────────────────────────────────────────────────────────

export type McSlotProps = {
  children?: ReactNode;
  size?: keyof typeof slotSize | number;
  /** Draws the hotbar selection frame, overhanging the slot as vanilla's does. */
  selected?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

/**
 * An inventory slot: an inset square that an item sits inside.
 *
 * This is the app's unit of "a thing you can pick" — a theme block, an event,
 * a skin. One shape for all of them is what makes the app feel like a single
 * game rather than a set of screens.
 */
export function McSlot({
  children,
  size = "md",
  selected = false,
  onPress,
  style,
  accessibilityLabel,
}: McSlotProps) {
  const edge = px(typeof size === "number" ? size : slotSize[size]);
  const surface = useSurface();
  const Container: any = onPress ? Pressable : View;

  return (
    <Container
      onPress={onPress}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={onPress ? { selected } : undefined}
      // No `overflow: "hidden"` here: the selection frame overhangs the slot
      // and clipping is exactly what would flatten it back into a border.
      style={[styles.slotOuter, { width: edge, height: edge }, style]}
    >
      <View
        style={[
          styles.square,
          styles.slot,
          { backgroundColor: selected ? surface.slotActive : surface.slot },
        ]}
      >
        <Grain />
        <Frame depth="sunken" />
        {children}
      </View>
      {selected ? <SelectionFrame style={styles.selector} /> : null}
    </Container>
  );
}

// ── Text ──────────────────────────────────────────────────────────────────────

export type McTextProps = {
  children: ReactNode;
  size?: number;
  color?: string;
  weight?: "regular" | "bold";
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
};

/**
 * Pixel-font text with the derived drop shadow.
 *
 * The shadow is the highest-leverage detail in the whole redesign: in game
 * *every* piece of UI text has it, and without it even a perfect pixel font
 * reads as flat web typography.
 */
export function McText({
  children,
  size = 14,
  color = "#ffffff",
  weight = "regular",
  style,
  numberOfLines,
}: McTextProps) {
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        { fontFamily: weight === "bold" ? fonts.pixelBold : fonts.pixel, fontSize: px(size), color },
        mcTextShadow(color, size),
        style,
      ]}
    >
      {children}
    </Text>
  );
}

// ── Divider ───────────────────────────────────────────────────────────────────

/** A two-pixel engraved groove, the way in-game panels separate sections. */
export function McDivider({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.divider, style]}>
      <View style={styles.dividerDark} />
      <View style={styles.dividerLight} />
    </View>
  );
}

const styles = StyleSheet.create({
  square: {
    borderRadius: 0,
    overflow: "hidden",
  },
  button: {
    paddingHorizontal: px(18),
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  buttonLabel: {
    fontFamily: fonts.pixelBold,
    fontSize: pxFont(15), lineHeight: Math.round(pxFont(15) * 1.25),
    letterSpacing: px(0.5),
    textTransform: "uppercase",
  },
  cardPressed: { transform: [{ translateY: px(1) }] },
  slotOuter: {
    alignItems: "center",
    justifyContent: "center",
  },
  slot: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  /**
   * Vanilla's selector is 24px over a 20px slot, so it overhangs by 2/20 of the
   * slot on each side. `overflow: "hidden"` on the slot would clip it, so it is
   * rendered with a negative inset and the slot leaves it room.
   */
  selector: {
    top: -px(2),
    left: -px(2),
    right: -px(2),
    bottom: -px(2),
  },
  divider: {
    height: px(2),
    alignSelf: "stretch",
  },
  dividerDark: { flex: 1, backgroundColor: "#0a0909" },
  dividerLight: { flex: 1, backgroundColor: "#4a4543" },
});
