import React, { useState, useCallback } from "react";
import { useFocusEffect } from "expo-router";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing
} from "react-native-reanimated";
import { px } from "@/theme/scale";

export function FadeOnFocus({ children, duration = 150 }: { children: React.ReactNode, duration?: number }) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(-px(15));

  useFocusEffect(
    useCallback(() => {
      // Slide down from the top while fading in
      opacity.value = withTiming(1, { duration, easing: Easing.out(Easing.quad) });
      translateY.value = withTiming(0, { duration, easing: Easing.out(Easing.quad) });

      return () => {
        // Instantly reset when blurred
        opacity.value = 0;
        translateY.value = -px(15);
      };
    }, [opacity, translateY, duration])
  );

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
    flex: 1,
  }));

  return <Animated.View style={style}>{children}</Animated.View>;
}
