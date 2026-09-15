import { StyleSheet, View } from "react-native";
import Svg, { Defs, LinearGradient, Polygon, Rect, Stop } from "react-native-svg";
import Animated, { useAnimatedStyle } from "react-native-reanimated";

import { colors, motion } from "@/theme/tokens";
import { px, SCREEN_HEIGHT } from "@/theme/scale";
import { Block, RadialGlow } from "@/components/pixel/Primitives";
import { useLoop, usePulse, useStepped } from "./useAmbient";

/** `top:6..52` — the five stars still out over the sunrise. */
const STARS = [
  { t: 6, l: 26, s: 3, color: "#ffffff", dur: 3200, delay: 0 },
  { t: 18, l: 96, s: 3, color: "#dfe9ff", dur: 2400, delay: -1000 },
  { t: 9, l: 198, s: 2, color: "#ffffff", dur: 4000, delay: -2000 },
  { t: 30, l: 300, s: 3, color: "#ffffff", dur: 2800, delay: -600 },
  { t: 52, l: 344, s: 2, color: "#e8f0ff", dur: 3600, delay: 0 },
];

function Star({ star }: { star: (typeof STARS)[number] }) {
  const pulse = usePulse(star.dur, star.delay);
  const style = useAnimatedStyle(() => ({ opacity: 0.25 + pulse.value * 0.75 }));
  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          top: px(star.t),
          left: px(star.l),
          width: px(star.s),
          height: px(star.s),
          backgroundColor: star.color,
        },
        style,
      ]}
    />
  );
}

/** A drifting pixel cloud bank. `from` / `to` are the CSS translateX endpoints. */
function CloudBand({
  top,
  duration,
  phase,
  from,
  to,
  children,
}: {
  top: number;
  duration: number;
  phase: number;
  from: number;
  to: number;
  children: React.ReactNode;
}) {
  const loop = useLoop(duration);
  const style = useAnimatedStyle(() => {
    "worklet";
    const t = (loop.value + phase) % 1;
    return { transform: [{ translateX: px(from + (to - from) * t) }] };
  });
  return (
    <Animated.View
      style={[{ position: "absolute", top: px(top), left: 0, right: 0 }, style]}
      pointerEvents="none"
    >
      {children}
    </Animated.View>
  );
}

function Puff({ l, t, w, h, c, o }: { l: number; t: number; w: number; h: number; c: string; o: number }) {
  return (
    <View
      style={{
        position: "absolute",
        left: px(l),
        top: px(t),
        width: px(w),
        height: px(h),
        backgroundColor: c,
        opacity: o,
      }}
    />
  );
}

function Bird() {
  const fly = useLoop(motion.birdFly);
  const beat = useStepped(440, 2);

  const flyStyle = useAnimatedStyle(() => {
    "worklet";
    const t = fly.value;
    // birdFly: 0% (0,0) -> 50% (120,-16) -> 100% (250,4)
    const x = t < 0.5 ? 120 * (t / 0.5) : 120 + 130 * ((t - 0.5) / 0.5);
    const y = t < 0.5 ? -16 * (t / 0.5) : -16 + 20 * ((t - 0.5) / 0.5);
    return { transform: [{ translateX: px(x) }, { translateY: px(y) }] };
  });

  const wingStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: beat.value < 0.5 ? 1 : 0.3 }],
  }));

  return (
    <Animated.View style={[{ position: "absolute", top: px(96), left: px(22) }, flyStyle]}>
      <Animated.View style={[{ width: px(4), height: px(4), backgroundColor: colors.bird }, wingStyle]} />
      <Animated.View
        style={[
          { position: "absolute", left: px(13), top: px(7), width: px(3), height: px(3), backgroundColor: colors.bird },
          wingStyle,
        ]}
      />
      <Animated.View
        style={[
          { position: "absolute", left: px(26), top: px(-4), width: px(3), height: px(3), backgroundColor: colors.bird },
          wingStyle,
        ]}
      />
    </Animated.View>
  );
}

function SunRay({
  top,
  right,
  width,
  height,
  skew,
  duration,
  delay,
  peak,
}: {
  top: number;
  right: number;
  width: number;
  height: number;
  skew: number;
  duration: number;
  delay: number;
  peak: number;
}) {
  const pulse = usePulse(duration, delay);
  const style = useAnimatedStyle(() => ({ opacity: 0.22 + pulse.value * (peak - 0.22) }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          top: px(top),
          right: px(right),
          width: px(width),
          height: px(height),
          transform: [{ skewX: `${skew}deg` }],
        },
        style,
      ]}
    >
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id={`ray${top}`} x1="0.5" y1="0" x2="0.2" y2="1">
            <Stop offset="0%" stopColor="#ffdc9b" stopOpacity={0.3} />
            <Stop offset="62%" stopColor="#ffdc9b" stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#ray${top})`} />
      </Svg>
    </Animated.View>
  );
}

