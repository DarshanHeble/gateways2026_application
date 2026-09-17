import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import Animated, {
  FadeInDown,
  Layout,
  ZoomIn,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { colors, fonts, typography } from "@/theme/tokens";
import { px } from "@/theme/scale";
import { useM3Theme } from "@/theme/M3ThemeContext";
import { ScheduleResponse } from "@/services/api";
import { SEED_SCHEDULE } from "@/services/offline/seed";
import { useAppData } from "@/modules/core/DataProvider";
import { OfflineBanner } from "@/components/OfflineBanner";
import { getEventImage } from "@/services/EventAssets";
import { EventDetailSheet } from "@/components/EventDetailSheet";
import { TimelineCard } from "@/components/TimelineCard";
import { EventItem } from "@/services/api";
import { PixelToast } from "@/components/pixel/PixelToast";

export default function ScheduleTab() {
  const insets = useSafeAreaInsets();
  const { theme } = useM3Theme();

  const { schedule: scheduleData, scheduleSource: dataSource, scheduleSavedAt, scheduleLoading: loading, refreshData } = useAppData();
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
    <View style={[styles.root, { paddingTop: Math.max(insets.top, px(16)) + px(8), backgroundColor: theme.background }]}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>EVENT TIMELINE</Text>
        
      </View>

      {/* Day Selector Tabs */}
      <View style={styles.daySelectorRow}>
        {(scheduleData?.days || SEED_SCHEDULE.days).map((day, idx) => {
          const isSelected = idx === selectedDayIndex;
          return (
            <TouchableOpacity
              key={idx}
              activeOpacity={0.7}
              style={[
                styles.dayTab,
                { backgroundColor: theme.surfaceElevated, borderColor: theme.border },
                isSelected && [
                  styles.dayTabActive,
                  {
                    backgroundColor: theme.primaryContainer,
                    borderColor: theme.primary,
                  },
                ],
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedDayIndex(idx);
              }}
            >
              <Ionicons
                name="calendar"
                size={12}
                color={isSelected ? theme.primary : theme.textDim}
              />
              <Text
                style={[
                  styles.dayTabText,
                  { color: theme.textDim },
                  isSelected && [styles.dayTabTextActive, { color: theme.primary }],
                ]}
              >
                {day.display_date.toUpperCase()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <OfflineBanner source={dataSource} savedAt={scheduleSavedAt} />

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
  dayTab: {
    flexDirection: "row",
    alignItems: "center",
    gap: px(6),
    paddingVertical: px(8),
    paddingHorizontal: px(14),
    backgroundColor: "rgba(22, 28, 40, 0.75)",
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  dayTabActive: {
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