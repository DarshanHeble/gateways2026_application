import React from "react";
import type { ColorValue } from "react-native";
import Svg, { Path } from "react-native-svg";

/**
 * The tab bar's icons.
 *
 * Drawn on a 24-unit grid in 2-unit steps, so each "pixel" of the glyph is a
 * clean 2pt block at 24pt — hard edges and no antialiasing, like an item in
 * the game's inventory, but with the line quality of a proper icon set rather
 * than the 12x12 sprites `PixelIcon` uses for illustration.
 *
 * Paths from pixelarticons by Gerrit Halfmann (MIT licence),
 * https://github.com/halfmage/pixelarticons
 */

export type TabGlyphName = "home" | "schedule" | "events" | "alerts" | "settings" | "crew" | "shout";

const PATHS: Record<TabGlyphName, string[]> = {
  home: [
    "M4 20h16v2H4zm16-10h2v10h-2zM2 10h2v10H2zm2-2h2v2H4zm2-2h2v2H6zm2-2h2v2H8zm2-2h4v2h-4zm4 2h2v2h-2zm2 2h2v2h-2zm2 2h2v2h-2zM8 14h2v6H8zm2-2h4v2h-4zm4 2h2v6h-2z",
  ],
  schedule: [
    "M5 4h14v2H5zm0 16h14v2H5zM3 10h2v10H3zm0-4h2v2H3zm16 0h2v2h-2zm0 4h2v10h-2zM3 8h18v2H3zm12-6h2v2h-2zM7 2h2v2H7zm0 10h8v2H7zm0 4h4v2H7z",
  ],
  events: [
    "M16 17H13V19H15V21H9V19H11V17H8V15H16V17ZM18 5H22V11H20V7H18V11H20V13H18V15H16V5H8V15H6V13H4V11H6V7H4V11H2V5H6V3H18V5Z",
  ],
  alerts: [
    "M9 2h6v2H9zM7 4h2v2H7zm8 0h2v2h-2zM5 6h2v7H5zm12 0h2v7h-2zM3 13h2v4H3zm16 0h2v4h-2z",
    "M3 15h18v2H3zm5 3h2v2H8zm6 0h2v2h-2zm-4 2h4v2h-4z",
  ],
  settings: [
    "M4 20h3v-2h4v4h2v-4h4v2h-2v4H9v-4H7v2H2v-5h2v3Zm18 2h-5v-2h3v-3h2v5ZM6 11H2v2h4v4H4v-2H0V9h4V7h2v4Zm14-2h4v6h-4v2h-2v-4h4v-2h-4V7h2v2Zm-6 7h-4v-2h4v2Zm-4-2H8v-4h2v4Zm6 0h-2v-4h2v4Zm-2-4h-4V8h4v2ZM7 4H4v3H2V2h5v2Zm8 0h2V2h5v5h-2V4h-3v2h-4V2h-2v4H7V4h2V0h6v4Z",
  ],
  crew: [
    "M5 2h6v2H5zm10 0h4v2h-4zM5 10h6v2H5zm10 0h4v2h-4zm4-6h2v6h-2zm-8 0h2v6h-2zM3 4h2v6H3zM0 18h2v4H0zm14 0h2v4h-2zm8 0h2v4h-2zM4 14h8v2H4zm12 0h4v2h-4zM2 16h2v2H2zm10 0h2v2h-2zm8 0h2v2h-2z",
  ],
  shout: [
    "M4 6h12v2H4zM2 8h2v6H2zm2 6h12v2H4zM20 2h2v18h-2zm-2 16h2v2h-2zm-2-2h2v2h-2zm0-12h2v2h-2zm2-2h2v2h-2zM8 8h2v6H8zm-2 8h2v4H6zm2 4h4v2H8zm2-4h2v4h-2z",
  ],
};

/**
 * Each glyph's inside — the cells its outline encloses — so the selected tab
 * can show its item filled in, the way a held item reads solid and the others
 * read as outlines.
 */
const FILLS: Record<TabGlyphName, string> = {
  home: "M10 4h4v2h-4zM8 6h8v2h-8zM6 8h12v2h-12zM4 10h16v2h-16zM4 12h6v2h-6zM14 12h6v2h-6zM4 14h4v6h-4zM10 14h4v6h-4zM16 14h4v6h-4z",
  schedule: "M5 6h14v2h-14zM5 10h14v2h-14zM5 12h2v2h-2zM15 12h4v2h-4zM5 14h14v2h-14zM5 16h2v2h-2zM11 16h8v2h-8zM5 18h14v2h-14z",
  events: "M8 5h8v10h-8zM4 7h2v4h-2zM18 7h2v4h-2z",
  alerts: "M9 4h6v2h-6zM7 6h10v7h-10zM5 13h14v2h-14z",
  settings: "M11 2h2v4h-2zM4 4h3v2h-3zM17 4h3v2h-3zM4 6h16v1h-16zM6 7h12v1h-12zM6 8h4v2h-4zM14 8h4v2h-4zM6 10h2v1h-2zM10 10h4v4h-4zM16 10h2v1h-2zM2 11h6v2h-6zM16 11h6v2h-6zM6 13h2v1h-2zM16 13h2v1h-2zM6 14h4v2h-4zM14 14h4v2h-4zM6 16h12v1h-12zM4 17h16v1h-16zM4 18h3v2h-3zM11 18h2v4h-2zM17 18h3v2h-3z",
  crew: "M5 4h6v6h-6zM13 4h6v6h-6zM4 16h8v2H4zM2 18h12v4H2zM16 16h4v2h-4zM16 18h6v4h-6z",
  shout: "M18 4h2v2h-2zM16 6h4v2h-4zM4 8h4v6h-4zM10 8h10v6h-10zM16 14h4v2h-4zM8 16h2v4h-2zM18 16h2v2h-2z",
};

/** Light fill under dark ink, a dark wash under white ink. */
function fillFor(color: ColorValue): string {
  return String(color).toLowerCase() === "#ffffff" ? "rgba(0,0,0,0.28)" : "rgba(255,255,255,0.6)";
}

export function TabGlyph({
  name,
  size,
  color,
  filled,
}: {
  name: TabGlyphName;
  size: number;
  color: ColorValue;
  filled?: boolean;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {filled ? <Path d={FILLS[name]} fill={fillFor(color)} /> : null}
      {PATHS[name].map((d, i) => (
        <Path key={i} d={d} fill={color} />
      ))}
    </Svg>
  );
}
