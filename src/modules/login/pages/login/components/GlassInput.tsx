import { forwardRef, useState } from "react";
import { View, TextInput, StyleSheet, type TextInputProps } from "react-native";
import { McGlyph, type GlyphName } from "@/components/mc/PixelIcon";
import { useBlockTheme } from "@/theme/BlockThemeContext";
import { fonts } from "@/theme/tokens";
import { px } from "@/theme/scale";

type Props = TextInputProps & {
  icon: GlyphName;
  rightAccessory?: React.ReactNode;
};

/**
 * A login field that follows the colour mode: the page's raised surface, a
 * hairline edge, and the accent on focus — the same treatment as search on
 * the Events tab.
 */
export const GlassInput = forwardRef<TextInput, Props>(function GlassInput(
  { icon, rightAccessory, style, onFocus, onBlur, ...rest },
  ref,
) {
  const { theme } = useBlockTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View
      style={[
        styles.wrap,
        { backgroundColor: theme.surfaceElevated, borderColor: focused ? theme.primary : theme.border },
        focused && styles.wrapFocused,
      ]}
    >
      <McGlyph name={icon} size={px(15)} color={focused ? theme.primary : theme.textDim} style={styles.icon} />
      <TextInput
        ref={ref}
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
        style={[styles.input, { color: theme.text }, style]}
        {...rest}
      />
      {rightAccessory ? <View style={styles.accessory}>{rightAccessory}</View> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: px(14),
    height: px(52),
    marginBottom: px(6),
  },
  wrapFocused: { borderWidth: px(1.5) },
  icon: { marginRight: px(10) },
  input: { flex: 1, fontFamily: fonts.body, fontSize: px(16), height: "100%" },
  accessory: { marginLeft: px(8) },
});
