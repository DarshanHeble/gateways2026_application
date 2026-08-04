import { StyleSheet, View, type ViewStyle, type StyleProp } from "react-native";
import Svg, { Defs, Pattern, Rect } from "react-native-svg";

import { colors } from "@/theme/tokens";
import { px } from "@/theme/scale";

/**
 * React Native's `experimental_backgroundImage` covers linear/radial gradients
 * but not `repeating-linear-gradient` or `repeating-conic-gradient`, which the
 * design uses for every wooden and earthen surface. SVG `<Pattern>` reproduces
 * them exactly and tiles for free.
 */

let uid = 0;
const nextId = (prefix: string) => `${prefix}${uid++}`;

type FillProps = { style?: StyleProp<ViewStyle> };

/**
 * Vertical wood planks.
 * `repeating-linear-gradient(90deg,#5b3d21 0 4px,#432c15 4px 8px,#6b4a2a 8px 12px)`
 */
export function PlankFill({ style }: FillProps) {
  const id = nextId("plank");
  const unit = px(4);
  return (
    <View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id={id} patternUnits="userSpaceOnUse" width={unit * 3} height={unit}>
            <Rect x={0} y={0} width={unit} height={unit} fill={colors.plank[0]} />
            <Rect x={unit} y={0} width={unit} height={unit} fill={colors.plank[1]} />
            <Rect x={unit * 2} y={0} width={unit} height={unit} fill={colors.plank[2]} />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

/**
 * The notice board's horizontal planking.
 * `repeating-linear-gradient(0deg,#7d5634 0 13px,#5c3f22 13px 14px,#74502f 14px 27px,#553a1f 27px 28px)`
 */
export function BoardFill({ style }: FillProps) {
  const id = nextId("board");
  const a = px(13);
  const seam = px(1);
  const period = a * 2 + seam * 2;
  return (
    <View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id={id} patternUnits="userSpaceOnUse" width={period} height={period}>
            <Rect x={0} y={0} width={period} height={a} fill={colors.board.plankA} />
            <Rect x={0} y={a} width={period} height={seam} fill={colors.board.seamA} />
            <Rect x={0} y={a + seam} width={period} height={a} fill={colors.board.plankB} />
            <Rect x={0} y={a * 2 + seam} width={period} height={seam} fill={colors.board.seamB} />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

/**
 * The pixel-art dither the design lays over grass, dirt and stone:
 * `repeating-conic-gradient(from 0deg at 50% 50%, <light> 0% 25%, <dark> 0% 50%) 0 0/Npx Npx`
 * — a 2x2 checkerboard inside each N-pixel tile. Render it over a solid
 * background colour.
 */
export function DitherFill({
  size = 5,
  light = 0.09,
  dark = 0.19,
  style,
}: FillProps & { size?: number; light?: number; dark?: number }) {
  const id = nextId("dither");
  const half = px(size) / 2;
  const w = `rgba(255,255,255,${light})`;
  const b = `rgba(0,0,0,${dark})`;
  return (
    <View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id={id} patternUnits="userSpaceOnUse" width={half * 2} height={half * 2}>
            {/* conic quadrants: TR light, BR dark, BL light, TL dark */}
            <Rect x={half} y={0} width={half} height={half} fill={w} />
            <Rect x={half} y={half} width={half} height={half} fill={b} />
            <Rect x={0} y={half} width={half} height={half} fill={w} />
            <Rect x={0} y={0} width={half} height={half} fill={b} />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

/**
 * Evenly spaced vertical bars — grass tufts, the notice board's dashed rule,
 * the castle's crenellations, the fountain's water striping.
 */
export function StripeFill({
  color,
  bar,
  gap,
  style,
}: FillProps & { color: string; bar: number; gap: number }) {
  const id = nextId("stripe");
  const b = px(bar);
  const period = px(bar + gap);
  return (
    <View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id={id} patternUnits="userSpaceOnUse" width={period} height={period}>
            <Rect x={0} y={0} width={b} height={period} fill={color} />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

/**
 * The masonry hatching on the castle blocks: 1px dark lines every 11px
 * horizontally and every 22px vertically, over a solid stone colour.
 */
export function MasonryFill({ style }: FillProps) {
  const id = nextId("masonry");
  const w = px(22);
  const h = px(11);
  const line = Math.max(StyleSheet.hairlineWidth, px(1));
  return (
    <View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id={id} patternUnits="userSpaceOnUse" width={w} height={h}>
            <Rect x={0} y={0} width={w} height={line} fill="rgba(0,0,0,0.30)" />
            <Rect x={0} y={0} width={line} height={h} fill="rgba(0,0,0,0.26)" />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}
