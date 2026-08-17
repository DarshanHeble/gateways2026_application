import { forwardRef, useEffect, useState } from "react";
import { StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { colors, fonts, type } from "@/theme/tokens";
import { px } from "@/theme/scale";
import { Bevel } from "./Primitives";

export type PixelInputHandle = TextInput;

export type PixelInputProps = TextInputProps & {
  label: string;
  /** Bump to replay the error shake. */
  errorNonce?: number;
  rightAccessory?: React.ReactNode;
};

/**
 * A Silkscreen-labelled field sunk into the notice board: a 2px dark frame with
 * a hard inner top shadow, matching the design's inset box-shadow exactly.
 */
export const PixelInput = forwardRef<TextInput, PixelInputProps>(function PixelInput(
  { label, errorNonce = 0, onFocus, onBlur, style, rightAccessory, ...rest },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const shake = useSharedValue(0);

  useEffect(() => {
    if (errorNonce > 0) {
      shake.value = withSequence(
        withTiming(-1, { duration: 45 }),
        withTiming(1, { duration: 55 }),
        withTiming(-1, { duration: 55 }),
        withTiming(1, { duration: 55 }),
        withTiming(0, { duration: 45 }),
      );
    }
    // errorNonce is a monotonically bumped trigger — replay whenever it
    // changes, deliberately excluding `shake` (a stable Reanimated ref).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errorNonce]);

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.value * px(4) }],
  }));

  return (
    <Animated.View style={shakeStyle}>
      <Text style={styles.label} accessibilityElementsHidden importantForAccessibility="no">
        {label}
      </Text>

      <View style={[styles.frame, focused && styles.frameFocused]}>
        <Bevel top={{ color: "rgba(0,0,0,0.5)", size: 3 }} />
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          placeholderTextColor="#a08c70"
          selectionColor={colors.gold.bright}
          cursorColor={colors.gold.bright}
          underlineColorAndroid="transparent"
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[styles.field, style, rightAccessory ? { paddingRight: px(40) } : null]}
          {...rest}
        />
        {rightAccessory && (
          <View style={styles.rightAccessoryContainer}>
            {rightAccessory}
          </View>
        )}
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  label: {
    fontFamily: fonts.pixelBold,
    fontSize: px(11),
    letterSpacing: px(1.5),
    color: colors.gold.title,
    marginBottom: px(6),
  },
  frame: {
    padding: px(2),
    backgroundColor: colors.gold.muted,
    borderRadius: px(4),
  },
  frameFocused: {
    backgroundColor: colors.gold.bright,
  },
  field: {
    paddingVertical: px(10),
    paddingHorizontal: px(14),
    backgroundColor: "#1c140c", // Rich high-contrast dark wood
    color: "#ffffff", // Pure white input text
    fontFamily: fonts.bodyMedium,
    fontSize: px(15), // Much larger, readable text
    height: px(48), // Comfortable touch height
    borderRadius: px(2),
  },
  rightAccessoryContainer: {
    position: "absolute",
    right: px(6),
    top: px(2),
    bottom: px(2),
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: px(8),
  },
});