export function SkyLayer() {
  const sunGlow = usePulse(5000);
  const sunGlowStyle = useAnimatedStyle(() => ({ opacity: 0.45 + sunGlow.value * 0.45 }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Full-height base ramp: night sky through sunrise into grass and soil. */}
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <LinearGradient id="worldRamp" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={colors.sky.night} />
            <Stop offset="3%" stopColor={colors.sky.dusk} />
            <Stop offset="6%" stopColor={colors.sky.violet} />
            <Stop offset="9%" stopColor={colors.sky.mauve} />
            <Stop offset="12%" stopColor={colors.sky.ember} />
            <Stop offset="16%" stopColor={colors.sky.amber} />
            <Stop offset="19%" stopColor={colors.sky.peach} />
            <Stop offset="20%" stopColor={colors.grass.canopy} />
            <Stop offset="26%" stopColor={colors.grass.deep} />
            <Stop offset="40%" stopColor={colors.grass.shade} />
            <Stop offset="60%" stopColor={colors.dirt.shadow} />
            <Stop offset="78%" stopColor={colors.dirt.mid} />
            <Stop offset="100%" stopColor={colors.dirt.light} />
          </LinearGradient>
          <LinearGradient id="skyBand" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={colors.sky.night} />
            <Stop offset="14%" stopColor={colors.sky.dusk} />
            <Stop offset="30%" stopColor={colors.sky.violet} />
            <Stop offset="44%" stopColor={colors.sky.mauve} />
            <Stop offset="58%" stopColor={colors.sky.ember} />
            <Stop offset="74%" stopColor={colors.sky.amber} />
            <Stop offset="90%" stopColor={colors.sky.peach} />
            <Stop offset="100%" stopColor={colors.sky.cream} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#worldRamp)" />
        <Rect width="100%" height={px(170)} fill="url(#skyBand)" />
      </Svg>

      {STARS.map((s, i) => (
        <Star key={i} star={s} />
      ))}

      {/* Sun: a cut-corner pixel square with a wide warm bloom. */}
      <Block t={38} r={34} w={66} h={66}>
        <Animated.View style={[StyleSheet.absoluteFill, sunGlowStyle]}>
          <RadialGlow
            stops={[
              { offset: 0, color: "#ffecbe", opacity: 0.55 },
              { offset: 68, color: "#ffecbe", opacity: 0 },
            ]}
          />
        </Animated.View>
      </Block>
      <View
        style={{
          position: "absolute",
          top: px(44),
          right: px(40),
          width: px(54),
          height: px(54),
          boxShadow: `0 0 ${px(56)}px ${px(24)}px rgba(255,196,110,0.5), 0 0 ${px(120)}px ${px(56)}px rgba(255,150,70,0.26)`,
        }}
      >
        <Svg width={px(54)} height={px(54)}>
          <Polygon
            points={`${px(7)},0 ${px(47)},0 ${px(54)},${px(7)} ${px(54)},${px(47)} ${px(47)},${px(54)} ${px(7)},${px(54)} 0,${px(47)} 0,${px(7)}`}
            fill="#fff6d8"
          />
        </Svg>
      </View>

      <SunRay top={86} right={6} width={128} height={430} skew={-13} duration={7000} delay={0} peak={0.5} />
      <SunRay top={96} right={76} width={64} height={360} skew={8} duration={9000} delay={-3000} peak={0.5} />

      {/* Three cloud banks at different depths and speeds. */}
      <CloudBand top={20} duration={motion.driftFast} phase={0} from={-140} to={460}>
        <Puff l={0} t={0} w={58} h={11} c="#fdf2e0" o={0.92} />
        <Puff l={11} t={-9} w={34} h={9} c="#fff8ec" o={0.92} />
        <Puff l={22} t={-16} w={17} h={7} c="#fffaf2" o={0.92} />
        <Puff l={46} t={-9} w={22} h={9} c="#f6e6d2" o={0.92} />
      </CloudBand>
      <CloudBand top={66} duration={motion.driftMid} phase={0.33} from={-200} to={500}>
        <Puff l={0} t={0} w={88} h={12} c="#ffe6cc" o={0.72} />
        <Puff l={24} t={-9} w={42} h={9} c="#fff1de" o={0.72} />
      </CloudBand>
      <CloudBand top={110} duration={motion.driftSlow} phase={0.54} from={-140} to={460}>
        <Puff l={0} t={0} w={112} h={9} c="#ffd9b4" o={0.45} />
      </CloudBand>

      <Bird />
    </View>
  );
}

export const SKY_HEIGHT = SCREEN_HEIGHT;
