import { View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import Animated, { useAnimatedStyle } from "react-native-reanimated";

import { colors, motion } from "@/theme/tokens";
import { px } from "@/theme/scale";
import { Block, Bevel, FlameShape, RadialGlow } from "@/components/pixel/Primitives";
import { DitherFill, PlankFill, StripeFill } from "@/components/pixel/Fills";
import { useLoop, usePulse, useStepped } from "./useAmbient";

/**
 * The bottom 158 design-units of the scene: three soil terraces capped with
 * grass, a fountain, a stone plinth, torches, flowers and one hopping slime.
 *
 * The source nests these in a `bottom:0;height:158px` box, but since that box
 * is itself flush to the bottom, every child's `bottom` is already measured
 * from the scene floor — so we anchor them directly and avoid an overflow trap
 * for the pieces that sit above the box's top edge.
 */

const GRASS_CAP_BEVEL = {
  top: { color: "rgba(255,255,255,0.22)", size: 4 },
  bottom: { color: "rgba(0,0,0,0.3)", size: 3 },
};

/** Mounds along the top terrace edge. */
const MOUNDS = [
  { l: 25, h: 7 },
  { l: 75, h: 13 },
  { l: 100, h: 7 },
  { l: 150, h: 7 },
  { l: 175, h: 13 },
  { l: 225, h: 7 },
  { l: 250, h: 20 },
  { l: 275, h: 13 },
  { l: 300, h: 7 },
  { l: 350, h: 7 },
];

const FLOWERS = [
  { b: 47, l: 146, color: colors.flowers[0] },
  { b: 47, l: 268, color: colors.flowers[1] },
  { b: 47, l: 300, color: colors.flowers[2] },
  { b: 116, l: 196, color: colors.flowers[1] },
  { b: 116, l: 238, color: colors.flowers[3] },
  { b: 158, l: 112, color: colors.flowers[0] },
];

const TORCHES = [
  { b: 46, l: 22, delay: 0 },
  { b: 46, r: 24, delay: -140 },
  { b: 116, l: 100, delay: -260 },
  { b: 116, r: 104, delay: -60 },
];

function Flower({ b, l, color }: { b: number; l: number; color: string }) {
  return (
    <Block b={b} l={l} w={7} h={12}>
      <Block b={0} l={2} w={3} h={7} bg={colors.grass.mid} />
      <Block t={0} l={0} w={7} h={5} bg={color} />
      <Block t={1} l={2} w={3} h={3} bg="#fff2c4" />
    </Block>
  );
}

function Torch({ b, l, r, delay }: { b: number; l?: number; r?: number; delay: number }) {
  const flicker = useStepped(300, 2, delay);
  const glow = usePulse(2600, delay);

  const flameStyle = useAnimatedStyle(() => {
    "worklet";
    const up = flicker.value >= 0.5;
    return {
      transform: [{ translateY: up ? px(-2) : 0 }, { scaleY: up ? 1.3 : 1 }],
    };
  });
  const glowStyle = useAnimatedStyle(() => ({ opacity: 0.45 + glow.value * 0.45 }));

  return (
    <Block b={b} l={l} r={r} w={7} h={28}>
      <View style={{ width: px(7), height: px(28) }}>
        <PlankFill />
        <Bevel right={{ color: "rgba(0,0,0,0.35)", size: 2 }} />
      </View>

      <Animated.View
        pointerEvents="none"
        style={[
          { position: "absolute", top: px(-34), left: px(-29), width: px(68), height: px(68) },
          glowStyle,
        ]}
      >
        <RadialGlow
          stops={[
            { offset: 0, color: "#ffb45a", opacity: 0.5 },
            { offset: 66, color: "#ffb45a", opacity: 0 },
          ]}
        />
      </Animated.View>

      <Animated.View
        style={[
          { position: "absolute", top: px(-15), left: px(-3), transformOrigin: "bottom" },
          flameStyle,
        ]}
      >
        <FlameShape />
      </Animated.View>
    </Block>
  );
}

function Fountain() {
  const shift = useLoop(motion.waterShift);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: shift.value * px(16) }],
  }));

  return (
    <>
      <Block b={50} l={38} w={8} h={24} bg={colors.stone.light} fill={<DitherFill size={5} light={0.13} dark={0.2} />} />
      <Block b={50} l={118} w={8} h={24} bg={colors.stone.light} fill={<DitherFill size={5} light={0.13} dark={0.2} />} />
      <Block b={74} l={38} w={88} h={6} bg={colors.stone.light} fill={<DitherFill size={5} light={0.13} dark={0.2} />} />

      <View
        style={{
          position: "absolute",
          bottom: px(50),
          left: px(46),
          width: px(72),
          height: px(24),
          overflow: "hidden",
          boxShadow: `0 0 ${px(22)}px rgba(80,150,230,0.5)`,
        }}
      >
        <Svg style={{ position: "absolute", inset: 0 }} width="100%" height="100%">
          <Defs>
            <LinearGradient id="water" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={colors.water.lit} />
              <Stop offset="100%" stopColor={colors.water.deep} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#water)" />
        </Svg>
        <Animated.View
          style={[{ position: "absolute", top: 0, bottom: 0, left: px(-16), width: px(104) }, style]}
        >
          <StripeFill color="rgba(255,255,255,0.16)" bar={3} gap={6} />
        </Animated.View>
        <Bevel
          top={{ color: "rgba(255,255,255,0.28)", size: 3 }}
          bottom={{ color: "rgba(0,0,0,0.3)", size: 4 }}
        />
      </View>
    </>
  );
}

