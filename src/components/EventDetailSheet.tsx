import React, { useCallback, useEffect, useMemo } from "react";
import {
  Dimensions,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Image } from "expo-image";

import { timing } from "@/theme/motion";
import { useBlockTheme } from "@/theme/BlockThemeContext";
import { space, typography } from "@/theme/tokens";
import { EventItem } from "@/services/api";
import { getEventImage } from "@/services/EventAssets";
import { useAssetsVersion } from "@/modules/assets";
import { px } from "@/theme/scale";
import { Frame, Grain, McButton, McDivider, useSurface } from "@/components/mc";
import { McGlyph, PixelIcon, type PixelIconName } from "@/components/mc/PixelIcon";

const { height: SCREEN_H } = Dimensions.get("window");

interface EventDetailSheetProps {
  visible: boolean;
  event: EventItem | null;
  onClose: () => void;
  onViewAction?: () => void;
  /**
   * A primary action for the sheet's footer.
   *
   * Exists so the home screen can offer "add to my stage" without maintaining
   * its own copy of this entire sheet — which is exactly what it was doing: a
   * second, separately-styled detail modal, ~200 lines, that drifted from this
   * one every time either was touched.
   */
  action?: {
    label: string;
    /** `true` renders the confirm tone — the thing is already in your lineup. */
    active?: boolean;
    onPress: () => void;
  };
}

/** 1st / 2nd / 3rd, as the ingots you'd actually be handed. */
const PODIUM: { icon: PixelIconName; label: string; key: keyof NonNullable<EventItem["prizes"]> }[] = [
  { icon: "gold", label: "1ST", key: "winner" },
  { icon: "iron", label: "2ND", key: "runner_up" },
  { icon: "copper", label: "3RD", key: "second_runner_up" },
];

/**
 * The event sheet, as a Minecraft container screen.
 *
 * What it was: a rounded-corner bottom sheet with a drag pill, emoji metadata
 * chips (📅 ⏰ 📍 🥇🥈🥉) and centred headings — a stock iOS sheet with a dark
 * theme. Three things about that were actively wrong here.
 *
 * **The corners.** `borderTopLeftRadius: 24` survived the radius purge because
 * it was a raw number rather than a `px()` call, so this was the last rounded
 * surface in the app.
 *
 * **The emoji.** Platform emoji render in Apple's house style at Apple's scale
 * with Apple's gloss. One of them beside a 12px hand-drawn sprite destroys the
 * sprite, not the other way round.
 *
 * **The drag pill.** A grabber is an iOS affordance. A Minecraft container has a
 * *title bar*: the screen's name set flush left at the top, and a close control
 * at the right. That is what this has now — and the swipe-to-dismiss still works,
 * it just no longer advertises itself with a piece of another platform's UI.
 */
