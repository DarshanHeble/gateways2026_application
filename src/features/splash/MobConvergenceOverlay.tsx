import React, { useEffect } from "react";
import { StyleSheet, View, Text, Dimensions } from "react-native";
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

import { registerChunkTransitionHandlers } from "./chunkTransition";
import { colors, fonts } from "@/theme/tokens";
import { px } from "@/theme/scale";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

// Each mob has an assigned target position, angle, scale, and spawn direction
// When converging, they rush in towards the center/focal zones, overlapping with slight rotation
// to create a dynamic action-packed horde swarm covering the screen.
const MOB_SIZE = Math.max(SCREEN_W * 0.72, SCREEN_H * 0.38);

interface DynamicMob {
  id: string;
  source: any;
  targetX: number;
  targetY: number;
  startOffsetX: number;
  startOffsetY: number;
  rotation: number; // slight tilt in degrees
  zIndex: number;
}

const MOBS: DynamicMob[] = [
  // 1. Creeper - Top Left, coming from top-left far corner
  {
    id: "creeper",
    source: require("../../../assets/images/characters/creeper.png"),
    targetX: -MOB_SIZE * 0.12,
    targetY: -MOB_SIZE * 0.08,
    startOffsetX: -SCREEN_W * 0.9,
    startOffsetY: -SCREEN_H * 0.7,
    rotation: -8,
    zIndex: 1,
  },
  // 2. Skeleton - Top Right, coming from top-right
  {
    id: "skeleton",
    source: require("../../../assets/images/characters/skeleton.png"),
    targetX: SCREEN_W - MOB_SIZE * 0.88,
    targetY: -MOB_SIZE * 0.05,
    startOffsetX: SCREEN_W * 0.9,
    startOffsetY: -SCREEN_H * 0.7,
    rotation: 6,
    zIndex: 2,
  },
  // 3. Steve - Mid Left, sweeping across center
  {
    id: "steve",
    source: require("../../../assets/images/characters/steve.png"),
    targetX: -MOB_SIZE * 0.1,
    targetY: (SCREEN_H - MOB_SIZE) * 0.44,
    startOffsetX: -SCREEN_W * 1.1,
    startOffsetY: 40,
    rotation: 5,
    zIndex: 3,
  },
  // 4. Alex - Mid Right, overlapping Steve in center
  {
    id: "alex",
    source: require("../../../assets/images/characters/alex.png"),
    targetX: SCREEN_W - MOB_SIZE * 0.9,
    targetY: (SCREEN_H - MOB_SIZE) * 0.52,
    startOffsetX: SCREEN_W * 1.1,
    startOffsetY: -30,
    rotation: -7,
    zIndex: 4,
  },
  // 5. Zombie - Bottom Left
  {
    id: "zombie",
    source: require("../../../assets/images/characters/zombie.png"),
    targetX: -MOB_SIZE * 0.08,
    targetY: SCREEN_H - MOB_SIZE * 0.92,
    startOffsetX: -SCREEN_W * 0.9,
    startOffsetY: SCREEN_H * 0.7,
    rotation: 9,
    zIndex: 5,
  },
  // 6. Enderman - Bottom Right, huge presence
  {
    id: "enderman",
    source: require("../../../assets/images/characters/enderman.png"),
    targetX: SCREEN_W - MOB_SIZE * 0.92,
    targetY: SCREEN_H - MOB_SIZE * 0.94,
    startOffsetX: SCREEN_W * 0.9,
    startOffsetY: SCREEN_H * 0.7,
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
  const animStyle = useAnimatedStyle(() => {
    "worklet";
    const p = progress.value;
    const curX = mob.targetX + mob.startOffsetX * (1 - p);
    const curY = mob.targetY + mob.startOffsetY * (1 - p);
    // Slight zoom effect on entry
    const scale = 0.8 + 0.28 * p;
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
        source={mob.source}
        style={styles.mobImage}
        contentFit="cover"
        cachePolicy="memory-disk"
        allowDownscaling={false}
      />
      {/* Minecraft shadow/border rim */}
      <View style={styles.mobBorder} />
    </Animated.View>
  );
}

const CONVERGE_MS = 380;
const REVEAL_MS = 340;

export function MobConvergenceOverlay() {
  const progress = useSharedValue(0);
  const badgeScale = useSharedValue(0);

  useEffect(() => {
    return registerChunkTransitionHandlers({
      cover: (onCovered) => {
        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
        } catch (_) {}

        // Center badge pops in
        badgeScale.value = withTiming(1, {
          duration: CONVERGE_MS,
          easing: Easing.out(Easing.back(1.4)),
        });

        // 6 Large mobs swarm in and overlap to cover the screen
        progress.value = withTiming(
          1,
          {
            duration: CONVERGE_MS,
            easing: Easing.out(Easing.quad),
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
        } catch (_) {}

        badgeScale.value = withTiming(0, { duration: 180 });

        // 6 Large mobs blast back out off-screen
        progress.value = withTiming(0, {
          duration: REVEAL_MS,
          easing: Easing.in(Easing.quad),
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

const styles = StyleSheet.create({
  container: {
    zIndex: 99999,
    backgroundColor: "#07080c",
    overflow: "hidden",
  },
  mobWrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.8,
    shadowRadius: 16,
    elevation: 16,
  },
  mobImage: {
    width: "100%",
    height: "100%",
  },
  mobBorder: {
    ...StyleSheet.absoluteFill,
    borderWidth: 3,
    borderColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 8,
  },
  centerEmblem: {
    position: "absolute",
    zIndex: 9999,
    alignSelf: "center",
    top: SCREEN_H / 2 - px(34),
    width: px(180),
    height: px(68),
    backgroundColor: "#0f1522",
    borderWidth: 3,
    borderColor: colors.gold.bright,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 20,
  },
  emblemTitle: {
    fontFamily: fonts.pixelBold,
    fontSize: px(13),
    color: colors.gold.bright,
    letterSpacing: px(2),
  },
  emblemSub: {
    fontFamily: fonts.pixel,
    fontSize: px(9),
    color: colors.cta.glow,
    letterSpacing: px(1.5),
    marginTop: px(4),
  },
});
