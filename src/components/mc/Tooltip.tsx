import { useState, type ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import { px } from "@/theme/scale";

/**
 * Minecraft's tooltip — the panel that appears when you hover an item.
 *
 * It is the most recognisable floating surface in the game, and the right
 * vocabulary for anything that floats over the app. Drawn to vanilla's own
 * spec (`TooltipRenderUtil`):
 *
 *  - background `#100010` at 0xF0 alpha — near-black with a violet cast;
 *  - a 1px border *inside* the background, a vertical gradient from
 *    `#5000FF` to `#28007F`, both at 0x50 alpha;
 *  - corners knocked out by one pixel, which is what makes it read as a
 *    tooltip rather than as a dark box.
 *
 * It stays dark in both colour modes. It is an in-game overlay, and the game's
 * is dark whatever is behind it.
 *
 * Drawn in SVG from the measured size rather than as nested views so the notch
 * and the gradient border are exact at any size.
 */

const BG = "#100010";
const BG_ALPHA = 0xf0 / 255;
const BORDER_TOP = "#5000ff";
const BORDER_BOTTOM = "#28007f";
const BORDER_ALPHA = 0x50 / 255;

/** One tooltip pixel, in points. */
const U = px(2);

let uid = 0;

export function Tooltip({
  children,
  style,
  padding = px(8),
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  padding?: number;
}) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [id] = useState(() => `tooltipBorder${uid++}`);
  const { w, h } = size;

  return (
    <View
      style={[{ padding: padding + U }, style]}
      onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
    >
      {w > 0 ? (
        <Svg style={StyleSheet.absoluteFill} width={w} height={h} pointerEvents="none">
          <Defs>
            <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={BORDER_TOP} stopOpacity={BORDER_ALPHA} />
              <Stop offset="100%" stopColor={BORDER_BOTTOM} stopOpacity={BORDER_ALPHA} />
            </LinearGradient>
          </Defs>

          {/* Background as three non-overlapping bands, so the corner pixels
              are missing and no area is painted twice at partial alpha. */}
          <Rect x={0} y={U} width={w} height={h - U * 2} fill={BG} fillOpacity={BG_ALPHA} />
          <Rect x={U} y={0} width={w - U * 2} height={U} fill={BG} fillOpacity={BG_ALPHA} />
          <Rect x={U} y={h - U} width={w - U * 2} height={U} fill={BG} fillOpacity={BG_ALPHA} />

          {/* The gradient border, one pixel in from the background's edge. */}
          <Rect
            x={U * 1.5}
            y={U * 1.5}
            width={w - U * 3}
            height={h - U * 3}
            fill="none"
            stroke={`url(#${id})`}
            strokeWidth={U}
          />
        </Svg>
      ) : null}
      {children}
    </View>
  );
}
