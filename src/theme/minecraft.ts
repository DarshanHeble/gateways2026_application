import type { TextStyle } from "react-native";

import { colors } from "./tokens";
import { px } from "./scale";

/**
 * The Minecraft UI spec, measured rather than invented.
 *
 * Every number below was read out of the game's own GUI textures (Java 1.21.5,
 * `assets/minecraft/textures/gui/`) pixel by pixel. Nothing here is an
 * impression of how Minecraft looks; it is what Minecraft actually is. The
 * textures were read for their geometry and colour only — none of Mojang's
 * artwork ships in this app, and everything is redrawn from these constants.
 *
 * What the measurements showed, and what most "Minecraft-style" UI gets wrong:
 *
 *  1. **There is a 1px pure black outline around every widget.** Button, hotbar
 *     and container panel all have it. It is the single strongest cue that a
 *     surface is a stamped pixel sprite rather than a CSS box, and it is the
 *     thing that is almost always missing.
 *  2. **Inset and raised are opposites, and the light edge is nearly white.**
 *     A container panel is `#ffffff` on top/left over a `#c6c6c6` face. An
 *     inventory slot is the exact inverse: `#373737` on top/left, `#ffffff` on
 *     bottom/right, over `#8b8b8b`. Not "a slightly lighter grey" — white.
 *  3. **The face carries ±3/255 of per-pixel noise.** Barely visible on its own,
 *     but it is why a vanilla surface reads as material and a flat fill does
 *     not. Anything stronger reads as a pattern, which is a different mistake.
 *  4. **The hotbar selector is not white.** It is a pale desaturated green,
 *     `#d5e8d0 → #a1b29d → #5f6d5c` across three pixels, and it overhangs the
 *     20px slot by 2px on every side (24px frame).
 *  5. **Hover is a white outline**, replacing the black one. That is the whole
 *     of vanilla's focus treatment.
 */

// ── Measured constants ────────────────────────────────────────────────────────

/** `gui/container/inventory.png` and `gui/sprites/widget/button.png`. */
export const vanilla = {
  /** The 1px outline stamped around every widget. */
  outline: "#000000",
  /** The outline when a widget is hovered or focused. */
  outlineFocus: "#ffffff",

  /** Container panel: 2px `#ffffff` top/left, `#c6c6c6` face, `#555555` bottom/right. */
  panel: { face: "#c6c6c6", lit: "#ffffff", shade: "#555555" },
  /** Inventory slot: 1px `#373737` top/left, `#8b8b8b` interior, `#ffffff` bottom/right. */
  slot: { face: "#8b8b8b", lit: "#373737", shade: "#ffffff" },
  /** Button: 1px `#aaaaaa` top/left, ~`#6e6e6e` face, `#565656` bottom/right. */
  button: { face: "#6e6e6e", lit: "#aaaaaa", shade: "#565656" },
  /** Button, hovered: the face lifts by 4 and the outline goes white. */
  buttonHover: { face: "#757575", lit: "#afafaf", shade: "#5c5c5c" },
  /** Button, disabled: flat, no highlight. */
  buttonDisabled: { face: "#2c2c2c", lit: "#2c2c2c", shade: "#2c2c2c" },

  /** `gui/sprites/hud/hotbar_selection.png`, read across its 3px frame. */
  selector: ["#d5e8d0", "#a1b29d", "#5f6d5c"] as const,

  /** Hotbar: 20px slot pitch, 24px selector — a 2px overhang per side. */
  hotbarSlot: 20,
  hotbarSelector: 24,

  /** `button.png` is 200x20 nine-sliced with a 3px border. */
  buttonNineSliceBorder: 3,
} as const;

/** The selector's overhang as a fraction of the slot it sits on: 2/20. */
export const SELECTOR_OVERHANG_RATIO = (vanilla.hotbarSelector - vanilla.hotbarSlot) / 2 / vanilla.hotbarSlot;

/**
 * Per-pixel face noise, as an opacity.
 *
 * Measured at ±3 of 255 on the button face, so ±0.012. The dither fills take a
 * light and a dark opacity, which is exactly this in each direction.
 */
export const GRAIN = { light: 0.012, dark: 0.016, size: 2 } as const;

// ── Text ──────────────────────────────────────────────────────────────────────

/**
 * Minecraft draws text twice: once offset down-right in a darkened copy of the
 * colour, then the glyph on top. The darkened copy is the foreground at exactly
 * a quarter brightness — the wiki's formatting table gives §c as foreground
 * `#FF5555` with background `#3F1515`, and 0xFF/4 = 0x3F, 0x55/4 = 0x15.
 *
 * Deriving it means every colour in the app gets the right shadow for free,
 * including ones added later.
 */
