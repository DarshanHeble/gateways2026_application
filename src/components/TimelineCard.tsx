import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import Animated, { FadeInDown, Layout, ZoomIn } from "react-native-reanimated";

import { fonts, typography } from "@/theme/tokens";
import { px } from "@/theme/scale";
import { EventItem } from "@/services/api";
import { getEventImage } from "@/services/EventAssets";

export interface TimelineCardProps {
  item: any;
  index: number;
  isLast: boolean;
  onPress?: () => void;
  badgeOverride?: string;
  theme: any;
}

export function TimelineCard({
  item,
  index,
  isLast,
  onPress,
  badgeOverride,
  theme,
}: TimelineCardProps) {
  const isCompetition = Boolean((item as any).is_competition);
  const badgeText = badgeOverride || ((item as any).category ? (item as any).category.toUpperCase() : "");

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 60).duration(320)}
      layout={Layout.springify().damping(16)}
      style={styles.timelineCard}
    >
      {/* Vertical Line Divider with Animated Node */}
      <View style={styles.dividerContainer}>
        <Animated.View
          entering={ZoomIn.delay(index * 60 + 80).duration(260)}
          style={[
            styles.nodeDot,
            {
              backgroundColor: isCompetition ? theme.primary : "#52a3c4",
              borderColor: "#0a0e17",
            },
          ]}
        />
        {!isLast && <View style={[styles.verticalLine, { backgroundColor: theme.border }]} />}
      </View>

      {/* Card Body */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        disabled={!onPress}
        style={[
          styles.cardContent,
          { backgroundColor: theme.surfaceElevated },
          {
            borderColor: isCompetition ? theme.primary : theme.border,
            borderWidth: 1, // Added explicit border width so borderColor works
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: px(10) }}>
            {getEventImage(item.title) ? (
              <View
                style={{
                  width: px(32),
                  height: px(32),
                  borderRadius: px(4),
                  overflow: "hidden",
                  backgroundColor: theme.surfaceTint,
                }}
              >
                <Image
                  source={getEventImage(item.title)}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                />
              </View>
            ) : null}
            <Text style={[styles.itemTitle, { color: theme.text }]} numberOfLines={2}>
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
                  isCompetition ? { color: theme.primary } : { color: "#94a3b8" },
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
            <Ionicons name="time-outline" size={13} color={theme.textDim} />
            <Text style={[styles.metaText, { color: theme.textDim }]}>
              {item.from_time || "TBA"}
              {item.end_time ? ` - ${item.end_time}` : ""}
            </Text>
          </View>
          {item.venue ? (
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={13} color={theme.textDim} />
              <Text style={[styles.metaText, { color: theme.textDim }]} numberOfLines={1}>
                {item.venue}
              </Text>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
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
    backgroundColor: "#131824",
    padding: px(12),
    // Removed border radius to keep it boxy and consistent
    borderRadius: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
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
