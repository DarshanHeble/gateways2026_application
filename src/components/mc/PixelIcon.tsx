import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

/**
 * Icons drawn as actual pixels.
 *
 * The last thing giving the redesign away was the icon set: Ionicons are smooth
 * vector glyphs with rounded joins and antialiased diagonals, and at 22px next
 * to a bitmap font they read as a different app bleeding through. Minecraft's
 * icons are items — a grass block, a clock, a bell — drawn on a small grid with
 * hard edges and no antialiasing, so that is what these are.
 *
 * Each icon is a grid of single-character palette keys, one string per row, and
 * renders as one absolutely-positioned square per non-empty cell. A 12x12 icon
 * is 144 cells at most and in practice ~90 after transparent ones are dropped,
 * which is cheap enough for a tab bar and keeps the icons as data rather than
 * as SVG paths that would need re-tuning at every size.
 *
 * `.` is transparent. Everything else indexes the icon's own palette, so an
 * icon owns its colours the way an item texture does; `tint` overrides the lot
 * for cases (an inactive tab) that need a single flat colour.
 */

export type PixelArt = {
  palette: Record<string, string>;
  rows: string[];
};

const GRASS = "#5fa049";
const GRASS_DARK = "#3f7a42";
const DIRT = "#8a6239";
const DIRT_DARK = "#6b4a2a";
const GOLD = "#fcd12a";
const GOLD_DARK = "#c89a2e";
const INK = "#20160c";
const PAPER = "#f2e6c8";
const REDSTONE = "#c62828";
const WOOD = "#a87a4a";
const WOOD_DARK = "#6b4a2a";
const SKIN = "#e0ac7e";
const HAIR = "#3f2d1c";

/** A grass block, front face. The most recognisable object in the game. */
export const ICON_HOME: PixelArt = {
  palette: { G: GRASS, g: GRASS_DARK, D: DIRT, d: DIRT_DARK },
  rows: [
    "GGGGGGGGGGGG",
    "GgGGgGGGgGGG",
    "gGgGGgGgGGgG",
    "DdDDDdDDdDDD",
    "DDdDDDdDDDdD",
    "dDDDdDDDDdDD",
    "DDDdDDdDDDDd",
    "DdDDDDDdDDDD",
    "DDDDdDDDdDDd",
    "dDDdDDDDDDDD",
    "DDDDDdDDdDDD",
    "DdDDDDDDdDDd",
  ],
};

/** The clock item: gold rim, pale dial, a single dark hand. */
export const ICON_SCHEDULE: PixelArt = {
  palette: { Y: GOLD, y: GOLD_DARK, W: PAPER, K: INK },
  rows: [
    "....yYYy....",
    "..yYWWWWYy..",
    ".yYWWWWWWYy.",
    ".YWWWWKWWWWY",
    "yWWWWWKWWWWy",
    "YWWWWWKWWWWY",
    "YWWWWWKKKWWY",
    "yWWWWWWWWWWy",
    ".YWWWWWWWWY.",
    ".yYWWWWWWYy.",
    "..yYWWWWYy..",
    "....yYYy....",
  ],
};

/** A written book: leather cover, page block, gold clasp. */
export const ICON_EVENTS: PixelArt = {
  palette: { B: "#8a4b2a", b: "#5e3119", P: PAPER, p: "#d6c39a", Y: GOLD },
  rows: [
    ".bbbbbbbbbb.",
    ".bPPPPPPPPb.",
    ".bPppPPppPb.",
    ".bPPPPPPPPb.",
    ".bPppPPppPb.",
    ".bPPPPPPPPb.",
    ".bPppPPppPb.",
    ".bPPPPPPPPb.",
    ".bPppPPppPb.",
    ".bPPPPPPPPb.",
    ".bbbbYYbbbb.",
    "..bbbYYbbb..",
  ],
};

/** The bell block: gold body, dark clapper, wooden yoke. */
export const ICON_ALERTS: PixelArt = {
  palette: { Y: GOLD, y: GOLD_DARK, K: INK, W: WOOD_DARK },
  rows: [
    ".....WW.....",
    "....WWWW....",
    ".....yy.....",
    "....yYYy....",
    "...yYYYYy...",
    "..yYYYYYYy..",
    "..YYYYYYYY..",
    "..YYYYYYYY..",
    ".yYYYYYYYYy.",
    ".YYYYYYYYYY.",
    "yyyyyyyyyyyy",
    "....KKKK....",
  ],
};

