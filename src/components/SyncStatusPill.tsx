import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Animated, Easing } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { px } from "@/theme/scale";
import { fonts } from "@/theme/tokens";
import { useAppData } from "@/modules/core/DataProvider";
import { useNetwork } from "@/modules/core/NetworkProvider";

/**
 * The transient "what's happening with the network right now" pill.
 *
 * `OfflineBanner` explains the *data* you're looking at; this narrates the
 * *transition* — offline → connecting → syncing → synced — so reconnecting
 * feels like something the app is doing rather than something that silently
 * happened.
 *
 * Offline and connecting are derived from `NetworkProvider` rather than stored,
 * so they can never drift out of step with actual connectivity; only the
 * genuinely event-shaped states (syncing/synced/failed) come from the data
 * layer. Terminal states fade themselves out; conditions stay put.
 */
const AUTO_HIDE_MS = 2200;

type Visual = { label: string; color: string; spinner: boolean; sticky: boolean };

export function SyncStatusPill() {
  const insets = useSafeAreaInsets();
  const { syncState, pendingWrites } = useAppData();
  const { isOnline, isBackendReachable } = useNetwork();

  // `useState` with an initialiser creates these exactly once without touching
  // a ref during render.
  const [opacity] = useState(() => new Animated.Value(0));
  const [translateY] = useState(() => new Animated.Value(-8));
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  let visual: Visual | null;
  if (!isOnline) {
    visual = { label: "OFFLINE", color: "#FF6B6B", spinner: false, sticky: true };
  } else if (isBackendReachable === null && syncState !== "idle") {
    visual = { label: "CONNECTING…", color: "#FFAA00", spinner: true, sticky: true };
  } else if (syncState === "syncing") {
    visual = { label: "SYNCING…", color: "#7FB2FF", spinner: true, sticky: true };
  } else if (syncState === "synced") {
    visual = {
      label: pendingWrites > 0 ? "SYNCED · CHANGES PENDING" : "SYNCED",
      color: "#55DD77",
      spinner: false,
      sticky: false,
    };
  } else if (syncState === "failed") {
    visual = {
      label: isBackendReachable === false ? "SERVER UNREACHABLE" : "USING SAVED DATA",
      color: "#FFAA00",
      spinner: false,
      sticky: false,
    };
  } else {
    visual = null;
  }

  const label = visual?.label ?? "";
  const sticky = visual?.sticky ?? false;

  useEffect(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    if (!label) return;

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 180,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();

    if (!sticky) {
      // Fade out in place rather than unmounting — keeps this free of
      // visibility state, and an opacity-0 pill with pointerEvents="none"
      // is inert anyway.
      hideTimer.current = setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0, duration: 260, useNativeDriver: true }),
          Animated.timing(translateY, { toValue: -8, duration: 260, useNativeDriver: true }),
        ]).start();
      }, AUTO_HIDE_MS);
    }

    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [label, sticky, opacity, translateY]);

  if (!visual) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.wrapper, { top: insets.top + px(8), opacity, transform: [{ translateY }] }]}
    >
      <View style={[styles.pill, { borderColor: visual.color }]}>
        {visual.spinner ? (
          <ActivityIndicator size="small" color={visual.color} style={styles.spinner} />
        ) : (
          <View style={[styles.dot, { backgroundColor: visual.color }]} />
        )}
        <Text style={[styles.label, { color: visual.color }]}>{visual.label}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 9998,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: px(6),
    paddingVertical: px(6),
    paddingHorizontal: px(12),
    borderRadius: px(999),
    borderWidth: px(1),
    backgroundColor: "rgba(12,16,26,0.92)",
  },
  dot: {
    width: px(7),
    height: px(7),
    borderRadius: px(999),
  },
  spinner: {
    transform: [{ scale: 0.7 }],
    marginRight: -px(2),
  },
  label: {
    fontFamily: fonts.pixelBold,
    fontSize: px(10),
    letterSpacing: px(0.8),
  },
});
