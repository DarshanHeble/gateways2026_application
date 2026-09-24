import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import Animated, {
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { fonts, typography } from "@/theme/tokens";
import { px } from "@/theme/scale";
import { DirtBackground, McCard, useSurface } from "@/components/mc";
import { mcTextShadow } from "@/theme/minecraft";
import { useBlockTheme } from "@/theme/BlockThemeContext";
import { ScheduleResponse } from "@/services/api";
import { SEED_SCHEDULE } from "@/services/offline/seed";
import { useAppData } from "@/modules/core/DataProvider";
import { getEventImage } from "@/services/EventAssets";
import { EventDetailSheet } from "@/components/EventDetailSheet";
import { TimelineCard } from "@/components/TimelineCard";
import { EventItem } from "@/services/api";
import { PixelToast } from "@/components/pixel/PixelToast";
import { McGlyph } from "@/components/mc/PixelIcon";

export default function ScheduleTab() {
  const insets = useSafeAreaInsets();
  const { theme } = useBlockTheme();
  const surface = useSurface();

  const { schedule: scheduleData, scheduleLoading: loading, refreshData } = useAppData();
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);


  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  }, [refreshData]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.primary }]}>LOADING MASTER SCHEDULE...</Text>
      </View>
    );
  }

  const daysList = scheduleData?.days || SEED_SCHEDULE.days;
  const safeDayIndex = Math.min(Math.max(0, selectedDayIndex), Math.max(0, daysList.length - 1));
  const activeDay = daysList[safeDayIndex] || SEED_SCHEDULE.days[0];

  return (
    <View style={[styles.root, { paddingTop: insets.top + px(52), backgroundColor: theme.background }]}>
      {/*
        The dirt menu background.

        Minecraft splits its backdrops: the title screen gets the panning
        panorama, and every menu behind it — options, inventory, controls — gets
        the dirt block tiled and darkened. Home is this app's title screen and
        carries the panorama; the list screens get the dirt, which is what makes
        them read as *inside* the same game rather than as a different app's
        settings page.
      */}
      <DirtBackground brightness={0.085} />
      {/* Top Header */}
      <View style={styles.topHeader}>
        <Text
          style={[
            styles.headerTitle,
            { color: theme.text },
          ]}
        >
          EVENT TIMELINE
        </Text>
        
      </View>

      {/* Day Selector Tabs */}
      <View style={styles.daySelectorRow}>
        {(scheduleData?.days || SEED_SCHEDULE.days).map((day, idx) => {
          const isSelected = idx === selectedDayIndex;
          return (
            <McCard
              key={idx}
              onPress={() => setSelectedDayIndex(idx)}
              depth={isSelected ? "gold" : "raised"}
              fill={isSelected ? surface.slotActive : surface.stone}
              style={styles.dayTab}
              accessibilityLabel={day.display_date}
            >
              <McGlyph name="clock" size={px(12)} color={isSelected ? theme.primary : theme.textDim} />
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
                style={[
                  styles.dayTabText,
                  { color: isSelected ? theme.primary : theme.textDim },
                  mcTextShadow(isSelected ? theme.primary : theme.textDim, 14),
                ]}
              >
                {day.display_date.toUpperCase()}
              </Text>
            </McCard>
          );
        })}
      </View>


      {/* Timeline Animated List */}
      <Animated.FlatList
        key={`day-${selectedDayIndex}`}
        data={activeDay.timeline}
        keyExtractor={(item, idx) => `${item.id}-${idx}`}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
            progressViewOffset={20}
          />
        }
        renderItem={({ item, index }) => {
          return (
            <TimelineCard
              item={item}
              index={index}
              isLast={index === activeDay.timeline.length - 1}
              onPress={() => {
                Haptics.selectionAsync();
                setSelectedEvent(item as any);
              }}
              theme={theme}
            />
          );
        }}
      />

      <EventDetailSheet
        visible={!!selectedEvent}
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />

      {/* Sync Status PixelToast */}
      <PixelToast message={toastMessage} bottom={100} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0a0e17",
    paddingHorizontal: px(14),
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0a0e17",
  },
  loadingText: {
    fontFamily: fonts.pixelBold,
    fontSize: px(15),
    marginTop: px(12),
    letterSpacing: px(0.8),
  },
  topHeader: {
    marginBottom: px(12),
  },
  headerTitle: {
    fontFamily: typography.pageTitle.fontFamily,
    fontSize: px(typography.pageTitle.fontSize),
    lineHeight: px(typography.pageTitle.lineHeight),
    color: "#ffffff",
    letterSpacing: typography.pageTitle.letterSpacing,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: px(16),
    color: "#8e99a8",
    marginTop: px(2),
  },
  daySelectorRow: {
    flexDirection: "row",
    marginBottom: px(14),
    gap: px(8),
  },
  /*
   * `flex: 1` so the days share the row.
   *
   * They were intrinsically sized and laid out left to right, so with two days
   * the second ran off the right edge of the screen and was half-unreachable.
   */
  dayTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: px(6),
    paddingVertical: px(10),
    paddingHorizontal: px(10),
  },

  dayTabText: {
    fontFamily: fonts.pixelBold,
    fontSize: px(14),
    color: "#8e99a8",
    letterSpacing: px(0.5),
  },
  dayTabTextActive: {},

  // Fallback notice

  listContainer: {
    paddingBottom: px(24),
    paddingHorizontal: px(16),
  },


















});