/** A crafting table top: the 3x3 grid, which is the game's own "configure". */
export const ICON_SETTINGS: PixelArt = {
  palette: { W: WOOD, w: WOOD_DARK, K: "#4a3520", G: "#c7b28a" },
  rows: [
    "wwwwwwwwwwww",
    "wWWWWWWWWWWw",
    "wWKKWKKWKKWw",
    "wWKGWKGWKGWw",
    "wWWWWWWWWWWw",
    "wWKKWKKWKKWw",
    "wWKGWKGWKGWw",
    "wWWWWWWWWWWw",
    "wWKKWKKWKKWw",
    "wWKGWKGWKGWw",
    "wWWWWWWWWWWw",
    "wwwwwwwwwwww",
  ],
};

/** A player head — the crew. */
export const ICON_CREW: PixelArt = {
  palette: { H: HAIR, S: SKIN, E: "#ffffff", B: "#3b6fe0", M: "#7a4b32", C: "#00aaaa" },
  rows: [
    "..HHHHHHHH..",
    ".HHHHHHHHHH.",
    ".HHHHHHHHHH.",
    ".HSSSSSSSSH.",
    ".HSEBSSEBSH.",
    ".HSSSSSSSSH.",
    ".HSSSSSSSSH.",
    ".HSSMMMMSSH.",
    "..SSSSSSSS..",
    "..CCCCCCCC..",
    ".CCCCCCCCCC.",
    ".CCCCCCCCCC.",
  ],
};

/**
 * A lit redstone torch — the game's own "this sends a signal".
 *
 * A note block with a musical note was the first attempt and it did not survive
 * contact with the grid: at 12px, once the block's 1px border takes two columns
 * on each axis, there is no room left to draw a beamed note that reads as
 * anything but a rectangle. The torch uses the full 12px, has an unmistakable
 * silhouette at any size, and *is* what a broadcast is in Minecraft terms.
 */
export const ICON_SHOUT: PixelArt = {
  palette: { R: "#ff5555", r: REDSTONE, G: "#ffb3b3", W: WOOD, w: WOOD_DARK },
  rows: [
    ".....rr.....",
    "....rRRr....",
    "...rRGGRr...",
    "...rRGGRr...",
    "....rRRr....",
    ".....rr.....",
    ".....Ww.....",
    ".....Ww.....",
    ".....Ww.....",
    ".....Ww.....",
    "....WWww....",
    "....wwww....",
  ],
};

/** A diamond: used wherever something is premium or featured. */
export const ICON_DIAMOND: PixelArt = {
  palette: { D: "#4aedd9", d: "#32b8ab", L: "#b8fff6" },
  rows: [
    "....dddd....",
    "...dLLLLd...",
    "..dLLDDLLd..",
    ".dLLDDDDLLd.",
    "dLLDDDDDDLLd",
    "dLDDDDDDDDLd",
    "dLDDDDDDDDLd",
    ".dDDDDDDDDd.",
    "..dDDDDDDd..",
    "...dDDDDd...",
    "....dDDd....",
    ".....dd.....",
  ],
};

/**
 * Podium ingots — gold, iron, copper for 1st, 2nd, 3rd.
 *
 * Replaces 🥇🥈🥉. Platform emoji are the single most out-of-place thing a
 * themed interface can contain: they render in Apple's house style, at Apple's
 * scale, with Apple's gloss, and no amount of surrounding pixel art survives
 * sitting next to one.
 */
const ingot = (top: string, face: string, shade: string): PixelArt => ({
  palette: { T: top, F: face, S: shade },
  rows: [
    "............",
    "...TTTTTT...",
    "..TTTTTTTT..",
    ".TFFFFFFFFT.",
    ".FFFFFFFFFF.",
    ".FFFFFFFFFF.",
    ".FFFFFFFFFF.",
    ".SFFFFFFFFS.",
    "..SSSSSSSS..",
    "...SSSSSS...",
    "............",
    "............",
  ],
});

export const ICON_GOLD_INGOT = ingot("#fffbe0", "#fcd12a", "#8a5d0c");
export const ICON_IRON_INGOT = ingot("#ffffff", "#cfcfcf", "#6e6e6e");
export const ICON_COPPER_INGOT = ingot("#f2b48c", "#c16a43", "#5e2d18");

/**
 * A player head in a given palette.
 *
 * The crew list rendered the same Steve head three times, which reads as a
 * placeholder rather than as three people. Skins are the whole point of a
 * Minecraft identity, so each crew member gets their own hair and shirt —
 * derived from their name, so the same person is always the same head.
 */
export function crewHead(hair: string, shirt: string, skin = SKIN): PixelArt {
  return {
    palette: { H: hair, S: skin, E: "#ffffff", B: "#3b6fe0", M: "#7a4b32", C: shirt },
    rows: [
      "..HHHHHHHH..",
      ".HHHHHHHHHH.",
      ".HHHHHHHHHH.",
      ".HSSSSSSSSH.",
      ".HSEBSSEBSH.",
      ".HSSSSSSSSH.",
      ".HSSSSSSSSH.",
      ".HSSMMMMSSH.",
      "..SSSSSSSS..",
      "..CCCCCCCC..",
      ".CCCCCCCCCC.",
      ".CCCCCCCCCC.",
    ],
  };
}