export function shadowColorFor(hex: string): string {
  const normalized = hex.replace("#", "");
  const full =
    normalized.length === 3
      ? normalized.split("").map((c) => c + c).join("")
      : normalized.slice(0, 6);

  const quarter = (offset: number) => {
    const value = parseInt(full.slice(offset, offset + 2), 16);
    return Math.floor((Number.isNaN(value) ? 0 : value) / 4)
      .toString(16)
      .padStart(2, "0");
  };

  return `#${quarter(0)}${quarter(2)}${quarter(4)}`;
}

/**
 * The full text-shadow style for a given colour and size.
 *
 * In game the offset is one *font* pixel, so it grows with the glyph rather than
 * staying at a hairline — a 48pt title with a 1px shadow reads as a mistake, not
 * as Minecraft. The game's font is 8px tall with a 1px shadow, so the offset is
 * one eighth of the cap height; ~1/12 of the CSS font size lands in the same
 * place once ascender and line box are accounted for.
 */
export function mcTextShadow(color: string, fontSize: number): TextStyle {
  const offset = Math.max(1, Math.round(fontSize / 12));
  return {
    textShadowColor: shadowColorFor(color),
    textShadowOffset: { width: offset, height: offset },
    textShadowRadius: 0,
  };
}

/**
 * Scale a hex colour's channels by `factor`.
 *
 * Used to make the accent ramps legible in light mode. A block colour is tuned
 * to sit on darkness — gold `#f7cf3f` is beautiful on `#171615` and effectively
 * invisible on `#e6dcd8`. Multiplying toward black keeps the hue, which is the
 * point: the Gold Block theme has to still look like gold, just gold that can
 * be read on paper.
 */
export function scaleColor(hex: string, factor: number): string {
  const n = hex.replace("#", "");
  const full = n.length === 3 ? n.split("").map((c) => c + c).join("") : n.slice(0, 6);
  const ch = (o: number) => {
    const v = parseInt(full.slice(o, o + 2), 16);
    const scaled = Math.round((Number.isNaN(v) ? 0 : v) * factor);
    return Math.min(255, Math.max(0, scaled)).toString(16).padStart(2, "0");
  };
  return `#${ch(0)}${ch(2)}${ch(4)}`;
}

// ── Mojang's own design tokens ────────────────────────────────────────────────

/**
 * The palette from Mojang's product design system (minecraft.net, the Launcher,
 * the Dungeons and Legends sub-brands) rather than from the game's HUD.
 *
 * This is the correction that mattered most. Copying `widgets.png` gives you the
 * in-game *heads-up display* — chunky grey toy buttons, which is right for a
 * hotbar and reads as a child's pixel-art project when it is the whole app. What
 * Mojang's designers actually ship for their products is a different thing: a
 * neutral, warm dark canvas carrying bright content tiles, one brand ramp, and
 * a very large tightly-set display face. Restraint, with the game's language
 * used precisely where it belongs.
 *
 * Note the neutrals are **warm** — `#262423`, `#3d3938`, `#d0c5c0` all carry a
 * red bias. The blue-grey scheme this replaced (`#1f2532`, `#48546b`) is the
 * default of every dark-mode template on the internet, and it is most of why
 * the app read as generic.
 */
export const mojang = {
  /** Canvas, back to front. */
  richBlack: "#000000",
  offBlack: "#171615",
  surface: "#1d1e1e",
  surfaceMid: "#262423",
  surfaceSoft: "#3d3938",
  canvas: "#313131",

  /** Text, brightest to dimmest. */
  offWhite: "#ffffff",
  greyWarm: "#ede5e2",
  grey2: "#d0c5c0",
  grey3: "#aba09c",
  greySoft: "#898481",

  /** The Vanilla green ramp, light to dark. `green3` is the core brand colour. */
  green1: "#a0e081",
  green2: "#86d562",
  green3: "#6cc349",
  green4: "#52a535",
  green5: "#3c8527",
  green6: "#2a641c",

  /** Semantic. */
  warning: "#ff605e",
  focus: "#1157be",

  /** Sub-brand accents. Gateways' own identity is gold, so it sits here. */
  gold: "#fff27a",
  goldDeep: "#ffc42b",
} as const;

/**
 * Surfaces and edges, per colour scheme.
 *
 * Both schemes are built from the same warm ramp and the same structure — 1px
 * near-black outline, a light edge on top/left, a dark edge on bottom/right — so
 * a widget has the same *shape* in either mode and only its values change. That
 * is how vanilla does it too: the container GUI is `#ffffff` over `#c6c6c6` over
 * `#555555`, which is the light scheme here almost exactly.
 *
 * The outline stays near-black in light mode. It is tempting to lighten it, and
 * it is wrong: the hard black stamp is what makes a surface read as a sprite
 * rather than as a CSS card, and vanilla keeps it on its light panels.
 */
