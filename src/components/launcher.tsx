import React from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { Image } from "expo-image";
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import { McGlyph, PixelIcon, type PixelIconName } from "@/components/mc/PixelIcon";
import { useSurface } from "@/components/mc";
import type { EventItem } from "@/services/api";
import { getEventImage } from "@/services/EventAssets";
import { useAssetSource } from "@/modules/assets";
import { useBlockTheme } from "@/theme/BlockThemeContext";
import { mcTextShadow, mojang } from "@/theme/minecraft";
import { px, pxFont } from "@/theme/scale";
import { fonts, space } from "@/theme/tokens";

/**
 * The Launcher-style building blocks the content screens share: press
 * feedback, section headers, and event artwork used as a blurred backdrop.
 * Home introduced them; Schedule uses the same ones so the two read as one app.
 */

/** Gentle scale-down on press. Timed, not sprung — it settles, it doesn't bounce. */
export function PressScale({
  children,
  onPress,
  style,
  containerStyle,
}: {
  children: React.ReactNode;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  /** For the touch target itself, e.g. `flex: 1` to fill a row. */
  containerStyle?: StyleProp<ViewStyle>;
}) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Pressable
      onPress={onPress}
      // Shared values are mutable by design; the compiler lint rule doesn't
      // recognise that yet (same exception as PixelButton).
      onPressIn={() => {
        // eslint-disable-next-line react-hooks/immutability
        scale.value = withTiming(0.975, { duration: 90 });
      }}
      onPressOut={() => {
        // eslint-disable-next-line react-hooks/immutability
        scale.value = withTiming(1, { duration: 140 });
      }}
      accessibilityRole="button"
      style={containerStyle}
    >
      <Animated.View style={[style, animated]}>{children}</Animated.View>
    </Pressable>
  );
}

export function SectionHeader({
  title,
  count,
  action,
  icon,
}: {
  title: string;
  count?: number;
  action?: { label: string; onPress: () => void };
  /** A small item sprite marking the section — the game's own nouns. */
  icon?: PixelIconName;
}) {
  const { theme } = useBlockTheme();
  return (
    <View style={styles.sectionHead}>
      <View style={styles.sectionLead}>
        {icon ? <PixelIcon name={icon} size={px(18)} /> : null}
        <Text style={[styles.sectionTitle, { color: theme.text }, mcTextShadow(theme.text, 18)]}>
        {title}
          {count ? <Text style={{ color: theme.textDim }}>  {count}</Text> : null}
        </Text>
      </View>
      {action ? (
        <Pressable onPress={action.onPress} hitSlop={px(10)} accessibilityRole="button">
          {({ pressed }) => (
            <Text style={[styles.sectionAction, { color: theme.primary, opacity: pressed ? 0.6 : 1 }]}>
              {action.label}
            </Text>
          )}
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * The event's own artwork, heavily blurred and scrimmed, filling its card.
 * `strength` is how much of the page colour is laid back over it.
 */
export function ArtBackdrop({
  event,
  strength,
  tint,
}: {
  event: EventItem;
  strength: number;
  /** Scrim colour. Defaults to the page's surface. */
  tint?: string;
}) {
  const { theme } = useBlockTheme();
  const source = getEventImage(event.title) || (event.image_url ? { uri: event.image_url } : null);
  if (!source) return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Image
        source={source}
        style={[StyleSheet.absoluteFill, styles.backdropImage]}
        contentFit="cover"
        blurRadius={36}
      />
      <View
        style={[StyleSheet.absoluteFill, { backgroundColor: tint ?? theme.surfaceElevated, opacity: strength }]}
      />
    </View>
  );
}

/** "Technical" / "Non-Technical" / "Non Technical" → a short tile tag. */
export function categoryTag(type?: string) {
  const t = (type ?? "").toLowerCase().replace(/[^a-z]/g, "");
  if (t === "technical") return "TECH";
  if (t === "nontechnical") return "NON-TECH";
  // The sheet files the inauguration and valedictory as "General"; to anyone
  // reading the schedule they are the ceremonies, and that's what the legend
  // and the gold ore call them.
  if (t === "general" || t === "") return "CEREMONY";
  return (type ?? "EVENT").toUpperCase();
}

/**
 * An event's badge, clipped to its circle.
 *
 * Every badge is a round medallion touching the edges of its square, but some
 * of the files were exported without transparency — a black square behind the
 * circle (alternate-thesis and in-perspective, which several events share).
 * Clipping to the circle removes those corners whatever the export, and is a
 * no-op for the transparent ones.
 */
export function EventArt({ event, size }: { event: EventItem; size: number }) {
  const source = getEventImage(event.title) || (event.image_url ? { uri: event.image_url } : null);
  if (!source) return null;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, overflow: "hidden" }}>
      <Image source={source} style={{ width: size, height: size }} contentFit="cover" />
    </View>
  );
}

/** "Technical" / "Non Technical" / "Non-Technical" / "General" → one key. */
export function categoryKey(category?: string): "tech" | "nontech" | "general" {
  const c = (category ?? "").toLowerCase().replace(/[^a-z]/g, "");
  if (c === "technical") return "tech";
  if (c === "nontechnical") return "nontech";
  return "general";
}

/**
 * Category as ore. Tech is diamond, Non-Tech emerald, ceremonies gold: the
 * three things a player recognises at a glance, used as the page's colour key
 * on the rail, the tags, the filters and the day track.
 */