/** Hair/shirt pairs to spread crew members across. */
export const CREW_PALETTES: [string, string][] = [
  ["#3f2d1c", "#00aaaa"],
  ["#1c1a18", "#c0392b"],
  ["#8a5a2b", "#2f8f5b"],
  ["#5a3a6b", "#d4a017"],
  ["#2b2b2b", "#3b6fe0"],
  ["#a8541f", "#7d5ba6"],
];

/** Stable index into `CREW_PALETTES` for a name. */
export function paletteIndexFor(key: string): number {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return hash % CREW_PALETTES.length;
}

/** The compass item: iron rim, dark face, red and white needle. For "explore". */
export const ICON_COMPASS: PixelArt = {
  palette: { I: "#b4b4b4", d: "#2e2a33", R: "#e03a3a", W: "#ececec" },
  rows: [
    "....IIII....",
    "..IIddddII..",
    ".IddddddRRI.",
    ".IdddddRRdI.",
    "IdddddRRdddI",
    "IddddRRddddI",
    "IdddWWdddddI",
    "IddWWddddddI",
    ".IWWddddddI.",
    ".IddddddddI.",
    "..IIddddII..",
    "....IIII....",
  ],
};

export const PIXEL_ICONS = {
  compass: ICON_COMPASS,
  gold: ICON_GOLD_INGOT,
  iron: ICON_IRON_INGOT,
  copper: ICON_COPPER_INGOT,
  home: ICON_HOME,
  schedule: ICON_SCHEDULE,
  events: ICON_EVENTS,
  alerts: ICON_ALERTS,
  settings: ICON_SETTINGS,
  crew: ICON_CREW,
  shout: ICON_SHOUT,
  diamond: ICON_DIAMOND,
} as const;

export type PixelIconName = keyof typeof PIXEL_ICONS;

export function PixelIcon({
  name,
  art,
  size = 24,
  tint,
  opacity,
  style,
}: {
  name?: PixelIconName;
  /** An inline sprite, for one-offs that don't belong in the shared set. */
  art?: PixelArt;
  /** Rendered edge length in points. Rounded to a whole number of cells. */
  size?: number;
  /** Flatten the icon to a single colour — for a tab that isn't selected. */
  tint?: string;
  opacity?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const sprite = art ?? (name ? PIXEL_ICONS[name] : undefined);
  if (!sprite) return null;

  const rows = sprite.rows;
  const cols = rows[0]?.length ?? 0;
  if (!cols) return null;

  // Snap the cell to a whole number of device points. A fractional cell leaves
  // seams between the squares, which on a pixel icon is the one artefact that
  // would undo the whole point of drawing it this way.
  const cell = Math.max(1, Math.round(size / cols));
  const width = cell * cols;
  const height = cell * rows.length;

  const cells: React.ReactNode[] = [];
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const key = row[x];
      if (key === "." || key === " ") continue;
      const color = tint ?? sprite.palette[key];
      if (!color) continue;
      cells.push(
        <View
          key={`${x}:${y}`}
          style={{
            position: "absolute",
            left: x * cell,
            top: y * cell,
            width: cell,
            height: cell,
            backgroundColor: color,
          }}
        />,
      );
    }
  });

  return (
    <View style={[styles.canvas, { width, height, opacity }, style]} pointerEvents="none">
      {cells}
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    borderRadius: 0,
    overflow: "hidden",
  },
});

/* ── Glyphs ───────────────────────────────────────────────────────────────────
 *
 * The item icons above are little paintings. These are the opposite: flat
 * single-colour marks — a close cross, a tick, a chevron — that take whatever
 * colour the caller is already using. They exist because an Ionicon at 13px
 * beside a bitmap font is still a smooth antialiased glyph, and at that size
 * the smoothness is the only thing you notice.
 *
 * Drawn on a 9x9 grid rather than 12x12: these sit inline with text, and an odd
 * grid gives a true centre column, which a cross and a pin both need.
 */

const G = "#ffffff"; // replaced by `tint` at every call site

const glyph = (rows: string[]): PixelArt => ({ palette: { X: G }, rows });

