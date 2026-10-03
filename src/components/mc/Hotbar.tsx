import React, { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { useBlockTheme } from "@/theme/BlockThemeContext";
import { mojang, scaleColor } from "@/theme/minecraft";
import { duration } from "@/theme/motion";
import { px, pxFont } from "@/theme/scale";
import { fonts } from "@/theme/tokens";

/**
 * The tab bar: a panel docked to the bottom of the screen, built like the
 * game's own GUI.
 *
 *  - The bar is a raised panel — a hard outline along its top and a lit bevel
 *    under it — the same construction as every card and button in the app.
 *  - Every tab shows its item and its name. Items are crisp pixel glyphs
 *    (`TabGlyph`): outlines when idle, filled in when held, and on the dark
 *    panel they carry the GUI's drop shadow, as items and text do in the game.
 *  - The selected tab's item sits on a Minecraft button: solid accent, black
 *    outline, lit top-left and shaded bottom-right edges, with a matching
 *    marker in the panel's top edge. One button slides between tabs, so
 *    switching reads as a single motion.
 *  - Landing is the moment: the item pops, a few pixels burst off it, and an
 *    enchantment glint sweeps across the button. All of it is skipped under
 *    Reduce Motion.
 *
 * The button is the accent block's own colour in both modes (light mode's
 * darkened accent is for gold *text* on cream, and as a fill it went olive),
 * with dark or light ink chosen by its brightness. It follows the accent block
 * chosen in Settings.
 */

/** Dark ink on a bright block (gold, diamond, emerald), white on a deep one. */
function inkFor(hex: string): string {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.55 ? "#1d1606" : "#ffffff";
}

type BottomTabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>["tabBar"]>>[0];
type TabDescriptor = BottomTabBarProps["descriptors"][string];
type TabRoute = BottomTabBarProps["state"]["routes"][number];

const ICON = px(24);
const BUTTON_H = px(34);
const SWITCH_MS = duration.screen;
const ROW_PAD = px(4);
const GLINT_W = px(10);

export function Hotbar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { theme, isDark, activeShape } = useBlockTheme();
  const reduceMotion = useReducedMotion();
  const fill = activeShape.seedColor;

  // `href: null` reaches a custom bar as `tabBarItemStyle: { display: "none" }`;
  // the crew-only tabs depend on this check.
  const routes = state.routes.filter((route: TabRoute) => {
    const itemStyle = StyleSheet.flatten(descriptors[route.key].options.tabBarItemStyle) as
      | { display?: string }
      | undefined;
    return itemStyle?.display !== "none";
  });
  const focusedIndex = Math.max(
    0,
    routes.findIndex((route: TabRoute) => state.routes.indexOf(route) === state.index),
  );

  const [rowW, setRowW] = useState(0);
  // The row's padding is inside its measured width; the tabs share what's left.
  const slotW = routes.length ? (rowW - 2 * ROW_PAD) / routes.length : 0;
  const buttonW = Math.min(px(54), slotW - px(8));

  // The button slides to the selected tab; the first layout lands in place.
  // Once it lands, the glint sweeps across it.
  const x = useSharedValue(-1);
  const glint = useSharedValue(0);
  useEffect(() => {
    if (rowW <= 0) return;
    const target = ROW_PAD + focusedIndex * slotW + (slotW - buttonW) / 2;
    const first = x.value < 0;
    x.value = first || reduceMotion ? target : withTiming(target, { duration: SWITCH_MS });
    if (!first && !reduceMotion) {
      glint.value = 0;
      glint.value = withDelay(SWITCH_MS, withTiming(1, { duration: 520, easing: Easing.out(Easing.quad) }));
    }
  }, [focusedIndex, slotW, buttonW, rowW, reduceMotion, x, glint]);
  const slideStyle = useAnimatedStyle(() => ({
    opacity: x.value < 0 ? 0 : 1,
    transform: [{ translateX: Math.max(0, x.value) }],
  }));
  const glintStyle = useAnimatedStyle(() => ({
    opacity: glint.value > 0 && glint.value < 1 ? 1 : 0,
    transform: [{ translateX: -GLINT_W * 2 + glint.value * (buttonW + GLINT_W * 3) }, { skewX: "-24deg" }],
  }));

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: theme.surfaceElevated,
          borderTopColor: isDark ? "#000000" : scaleColor(theme.border, 0.8),
          paddingBottom: Math.max(px(8), insets.bottom - px(12)),
        },
      ]}
    >
      {/* Bevel: a lit inner top edge, as on every raised widget. */}
      <View
        pointerEvents="none"
        style={[styles.lit, { backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.9)" }]}
      />
      {rowW > 0 ? (
        // The marker in the panel's edge, riding along above the button.
        <Animated.View
          pointerEvents="none"
          style={[styles.marker, { width: buttonW, backgroundColor: fill }, slideStyle]}
        />
      ) : null}
      <View style={styles.row} onLayout={(e) => setRowW(e.nativeEvent.layout.width)}>
        {rowW > 0 ? (
          <Animated.View pointerEvents="none" style={[styles.button, { width: buttonW }, slideStyle]}>
            <View style={[styles.buttonFace, { backgroundColor: fill }]}>
              <Animated.View style={[styles.glint, glintStyle]} />
              <View style={[styles.edgeTop, { backgroundColor: "rgba(255,255,255,0.45)" }]} />
              <View style={[styles.edgeLeft, { backgroundColor: "rgba(255,255,255,0.3)" }]} />
              <View style={[styles.edgeBottom, { backgroundColor: scaleColor(fill, 0.6) }]} />
              <View style={[styles.edgeRight, { backgroundColor: scaleColor(fill, 0.72) }]} />
            </View>
          </Animated.View>
        ) : null}

        {routes.map((route: TabRoute) => {
          const { options } = descriptors[route.key];
          const focused = state.routes.indexOf(route) === state.index;
          return (
            <Tab
              key={route.key}
              label={options.title ?? route.name}
              focused={focused}
              slotW={buttonW}
              badge={options.tabBarBadge}
              icon={options.tabBarIcon}
              reduceMotion={reduceMotion}
              onPress={() => {
                const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) {
                  Haptics.selectionAsync().catch(() => {});
                  (navigation.navigate as any)(route.name, route.params);
                }
              }}
              onLongPress={() => navigation.emit({ type: "tabLongPress", target: route.key })}
            />
          );
        })}
      </View>
    </View>
  );
}

