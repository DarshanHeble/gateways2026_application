import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { VideoView } from "expo-video";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay } from "react-native-reanimated";

import { colors, fonts } from "@/theme/tokens";
import { px, FILL } from "@/theme/scale";
import { Bevel } from "@/components/pixel/Primitives";
import { useVideoSplash } from "../../hooks/useVideoSplash";
import { styles } from "./video-splash.styles";

const SKIP_FADE_DELAY = 1000;

export function VideoSplashScreen({ onDone }: { onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const { player, muted, toggleMute, skip, hidden } = useVideoSplash(onDone);

  const controlsOpacity = useSharedValue(0);
  useEffect(() => {
    if (hidden) return;
    controlsOpacity.value = withDelay(SKIP_FADE_DELAY, withTiming(1, { duration: 250 }));
  }, [hidden, controlsOpacity]);
  const controlsStyle = useAnimatedStyle(() => ({ opacity: controlsOpacity.value }));

  // Reduce Motion resolves onDone synchronously via useVideoSplash — render
  // nothing rather than flash a muted video frame first.
  if (hidden) return null;

  return (
    <View style={styles.root}>
      <VideoView
        player={player}
        style={FILL}
        contentFit="cover"
        nativeControls={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />

      <Animated.View
        style={[styles.mute, { top: insets.top + px(16), left: insets.left + px(16) }, controlsStyle]}
      >
        <Pressable
          onPress={toggleMute}
          accessibilityRole="button"
          accessibilityLabel={muted ? "Unmute" : "Mute"}
          hitSlop={px(10)}
          style={styles.chip}
        >
          <Bevel top={{ color: "rgba(255,255,255,0.14)", size: 2 }} />
          <Text style={styles.chipText}>{muted ? "SOUND OFF" : "SOUND ON"}</Text>
        </Pressable>
      </Animated.View>

      <Animated.View
        style={[
          styles.skip,
          { bottom: insets.bottom + px(20), right: insets.right + px(16) },
          controlsStyle,
        ]}
      >
        <Pressable
          onPress={skip}
          accessibilityRole="button"
          accessibilityLabel="Skip intro"
          hitSlop={px(10)}
          style={styles.chip}
        >
          <Bevel top={{ color: "rgba(255,255,255,0.14)", size: 2 }} />
          <Text style={styles.chipText}>SKIP ▶</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}