export const ORE = { tech: "#4aedd9", nontech: "#17dd62", general: mojang.goldDeep } as const;
export const oreFor = (category?: string) => ORE[categoryKey(category)];

/** A block of ore colour: a flat square with the game's shaded bottom-right. */
export function OreSwatch({ color, size = px(9), style }: { color: string; size?: number; style?: any }) {
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          backgroundColor: color,
          borderRightWidth: Math.max(1, size / 5),
          borderBottomWidth: Math.max(1, size / 5),
          borderColor: "rgba(0,0,0,0.28)",
        },
        style,
      ]}
    />
  );
}

/**
 * Add to / remove from the lineup without opening the event. An empty slot with
 * a plus; filled with a diamond once it's yours.
 */
export function LineupToggle({
  active,
  title,
  onPress,
  onArt = false,
}: {
  active: boolean;
  title: string;
  onPress: () => void;
  /** Sitting over artwork: a dark backing so it reads on any picture. */
  onArt?: boolean;
}) {
  const { theme } = useBlockTheme();
  const surface = useSurface();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={px(8)}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={active ? `Remove ${title} from your lineup` : `Add ${title} to your lineup`}
      style={({ pressed }) => [
        styles.toggle,
        {
          backgroundColor: onArt ? "rgba(0,0,0,0.62)" : active ? theme.primaryContainer : surface.slot,
          borderColor: active ? theme.primary : onArt ? "rgba(255,255,255,0.18)" : theme.border,
          transform: [{ scale: pressed ? 0.92 : 1 }],
        },
      ]}
    >
      {active ? (
        <PixelIcon name="diamond" size={px(14)} />
      ) : (
        <McGlyph name="plus" size={px(12)} color={onArt ? "#ffffff" : theme.textDim} />
      )}
    </Pressable>
  );
}

/**
 * A page header: the fest key art fading into the page, then an eyebrow, a
 * title and a line of context. Bleeds to the screen edges — give it the
 * page's horizontal padding as `gutter` so it can cancel it.
 */
export function PageBanner({
  eyebrow,
  title,
  subtitle,
  action,
  gutter = 0,
  height = 200,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  /** Rendered at the right of the title row. */
  action?: React.ReactNode;
  gutter?: number;
  height?: number;
}) {
  const { theme } = useBlockTheme();
  const insets = useSafeAreaInsets();
  const art = useAssetSource("ui/login-bg");
  const h = insets.top + px(height);
  return (
    <View style={[styles.banner, { height: h, marginHorizontal: -gutter }]}>
      {art ? (
        <Image
          source={art}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          contentPosition={{ top: "92%", left: "50%" }}
          transition={250}
        />
      ) : null}
      <Svg style={StyleSheet.absoluteFill} width="100%" height={h}>
        <Defs>
          <LinearGradient id="pageBannerFade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={theme.background} stopOpacity={0.3} />
            <Stop offset="22%" stopColor={theme.background} stopOpacity={0.05} />
            <Stop offset="58%" stopColor={theme.background} stopOpacity={0.82} />
            <Stop offset="90%" stopColor={theme.background} stopOpacity={1} />
            <Stop offset="100%" stopColor={theme.background} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height={h} fill="url(#pageBannerFade)" />
      </Svg>
      <View pointerEvents="none" style={[styles.bannerFoot, { backgroundColor: theme.background }]} />
      <Animated.View entering={FadeInDown.duration(420)} style={[styles.bannerCopy, { paddingHorizontal: gutter || px(space.xl) }]}>
        <Text style={[styles.bannerEyebrow, { color: theme.primary }]}>{eyebrow}</Text>
        <View style={styles.bannerTitleRow}>
          <Text style={[styles.bannerTitle, { color: theme.text }, mcTextShadow(theme.text, 40)]}>{title}</Text>
          {action}
        </View>
        {subtitle ? <Text style={[styles.bannerSub, { color: theme.textDim }]}>{subtitle}</Text> : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHead: {
    flexDirection: "row",
    // Centre, not baseline: the two faces have different ascents, so their
    // baselines put the action a few points below the title.
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: px(space.xl),
    marginBottom: px(space.md),
  },
  sectionLead: { flexDirection: "row", alignItems: "center", gap: px(10) },
  sectionTitle: {
    fontFamily: fonts.display,
    fontSize: pxFont(18), lineHeight: Math.round(pxFont(18) * 1.25),
    letterSpacing: 0,
  },
  sectionAction: { fontFamily: fonts.displayMedium, fontSize: px(15) },
  backdropImage: { transform: [{ scale: 1.6 }] },
  banner: { overflow: "hidden", justifyContent: "flex-end" },
  bannerFoot: { position: "absolute", left: 0, right: 0, bottom: 0, height: px(6) },
  bannerCopy: { paddingBottom: px(14) },
  bannerEyebrow: {
    fontFamily: fonts.pixelBold,
    fontSize: pxFont(12),
    lineHeight: Math.round(pxFont(12) * 1.25),
    letterSpacing: px(1.2),
  },
  bannerTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: px(4) },
  bannerTitle: { fontFamily: fonts.display, fontSize: px(40), lineHeight: px(48) },
  bannerSub: { fontFamily: fonts.body, fontSize: px(15), lineHeight: px(21), marginTop: px(2) },
  toggle: {
    width: px(32),
    height: px(32),
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
});
