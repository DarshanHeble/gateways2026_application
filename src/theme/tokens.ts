/**
 * Palette and type scale lifted verbatim from the `Gateways 2026 Parallax`
 * design file. Grouped the way the scene is layered, back to front.
 */

export const colors = {
  // Frame / void behind everything
  void: "#0b0c12",
  voidDeep: "#07080c",
  stage: "#0d1018",

  // Sunrise sky ramp, night at the top to warm haze at the horizon
  sky: {
    night: "#0f1c44",
    dusk: "#22326b",
    violet: "#4b5a92",
    mauve: "#8b7ba6",
    ember: "#d9865c",
    amber: "#f5b675",
    peach: "#ffd8a4",
    cream: "#ffe9c8",
  },

  grass: {
    canopy: "#3f7a42",
    deep: "#2a5230",
    shade: "#1d3a23",
    dark: "#31703a",
    mid: "#3f8a46",
    bright: "#5fa049",
    tuft: "#6bb45a",
  },

  dirt: {
    shadow: "#2a2113",
    mid: "#3b2b17",
    light: "#4a3520",
    clay: "#8a6239",
    loam: "#6b4a2a",
  },

  /** Vertical plank stripe: 4px each, 12px repeat. */
  plank: ["#5b3d21", "#432c15", "#6b4a2a"] as const,

  /** Notice board horizontal planks: 13px band, 1px seam, repeated. */
  board: {
    plankA: "#7d5634",
    seamA: "#5c3f22",
    plankB: "#74502f",
    seamB: "#553a1f",
    base: "#6b4a2a",
  },

  stone: {
    base: "#7d8394",
    light: "#8a8f9e",
    castle: "#6e7386",
    castleDark: "#5b6076",
    screw: "#cdd3dd",
    roof: "#8c3b2e",
  },

  ridge: {
    near: "#57668f",
    far: "#4e5c85",
    farther: "#4a5880",
    cap: "#62729c",
    snow: "#d3dbec",
  },

  gold: {
    bright: "#ffd25e",
    title: "#ffe9b8",
    text: "#ffe9c4",
    muted: "#e0b877",
    label: "#c8a679",
    deepShadow: "#2a1a0c",
  },

  cyan: "#63d9e8",

  cta: {
    lit: "#3ee89a",
    mid: "#1fbf74",
    deep: "#149a5b",
    base: "#0a5c38",
    ink: "#053c25",
    glow: "#7dffc0",
  },

  google: {
    lit: "#e6cfa2",
    mid: "#cdb184",
    deep: "#b89a6d",
    base: "#8a7048",
    ink: "#4a3018",
    red: "#ea4335",
    yellow: "#fbbc05",
    blue: "#4285f4",
    green: "#34a853",
    chip: "#fdfdfb",
  },

  input: {
    frame: "#2a1a0c",
    field: "#3b2a17",
    text: "#ffe9c4",
    placeholder: "#8b7a63",
  },

  flame: {
    outer: "#ff8a2b",
    mid: "#ffd25e",
    core: "#fff8e0",
    window: "#ffcf7a",
    windowAlt: "#ffbe63",
  },

  water: { lit: "#4d93e4", deep: "#2f6fd0" },

  slime: { body: "rgba(96,214,150,0.82)", eye: "#123d2c" },

  flowers: ["#d94b3b", "#ffd25e", "#f4a7c3", "#9b8cff"] as const,

  firefly: ["#ffe08a", "#fff3c4", "#c9ff9a"] as const,
  leaf: ["#7ec25f", "#5ea94a", "#c9d96a"] as const,

  bird: "#3a3040",
  link: "#9ecfe0",
  linkRule: "#6f93a3",
  body: "#e7cfa6",
  rule: "#c8763f",
  plaque: "rgba(255,238,205,0.92)",
} as const;

export const fonts = {
  /*
   * The Minecraft UI typeface (OFL 1.1, IdreesInc/minecraft-font), not a
   * generic pixel face. It has only two weights because the game's font has
   * only two, so `pixelMedium` maps to regular rather than inventing a weight
   * the typeface does not have.
   */
  pixel: "Minecraft",
  pixelMedium: "Minecraft",
  pixelBold: "MinecraftBold",
  /*
   * Display: headings, names, titles. Pixelify Sans rather than the Minecraft
   * face — the game's font is drawn for 8px HUD text and at heading sizes its
   * one-pixel strokes turn thin and spiky. Pixelify is a pixel face drawn for
   * display, with real weights, so a 40pt title is solid and legible while still
   * reading as blocks. The Minecraft face keeps the small HUD-like labels
   * (eyebrows, tags, tab names, tooltips), which is where it looks authentic.
   */
  display: "PixelifySans_700Bold",
  displayMedium: "PixelifySans_500Medium",
  // DM Sans for normal text
  body: "SpaceGrotesk_400Regular",
  bodyMedium: "SpaceGrotesk_500Medium",
  bodySemi: "SpaceGrotesk_700Bold", // Use bold for semi
  bodyBold: "SpaceGrotesk_700Bold",
  // Fallbacks if used somewhere specifically
  rubikRegular: "SpaceGrotesk_400Regular",
  rubikBold: "SpaceGrotesk_700Bold",
} as const;

