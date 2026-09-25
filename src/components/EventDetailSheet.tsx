import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Dimensions,
  Linking,
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
import * as WebBrowser from "expo-web-browser";

import { timing } from "@/theme/motion";
import { useBlockTheme } from "@/theme/BlockThemeContext";
import { fonts, space, typography } from "@/theme/tokens";
import { EventItem } from "@/services/api";
import { getEventImage } from "@/services/EventAssets";
import { useAssetsVersion } from "@/modules/assets";
import { px, pxFont } from "@/theme/scale";
import { Frame, Grain, McButton, McDivider, useSurface } from "@/components/mc";
import { McGlyph, PixelIcon, type PixelIconName } from "@/components/mc/PixelIcon";
import { rupees, teamLabel } from "@/utils/fest";

const { height: SCREEN_H } = Dimensions.get("window");

// ── Links ───────────────────────────────────────────────────────────────────

/** URLs in the organisers' free text. A capture group, so `split` keeps them. */
const URL_SPLIT = /(https?:\/\/[^\s)>\]]+)/;

/** Trailing punctuation is the sentence's, not the link's. */
function trimUrl(url: string) {
  return url.replace(/[.,;:!?'"]+$/, "");
}

/**
 * A readable name for a link. The rules are Google Docs, and a 90-character
 * `docs.google.com/document/d/1-C9U3…/edit?usp=drive_link` is noise on a phone.
 */
function linkLabel(url: string) {
  const m = url.match(/^https?:\/\/(?:www\.)?([^/?#]+)([^?#]*)/i);
  if (!m) return url;
  const [, host, path] = m;
  if (host === "docs.google.com") {
    if (path.startsWith("/forms")) return "Google Form";
    if (path.startsWith("/spreadsheets")) return "Google Sheet";
    if (path.startsWith("/presentation")) return "Google Slides";
    return "Google Doc";
  }
  if (host === "drive.google.com") return "Google Drive";
  if (host === "forms.gle") return "Google Form";
  return host;
}

/**
 * Open in the in-app browser — a sheet over the event, so closing it lands you
 * back where you were — and fall back to the system if that can't open.
 */
function openLink(url: string) {
  WebBrowser.openBrowserAsync(url).catch(() => {
    Linking.openURL(url).catch(() => {});
  });
}

/** Text with any URLs in it turned into tappable, named links. */
function LinkedText({
  text,
  style,
  linkColor,
  numberOfLines,
}: {
  text: string;
  style: any;
  linkColor: string;
  numberOfLines?: number;
}) {
  const parts = text.split(URL_SPLIT);
  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {parts.map((part, i) => {
        // `split` with one capture group puts the matches at the odd indices.
        if (i % 2 === 0) return part;
        const url = trimUrl(part);
        const rest = part.slice(url.length);
        return (
          <Text key={i}>
            <Text
              onPress={() => openLink(url)}
              accessibilityRole="link"
              style={[styles.link, { color: linkColor }]}
              suppressHighlighting={false}
            >
              {`Open ${linkLabel(url)}`}
            </Text>
            {rest}
          </Text>
        );
      })}
    </Text>
  );
}

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
  // Folded again whenever a different event opens (reset during render, not in
  // an effect, so the new event never flashes fully expanded).
  const [expanded, setExpanded] = useState(false);
  const [expandedFor, setExpandedFor] = useState<string | undefined>(event?.id);
  if (event?.id !== expandedFor) {
    setExpandedFor(event?.id);
    setExpanded(false);
  }
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

  const rulesUrl = event.rules_pdf_url?.trim() || null;
  const description = event.description || "Compete against top participants across colleges.";
  const longDescription = description.length > 320;
  const hasTime = !!event.from_time && !/^tba$/i.test(event.from_time.trim());
  const hasEnd = !!event.end_time && !/^tba$/i.test(event.end_time.trim());
  const timeText = hasTime ? `${event.from_time}${hasEnd ? ` – ${event.end_time}` : ""}` : "Time TBA";
  const team = teamLabel(event.participation_type);
  const pool = rupees(event.prizes?.pool);
  const eligibility = (event.eligibility ?? []).map((l) => l.trim()).filter(Boolean);
  /*
   * Every event's first rule is "Detailed Rules & Guidelines: <the same URL>".
   * The rulebook button says that already, so a rule that is only a label for
   * that link is dropped rather than shown twice.
   */
  const rules = (event.rules ?? []).filter((rule) => {
    if (!rulesUrl || !rule.includes(rulesUrl)) return true;
    return rule.replace(rulesUrl, "").replace(/[\s:–-]+$/, "").trim().length > 60;
  });

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
                {/* Clipped to the badge's circle: some art files carry a black
                    square behind it (see EventArt). */}
                {art ? (
                  <View style={styles.artClip}>
                    <Image source={art} style={styles.artFill} contentFit="cover" />
                  </View>
                ) : null}
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
                {timeText}
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
              {team ? (
                <MetaChip icon="crew" fill={surface.slot} color={theme.textDim}>
                  {team}
                </MetaChip>
              ) : null}
              {event.max_slots ? (
                <MetaChip icon="events" fill={surface.slot} color={theme.textDim}>
                  {event.max_slots} slots
                </MetaChip>
              ) : null}
            </View>

            <McDivider style={styles.divider} />

            <Text style={[styles.eyebrow, { color: theme.textDim }]}>OVERVIEW</Text>
            {/* Long write-ups start folded to five lines, so prizes and the
                rulebook aren't a long scroll away. */}
            <Pressable onPress={() => setExpanded((v) => !v)} disabled={!longDescription}>
              <LinkedText
                text={description}
                style={[styles.paragraph, { color: theme.textDim }]}
                linkColor={theme.primary}
                numberOfLines={longDescription && !expanded ? 5 : undefined}
              />
              {longDescription ? (
                <Text style={[styles.readMore, { color: theme.primary }]}>{expanded ? "Show less" : "Read more"}</Text>
              ) : null}
            </Pressable>

            {prizes.length > 0 ? (
              <>
                <McDivider style={styles.divider} />
                <View style={styles.eyebrowRow}>
                  <Text style={[styles.eyebrow, { color: theme.textDim }]}>PRIZES</Text>
                  {pool ? (
                    <Text style={[styles.poolText, { color: theme.primary }]}>
                      ₹{pool.toLocaleString("en-IN")} pool
                    </Text>
                  ) : null}
                </View>
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

            {eligibility.length ? (
              <>
                <McDivider style={styles.divider} />
                <Text style={[styles.eyebrow, { color: theme.textDim }]}>WHO CAN ENTER</Text>
                {eligibility.map((line, i) => (
                  <LinkedText
                    key={i}
                    text={line}
                    style={[styles.paragraph, { color: theme.textDim }]}
                    linkColor={theme.primary}
                  />
                ))}
              </>
            ) : null}

            {rules.length > 0 || rulesUrl ? (
              <>
                <McDivider style={styles.divider} />
                <Text style={[styles.eyebrow, { color: theme.textDim }]}>RULES &amp; INFO</Text>

                {/* The full rulebook, as a proper control rather than a raw URL
                    in a bullet point that nobody could tap. */}
                {rulesUrl ? (
                  <Pressable
                    onPress={() => openLink(rulesUrl)}
                    accessibilityRole="link"
                    accessibilityLabel={`Rules and guidelines, opens ${linkLabel(rulesUrl)}`}
                    style={({ pressed }) => [
                      styles.docLink,
                      { backgroundColor: theme.surfaceElevated, opacity: pressed ? 0.75 : 1 },
                    ]}
                  >
                    <Frame depth="raised" />
                    <View style={[styles.docIcon, { backgroundColor: surface.slot }]}>
                      <Frame depth="sunken" />
                      <PixelIcon name="events" size={px(24)} />
                    </View>
                    <View style={styles.docBody}>
                      <Text style={[styles.docTitle, { color: theme.text }]}>Rules &amp; guidelines</Text>
                      <Text style={[styles.docMeta, { color: theme.textDim }]}>
                        {linkLabel(rulesUrl)} · opens in the app
                      </Text>
                    </View>
                    <McGlyph name="arrowRight" size={px(14)} color={theme.primary} />
                  </Pressable>
                ) : null}

                {rules.length > 0 ? (
                  <View style={styles.ruleList}>
                    {rules.map((rule, idx) => (
                      <View key={idx} style={styles.ruleRow}>
                        {/* A square bullet, because nothing here is round. */}
                        <View style={[styles.ruleBullet, { backgroundColor: theme.primary }]} />
                        <LinkedText
                          text={rule}
                          style={[styles.ruleText, { color: theme.textDim }]}
                          linkColor={theme.primary}
                        />
                      </View>
                    ))}
                  </View>
                ) : null}
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
  icon,
  children,
  fill,
  color,
}: {
  glyph?: "clock" | "pin" | "star";
  /** A full-colour item sprite instead of a tinted glyph. */
  icon?: PixelIconName;
  children: React.ReactNode;
  fill: string;
  color: string;
}) {
  return (
    <View style={[styles.metaChip, { backgroundColor: fill }]}>
      <Frame depth="sunken" />
      {icon ? <PixelIcon name={icon} size={px(12)} /> : glyph ? <McGlyph name={glyph} size={px(12)} color={color} /> : null}
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
    fontSize: pxFont(typography.eyebrow.fontSize), lineHeight: Math.round(pxFont(typography.eyebrow.fontSize) * 1.25),
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
  artClip: { width: "86%", aspectRatio: 1, borderRadius: 9999, overflow: "hidden" },
  artFill: { width: "100%", height: "100%" },
  headerText: { flex: 1, minWidth: 0 },
  title: {
    fontFamily: typography.h1.fontFamily,
    fontSize: pxFont(typography.h1.fontSize), lineHeight: Math.round(pxFont(typography.h1.fontSize) * 1.25),
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
    fontSize: pxFont(typography.eyebrow.fontSize), lineHeight: Math.round(pxFont(typography.eyebrow.fontSize) * 1.25),
    letterSpacing: typography.eyebrow.letterSpacing,
    marginBottom: px(space.sm),
  },
  readMore: { fontFamily: fonts.bodyBold, fontSize: px(13), marginTop: px(6) },
  eyebrowRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  poolText: { fontFamily: fonts.bodyBold, fontSize: px(13) },
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
    fontSize: pxFont(typography.eyebrow.fontSize), lineHeight: Math.round(pxFont(typography.eyebrow.fontSize) * 1.25),
    letterSpacing: typography.eyebrow.letterSpacing,
  },
  prizeValue: {
    flex: 1,
    fontFamily: typography.subtitle.fontFamily,
    fontSize: px(typography.subtitle.fontSize),
  },

  ruleList: { gap: px(space.sm) },
  ruleRow: { flexDirection: "row", gap: px(space.sm), alignItems: "flex-start" },
  link: { fontFamily: fonts.bodyBold, textDecorationLine: "underline" },
  docLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: px(12),
    padding: px(10),
    marginBottom: px(space.md),
  },
  docIcon: { width: px(40), height: px(40), alignItems: "center", justifyContent: "center" },
  docBody: { flex: 1, minWidth: 0 },
  docTitle: { fontFamily: fonts.display, fontSize: pxFont(15), lineHeight: Math.round(pxFont(15) * 1.25) },
  docMeta: { fontFamily: typography.body.fontFamily, fontSize: px(12), marginTop: px(2) },
  ruleBullet: { width: px(5), height: px(5), marginTop: px(7), borderRadius: 0 },
  ruleText: {
    flex: 1,
    fontFamily: typography.body.fontFamily,
    fontSize: px(typography.body.fontSize),
    lineHeight: px(typography.body.lineHeight),
  },

  action: { marginTop: px(space.xl) },
});