export function EventDetailSheet({
  visible,
  event,
  onClose,
  onViewAction,
  action,
}: EventDetailSheetProps) {
  // `getEventImage` is a synchronous read of the asset registry; without this
  // the sheet would keep whatever was resolvable on first render.
  useAssetsVersion();
  const { theme } = useBlockTheme();
  const surface = useSurface();

  const sheetY = useSharedValue(SCREEN_H);

  const handleClose = useCallback(() => {
    sheetY.value = withTiming(SCREEN_H, timing.sheet, (done) => {
      if (done) runOnJS(onClose)();
    });
  }, [onClose, sheetY]);

  useEffect(() => {
    sheetY.value = visible ? withTiming(0, timing.sheet) : SCREEN_H;
  }, [visible, sheetY]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, g) =>
          g.dy > 6 && Math.abs(g.dx) < Math.abs(g.dy),
        onPanResponderMove: (_, g) => {
          if (g.dy > 0) sheetY.value = g.dy;
        },
        onPanResponderRelease: (_, g) => {
          if (g.dy > 120 || g.vy > 0.8) handleClose();
          else sheetY.value = withTiming(0, timing.sheet);
        },
      }),
    [sheetY, handleClose],
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetY.value }],
  }));

  if (!event) return null;

  const art = getEventImage(event.title);
  const prizes = PODIUM.filter(({ key }) => event.prizes?.[key]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={[styles.overlay, { backgroundColor: theme.overlay }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />

        <Animated.View
          style={[styles.sheet, { backgroundColor: theme.surfaceElevated }, animatedStyle]}
        >
          <Grain />
          <Frame depth="raised" />

          {/* Title bar: the container's name flush left, close at the right. */}
          <View {...panResponder.panHandlers} style={styles.titleBar}>
            <Text style={[styles.containerName, { color: theme.textDim }]}>
              {(event.type || "EVENT").toUpperCase()}
            </Text>
            <Pressable
              onPress={handleClose}
              hitSlop={px(10)}
              accessibilityRole="button"
              accessibilityLabel="Close"
              style={[styles.closeBtn, { backgroundColor: surface.slot }]}
            >
              <Frame depth="raised" />
              <McGlyph name="close" size={px(13)} color={theme.textDim} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
            {/* Header: artwork in a slot, beside the name. */}
            <View style={styles.headerRow}>
              <View style={[styles.artSlot, { backgroundColor: surface.slot }]}>
                <Frame depth="sunken" />
                {art ? <Image source={art} style={styles.artImage} contentFit="contain" /> : null}
              </View>
              <View style={styles.headerText}>
                <Text style={[styles.title, { color: theme.text }]} numberOfLines={3}>
                  {event.title}
                </Text>
                {event.subtitle ? (
                  <Text style={[styles.subtitle, { color: theme.textDim }]} numberOfLines={2}>
                    {event.subtitle}
                  </Text>
                ) : null}
              </View>
            </View>

            {/* Metadata, as slot-style chips with drawn glyphs. */}
            <View style={styles.metaRow}>
              <MetaChip glyph="clock" fill={surface.slot} color={theme.textDim}>
                {event.from_time || "TBA"}
                {event.end_time ? ` – ${event.end_time}` : ""}
              </MetaChip>
              {event.venue ? (
                <MetaChip glyph="pin" fill={surface.slot} color={theme.textDim}>
                  {event.venue}
                </MetaChip>
              ) : null}
              {event.date ? (
                <MetaChip glyph="star" fill={surface.slot} color={theme.textDim}>
                  {event.date}
                </MetaChip>
              ) : null}
            </View>

            <McDivider style={styles.divider} />

            <Text style={[styles.eyebrow, { color: theme.textDim }]}>OVERVIEW</Text>
            <Text style={[styles.paragraph, { color: theme.textDim }]}>
              {event.description || "Compete against top participants across colleges."}
            </Text>

            {prizes.length > 0 ? (
              <>
                <McDivider style={styles.divider} />
                <Text style={[styles.eyebrow, { color: theme.textDim }]}>PRIZES</Text>
                <View style={styles.prizeList}>
                  {prizes.map(({ icon, label, key }) => (
                    <View key={label} style={styles.prizeRow}>
                      <View style={[styles.prizeSlot, { backgroundColor: surface.slot }]}>
                        <Frame depth="sunken" />
                        <PixelIcon name={icon} size={px(24)} />
                      </View>
                      <Text
                        style={[styles.prizeRank, { color: theme.textDim }]}
                        numberOfLines={1}
                      >
                        {label}
                      </Text>
                      <Text style={[styles.prizeValue, { color: theme.text }]} numberOfLines={1}>
                        {event.prizes?.[key]}
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            ) : null}

            {event.rules && event.rules.length > 0 ? (
              <>
                <McDivider style={styles.divider} />
                <Text style={[styles.eyebrow, { color: theme.textDim }]}>RULES &amp; INFO</Text>
                <View style={styles.ruleList}>
                  {event.rules.map((rule, idx) => (
                    <View key={idx} style={styles.ruleRow}>
                      {/* A square bullet, because nothing here is round. */}
                      <View style={[styles.ruleBullet, { backgroundColor: theme.primary }]} />
                      <Text style={[styles.ruleText, { color: theme.textDim }]}>{rule}</Text>
                    </View>
                  ))}
                </View>
              </>
            ) : null}

            {action ? (
              <McButton
                label={action.label}
                tone={action.active ? "confirm" : "primary"}
                block
                onPress={action.onPress}
                style={styles.action}
              />
            ) : null}

            {onViewAction ? (
              <McButton
                label="View full details"
                tone="ghost"
                block
                onPress={onViewAction}
                style={styles.action}
              />
            ) : null}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

function MetaChip({
  glyph,
  children,
  fill,
  color,
}: {
  glyph: "clock" | "pin" | "star";
  children: React.ReactNode;
  fill: string;
  color: string;
}) {
  return (
    <View style={[styles.metaChip, { backgroundColor: fill }]}>
      <Frame depth="sunken" />
      <McGlyph name={glyph} size={px(12)} color={color} />
      <Text style={[styles.metaText, { color }]} numberOfLines={1}>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  sheet: {
    maxHeight: "88%",
    borderRadius: 0,
    overflow: "hidden",
    paddingHorizontal: px(space.lg),
    paddingTop: px(space.md),
  },

  titleBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: px(space.md),
  },
  containerName: {
    fontFamily: typography.eyebrow.fontFamily,
    fontSize: px(typography.eyebrow.fontSize),
    letterSpacing: typography.eyebrow.letterSpacing,
  },
  closeBtn: {
    width: px(30),
    height: px(30),
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 0,
    overflow: "hidden",
  },

  body: { paddingBottom: px(space["3xl"]) },

  headerRow: { flexDirection: "row", gap: px(space.md), alignItems: "flex-start" },
  artSlot: {
    width: px(62),
    height: px(62),
    borderRadius: 0,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  artImage: { width: "86%", height: "86%" },
  headerText: { flex: 1, minWidth: 0 },
  title: {
    fontFamily: typography.h1.fontFamily,
    fontSize: px(typography.h1.fontSize),
    letterSpacing: typography.h1.letterSpacing,
  },
  subtitle: {
    fontFamily: typography.subtitle.fontFamily,
    fontSize: px(typography.subtitle.fontSize),
    marginTop: px(space.xs),
  },

  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: px(space.sm), marginTop: px(space.md) },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: px(space.xs + 2),
    paddingHorizontal: px(space.sm + 2),
    paddingVertical: px(space.xs + 2),
    borderRadius: 0,
    overflow: "hidden",
  },
  metaText: { fontFamily: typography.caption.fontFamily, fontSize: px(typography.caption.fontSize) },

  divider: { marginVertical: px(space.lg) },
  eyebrow: {
    fontFamily: typography.eyebrow.fontFamily,
    fontSize: px(typography.eyebrow.fontSize),
    letterSpacing: typography.eyebrow.letterSpacing,
    marginBottom: px(space.sm),
  },
  paragraph: {
    fontFamily: typography.body.fontFamily,
    fontSize: px(typography.body.fontSize),
    lineHeight: px(typography.body.lineHeight),
  },

  prizeList: { gap: px(space.sm) },
  prizeRow: { flexDirection: "row", alignItems: "center", gap: px(space.md) },
  prizeSlot: {
    width: px(34),
    height: px(34),
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 0,
    overflow: "hidden",
  },
  prizeRank: {
    // Wide enough for "1ST" in the pixel face, which sets much wider than the
    // sans: at 34 it wrapped to "15 / T".
    width: px(44),
    fontFamily: typography.eyebrow.fontFamily,
    fontSize: px(typography.eyebrow.fontSize),
    letterSpacing: typography.eyebrow.letterSpacing,
  },
  prizeValue: {
    flex: 1,
    fontFamily: typography.subtitle.fontFamily,
    fontSize: px(typography.subtitle.fontSize),
  },

  ruleList: { gap: px(space.sm) },
  ruleRow: { flexDirection: "row", gap: px(space.sm), alignItems: "flex-start" },
  ruleBullet: { width: px(5), height: px(5), marginTop: px(7), borderRadius: 0 },
  ruleText: {
    flex: 1,
    fontFamily: typography.body.fontFamily,
    fontSize: px(typography.body.fontSize),
    lineHeight: px(typography.body.lineHeight),
  },

  action: { marginTop: px(space.xl) },
});