/**
 * Type ramp. Sizes and letter spacing are in design units — React Native's
 * `letterSpacing` is absolute points, so the CSS values carry over 1:1 once
 * scaled by `px()`.
 */
export const type = {
  department: { size: 9, tracking: 3, color: colors.gold.muted },
  wordmark: { size: 31, tracking: 1, color: colors.gold.title },
  year: { size: 13, tracking: 5, color: colors.cyan },
  theme: { size: 16, tracking: 9, color: colors.cta.glow },
  tagline: { size: 11, lineHeight: 16.5, color: colors.body },
  welcome: { size: 11, tracking: 1, color: colors.gold.bright },
  fieldLabel: { size: 8, tracking: 2, color: colors.gold.label },
  fieldValue: { size: 12, color: colors.input.text },
  link: { size: 8, tracking: 1, color: colors.link },
  cta: { size: 15, tracking: 4, color: colors.cta.ink },
  ctaAlt: { size: 10, tracking: 1, color: colors.google.ink },
  plaque: { size: 7.5, tracking: 1.6, color: colors.plaque },
  toast: { size: 9, tracking: 1.5, color: colors.gold.text },
} as const;

/**
 * The spacing rhythm — Mojang's 8-step scale.
 *
 * Every gap and pad in the app should land on one of these. Ad-hoc values
 * (px(14), px(18), px(22)) are what make a layout feel hand-placed rather than
 * composed, because nothing lines up with anything a screen away.
 */
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 32,
  "3xl": 48,
  "4xl": 64,
} as const;

/** Durations (ms) for the ambient loops, matching the CSS keyframes. */
export const motion = {
  driftFast: 46_000,
  driftMid: 72_000,
  driftSlow: 92_000,
  birdFly: 30_000,
  shimmer: 3_400,
  waterShift: 3_000,
  hop: 3_400,
  gate: 1_350,
  toast: 2_200,
} as const;

/**
 * Global App Typography
 * Standardized typography variables to keep sizing and fonts consistent across the app.
 */
export const typography = {
  // Massive screen headers
  /**
   * Display type — in the display pixel face (see `fonts.display`).
   *
   * The Launcher's own split: headings, names, labels and numbers are set in
   * the game's typeface; paragraphs and small metadata stay in the sans, where
   * a bitmap face at 13pt would cost readability for no gain. The pixel face
   * never takes negative tracking (it would fuse the glyphs), and its line box
   * is exactly 1em, so every size here carries a line height of ~1.15em to keep
   * descenders and the drop shadow from clipping.
   */
  hero: {
    fontFamily: fonts.display,
    fontSize: 40,
    lineHeight: 46,
    letterSpacing: 0,
  },
  // Sub-headers or Kickers (WELCOME BACK)
  // Main page headers (Events, Schedule, Alerts)
  pageTitle: {
    fontFamily: fonts.display,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: 0.5,
  },
  /**
   * Eyebrow labels, in the pixel face at Mojang's tracking (16px / 0.96px).
   * These are the small all-caps lines above a heading or over a tile.
   */
  kicker: {
    fontFamily: fonts.pixelBold,
    fontSize: 16,
    letterSpacing: 0.96,
  },
  /** The smaller eyebrow: 14px / 0.56px. */
  eyebrow: {
    fontFamily: fonts.pixelBold,
    fontSize: 14,
    letterSpacing: 0.56,
  },
  // Large modal or page headers
  h1: {
    fontFamily: fonts.display,
    fontSize: 24,
    letterSpacing: 0.3,
  },
  // Medium section headers
  h2: {
    fontFamily: fonts.display,
    fontSize: 20,
    letterSpacing: 0.3,
  },
  /*
   * Card titles.
   *
   * Also the sans. In the pixel face these were both unprofessional *and*
   * broken — real event names ran out of column and split mid-word
   * ("Inauguratio / n Ceremony"), because the bitmap face sets very wide and
   * has no hyphenation to fall back on.
   */
  h3: {
    fontFamily: fonts.display,
    fontSize: 16,
    letterSpacing: 0.2,
  },
  /*
   * Body sits at 15/16, not 17/19.
   *
   * Mojang's own scale puts body and CTAs at 14–16px and reserves size for the
   * display face. Running body at 17–19 next to a 46px pixel masthead flattens
   * the hierarchy — everything ends up "quite big" and nothing leads — and it is
   * a large part of why the screens read as loose rather than composed.
   */
  subtitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 21,
  },
  // Smaller metadata (times, venues)
  caption: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13.5,
  },
  // Labels, tags, badges
  tag: {
    fontFamily: fonts.pixelBold,
    fontSize: 13.5,
    letterSpacing: 0.5,
  }
} as const;
