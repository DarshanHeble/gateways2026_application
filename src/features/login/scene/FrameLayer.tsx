import { View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import { colors } from "@/theme/tokens";
import { px, DESIGN_HEIGHT } from "@/theme/scale";
import { Block, Bevel } from "@/components/pixel/Primitives";
import { DitherFill, PlankFill } from "@/components/pixel/Fills";

/** A three-tier pixel bush. Offsets are bottom-anchored, as in the source. */
type BushTier = { b: number; l?: number; r?: number; w: number; h: number };
type Bush = { top: number; l?: number; r?: number; w: number; h: number; color: string; trunk: BushTier; tiers: BushTier[] };

/**
 * The source anchors these at `bottom:714/716` inside the 844-tall stage, i.e.
 * just under the tree line. Converted to top offsets with an explicit box so
 * nothing relies on overflow from a zero-height parent.
 */
const BUSHES: Bush[] = [
  {
    top: DESIGN_HEIGHT - 714 - 60,
    l: 4,
    w: 52,
    h: 60,
    color: colors.grass.dark,
    trunk: { b: 0, l: 20, w: 12, h: 24 },
    tiers: [
      { b: 16, l: 0, w: 52, h: 22 },
      { b: 38, l: 9, w: 33, h: 14 },
      { b: 51, l: 19, w: 15, h: 9 },
    ],
  },
  {
    top: DESIGN_HEIGHT - 716 - 46,
    l: 58,
    w: 40,
    h: 46,
    color: colors.grass.mid,
    trunk: { b: 0, l: 14, w: 12, h: 18 },
    tiers: [
      { b: 10, l: 0, w: 40, h: 17 },
      { b: 27, l: 7, w: 26, h: 10 },
      { b: 37, l: 14, w: 11, h: 9 },
    ],
  },
  {
    top: DESIGN_HEIGHT - 714 - 65,
    r: 2,
    w: 56,
    h: 65,
    color: colors.grass.dark,
    trunk: { b: 0, r: 22, w: 12, h: 26 },
    tiers: [
      { b: 18, r: 0, w: 56, h: 24 },
      { b: 42, r: 10, w: 36, h: 15 },
      { b: 56, r: 20, w: 16, h: 9 },
    ],
  },
  {
    top: DESIGN_HEIGHT - 716 - 41,
    r: 62,
    w: 36,
    h: 41,
    color: colors.grass.mid,
    trunk: { b: 0, r: 12, w: 12, h: 16 },
    tiers: [
      { b: 8, r: 0, w: 36, h: 15 },
      { b: 23, r: 6, w: 23, h: 9 },
      { b: 32, r: 13, w: 10, h: 9 },
    ],
  },
];

export function TopBushes() {
  return (
    <>
      {BUSHES.map((bush, i) => (
        <Block key={i} t={bush.top} l={bush.l} r={bush.r} w={bush.w} h={bush.h}>
          <Block {...bush.trunk} fill={<PlankFill />} />
          {bush.tiers.map((tier, j) => (
            <Block key={j} {...tier} bg={bush.color} fill={<DitherFill size={5} />} />
          ))}
        </Block>
      ))}
    </>
  );
}

/**
 * The horizon shelf the notice board hangs against: a soil band capped with
 * grass, plus a warm haze bleeding down from the sunrise.
 */
export function MidGround() {
  return (
    <>
      <Block t={132} l={0} r={0} h={40} bg={colors.dirt.clay} fill={<DitherFill size={7} light={0.06} dark={0.13} />} />
      <Block t={132} l={0} r={0} h={12} bg={colors.grass.bright} fill={<DitherFill size={6} light={0.11} dark={0.11} />}>
        <Bevel top={{ color: "rgba(255,255,255,0.2)", size: 3 }} />
      </Block>
      <Block t={150} l={0} r={0} h={56}>
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id="haze" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#ffd6a8" stopOpacity={0.5} />
              <Stop offset="100%" stopColor="#ffd6a8" stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#haze)" />
        </Svg>
      </Block>
    </>
  );
}

/** Full-height wooden posts framing the viewport, as if peering out of a hut. */
export function Pillars() {
  return (
    <>
      <View style={{ position: "absolute", bottom: 0, left: px(-6), width: px(32), top: 0 }}>
        <PlankFill />
        <Bevel
          left={{ color: "rgba(255,220,170,0.08)", size: 5 }}
          right={{ color: "rgba(0,0,0,0.42)", size: 7 }}
        />
      </View>
      <View style={{ position: "absolute", bottom: 0, right: px(-6), width: px(26), top: px(54) }}>
        <PlankFill />
        <Bevel
          left={{ color: "rgba(0,0,0,0.42)", size: 7 }}
          right={{ color: "rgba(255,220,170,0.08)", size: 5 }}
        />
      </View>
    </>
  );
}

/** Leaf canopy pushing into the top two corners. */
export function Canopies() {
  return (
    <>
      <Block t={0} l={-14} w={104} h={46} bg={colors.grass.dark} fill={<DitherFill size={5} />}>
        <Bevel bottom={{ color: "rgba(0,0,0,0.28)", size: 4 }} />
      </Block>
      <Block t={46} l={-14} w={62} h={20} bg={colors.grass.dark} fill={<DitherFill size={5} />} />
      <Block t={0} r={-16} w={88} h={38} bg={colors.grass.mid} fill={<DitherFill size={5} light={0.1} dark={0.17} />}>
        <Bevel bottom={{ color: "rgba(0,0,0,0.28)", size: 4 }} />
      </Block>
      <Block t={38} r={-16} w={52} h={18} bg={colors.grass.mid} fill={<DitherFill size={5} light={0.1} dark={0.17} />} />
    </>
  );
}
