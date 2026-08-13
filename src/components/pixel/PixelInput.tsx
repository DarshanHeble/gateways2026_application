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
};

/**
 * A Silkscreen-labelled field sunk into the notice board: a 2px dark frame with
 * a hard inner top shadow, matching the design's inset box-shadow exactly.
 */
export const PixelInput = forwardRef<TextInput, PixelInputProps>(function PixelInput(
  { label, errorNonce = 0, onFocus, onBlur, style, ...rest },
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
          placeholderTextColor={colors.input.placeholder}
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
          style={[styles.field, style]}
          {...rest}
        />
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  label: {
    fontFamily: fonts.pixel,
    fontSize: px(type.fieldLabel.size),
    letterSpacing: px(type.fieldLabel.tracking),
    color: type.fieldLabel.color,
    marginBottom: px(5),
  },
  frame: {
    padding: px(2),
    backgroundColor: "#1a120b",
    borderWidth: px(1),
    borderColor: colors.gold.label,
    borderRadius: px(4),
  },
  frameFocused: {
    borderColor: colors.gold.bright,
    backgroundColor: "#2e1e0f",
  },
  field: {
    paddingVertical: px(10),
    paddingHorizontal: px(11),
    backgroundColor: "#24180d",
    color: "#ffffff",
    fontFamily: fonts.bodyMedium,
    fontSize: px(13),
    // Keeps the field height identical across platforms despite font metrics.
    height: px(40),
  },
});
