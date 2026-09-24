import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { px } from "@/theme/scale";
import { schemes, vanilla, type FrameDepth } from "@/theme/minecraft";
import { useBlockTheme } from "@/theme/BlockThemeContext";

export type { FrameDepth };

/**
 * The complete Minecraft widget edge: a 1px outline, then the bevel inside it.
 *
 * This exists because the outline is the part everyone leaves out. Reading
 * `button.png` out of the game, row 0 and row 19 are both pure `#000000` and
 * columns 0 and 199 likewise — a hard black rectangle stamped around the whole
 * sprite, with the light and dark strips *inside* it. Without that outline a
 * bevelled rectangle reads as a CSS card with a gradient border; with it, it
 * reads as a sprite. Same for the hotbar and the container panels.
 *
 * `focused` swaps the outline to white, which is vanilla's entire hover
 * treatment (`button_highlighted.png` is `button.png` with `#000000` →
 * `#ffffff` and the face lifted four levels).
 *
 * Drawn as solid edge strips rather than borders so every edge stays exactly N
 * design-pixels at any density, and so the outline and the bevel can have
 * different widths without fighting over the same box model.
 */
export function Frame({
  depth = "raised",
  focused = false,
  outline = true,
  style,
}: {
  depth?: FrameDepth;
  focused?: boolean;
  /** Set false for a widget that butts up against another one. */
  outline?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  // Reads the colour mode rather than taking a fixed set: the light scheme
  // inverts the whole bevel (near-white lift, mid-grey shade) and a widget has
  // to keep its shape through the switch.
  const { isDark } = useBlockTheme();
  const spec = schemes[isDark ? "dark" : "light"].bevel[depth];
  const o = px(1);
  const inset = outline ? o : 0;

  const strip = (extra: ViewStyle): ViewStyle => ({ position: "absolute", ...extra });

  return (
    <View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      {outline ? (
        <>
          <View
            style={strip({
              top: 0,
              left: 0,
              right: 0,
              height: o,
              backgroundColor: focused ? vanilla.outlineFocus : vanilla.outline,
            })}
          />
          <View
            style={strip({
              bottom: 0,
              left: 0,
              right: 0,
              height: o,
              backgroundColor: focused ? vanilla.outlineFocus : vanilla.outline,
            })}
          />
          <View
            style={strip({
              top: 0,
              bottom: 0,
              left: 0,
              width: o,
              backgroundColor: focused ? vanilla.outlineFocus : vanilla.outline,
            })}
          />
          <View
            style={strip({
              top: 0,
              bottom: 0,
              right: 0,
              width: o,
              backgroundColor: focused ? vanilla.outlineFocus : vanilla.outline,
            })}
          />
        </>
      ) : null}

      {/* Bevel, inset by the outline. Top and left are drawn full-width and the
          side strips overlap them, which is how the sprite's corners actually
          resolve: the horizontal run wins. */}
      <View
        style={strip({
          top: inset,
          left: inset,
          right: inset,
          height: px(spec.top.size),
          backgroundColor: spec.top.color,
        })}
      />
      <View
        style={strip({
          bottom: inset,
          left: inset,
          right: inset,
          height: px(spec.bottom.size),
          backgroundColor: spec.bottom.color,
        })}
      />
      <View
        style={strip({
          top: inset,
          bottom: inset,
          left: inset,
          width: px(spec.left.size),
          backgroundColor: spec.left.color,
        })}
      />
      <View
        style={strip({
          top: inset,
          bottom: inset,
          right: inset,
          width: px(spec.right.size),
          backgroundColor: spec.right.color,
        })}
      />
    </View>
  );
}

/**
 * The hotbar's selection frame.
 *
 * Measured from `hotbar_selection.png`: a 24x23 sprite over a 20px slot, so it
 * overhangs by 2px on each side, and its three-pixel edge runs
 * `#d5e8d0 → #a1b29d → #5f6d5c` outward-in. It is *not* white — a pure white
 * frame is the most common tell that a hotbar was eyeballed rather than
 * measured. The centre is fully transparent.
 */
export function SelectionFrame({
  style,
  tone,
}: {
  style?: StyleProp<ViewStyle>;
  /** Force a scheme — for a frame on a surface that doesn't follow the mode. */
  tone?: "dark" | "light";
}) {
  const { isDark } = useBlockTheme();
  const [outer, mid, inner] = schemes[tone ?? (isDark ? "dark" : "light")].selector;
  const ring = (color: string, offset: number): ViewStyle => ({
    position: "absolute",
    top: offset,
    left: offset,
    right: offset,
    bottom: offset,
    borderWidth: px(1),
    borderColor: color,
    borderRadius: 0,
  });

  return (
    <View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      <View style={ring(outer, 0)} />
      <View style={ring(mid, px(1))} />
      <View style={ring(inner, px(2))} />
    </View>
  );
}
