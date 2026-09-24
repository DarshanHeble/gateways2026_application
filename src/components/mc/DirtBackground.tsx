import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Defs, Pattern, Rect } from "react-native-svg";

import { px } from "@/theme/scale";
import { scaleColor } from "@/theme/minecraft";
import { useBlockTheme } from "@/theme/BlockThemeContext";

/**
 * The dirt menu background.
 *
 * Minecraft's classic menus are not drawn on flat black — they are drawn on the
 * dirt block texture, tiled across the screen and darkened to about a quarter
 * brightness. It is the single most recognisable backdrop in the game, and it
 * is the reason a vanilla menu feels like it is *inside* the world rather than
 * floating on a void.
 *
 * Generated here rather than shipped: the layout below is a 16x16 speckle
 * pattern in the dirt palette, written out as SVG rects, so no Mojang artwork is
 * redistributed and the tile scales with the app's design units. The speckle
 * positions are a fixed hand-picked set rather than random, because a `Math.
 * random()` pattern would re-roll on every render and shimmer.
 */

let uid = 0;

/** A 16x16 dirt tile, as (x, y, shade) triples. 0 = base, 1 = dark, 2 = light. */
const SPECKLES: [number, number, number][] = [
  [1, 0, 1], [5, 0, 2], [10, 0, 1], [14, 0, 1],
  [3, 1, 1], [7, 1, 1], [12, 1, 2],
  [0, 2, 2], [6, 2, 1], [9, 2, 1], [15, 2, 1],
  [2, 3, 1], [8, 3, 2], [13, 3, 1],
  [4, 4, 1], [11, 4, 1],
  [1, 5, 2], [7, 5, 1], [14, 5, 1],
  [5, 6, 1], [9, 6, 2], [12, 6, 1],
  [0, 7, 1], [3, 7, 1], [15, 7, 2],
  [6, 8, 1], [10, 8, 1], [13, 8, 1],
  [2, 9, 2], [8, 9, 1],
  [4, 10, 1], [11, 10, 2], [14, 10, 1],
  [1, 11, 1], [7, 11, 1], [9, 11, 1],
  [5, 12, 2], [12, 12, 1], [15, 12, 1],
  [0, 13, 1], [3, 13, 1], [10, 13, 2],
  [6, 14, 1], [13, 14, 1],
  [2, 15, 1], [8, 15, 1], [11, 15, 1], [14, 15, 2],
];

export function DirtBackground({
  /** Brightness, as a fraction. Vanilla darkens the menu backdrop to ~0.25. */
  brightness = 0.25,
  /** Tile size in design units. 16 matches a block's texel grid. */
  tile = 16,
  style,
}: {
  brightness?: number;
  tile?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { isDark } = useBlockTheme();
  const id = `dirt${uid++}`;
  const unit = px(tile) / 16;
  const size = px(tile);

  /*
   * Light mode does not get dark dirt.
   *
   * Darkening the dirt block is what makes the backdrop work on a dark canvas,
   * and applying the same transform on a light one paints a near-black sheet
   * over a warm off-white page — which is exactly what happened: the Events
   * heading rendered dark-on-dark and vanished. So the light scheme tiles a
   * *pale* dirt instead, sitting a shade under the canvas so it reads as paper
   * texture rather than as soil.
   */
  const shades = isDark
    ? [scaleColor("#8a6239", brightness), scaleColor("#6b4a2a", brightness), scaleColor("#a87a4a", brightness)]
    : ["#ded3ce", "#d3c7c1", "#e9e1dc"];

  return (
    <View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id={id} patternUnits="userSpaceOnUse" width={size} height={size}>
            <Rect x={0} y={0} width={size} height={size} fill={shades[0]} />
            {SPECKLES.map(([x, y, shade], i) => (
              <Rect
                key={i}
                x={x * unit}
                y={y * unit}
                width={unit}
                height={unit}
                fill={shades[shade]}
              />
            ))}
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}
