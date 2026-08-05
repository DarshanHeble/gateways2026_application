import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";

import { px } from "@/theme/scale";

let uid = 0;
const nextId = (prefix: string) => `${prefix}${uid++}`;

type Edge = number | undefined;

export type BlockProps = {
  /** Offsets and size in design units (the 390x844 canvas). */
  t?: Edge;
  r?: Edge;
  b?: Edge;
  l?: Edge;
  w?: Edge;
  h?: Edge;
  bg?: string;
  /** Rendered above the background but below `children`. */
  fill?: ReactNode;
  opacity?: number;
  zIndex?: number;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  clip?: boolean;
};

/**
 * An absolutely positioned rectangle in design units — the design is built
 * almost entirely out of these, so this keeps the scene code a near-literal
 * transcription of the source.
 */
export function Block({
  t,
  r,
  b,
  l,
  w,
  h,
  bg,
  fill,
  opacity,
  zIndex,
  style,
  children,
  clip,
}: BlockProps) {
  return (
    <View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          top: t === undefined ? undefined : px(t),
          right: r === undefined ? undefined : px(r),
          bottom: b === undefined ? undefined : px(b),
          left: l === undefined ? undefined : px(l),
          width: w === undefined ? undefined : px(w),
          height: h === undefined ? undefined : px(h),
          backgroundColor: bg,
          opacity,
          zIndex,
          overflow: clip ? "hidden" : undefined,
        },
        style,
      ]}
    >
      {fill}
      {children}
    </View>
  );
}

export type BevelSpec = { color: string; size: number };

/**
 * Every `inset ... 0` shadow in the design has zero blur, i.e. it is a solid
 * strip along one edge. Drawing those strips explicitly is pixel-identical to
 * the CSS, stays crisp, and avoids RN's platform limits on inset `boxShadow`.
 */
export function Bevel({
  top,
  bottom,
  left,
  right,
}: {
  top?: BevelSpec;
  bottom?: BevelSpec;
  left?: BevelSpec;
  right?: BevelSpec;
}) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {top ? (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: px(top.size),
            backgroundColor: top.color,
          }}
        />
      ) : null}
      {bottom ? (
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: px(bottom.size),
            backgroundColor: bottom.color,
          }}
        />
      ) : null}
      {left ? (
        <View
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 0,
            width: px(left.size),
            backgroundColor: left.color,
          }}
        />
      ) : null}
      {right ? (
        <View
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            right: 0,
            width: px(right.size),
            backgroundColor: right.color,
          }}
        />
      ) : null}
    </View>
  );
}

export type GlowStop = { offset: number; color: string; opacity?: number };

/**
 * `radial-gradient(...)` as an SVG node — used for the sun halo, torch light,
 * the gate flare and the scene vignette.
 */
export function RadialGlow({
  stops,
  cx = "50%",
  cy = "50%",
  rx = "50%",
  ry = "50%",
  style,
}: {
  stops: GlowStop[];
  cx?: string;
  cy?: string;
  rx?: string;
  ry?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const id = nextId("glow");
  return (
    <View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient id={id} cx={cx} cy={cy} rx={rx} ry={ry} gradientUnits="objectBoundingBox">
            {stops.map((s, i) => (
              <Stop
                key={i}
                offset={`${s.offset}%`}
                stopColor={s.color}
                stopOpacity={s.opacity ?? 1}
              />
            ))}
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

/**
 * A pixel torch flame: the design's `clip-path` pentagon plus its two inner
 * cores. Built from stacked rectangles so it stays hard-edged at any scale.
 */
export function FlameShape() {
  return (
    <View style={{ width: px(13), height: px(17) }} pointerEvents="none">
      {/* pentagon approximated as a stepped pixel silhouette */}
      <View
        style={{
          position: "absolute",
          left: px(5),
          top: 0,
          width: px(3),
          height: px(3),
          backgroundColor: "#ff8a2b",
        }}
      />
      <View
        style={{
          position: "absolute",
          left: px(3),
          top: px(3),
          width: px(7),
          height: px(4),
          backgroundColor: "#ff8a2b",
        }}
      />
      <View
        style={{
          position: "absolute",
          left: px(1),
          top: px(7),
          width: px(11),
          height: px(7),
          backgroundColor: "#ff8a2b",
        }}
      />
      <View
        style={{
          position: "absolute",
          left: px(2),
          top: px(14),
          width: px(9),
          height: px(3),
          backgroundColor: "#ff8a2b",
        }}
      />
      <View
        style={{
          position: "absolute",
          left: px(3),
          top: px(5),
          width: px(7),
          height: px(10),
          backgroundColor: "#ffd25e",
        }}
      />
      <View
        style={{
          position: "absolute",
          left: px(4),
          top: px(9),
          width: px(5),
          height: px(5),
          backgroundColor: "#fff8e0",
        }}
      />
    </View>
  );
}
