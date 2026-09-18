import React, { useEffect } from "react";
import { StyleSheet, Text, Dimensions } from "react-native";
import { Image } from "expo-image";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  SharedValue,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { registerChunkTransitionHandlers } from "../utils/chunkTransition";
import { useAssetSource } from "@/modules/assets";
import { px } from "@/theme/scale";
import { styles } from "./MobConvergenceOverlay.styles";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

// Each mob has an assigned target position, angle, scale, and spawn direction
// When converging, they rush in towards the center/focal zones, overlapping with slight rotation
// to create a dynamic action-packed horde swarm covering the screen.
const MOB_SIZE = Math.min(SCREEN_W * 0.65, px(260));

interface DynamicMob {
  id: string;
  /**
   * CDN asset key rather than a `require()`. This list is built at module scope,
   * which runs before `AssetsProvider` primes the registry, so resolution has to
   * be deferred to render time.
   */
  assetKey: string;
  targetX: number;
  targetY: number;
  startOffsetX: number;
  startOffsetY: number;
  rotation: number; // slight tilt in degrees
  zIndex: number;
}

const MOBS: DynamicMob[] = [
  // 1. Archer Gold - Upper Left
  {
    id: "archer_gold",
    assetKey: "character/archer_gold",
    targetX: px(10),
    targetY: SCREEN_H * 0.08,
    startOffsetX: -SCREEN_W * 0.85,
    startOffsetY: -SCREEN_H * 0.6,
    rotation: -6,
    zIndex: 1,
  },
  // 2. Archer Blue - Upper Right
  {
    id: "archer_blue",
    assetKey: "character/archer_blue",
    targetX: SCREEN_W - MOB_SIZE - px(10),
    targetY: SCREEN_H * 0.10,
    startOffsetX: SCREEN_W * 0.85,
    startOffsetY: -SCREEN_H * 0.6,
    rotation: 6,
    zIndex: 2,
  },
  // 3. Runner Pickaxe - Mid Left
  {
    id: "runner_pickaxe",
    assetKey: "character/runner_pickaxe",
    targetX: px(15),
    targetY: (SCREEN_H - MOB_SIZE) * 0.44,
    startOffsetX: -SCREEN_W * 0.95,
    startOffsetY: 30,
    rotation: 4,
    zIndex: 3,
  },
  // 4. Adventurer - Mid Right
  {
    id: "adventurer",
    assetKey: "character/adventurer",
    targetX: SCREEN_W - MOB_SIZE - px(15),
    targetY: (SCREEN_H - MOB_SIZE) * 0.48,
    startOffsetX: SCREEN_W * 0.95,
    startOffsetY: -25,
    rotation: -5,
    zIndex: 4,
  },
  // 5. Archer Gold (Lower Flank) - Bottom Left
  {
    id: "archer_gold_lower",
    assetKey: "character/archer_gold",
    targetX: px(20),
    targetY: SCREEN_H - MOB_SIZE - SCREEN_H * 0.10,
    startOffsetX: -SCREEN_W * 0.85,
    startOffsetY: SCREEN_H * 0.6,
    rotation: 7,
    zIndex: 5,
  },
  // 6. Runner Pickaxe (Lower Flank) - Bottom Right
  {
    id: "runner_pickaxe_lower",
    assetKey: "character/runner_pickaxe",
    targetX: SCREEN_W - MOB_SIZE - px(20),
    targetY: SCREEN_H - MOB_SIZE - SCREEN_H * 0.08,
    startOffsetX: SCREEN_W * 0.85,
    startOffsetY: SCREEN_H * 0.6,
    rotation: -4,
    zIndex: 6,
  },
];

function SwarmMobItem({
  mob,
  progress,
}: {
  mob: DynamicMob;
  progress: SharedValue<number>;
}) {
  // Reactive: this overlay mounts at the root and its props never change, so a
  // plain `resolveAsset` read would freeze at whatever was known on frame one.
  const source = useAssetSource(mob.assetKey);

  const animStyle = useAnimatedStyle(() => {
    "worklet";
    const p = progress.value;
    const curX = mob.targetX + mob.startOffsetX * (1 - p);
    const curY = mob.targetY + mob.startOffsetY * (1 - p);
    // Well-balanced scale: zoomed out a bit (max 0.88 instead of 1.08) so characters stay centered, clean and visible
    const scale = 0.68 + 0.20 * p;
    const rot = mob.rotation * p;

    return {
      transform: [
        { translateX: curX },
        { translateY: curY },
        { rotate: `${rot}deg` },
        { scale },
      ],
      opacity: Math.min(1, p * 1.6),
    };
  });

  return (
    <Animated.View
      style={[
        styles.mobWrapper,
        {
          width: MOB_SIZE,
          height: MOB_SIZE,
          zIndex: mob.zIndex,
        },
        animStyle,
      ]}
    >
      <Image
        source={source}
        style={styles.mobImage}
        contentFit="contain"
        cachePolicy="memory-disk"
        allowDownscaling={false}
      />
    </Animated.View>
  );
}

const CONVERGE_MS = 850;
const REVEAL_MS = 700;

export function MobConvergenceOverlay() {
  const progress = useSharedValue(0);
  const badgeScale = useSharedValue(0);

  useEffect(() => {
    return registerChunkTransitionHandlers({
      cover: (onCovered) => {
        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
        } catch {}

        // Center badge pops in smoothly
        badgeScale.value = withTiming(1, {
          duration: 550,
          easing: Easing.out(Easing.back(1.2)),
        });

        // 6 Large mobs glide in smoothly and overlap to cover the screen
        progress.value = withTiming(
          1,
          {
            duration: CONVERGE_MS,
            easing: Easing.out(Easing.cubic),
          },
          (done) => {
            "worklet";
            if (done) {
              runOnJS(onCovered)();
            }
          }
        );
      },
      reveal: () => {
        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        } catch {}

        badgeScale.value = withTiming(0, { duration: 300 });

        // 6 Large mobs smoothly glide back off-screen
        progress.value = withTiming(0, {
          duration: REVEAL_MS,
          easing: Easing.inOut(Easing.cubic),
        });
      },
    });
  }, [progress, badgeScale]);

  const centerBadgeStyle = useAnimatedStyle(() => {
    "worklet";
    return {
      opacity: badgeScale.value,
      transform: [
        { scale: badgeScale.value },
      ],
    };
  });

  const overlayContainerStyle = useAnimatedStyle(() => {
    "worklet";
    return {
      opacity: progress.value > 0 ? 1 : 0,
    };
  });

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.container, overlayContainerStyle]}
      pointerEvents="none"
    >
      {/* 6 Overlapping Characters coming from all directions to cover the screen */}
      {MOBS.map((mob) => (
        <SwarmMobItem key={mob.id} mob={mob} progress={progress} />
      ))}

      {/* Center Gateways Emblem locked in the middle */}
      <Animated.View style={[styles.centerEmblem, centerBadgeStyle]}>
        <Text style={styles.emblemTitle}>GATEWAYS 2026</Text>
        <Text style={styles.emblemSub}>LOADING REALM...</Text>
      </Animated.View>
    </Animated.View>
  );
}