export const GLYPHS = {
  close: glyph([
    "XX.....XX",
    "XXX...XXX",
    ".XXX.XXX.",
    "..XXXXX..",
    "...XXX...",
    "..XXXXX..",
    ".XXX.XXX.",
    "XXX...XXX",
    "XX.....XX",
  ]),
  check: glyph([
    ".........",
    ".......XX",
    "......XXX",
    ".....XXX.",
    "XX..XXX..",
    "XXX.XXX..",
    ".XXXXX...",
    "..XXX....",
    "...X.....",
  ]),
  chevronRight: glyph([
    "..XX.....",
    "...XX....",
    "....XX...",
    ".....XX..",
    "......XX.",
    ".....XX..",
    "....XX...",
    "...XX....",
    "..XX.....",
  ]),
  arrowRight: glyph([
    ".........",
    "....XX...",
    ".....XX..",
    "XXXXXXXX.",
    "XXXXXXXXX",
    "XXXXXXXX.",
    ".....XX..",
    "....XX...",
    ".........",
  ]),
  clock: glyph([
    "..XXXXX..",
    ".X..X..X.",
    "X...X...X",
    "X...X...X",
    "X...XXX.X",
    "X.......X",
    "X.......X",
    ".X.....X.",
    "..XXXXX..",
  ]),
  pin: glyph([
    "..XXXXX..",
    ".X.....X.",
    "X..XXX..X",
    "X.X...X.X",
    "X..XXX..X",
    ".X.....X.",
    "..X...X..",
    "...X.X...",
    "....X....",
  ]),
  star: glyph([
    "....X....",
    "....X....",
    "..X.X.X..",
    "...XXX...",
    "XXXXXXXXX",
    "...XXX...",
    "..X.X.X..",
    "....X....",
    "....X....",
  ]),
  sun: glyph([
    "X...X...X",
    ".X..X..X.",
    "..XXXXX..",
    ".XXXXXXX.",
    "XXXXXXXXX",
    ".XXXXXXX.",
    "..XXXXX..",
    ".X..X..X.",
    "X...X...X",
  ]),
  moon: glyph([
    "..XXXX...",
    ".XX......",
    "XX.......",
    "XX.......",
    "XX.......",
    "XX.......",
    "XX.......",
    ".XX......",
    "..XXXX...",
  ]),
  bellOff: glyph([
    "X........",
    ".X.XXX...",
    "..XXXXX..",
    ".XXXXXXX.",
    "XXXXXXXXX",
    "....X..X.",
    "...XXX..X",
    ".........",
    "........X",
  ]),
  door: glyph([
    "XXXXX....",
    "X........",
    "X...X....",
    "X...XX...",
    "X..XXXXXX",
    "X...XX...",
    "X...X....",
    "X........",
    "XXXXX....",
  ]),
  filter: glyph([
    "XXXXXXXXX",
    ".XXXXXXX.",
    "..XXXXX..",
    "...XXX...",
    "....X....",
    "....X....",
    "....X....",
    "....X....",
    "....X....",
  ]),
  phone: glyph([
    ".XXXXXXX.",
    ".X.....X.",
    ".X.....X.",
    ".X.....X.",
    ".X.....X.",
    ".X.....X.",
    ".X.....X.",
    ".X..X..X.",
    ".XXXXXXX.",
  ]),
  mail: glyph([
    "XXXXXXXXX",
    "XX.....XX",
    "X.X...X.X",
    "X..X.X..X",
    "X...X...X",
    "X.......X",
    "X.......X",
    "X.......X",
    "XXXXXXXXX",
  ]),
  lock: glyph([
    "..XXXXX..",
    ".X.....X.",
    ".X.....X.",
    "XXXXXXXXX",
    "XXXXXXXXX",
    "XXXX.XXXX",
    "XXX...XXX",
    "XXXX.XXXX",
    "XXXXXXXXX",
  ]),
  pencil: glyph([
    "......XXX",
    ".....XXXX",
    "....XXXX.",
    "...XXXX..",
    "..XXXX...",
    ".XXXX....",
    "XXXX.....",
    "XXX......",
    "XX.......",
  ]),
  plus: glyph([
    "....X....",
    "....X....",
    "....X....",
    "....X....",
    "XXXXXXXXX",
    "....X....",
    "....X....",
    "....X....",
    "....X....",
  ]),
  eye: glyph([
    ".........",
    "..XXXXX..",
    ".X.....X.",
    "X..XXX..X",
    "X.XXXXX.X",
    "X..XXX..X",
    ".X.....X.",
    "..XXXXX..",
    ".........",
  ]),
  eyeOff: glyph([
    ".........",
    ".........",
    ".........",
    ".XXXXXXX.",
    "X.......X",
    ".........",
    ".X..X..X.",
    ".........",
    ".........",
  ]),
} as const;

export type GlyphName = keyof typeof GLYPHS;

/**
 * A flat single-colour mark, sized and coloured like the text it sits beside.
 *
 * Always pass `color` — the sprite's own palette is a placeholder white that
 * exists only so the grid is valid.
 */
export function McGlyph({
  name,
  size = 14,
  color,
  style,
}: {
  name: GlyphName;
  size?: number;
  color: string;
  style?: StyleProp<ViewStyle>;
}) {
  return <PixelIcon art={GLYPHS[name]} size={size} tint={color} style={style} />;
}