export const schemes = {
  dark: {
    surface: {
      /** Behind everything. */
      void: mojang.offBlack,
      /** Standard panel fill — a tile on the dark canvas. */
      stone: mojang.surfaceMid,
      /** A panel that needs to sit forward of another panel. */
      stoneLit: mojang.surfaceSoft,
      /** Inventory slot interior. */
      slot: "#141313",
      /** A slot holding the equipped/selected thing. */
      slotActive: "#33301f",
      /** The grain over a face, as dither opacities. */
      grain: { light: 0.012, dark: 0.016 },
    },
    bevel: {
      /** Panels and tiles. A single warm lift on top, a shadow under. */
      raised: {
        top: { color: "#4a4543", size: 1 },
        left: { color: "#3a3634", size: 1 },
        bottom: { color: "#0e0d0d", size: 2 },
        right: { color: "#0e0d0d", size: 2 },
      },
      /** Slots, inputs, troughs. Lighting flipped, as vanilla inverts it. */
      sunken: {
        top: { color: "#0a0909", size: 2 },
        left: { color: "#0a0909", size: 2 },
        bottom: { color: "#565150", size: 1 },
        right: { color: "#565150", size: 1 },
      },
      /** The one primary action on a screen. */
      gold: {
        top: { color: mojang.gold, size: 1 },
        left: { color: mojang.goldDeep, size: 1 },
        bottom: { color: "#6b5310", size: 2 },
        right: { color: "#6b5310", size: 2 },
      },
      /** Confirmations and anything on the brand ramp. */
      green: {
        top: { color: mojang.green1, size: 1 },
        left: { color: mojang.green2, size: 1 },
        bottom: { color: mojang.green6, size: 2 },
        right: { color: mojang.green6, size: 2 },
      },
    },
    /** The hotbar selector, outward-in. Vanilla's, unchanged. */
    selector: vanilla.selector,
  },

  light: {
    surface: {
      void: "#e6dcd8",
      stone: "#ffffff",
      stoneLit: "#f7f2f0",
      slot: "#d8cdc8",
      // A wash, not a fill. At full saturation every "selected" card became a
      // solid yellow block and the badge on it went yellow-on-yellow; the gold
      // bevel already carries the state.
      slotActive: "#f3e9d2",
      // Flipped bias: on a light face the shading has to carry the texture,
      // because a white speckle on white is invisible.
      grain: { light: 0.02, dark: 0.03 },
    },
    bevel: {
      raised: {
        top: { color: "#ffffff", size: 1 },
        left: { color: "#fbf8f7", size: 1 },
        bottom: { color: "#a9a09c", size: 2 },
        right: { color: "#a9a09c", size: 2 },
      },
      sunken: {
        top: { color: "#9a908c", size: 2 },
        left: { color: "#9a908c", size: 2 },
        bottom: { color: "#ffffff", size: 1 },
        right: { color: "#ffffff", size: 1 },
      },
      gold: {
        top: { color: "#ffe9a8", size: 1 },
        left: { color: "#ffdf86", size: 1 },
        bottom: { color: "#a9791a", size: 2 },
        right: { color: "#a9791a", size: 2 },
      },
      green: {
        top: { color: mojang.green1, size: 1 },
        left: { color: mojang.green2, size: 1 },
        bottom: { color: mojang.green5, size: 2 },
        right: { color: mojang.green5, size: 2 },
      },
    },
    /**
     * The selector, inverted.
     *
     * Vanilla's is a pale green because it sits on a dark hotbar; the same three
     * values on a cream bar are invisible. Inverting to a dark ramp keeps the
     * same three-pixel structure and the same job.
     */
    selector: ["#2f2a28", "#6b6461", "#a9a09c"] as const,
  },
} as const;

export type ColorScheme = keyof typeof schemes;
export type FrameDepth = keyof (typeof schemes)["dark"]["bevel"];

/**
 * The dark scheme's surfaces, as a plain object.
 *
 * Kept because a lot of static `StyleSheet.create` calls reference these, and a
 * stylesheet cannot read context. Anything that must respond to the colour mode
 * takes its fill from `useBlockTheme()` instead; this is for the handful of
 * always-dark surfaces (the character viewport, the splash) that genuinely do
 * not change.
 */
export const material = {
  ...schemes.dark.surface,

  /** Accents. These are brand, so they hold across both schemes. */
  gold: mojang.goldDeep,
  goldText: mojang.gold,
  emerald: mojang.green3,
  diamond: "#4aedd9",
  redstone: mojang.warning,
} as const;

/** The dark bevel set, for the same reason as `material`. */
export const bevel = schemes.dark.bevel;

/** Slot metrics, scaled from vanilla's 18px outer / 16px interior. */
export const slotSize = {
  sm: 34,
  md: 48,
  lg: 72,
} as const;

/**
 * Shorthand for the one rule that is easiest to break and most damaging when
 * broken: nothing in this UI has a radius.
 */
export const SQUARE = { borderRadius: 0 } as const;

/** Standard chunky spacing, in design units. */
export const gap = {
  xs: px(4),
  sm: px(8),
  md: px(12),
  lg: px(18),
  xl: px(26),
} as const;