/** Directions for the landing burst: out and mostly upward, like XP sparks. */
const SPARKS = [
  { dx: -1, dy: -0.7 },
  { dx: 1, dy: -0.7 },
  { dx: -0.45, dy: -1.1 },
  { dx: 0.45, dy: -1.1 },
  { dx: -1.15, dy: 0.15 },
  { dx: 1.15, dy: 0.15 },
];

function Spark({ t, dx, dy, color }: { t: SharedValue<number>; dx: number; dy: number; color: string }) {
  const style = useAnimatedStyle(() => {
    const d = px(26) * t.value;
    return {
      opacity: t.value > 0 && t.value < 1 ? 1 - t.value : 0,
      transform: [{ translateX: dx * d }, { translateY: dy * d }],
    };
  });
  return <Animated.View pointerEvents="none" style={[styles.spark, { backgroundColor: color }, style]} />;
}

function Tab({
  label,
  focused,
  slotW,
  badge,
  icon,
  reduceMotion,
  onPress,
  onLongPress,
}: {
  label: string;
  focused: boolean;
  slotW: number;
  badge: number | string | undefined;
  icon: TabDescriptor["options"]["tabBarIcon"];
  reduceMotion: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const { theme, isDark, activeShape } = useBlockTheme();
  const fill = activeShape.seedColor;

  // The item pops and throws its sparks as the button lands under it — but
  // not on first render, when nothing was switched.
  const mounted = useRef(false);
  const pop = useSharedValue(1);
  const burst = useSharedValue(0);
  useEffect(() => {
    const switched = mounted.current;
    mounted.current = true;
    if (!focused || !switched || reduceMotion) return;
    pop.value = withSequence(
      withTiming(1, { duration: SWITCH_MS * 0.6 }),
      withTiming(1.2, { duration: 80 }),
      withTiming(1, { duration: 160 }),
    );
    burst.value = 0;
    burst.value = withDelay(SWITCH_MS * 0.6, withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) }));
  }, [focused, reduceMotion, pop, burst]);
  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));

  // The badge pops when a new alert arrives.
  const count = typeof badge === "number" ? badge : badge ? Number(badge) || 0 : 0;
  const badgeScale = useSharedValue(1);
  const lastCount = useRef(count);
  useEffect(() => {
    if (count > lastCount.current && !reduceMotion) {
      badgeScale.value = withSequence(withTiming(1.35, { duration: 110 }), withTiming(1, { duration: 180 }));
    }
    lastCount.current = count;
  }, [count, reduceMotion, badgeScale]);
  const badgeStyle = useAnimatedStyle(() => ({ transform: [{ scale: badgeScale.value }] }));

  const ink = focused ? inkFor(fill) : theme.textDim;
  // The GUI drop shadow, one glyph-pixel down and right, on the dark panel.
  // Not on the button: there it doubles the outline of busy glyphs like the cog.
  const shadow = !focused && isDark ? "rgba(0,0,0,0.55)" : undefined;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={count ? `${label}, ${count} unread` : label}
      style={styles.tab}
    >
      {({ pressed }) => (
        <>
          <View style={styles.iconSlot}>
            {/* Pressing an idle tab lights its slot, as hovering one does in the game. */}
            {pressed && !focused ? (
              <View
                style={[
                  styles.pressSlot,
                  { width: slotW, backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(60,40,20,0.08)" },
                ]}
              />
            ) : null}
            {focused
              ? SPARKS.map((s, i) => (
                  <Spark key={i} t={burst} dx={s.dx} dy={s.dy} color={i % 2 ? "#ffffff" : fill} />
                ))
              : null}
            <Animated.View style={[styles.icon, popStyle, { top: pressed ? px(1) : 0 }]}>
              {shadow ? (
                <View style={styles.iconShadow}>{icon?.({ focused, color: shadow, size: ICON })}</View>
              ) : null}
              {icon?.({ focused, color: ink, size: ICON })}
              {count > 0 ? (
                <Animated.View
                  style={[styles.badge, { borderColor: isDark || focused ? "#000000" : "#ffffff" }, badgeStyle]}
                >
                  <View style={styles.badgeLit} />
                  <Text style={styles.badgeText}>{count > 9 ? "9+" : count}</Text>
                  <View style={styles.badgeShade} />
                </Animated.View>
              ) : null}
            </Animated.View>
          </View>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
            style={[
              styles.label,
              // Gold text in dark; on cream the darkened gold reads olive, so ink.
              { color: focused ? (isDark ? theme.primary : theme.text) : theme.textDim },
              isDark ? styles.labelShadow : null,
            ]}
          >
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const EDGE = px(2);

const styles = StyleSheet.create({
  bar: { borderTopWidth: px(2) },
  lit: { position: "absolute", top: 0, left: 0, right: 0, height: px(2) },
  marker: { position: "absolute", top: -px(2), left: 0, height: px(3) },
  row: { flexDirection: "row", paddingTop: px(8), paddingHorizontal: ROW_PAD },

  tab: { flex: 1, alignItems: "center", paddingHorizontal: px(1) },
  iconSlot: { height: BUTTON_H, alignItems: "center", justifyContent: "center" },
  pressSlot: { position: "absolute", top: 0, height: BUTTON_H },
  icon: { width: ICON, height: ICON },
  iconShadow: { position: "absolute", left: ICON / 12, top: ICON / 12 },
  spark: { position: "absolute", width: px(4), height: px(4) },
  label: {
    marginTop: px(5),
    fontFamily: fonts.pixelBold,
    fontSize: pxFont(9),
    lineHeight: Math.round(pxFont(9) * 1.35),
  },
  labelShadow: { textShadowColor: "rgba(0,0,0,0.6)", textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 0 },

  // The Minecraft button: black outline, lit top-left, shaded bottom-right.
  button: {
    position: "absolute",
    top: px(8),
    left: 0,
    height: BUTTON_H,
    borderWidth: px(2),
    borderColor: "#000000",
  },
  buttonFace: { flex: 1, overflow: "hidden" },
  glint: {
    position: "absolute",
    top: -px(6),
    bottom: -px(6),
    left: 0,
    width: GLINT_W,
    backgroundColor: "rgba(255,255,255,0.55)",
  },
  edgeTop: { position: "absolute", top: 0, left: 0, right: 0, height: EDGE },
  edgeLeft: { position: "absolute", top: EDGE, left: 0, bottom: EDGE, width: EDGE },
  edgeBottom: { position: "absolute", bottom: 0, left: 0, right: 0, height: EDGE + px(1) },
  edgeRight: { position: "absolute", top: EDGE, right: 0, bottom: EDGE + px(1), width: EDGE },

  // A redstone block of a badge, bevelled like everything else.
  badge: {
    position: "absolute",
    top: -px(6),
    right: -px(11),
    minWidth: px(17),
    height: px(17),
    paddingHorizontal: px(3),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: mojang.warning,
    borderWidth: px(2),
    overflow: "hidden",
  },
  badgeLit: { position: "absolute", top: 0, left: 0, right: 0, height: px(2), backgroundColor: "rgba(255,255,255,0.4)" },
  badgeShade: { position: "absolute", bottom: 0, left: 0, right: 0, height: px(2), backgroundColor: "rgba(0,0,0,0.25)" },
  badgeText: { fontFamily: fonts.bodyBold, fontSize: px(10), lineHeight: px(12), color: "#ffffff", fontVariant: ["tabular-nums"] },
});
