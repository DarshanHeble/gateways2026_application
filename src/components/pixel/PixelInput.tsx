import { forwardRef, useEffect, useState } from "react";
import { StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { fonts, typography } from "@/theme/tokens";
import { px } from "@/theme/scale";
import { Frame, useSurface } from "@/components/mc";
import { useBlockTheme } from "@/theme/BlockThemeContext";

export type PixelInputHandle = TextInput;

export type PixelInputProps = TextInputProps & {
  label: string;
  /** Bump to replay the error shake. */
  errorNonce?: number;
  rightAccessory?: React.ReactNode;
};

/**
 * A text field, sunk into the panel like an inventory slot.
 *
 * The frame was a coloured border that turned gold on focus — a web input's
 * focus ring wearing pixel clothes. It is now the same construction as every
 * other inset surface in the app: a sunken `Frame` over the field, with the
 * *outline* going white on focus, which is precisely how vanilla shows a
 * focused widget (`button_highlighted.png` is the button with `#000000`
 * swapped for `#ffffff`).
 */
export const PixelInput = forwardRef<TextInput, PixelInputProps>(function PixelInput(
  { label, errorNonce = 0, onFocus, onBlur, style, rightAccessory, ...rest },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const { theme } = useBlockTheme();
  const surface = useSurface();
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
      <Text style={[styles.label, { color: theme.text }]} accessibilityElementsHidden importantForAccessibility="no">
        {label}
      </Text>

      <View style={[styles.frame, { backgroundColor: surface.slot }]}>
        <Frame depth="sunken" focused={focused} />
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          placeholderTextColor={theme.textDim}
          selectionColor={theme.primary}
          cursorColor={theme.primary}
          underlineColorAndroid="transparent"
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[styles.field, { color: theme.text }, style, rightAccessory ? { paddingRight: px(40) } : null]}
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
    fontFamily: typography.eyebrow.fontFamily,
    fontSize: px(typography.eyebrow.fontSize),
    letterSpacing: typography.eyebrow.letterSpacing,
    marginBottom: px(6),
  },
  frame: {
    borderRadius: 0,
    overflow: "hidden",
  },
  field: {
    paddingVertical: px(11),
    paddingHorizontal: px(14),
    fontFamily: fonts.bodyMedium,
    fontSize: px(15),
    minHeight: px(46),
    borderRadius: 0,
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
