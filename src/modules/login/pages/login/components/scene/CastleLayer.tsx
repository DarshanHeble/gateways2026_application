import { View } from "react-native";
import Svg, { Polygon } from "react-native-svg";
import Animated, { useAnimatedStyle } from "react-native-reanimated";

import { colors } from "@/theme/tokens";
import { px } from "@/theme/scale";
import { Block, Bevel, RadialGlow } from "@/components/pixel/Primitives";
import { MasonryFill, StripeFill } from "@/components/pixel/Fills";
import { usePulse, useStepped } from "./useAmbient";

/** `top:74px;height:66px` — hazy blue ridgeline behind the keep. */
export function RidgeLayer() {
  return (
    <Block t={74} l={0} r={0} h={66} opacity={0.55}>
      <Block b={0} l={-14} w={74} h={38} bg={colors.ridge.near} />
      <Block b={38} l={4} w={42} h={15} bg={colors.ridge.cap} />
      <Block b={53} l={16} w={18} h={10} bg={colors.ridge.snow} />
      <Block b={0} l={52} w={56} h={26} bg={colors.ridge.far} />
      <Block b={0} r={-18} w={88} h={44} bg={colors.ridge.near} />
      <Block b={44} r={12} w={44} h={16} bg={colors.ridge.cap} />
      <Block b={60} r={26} w={18} h={9} bg={colors.ridge.snow} />
      <Block b={0} r={70} w={52} h={24} bg={colors.ridge.farther} />
    </Block>
  );
}

/** The design's pennant roof: `polygon(0 0,100% 0,100% 100%,50% 66%,0 100%)`. */
function Pennant({ w, h }: { w: number; h: number }) {
  const W = px(w);
  const H = px(h);
  return (
    <Svg width={W} height={H}>
      <Polygon
        points={`0,0 ${W},0 ${W},${H} ${W / 2},${H * 0.66} 0,${H}`}
        fill={colors.stone.roof}
      />
    </Svg>
  );
}

/**
 * A lit castle window. The source's `flick` keyframe is a `steps(3)` opacity +
 * scale pulse — deliberately chunky, so we keep the hard jumps.
 */
function Window({
  b,
  l,
  r,
  w,
  h,
  color,
  duration,
}: {
  b: number;
  l?: number;
  r?: number;
  w: number;
  h: number;
  color: string;
  duration: number;
}) {
  const step = useStepped(duration, 3);
  const style = useAnimatedStyle(() => {
    "worklet";
    const t = step.value;
    // 0%/100%: .85 @ 1x — 40%: 1 @ 1.12x — 70%: .7 @ .95x
    const opacity = t < 0.4 ? 0.85 : t < 0.7 ? 1 : 0.7;
    const scale = t < 0.4 ? 1 : t < 0.7 ? 1.12 : 0.95;
    return { opacity, transform: [{ scale }] };
  });

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          bottom: px(b),
          left: l === undefined ? undefined : px(l),
          right: r === undefined ? undefined : px(r),
          width: px(w),
          height: px(h),
          backgroundColor: color,
          boxShadow: `0 0 ${px(12)}px ${px(4)}px rgba(255,190,110,0.6)`,
        },
        style,
      ]}
    />
  );
}

const CASTLE_W = 214;

export function CastleLayer() {
  const gateGlow = usePulse(4000);
  const gateStyle = useAnimatedStyle(() => ({ opacity: 0.45 + gateGlow.value * 0.45 }));

  return (
    <Block t={34} l={(390 - CASTLE_W) / 2} w={CASTLE_W} h={106}>
      {/* keep */}
      <Block b={0} l={52} w={110} h={62} bg={colors.stone.castle} fill={<MasonryFill />}>
        <Bevel
          top={{ color: "rgba(255,255,255,0.12)", size: 5 }}
          bottom={{ color: "rgba(0,0,0,0.32)", size: 6 }}
        />
      </Block>
      {/* crenellations */}
      <Block b={62} l={52} w={110} h={11} clip>
        <StripeFill color="#767b8f" bar={13} gap={13} />
      </Block>

      {/* left tower */}
      <Block b={6} l={18} w={30} h={86} bg={colors.stone.castle} fill={<MasonryFill />}>
        <Bevel
          left={{ color: "rgba(255,255,255,0.1)", size: 5 }}
          right={{ color: "rgba(0,0,0,0.3)", size: 6 }}
        />
      </Block>
      <Block b={92} l={11} w={44} h={10} bg={colors.stone.castleDark} />
      <Block b={102} l={24} w={18} h={8}>
        <Pennant w={18} h={8} />
      </Block>

      {/* right tower */}
      <Block b={14} r={18} w={32} h={92} bg={colors.stone.castle} fill={<MasonryFill />}>
        <Bevel
          left={{ color: "rgba(255,255,255,0.1)", size: 5 }}
          right={{ color: "rgba(0,0,0,0.3)", size: 6 }}
        />
      </Block>
      <Block b={106} r={11} w={46} h={10} bg={colors.stone.castleDark} />
      <Block b={116} r={26} w={18} h={8}>
        <Pennant w={18} h={8} />
      </Block>

      {/* gate: an arch cut with a top-only radius, lit from within */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: px(92),
          width: px(30),
          height: px(36),
          borderTopLeftRadius: px(15),
          borderTopRightRadius: px(15),
          borderWidth: px(3),
          borderColor: "#4d4433",
          backgroundColor: "#1b1210",
          overflow: "hidden",
        }}
      />
      <Animated.View
        style={[
          { position: "absolute", bottom: 0, left: px(96), width: px(22), height: px(28) },
          gateStyle,
        ]}
        pointerEvents="none"
      >
        <RadialGlow
          cy="100%"
          stops={[
            { offset: 0, color: "#ffbe6e", opacity: 0.85 },
            { offset: 72, color: "#ffbe6e", opacity: 0 },
          ]}
        />
      </Animated.View>

      <Window b={26} l={28} w={9} h={12} color={colors.flame.window} duration={2300} />
      <Window b={56} l={28} w={9} h={12} color={colors.flame.windowAlt} duration={3100} />
      <Window b={40} r={29} w={9} h={12} color={colors.flame.window} duration={2700} />
      <Window b={70} r={29} w={9} h={12} color={colors.flame.windowAlt} duration={3500} />
      <Window b={22} l={70} w={8} h={11} color={colors.flame.window} duration={2900} />
      <Window b={22} r={70} w={8} h={11} color={colors.flame.window} duration={2500} />
    </Block>
  );
}
