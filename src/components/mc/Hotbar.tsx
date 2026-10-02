import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  FadeOutDown,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Tabs, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { px, pxFont } from "@/theme/scale";
import { fonts } from "@/theme/tokens";
import { SELECTOR_OVERHANG_RATIO, material, mcTextShadow, mojang } from "@/theme/minecraft";

import { Frame, SelectionFrame, Grain, McDivider } from "./index";
import { useBlockTheme } from "@/theme/BlockThemeContext";
import { timing } from "@/theme/motion";
import { McGlyph, PixelIcon, PixelIconName } from "./PixelIcon";
import { useAuth } from "@/modules/auth";

type BottomTabBarProps = Parameters<
  NonNullable<React.ComponentProps<typeof Tabs>["tabBar"]>
>[0];
type TabDescriptor = BottomTabBarProps["descriptors"][string];
type TabRoute = BottomTabBarProps["state"]["routes"][number];

export function Hotbar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useBlockTheme();
  const { role, logout } = useAuth();
  const [chestOpen, setChestOpen] = useState(false);

  const routes = state.routes.filter((route: TabRoute) => {
    const { options } = descriptors[route.key];
    const itemStyle = StyleSheet.flatten(options.tabBarItemStyle) as
      | { display?: string }
      | undefined;
    return itemStyle?.display !== "none";
  });

  const [barWidth, setBarWidth] = useState(0);
  const focusedIndex = Math.max(
    0,
    routes.findIndex((route: TabRoute) => state.routes.indexOf(route) === state.index),
  );
  const slotPitch = routes.length > 0 ? barWidth / routes.length : 0;
  const selectorX = useSharedValue(0);
  const nameX = useSharedValue(0);

  const nameWidth = slotPitch * 2;

  useEffect(() => {
    if (slotPitch <= 0) return;
    const target = slotPitch * focusedIndex - OVERHANG;
    const nameTarget = Math.min(
      Math.max(0, slotPitch * (focusedIndex + 0.5) - nameWidth / 2),
      barWidth - nameWidth,
    );
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

  const isTeam = role === "team";

  const chestMenuItems = useMemo(
    () => [
      {
        id: "profile",
        label: "Settings & Profile",
        icon: "settings" as PixelIconName,
        desc: "Preferences, skins & audio",
        onPress: () => {
          setChestOpen(false);
          router.push("/profile" as any);
        },
      },
      ...(isTeam
        ? [
            {
              id: "contact",
              label: "Crew Contact",
              icon: "crew" as PixelIconName,
              desc: "Staff directory & channels",
              onPress: () => {
                setChestOpen(false);
                router.push("/contact" as any);
              },
            },
            {
              id: "broadcast",
              label: "Broadcast Shout",
              icon: "shout" as PixelIconName,
              desc: "Send festival alerts",
              onPress: () => {
                setChestOpen(false);
                router.push("/broadcast" as any);
              },
            },
          ]
        : []),
    ],
    [isTeam],
  );

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: theme.surfaceElevated,
          borderTopColor: theme.border,
          paddingBottom: Math.max(px(10), insets.bottom),
        },
      ]}
    >
      {/* ── Durability Bar (Active Tab Indicator) ────────────────── */}
      <View style={styles.durabilityTrack}>
        {routes.map((route, i) => {
          const focused = state.routes.indexOf(route) === state.index;
          return (
            <View key={route.key} style={styles.durabilitySlot}>
              <View
                style={[
                  styles.durabilityBar,
                  {
                    backgroundColor: focused ? mojang.green3 : "transparent",
                    borderColor: focused ? "#1f4a16" : "transparent",
                  },
                ]}
              />
            </View>
          );
        })}
      </View>

      <View style={styles.stripWrap}>
        {/* The Hotbar Sprite Frame */}
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

            {/* Travelling Minecraft 24px Selector */}
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

        {/* Floating Tooltip Label under hotbar */}
        <View style={styles.nameRow} pointerEvents="none">
          {slotPitch > 0 ? (
            <Animated.View
              style={[
                styles.name,
                {
                  width: nameWidth,
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

      {/* ── Floating Ender Chest Action Button (FAB) ─────────── */}
      <Pressable
        style={({ pressed }) => [
          styles.chestFab,
          {
            backgroundColor: isDark ? "#171624" : "#26213b",
            transform: [{ scale: pressed ? 0.92 : 1 }],
          },
        ]}
        hitSlop={px(8)}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
          setChestOpen(true);
        }}
      >
        <Frame depth="raised" />
        <PixelIcon name="enderChest" size={20} />
      </Pressable>

      {/* ── Ender Chest / Crafting Overlay Modal ─────────────── */}
      <Modal
        visible={chestOpen}
        transparent
        animationType="none"
        onRequestClose={() => setChestOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setChestOpen(false)}>
          <Animated.View
            entering={FadeInDown.duration(200)}
            exiting={FadeOutDown.duration(150)}
            style={[styles.chestGuiContainer, { backgroundColor: theme.surface }]}
            onStartShouldSetResponder={() => true}
          >
            <Grain />
            <Frame depth="raised" />

            {/* Header */}
            <View style={styles.chestHeader}>
              <View style={styles.chestTitleRow}>
                <PixelIcon name="enderChest" size={20} />
                <Text style={[styles.chestTitle, { color: theme.primary }]}>ENDER CHEST</Text>
              </View>
              <Pressable
                onPress={() => setChestOpen(false)}
                hitSlop={px(8)}
                style={styles.closeButton}
              >
                <McGlyph name="close" size={14} color={mojang.greyWarm} />
              </Pressable>
            </View>

            <McDivider style={{ marginVertical: px(12) }} />

            {/* Chest Inventory Slots / Quick Actions */}
            <View style={styles.chestItemsGrid}>
              {chestMenuItems.map((item) => (
                <Pressable
                  key={item.id}
                  style={({ pressed }) => [
                    styles.chestItemCard,
                    {
                      backgroundColor: pressed ? theme.surfaceTint : theme.surfaceElevated,
                      borderColor: pressed ? mojang.green3 : theme.border,
                    },
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                    item.onPress();
                  }}
                >
                  <Frame depth="sunken" />
                  <View style={styles.chestItemIconBox}>
                    <PixelIcon name={item.icon} size={24} />
                  </View>
                  <View style={styles.chestItemInfo}>
                    <Text style={[styles.chestItemTitle, { color: theme.text }]}>
                      {item.label}
                    </Text>
                    <Text style={[styles.chestItemDesc, { color: theme.textDim }]}>
                      {item.desc}
                    </Text>
                  </View>
                  <McGlyph name="chevronRight" size={12} color={theme.textDim} />
                </Pressable>
              ))}
            </View>
          </Animated.View>
        </Pressable>
      </Modal>
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

  /* Item pickup pop + spring tactile response */
  const lift = useSharedValue(1);
  const particleY = useSharedValue(0);
  const particleOpacity = useSharedValue(0);

  useEffect(() => {
    if (!focused) return;
    lift.value = withSequence(
      withSpring(1.24, { damping: 10, stiffness: 260 }),
      withSpring(1, { damping: 14, stiffness: 200 }),
    );
    particleY.value = 0;
    particleOpacity.value = 1;
    particleY.value = withTiming(-px(16), { duration: 320 });
    particleOpacity.value = withTiming(0, { duration: 320 });
  }, [focused, lift, particleY, particleOpacity]);

  const liftStyle = useAnimatedStyle(() => ({ transform: [{ scale: lift.value }] }));
  const particleStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: particleY.value }],
    opacity: particleOpacity.value,
  }));

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }}
      accessibilityRole="button"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
      style={[styles.slot, focused && styles.slotFocused, divided && styles.slotDivided]}
    >
      {({ pressed }) => (
        <>
          {/* Item pickup float particle */}
          {focused ? (
            <Animated.View style={[styles.pickupParticle, particleStyle]} pointerEvents="none">
              <Text style={styles.particleText}>✦</Text>
            </Animated.View>
          ) : null}

          {/* Slot Icon */}
          <Animated.View
            style={[
              { opacity: focused ? 1 : 0.55, marginTop: pressed ? px(2) : 0 },
              liftStyle,
            ]}
          >
            {renderIcon()}
          </Animated.View>

          {/* Minecraft XP Level Number Badge (Glowing Green/White) */}
          {badge !== undefined && badge !== null ? (
            <View style={styles.xpBadge}>
              <Text style={[styles.xpBadgeText, mcTextShadow(mojang.green1, 11)]}>{badge}</Text>
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
  interiorFocused: "#383838",
  divider: "#161616",
} as const;

const styles = StyleSheet.create({
  bar: {
    borderRadius: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: px(6),
  },
  durabilityTrack: {
    flexDirection: "row",
    paddingHorizontal: px(14),
    marginBottom: px(4),
    height: px(3),
  },
  durabilitySlot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: px(8),
  },
  durabilityBar: {
    width: "100%",
    height: px(2),
    borderWidth: StyleSheet.hairlineWidth,
  },
  stripWrap: {
    paddingHorizontal: px(14),
  },
  outline: {
    backgroundColor: SPRITE.outline,
    padding: px(1),
  },
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

  travellingSelector: {
    position: "absolute",
    top: -OVERHANG - U,
    left: -U,
    height: SLOT + OVERHANG * 2,
    zIndex: 2,
  },

  nameRow: {
    height: px(16),
    marginTop: px(6),
  },
  name: {
    position: "absolute",
    top: 0,
    left: 0,
    alignItems: "center",
  },
  nameText: {
    fontFamily: fonts.pixelBold,
    fontSize: pxFont(11),
    lineHeight: Math.round(pxFont(11) * 1.25),
    letterSpacing: px(1),
  },

  /* Minecraft Experience Level badge: classic emerald/lime green with drop shadow */
  xpBadge: {
    position: "absolute",
    top: px(1),
    right: px(2),
    minWidth: px(15),
    height: px(14),
    paddingHorizontal: px(2),
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#204618",
    alignItems: "center",
    justifyContent: "center",
  },
  xpBadgeText: {
    fontFamily: fonts.pixelBold,
    fontSize: pxFont(10),
    lineHeight: px(12),
    color: mojang.green1,
  },

  pickupParticle: {
    position: "absolute",
    top: px(2),
    alignSelf: "center",
    zIndex: 5,
  },
  particleText: {
    fontFamily: fonts.pixelBold,
    fontSize: pxFont(10),
    color: mojang.gold,
  },

  /* Floating Ender Chest button positioned at bottom right corner above hotbar */
  chestFab: {
    position: "absolute",
    top: -px(16),
    right: px(16),
    width: px(36),
    height: px(36),
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 6,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "flex-end",
    paddingBottom: px(40),
    paddingHorizontal: px(16),
  },
  chestGuiContainer: {
    padding: px(16),
    width: "100%",
    maxWidth: px(480),
    alignSelf: "center",
  },
  chestHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  chestTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: px(8),
  },
  chestTitle: {
    fontFamily: fonts.pixelBold,
    fontSize: pxFont(15),
    letterSpacing: px(1),
  },
  closeButton: {
    padding: px(4),
  },
  chestItemsGrid: {
    gap: px(10),
  },
  chestItemCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: px(12),
    borderWidth: 1,
    gap: px(12),
  },
  chestItemIconBox: {
    width: px(38),
    height: px(38),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  chestItemInfo: {
    flex: 1,
    gap: px(2),
  },
  chestItemTitle: {
    fontFamily: fonts.pixelBold,
    fontSize: pxFont(13),
  },
  chestItemDesc: {
    fontFamily: fonts.pixel,
    fontSize: pxFont(11),
  },
});
