import { forwardRef, useState } from "react";
import { View, TextInput, StyleSheet, type TextInputProps } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { fonts } from "@/theme/tokens";
import { px } from "@/theme/scale";

type Props = TextInputProps & {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  rightAccessory?: React.ReactNode;
};

/**
 * A light "frosted glass" pill field with a leading icon — the login card
 * sits on a bright daytime background in the reference mockup, so this reads
 * light-on-light rather than the dark-glass look an earlier background used.
 */
export const GlassInput = forwardRef<TextInput, Props>(function GlassInput(
  { icon, rightAccessory, style, onFocus, onBlur, ...rest },
  ref,
) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.wrap, focused && styles.wrapFocused]}>
      <Ionicons name={icon} size={px(15)} color={focused ? "#3b3220" : "#6b6a63"} style={styles.icon} />
      <TextInput
        ref={ref}
        placeholderTextColor="#8b897e"
        selectionColor="#3b3220"
        cursorColor="#3b3220"
        underlineColorAndroid="transparent"
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[styles.input, style]}
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
    backgroundColor: "rgba(255,255,255,0.55)",
    borderWidth: px(1),
    borderColor: "rgba(60,55,40,0.22)",
    borderRadius: px(10),
    paddingHorizontal: px(10),
    height: px(38),
    marginBottom: px(8),
  },
  wrapFocused: {
    borderColor: "rgba(60,55,40,0.45)",
    backgroundColor: "rgba(255,255,255,0.8)",
  },
  icon: {
    marginRight: px(8),
  },
  input: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: px(12),
    color: "#2c2a22",
    height: "100%",
  },
  accessory: {
    marginLeft: px(6),
  },
});
