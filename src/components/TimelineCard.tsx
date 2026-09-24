import React from "react";
import { mojang } from "@/theme/minecraft";
import { View, Text, StyleSheet } from "react-native";
import { Image } from "expo-image";
import Animated, { FadeInDown, Layout, ZoomIn } from "react-native-reanimated";

import { duration, stepped } from "@/theme/motion";

import { fonts, typography } from "@/theme/tokens";
import { px } from "@/theme/scale";
import { EventItem } from "@/services/api";
import { getEventImage } from "@/services/EventAssets";
import { useAssetsVersion } from "@/modules/assets";
import { Frame, McCard, useSurface } from "@/components/mc";
import { McGlyph } from "@/components/mc/PixelIcon";

export interface TimelineCardProps {
  item: any;
  index: number;
  isLast: boolean;
  onPress?: () => void;
  badgeOverride?: string;
  /**
   * Whether this card gets the gold edge.
   *
   * Was derived from `is_competition`, which on the schedule is true for nearly
   * every row — so every card was gold, and a highlight that applies to
   * everything highlights nothing. The caller now says what is special *in this
   * list*: the next thing up in your lineup, and nothing on the full programme.
   */
  emphasis?: boolean;
  theme: any;
}

export function TimelineCard({
  item,
  index,
  isLast,
  onPress,
  badgeOverride,
  emphasis = false,
  theme,
}: TimelineCardProps) {
  // Subscribe to the asset registry: `getEventImage` is a plain synchronous
  // read, so without this the card would keep whatever was resolvable on first
  // render and never pick up a completed download.
  useAssetsVersion();
  const surface = useSurface();
  const isCompetition = Boolean((item as any).is_competition);
  const badgeText = badgeOverride || ((item as any).category ? (item as any).category.toUpperCase() : "");

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 60).duration(duration.screen).easing(stepped(5))}
      layout={Layout.duration(duration.quick)}
      style={styles.timelineCard}
    >
      {/* Vertical Line Divider with Animated Node */}
      <View style={styles.dividerContainer}>
        <Animated.View
          entering={ZoomIn.delay(index * 60 + 80).duration(260)}
          style={[
            styles.nodeDot,
            {
              backgroundColor: isCompetition ? theme.primary : mojang.greySoft,
              borderColor: "#0a0e17",
            },
          ]}
        />
        {!isLast && <View style={[styles.verticalLine, { backgroundColor: theme.border }]} />}
      </View>

      {/* Card Body */}
      {/* `McCard`, not `TouchableOpacity`: a widget sinks under your finger, it
          does not fade to 80%. Gold edge for a competition, plain stone
          otherwise — the same distinction the 1px border used to make, in the
          game's language. */}
      <McCard
        onPress={onPress}
        depth={emphasis ? "gold" : "raised"}
        fill={emphasis ? surface.slotActive : theme.surfaceElevated}
        style={styles.cardContent}
        accessibilityLabel={item.title}
      >
        <View style={styles.cardHeader}>
          <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: px(10) }}>
            {getEventImage(item.title) ? (
              <View style={[styles.artSlot, { backgroundColor: surface.slot }]}>
                <Frame depth="sunken" />
                <Image
                  source={getEventImage(item.title)}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                />
              </View>
            ) : null}
            <Text
              style={[
                styles.itemTitle,
                { color: theme.text },
              ]}
              numberOfLines={2}
            >
              {item.title}
            </Text>
          </View>
          {badgeText ? (
            <View
              style={[
                styles.tagBadge,
                isCompetition
                  ? { backgroundColor: theme.primaryContainer, borderColor: theme.primary }
                  : [styles.tagGen, { backgroundColor: theme.surfaceTint, borderColor: theme.border }],
              ]}
            >
              <Text
                style={[
                  styles.tagText,
                  isCompetition ? { color: theme.primary } : { color: mojang.greySoft },
                ]}
              >
                {badgeText}
              </Text>
            </View>
          ) : null}
        </View>

        {item.subtitle ? (
          <Text style={[styles.itemSubtitle, { color: theme.primary }]}>
            {item.subtitle}
          </Text>
        ) : null}

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <McGlyph name="clock" size={px(13)} color={theme.textDim} />
            <Text style={[styles.metaText, { color: theme.textDim }]}>
              {item.from_time || "TBA"}
              {item.end_time ? ` - ${item.end_time}` : ""}
            </Text>
          </View>
          {item.venue ? (
            <View style={styles.metaItem}>
              <McGlyph name="pin" size={px(13)} color={theme.textDim} />
              <Text style={[styles.metaText, { color: theme.textDim }]} numberOfLines={1}>
                {item.venue}
              </Text>
            </View>
          ) : null}
        </View>
      </McCard>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  timelineCard: {
    flexDirection: "row",
    marginBottom: px(16),
  },
  dividerContainer: {
    alignItems: "center",
    marginRight: px(14),
  },
  nodeDot: {
    width: px(12),
    height: px(12),
    marginTop: px(4),
  },
  verticalLine: {
    flex: 1,
    width: px(2),
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    marginTop: px(4),
  },
  cardContent: {
    flex: 1,
    padding: px(14),
    borderRadius: 0,
    overflow: "hidden",
    // No soft drop shadow: depth here comes from the bevel, and a blurred
    // shadow under a hard-edged block is the giveaway that it isn't one.
  },
  artSlot: {
    width: px(34),
    height: px(34),
    borderRadius: 0,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  itemTitle: {
    flex: 1,
    fontFamily: typography.h3.fontFamily,
    fontSize: px(typography.h3.fontSize),
    letterSpacing: typography.h3.letterSpacing,
    color: "#ffffff",
    paddingRight: px(8),
  },
  itemSubtitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: px(14),
    marginTop: px(3),
  },
  tagBadge: {
    paddingVertical: px(2),
    paddingHorizontal: px(7),
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
  },
  tagGen: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  tagText: {
    fontFamily: fonts.pixelBold,
    fontSize: px(13),
    letterSpacing: px(0.4),
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: px(12),
    marginTop: px(8),
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: px(4),
  },
  metaText: {
    fontFamily: fonts.bodyMedium,
    fontSize: px(13),
  },
});