function Slime() {
  const hop = useLoop(motion.hop);
  const style = useAnimatedStyle(() => {
    "worklet";
    const t = hop.value;
    // hop: 0/55/100% rest — 18% up+stretch — 42% landed+squash
    let y = 0;
    let sy = 1;
    if (t < 0.18) {
      const k = t / 0.18;
      y = -13 * k;
      sy = 1 + 0.12 * k;
    } else if (t < 0.42) {
      const k = (t - 0.18) / 0.24;
      y = -13 * (1 - k);
      sy = 1.12 + (0.84 - 1.12) * k;
    } else if (t < 0.55) {
      const k = (t - 0.42) / 0.13;
      sy = 0.84 + (1 - 0.84) * k;
    }
    return { transform: [{ translateY: px(y) }, { scaleY: sy }] };
  });

  return (
    <Animated.View
      style={[
        { position: "absolute", bottom: px(116), left: px(150), transformOrigin: "bottom" },
        style,
      ]}
      pointerEvents="none"
    >
      <View
        style={{
          width: px(24),
          height: px(20),
          backgroundColor: colors.slime.body,
          boxShadow: `0 0 ${px(16)}px rgba(96,214,150,0.5)`,
        }}
      >
        <Bevel
          top={{ color: "rgba(220,255,235,0.5)", size: 4 }}
          bottom={{ color: "rgba(0,90,60,0.4)", size: 5 }}
        />
        <Block t={6} l={5} w={4} h={4} bg={colors.slime.eye} />
        <Block t={6} r={5} w={4} h={4} bg={colors.slime.eye} />
        <Block t={13} l={9} w={6} h={3} bg={colors.slime.eye} />
      </View>
    </Animated.View>
  );
}

function GrassTufts({ b, bar, gap, duration, opacity }: { b: number; bar: number; gap: number; duration: number; opacity: number }) {
  const sway = usePulse(duration);
  const style = useAnimatedStyle(() => ({
    transform: [{ skewX: `${-3 + sway.value * 6}deg` }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        { position: "absolute", bottom: px(b), left: 0, right: 0, height: px(9), opacity, transformOrigin: "bottom" },
        style,
      ]}
    >
      <StripeFill color={colors.grass.tuft} bar={bar} gap={gap} />
    </Animated.View>
  );
}

export function GroundLayer() {
  return (
    <>
      {/* terraces, back to front */}
      <Block b={84} l={0} r={0} h={74} bg={colors.dirt.loam} fill={<DitherFill size={7} light={0.05} dark={0.16} />} />
      {MOUNDS.map((m, i) => (
        <Block key={i} b={158} l={m.l} w={25} h={m.h} bg={colors.grass.bright} fill={<DitherFill size={6} light={0.11} dark={0.11} />}>
          <Bevel top={{ color: "rgba(255,255,255,0.2)", size: 4 }} right={{ color: "rgba(0,0,0,0.22)", size: 3 }} />
        </Block>
      ))}
      <Block b={145} l={0} r={0} h={13} bg={colors.grass.bright} fill={<DitherFill size={6} light={0.11} dark={0.11} />}>
        <Bevel {...GRASS_CAP_BEVEL} />
      </Block>

      <Block b={42} l={0} r={0} h={48} bg={colors.dirt.clay} fill={<DitherFill size={7} light={0.06} dark={0.13} />} />
      <Block b={77} l={0} r={0} h={13} bg={colors.grass.bright} fill={<DitherFill size={6} light={0.11} dark={0.11} />}>
        <Bevel {...GRASS_CAP_BEVEL} />
      </Block>

      <Block b={0} l={0} r={0} h={46} bg={colors.stone.base} fill={<DitherFill size={6} light={0.08} dark={0.15} />} />
      <Block b={33} l={0} r={0} h={13} bg={colors.grass.bright} fill={<DitherFill size={6} light={0.11} dark={0.11} />}>
        <Bevel {...GRASS_CAP_BEVEL} />
      </Block>

      {/* stone plinth */}
      <Block b={0} l={136} w={118} h={33} bg={colors.stone.light} fill={<DitherFill size={5} light={0.13} dark={0.2} />}>
        <Bevel top={{ color: "rgba(255,255,255,0.14)", size: 4 }} />
      </Block>
      <Block b={33} l={152} w={86} h={11} bg={colors.stone.light} fill={<DitherFill size={5} light={0.13} dark={0.2} />} />
      <Block b={44} l={168} w={54} h={10} bg={colors.stone.light} fill={<DitherFill size={5} light={0.13} dark={0.2} />} />

      <Fountain />

      {/* right-hand bush */}
      <Block b={46} r={34} w={30} h={20} bg={colors.grass.mid} fill={<DitherFill size={5} light={0.1} dark={0.17} />}>
        <Bevel top={{ color: "rgba(255,255,255,0.16)", size: 3 }} />
      </Block>
      <Block b={66} r={45} w={16} h={9} bg={colors.grass.mid} fill={<DitherFill size={5} light={0.1} dark={0.17} />} />

      {/* festival banner */}
      <Block b={116} r={64} w={24} h={15} bg="#c2452f" fill={<DitherFill size={8} light={0.22} dark={0} />} />

      <Slime />
      {FLOWERS.map((f, i) => (
        <Flower key={i} {...f} />
      ))}

      <GrassTufts b={46} bar={3} gap={8} duration={4200} opacity={0.85} />
      <GrassTufts b={158} bar={4} gap={8} duration={5400} opacity={0.8} />

      {TORCHES.map((t, i) => (
        <Torch key={i} {...t} />
      ))}
    </>
  );
}
