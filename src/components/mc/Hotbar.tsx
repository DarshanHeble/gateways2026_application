import React, { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { px, pxFont } from "@/theme/scale";
import { fonts } from "@/theme/tokens";
import { SELECTOR_OVERHANG_RATIO, material, mcTextShadow } from "@/theme/minecraft";

import { Frame, SelectionFrame } from "./index";
import { useBlockTheme } from "@/theme/BlockThemeContext";
import { timing } from "@/theme/motion";

/**
 * Derived from `Tabs` rather than imported from `@react-navigation/bottom-tabs`:
 * expo-router vendors its own copy of the navigator, so that package isn't a
 * dependency here and a deep import into `expo-router/build/...` would break on
 * any internal reshuffle.
 */
type BottomTabBarProps = Parameters<
  NonNullable<React.ComponentProps<typeof Tabs>["tabBar"]>
>[0];
type TabDescriptor = BottomTabBarProps["descriptors"][string];
type TabRoute = BottomTabBarProps["state"]["routes"][number];

/**
 * The tab bar, as Minecraft's hotbar — built to the sprite's actual measurements.
 *
 * From `gui/sprites/hud/hotbar.png` (182x22) and `hotbar_selection.png` (24x23):
 *
 *  - the bar is a 1px black outline, a 1px `#939393` highlight, then the dark
 *    translucent interior, closed by `#7e7e7e` / `#5a5a5a` / black at the bottom;
 *  - slots sit on a 20px pitch;
 *  - the selector is **24px over a 20px slot** — it overhangs by 2px on every
 *    side, and it is a pale desaturated green (`#d5e8d0 → #a1b29d → #5f6d5c`),
 *    not white. Both of those are what make it read as the hotbar rather than
 *    as a highlighted tab, and both are usually got wrong.
 *
 * The strip is the HUD sprite itself, and like every in-game overlay here (the
 * server tooltip is the other) it is dark in both colour modes: the game draws
 * its hotbar the same over a snowfield as over a cave. The bar around it is
 * just the page — flat, with a hairline — so the one Minecraft object on it is
 * the hotbar, not a stone slab holding one.
 *
 * Only the selected slot is named, and the name rides under the selector: the
 * game's held-item name. Seven labels side by side had run together into one
 * line of type ("SCHEDULEEVENTSALERTS"); one name, where your eye already is,
 * says more.
 *
 * Replaces the stock bar wholesale rather than styling it, because that bar
 * insists on a rounded ripple, a centred label baseline and a circular badge,
 * none of which can be turned off from `screenOptions`.
 */
export function Hotbar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useBlockTheme();

  const routes = state.routes.filter((route: TabRoute) => {
    const { options } = descriptors[route.key];
    /*
     * `href: null` is how expo-router hides a tab, and it is load-bearing here:
     * `contact` and `broadcast` are team-only. It does **not** reach the
     * descriptor as `href` — expo-router translates it into
     * `tabBarItemStyle: { display: "none" }`, which the stock bar honours for
     * free and a custom bar has to check for itself. Missing it showed every
     * participant the two crew tabs.
     */
    const itemStyle = StyleSheet.flatten(options.tabBarItemStyle) as
      | { display?: string }
      | undefined;
    return itemStyle?.display !== "none";
  });

  /*
   * The selector is one element that *travels*, not a frame that appears inside
   * whichever slot happens to be selected — pressing 2 in game slides it there.
   * The held-item name travels with it.
   */
  const [barWidth, setBarWidth] = useState(0);
  const focusedIndex = Math.max(
    0,
    routes.findIndex((route: TabRoute) => state.routes.indexOf(route) === state.index),
  );
  const slotPitch = routes.length > 0 ? barWidth / routes.length : 0;
  const selectorX = useSharedValue(0);
  const nameX = useSharedValue(0);

  /** The name is wider than a slot; it centres on it but never leaves the bar. */
  const nameWidth = slotPitch * 2;

  useEffect(() => {
    if (slotPitch <= 0) return;
    const target = slotPitch * focusedIndex - OVERHANG;
    const nameTarget = Math.min(
      Math.max(0, slotPitch * (focusedIndex + 0.5) - nameWidth / 2),
      barWidth - nameWidth,
    );
    // First layout lands without animating; every later move slides.
    if (selectorX.value === 0) {
      selectorX.value = target;
      nameX.value = nameTarget;
    } else {
      selectorX.value = withTiming(target, timing.select);
      nameX.value = withTiming(nameTarget, timing.select);
    }
  }, [focusedIndex, slotPitch, nameWidth, barWidth, selectorX, nameX]);

  const selectorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: selectorX.value }],
  }));
  const nameStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: nameX.value }],
  }));

  const focusedRoute = routes[focusedIndex];
  const focusedName = focusedRoute
    ? (descriptors[focusedRoute.key].options.title ?? focusedRoute.name).toUpperCase()
    : "";

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: theme.surfaceElevated,
          borderTopColor: theme.border,
          // The home indicator sits in the bottom few points of the inset; the
          // rest is dead space under a bar this tall.
          paddingBottom: Math.max(px(8), insets.bottom - px(12)),
        },
      ]}
    >
      <View style={styles.stripWrap}>
        {/* The sprite: black outline, lit top-left rim, shaded bottom-right
            rim, dark interior. One trough; the slots share its edges. */}
        <View style={styles.outline}>
          <View style={styles.strip} onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}>
            {routes.map((route: TabRoute, i: number) => {
              const { options } = descriptors[route.key];
              const index = state.routes.indexOf(route);
              const focused = state.index === index;

              return (
                <HotbarSlot
                  key={route.key}
                  focused={focused}
                  divided={i < routes.length - 1}
                  label={options.title ?? route.name}
                  badge={options.tabBarBadge}
                  icon={options.tabBarIcon}
                  onPress={() => {
                    const event = navigation.emit({
                      type: "tabPress",
                      target: route.key,
                      canPreventDefault: true,
                    });
                    if (!focused && !event.defaultPrevented) {
                      Haptics.selectionAsync().catch(() => {});
                      (navigation.navigate as any)(route.name, route.params);
                    }
                  }}
                />
              );
            })}

            {slotPitch > 0 ? (
              <Animated.View
                style={[styles.travellingSelector, { width: slotPitch + OVERHANG * 2 }, selectorStyle]}
                pointerEvents="none"
              >
                <SelectionFrame tone="dark" />
              </Animated.View>
            ) : null}
          </View>
        </View>

        {/* The held-item name, under the selector. */}
        <View style={styles.nameRow} pointerEvents="none">
          {slotPitch > 0 ? (
            <Animated.View
              style={[
                styles.name,
                {
                  width: nameWidth,
                  // Clamped at either end, the name hugs that edge instead of
                  // centring in a box that no longer centres on the slot.
                  alignItems:
                    focusedIndex === 0
                      ? "flex-start"
                      : focusedIndex === routes.length - 1
                        ? "flex-end"
                        : "center",
                },
                nameStyle,
              ]}
            >
              <Animated.Text
                key={focusedName}
                entering={FadeIn.duration(160)}
                numberOfLines={1}
                style={[styles.nameText, { color: theme.primary }]}
              >
                {focusedName}
              </Animated.Text>
            </Animated.View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function HotbarSlot({
  focused,
  divided,
  badge,
  icon,
  label,
  onPress,
}: {
  focused: boolean;
  divided: boolean;
  badge: number | string | undefined;
  icon: TabDescriptor["options"]["tabBarIcon"];
  label: string;
  onPress: () => void;
}) {
  const renderIcon = useCallback(
    () => icon?.({ focused, color: "#ffffff", size: px(22) }) ?? null,
    [icon, focused],
  );

  /*
   * The pop when an item comes into hand: a quick lift and settle, once, on
   * selection. The game does exactly this to the item in the slot you switch to.
   */
  const lift = useSharedValue(1);
  useEffect(() => {
    if (!focused) return;
    lift.value = withSequence(withTiming(1.16, { duration: 90 }), withTiming(1, { duration: 150 }));
  }, [focused, lift]);
  const liftStyle = useAnimatedStyle(() => ({ transform: [{ scale: lift.value }] }));

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
      style={[styles.slot, focused && styles.slotFocused, divided && styles.slotDivided]}
    >
      {({ pressed }) => (
        <>
          {/* An unselected item is dimmed, not recoloured: a grass block stays
              a grass block. Pressing nudges it down a point, like a key. */}
          <Animated.View
            style={[
              { opacity: focused ? 1 : 0.55, marginTop: pressed ? px(2) : 0 },
              liftStyle,
            ]}
          >
            {renderIcon()}
          </Animated.View>

          {badge !== undefined && badge !== null ? (
            <View style={styles.badge}>
              <Frame depth="raised" />
              <Text style={[styles.badgeText, mcTextShadow("#ffffff", 10)]}>{badge}</Text>
            </View>
          ) : null}
        </>
      )}
    </Pressable>
  );
}

/** Slot height. Width is `flex: 1` so the strip always fills the bar. */
const SLOT = px(46);
/** 2px of overhang on a 20px slot, held as a ratio so the slot can resize. */
const OVERHANG = SLOT * SELECTOR_OVERHANG_RATIO;
/** One sprite pixel. */
const U = px(2);

/** `hud/hotbar.png`, measured. */
const SPRITE = {
  outline: "#000000",
  rimLit: "#939393",
  rimShade: "#5a5a5a",
  interior: "#2a2a2a",
  interiorFocused: "#3a3a3a",
  divider: "#161616",
} as const;

const styles = StyleSheet.create({
  bar: {
    borderRadius: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: px(10),
  },
  stripWrap: {
    // Room for the selector's overhang on the first and last slots, which would
    // otherwise be clipped by the screen edge.
    paddingHorizontal: px(14),
  },
  outline: {
    backgroundColor: SPRITE.outline,
    padding: px(1),
  },
  /** The trough. Slots live inside it and share its edges. */
  strip: {
    flexDirection: "row",
    height: SLOT,
    backgroundColor: SPRITE.interior,
    borderTopWidth: U,
    borderLeftWidth: U,
    borderBottomWidth: U,
    borderRightWidth: U,
    borderTopColor: SPRITE.rimLit,
    borderLeftColor: SPRITE.rimLit,
    borderBottomColor: SPRITE.rimShade,
    borderRightColor: SPRITE.rimShade,
  },
  slot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  slotFocused: { backgroundColor: SPRITE.interiorFocused },
  slotDivided: { borderRightWidth: px(1), borderRightColor: SPRITE.divider },

  /**
   * The travelling selector sits in the strip's own coordinate space, so its
   * `translateX` is measured from the strip's left edge. Sized to the slot plus
   * vanilla's 2px-per-side overhang; the strip's rim is inside that.
   */
  travellingSelector: {
    position: "absolute",
    top: -OVERHANG - U,
    left: -U,
    height: SLOT + OVERHANG * 2,
    zIndex: 2,
  },

  nameRow: {
    height: px(16),
    marginTop: px(8),
  },
  name: {
    position: "absolute",
    top: 0,
    left: 0,
    alignItems: "center",
  },
  nameText: {
    fontFamily: fonts.pixelBold,
    fontSize: pxFont(11), lineHeight: Math.round(pxFont(11) * 1.25),
    letterSpacing: px(1),
  },

  badge: {
    position: "absolute",
    top: px(2),
    right: px(3),
    minWidth: px(16),
    height: px(16),
    paddingHorizontal: px(3),
    backgroundColor: material.redstone,
    borderRadius: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontFamily: fonts.pixelBold,
    fontSize: pxFont(10),
    lineHeight: px(16),
    color: "#ffffff",
  },
});
