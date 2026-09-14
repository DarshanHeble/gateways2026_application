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

import { colors, fonts } from "@/theme/tokens";
import { px } from "@/theme/scale";
import { useM3Theme } from "@/theme/M3ThemeContext";
import { fetchSchedule, ScheduleResponse, MOCK_SCHEDULE } from "@/services/api";
import { PixelToast } from "@/components/pixel/PixelToast";

export default function ScheduleTab() {
  const insets = useSafeAreaInsets();
  const { theme } = useM3Theme();

  const [scheduleData, setScheduleData] = useState<ScheduleResponse | null>(null);
  const [dataSource, setDataSource] = useState<"network" | "cache" | "fallback">("network");
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const toastTimerRef = React.useRef<any>(null);

  const showToast = useCallback((msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage(msg);
    toastTimerRef.current = setTimeout(() => setToastMessage(null), 2500);
  }, []);

  const loadSchedule = useCallback(async () => {
    try {
      const res = await fetchSchedule();
      setScheduleData(res.data);
      setDataSource(res.source);

      if (res.source === "cache") {
        showToast("LOADED OFFLINE SCHEDULE CACHE");
      } else if (res.source === "network") {
        showToast("LIVE SCHEDULE SYNCED");
      }
    } catch {
      setScheduleData(MOCK_SCHEDULE);
      setDataSource("fallback");
      showToast("OFFLINE DEMO BACKUP LOADED");
    }
  }, [showToast]);

  useEffect(() => {
    loadSchedule().finally(() => setLoading(false));
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, [loadSchedule]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadSchedule();
    setRefreshing(false);
  }, [loadSchedule]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.primary }]}>LOADING MASTER SCHEDULE...</Text>
      </View>
    );
  }

  const daysList = scheduleData?.days && scheduleData.days.length > 0 ? scheduleData.days : MOCK_SCHEDULE.days;
  const safeDayIndex = Math.min(selectedDayIndex, daysList.length - 1);
  const activeDay = daysList[safeDayIndex] || MOCK_SCHEDULE.days[0];

  return (
    <View style={[styles.root, { paddingTop: Math.max(insets.top, px(16)) + px(8) }]}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <Text style={styles.headerTitle}>EVENT TIMELINE</Text>
        <Text style={styles.subtitle}>Auto-sorted master timeline for Gateways 2026</Text>
      </View>

      {/* Day Selector Tabs */}
      <View style={styles.daySelectorRow}>
        {(scheduleData?.days || MOCK_SCHEDULE.days).map((day, idx) => {
          const isSelected = idx === selectedDayIndex;
          return (
            <TouchableOpacity
              key={idx}
              activeOpacity={0.7}
              style={[
                styles.dayTab,
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
                color={isSelected ? theme.primary : "#8090a8"}
              />
              <Text
                style={[
                  styles.dayTabText,
                  isSelected && [styles.dayTabTextActive, { color: theme.primary }],
                ]}
              >
                {day.display_date.toUpperCase()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Offline Backup Notice Banner */}
      {dataSource === "fallback" && (
        <View style={styles.fallbackNotice}>
          <View style={styles.fallbackNoticeHeader}>
            <Text style={styles.fallbackNoticeIcon}>⚠️</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.fallbackNoticeTitle}>OFFLINE DEMO BACKUP</Text>
              <Text style={styles.fallbackNoticeText}>
                Could not connect to live schedule servers. Showing placeholder timeline.
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.fallbackRetryBtn}
            onPress={() => {
              setLoading(true);
              loadSchedule().finally(() => setLoading(false));
            }}
          >
            <Text style={styles.fallbackRetryText}>TAP TO RETRY SYNC</Text>
          </TouchableOpacity>
        </View>
      )}

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
          const isCompetition = Boolean(item.is_competition);

          return (
            <Animated.View
              entering={FadeInDown.delay(index * 60).duration(320)}
              layout={Layout.springify().damping(16)}
              style={styles.timelineCard}
            >
              {/* Time Column */}
              <View style={styles.timeColumn}>
                <Text style={[styles.timeStart, { color: theme.primary }]}>{item.from_time}</Text>
                <Text style={styles.timeEnd}>to {item.end_time}</Text>
              </View>

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
                <View style={styles.verticalLine} />
              </View>

              {/* Card Body */}
              <View
                style={[
                  styles.cardContent,
                  {
                    borderColor: isCompetition
                      ? "rgba(255, 255, 255, 0.12)"
                      : "rgba(255, 255, 255, 0.06)",
                  },
                ]}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  <View
                    style={[
                      styles.tagBadge,
                      isCompetition
                        ? { backgroundColor: theme.primaryContainer, borderColor: theme.primary }
                        : styles.tagGen,
                    ]}
                  >
                    <Text
                      style={[
                        styles.tagText,
                        isCompetition ? { color: theme.primary } : { color: "#94a3b8" },
                      ]}
                    >
                      {item.category.toUpperCase()}
                    </Text>
                  </View>
                </View>

                {item.subtitle ? (
                  <Text style={[styles.itemSubtitle, { color: theme.primary }]}>
                    {item.subtitle}
                  </Text>
                ) : null}

                {item.venue ? (
                  <View style={styles.venueRow}>
                    <Ionicons name="location-outline" size={13} color="#94a3b8" />
                    <Text style={styles.venueText}>{item.venue}</Text>
                  </View>
                ) : null}
              </View>
            </Animated.View>
          );
        }}
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
    fontSize: px(11),
    marginTop: px(12),
    letterSpacing: px(0.8),
  },
  topHeader: {
    marginBottom: px(12),
  },
  headerTitle: {
    fontFamily: fonts.pixelBold,
    fontSize: px(18),
    color: "#ffffff",
    letterSpacing: px(0.5),
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: px(12),
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
    borderRadius: px(20),
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  dayTabActive: {
    borderWidth: 1.2,
  },
  dayTabText: {
    fontFamily: fonts.pixelBold,
    fontSize: px(10),
    color: "#8e99a8",
    letterSpacing: px(0.5),
  },
  dayTabTextActive: {},

  // Fallback notice
  fallbackNotice: {
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.35)",
    borderRadius: px(10),
    padding: px(12),
    marginBottom: px(14),
    gap: px(8),
  },
  fallbackNoticeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: px(10),
  },
  fallbackNoticeIcon: {
    fontSize: px(18),
  },
  fallbackNoticeTitle: {
    fontFamily: fonts.pixelBold,
    fontSize: px(11),
    color: "#f87171",
    letterSpacing: px(0.8),
  },
  fallbackNoticeText: {
    fontFamily: fonts.bodyMedium,
    fontSize: px(11),
    color: "#cbd5e1",
    marginTop: px(2),
  },
  fallbackRetryBtn: {
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    borderColor: "rgba(239, 68, 68, 0.5)",
    borderWidth: 1,
    paddingVertical: px(6),
    paddingHorizontal: px(12),
    borderRadius: px(6),
    alignSelf: "flex-start",
    marginTop: px(2),
  },
  fallbackRetryText: {
    fontFamily: fonts.pixelBold,
    fontSize: px(9),
    color: "#fca5a5",
    letterSpacing: px(0.5),
  },

  listContainer: {
    paddingBottom: px(110),
  },
  timelineCard: {
    flexDirection: "row",
    marginBottom: px(12),
  },
  timeColumn: {
    width: px(76),
    paddingRight: px(8),
    alignItems: "flex-end",
    paddingTop: px(2),
  },
  timeStart: {
    fontFamily: fonts.pixelBold,
    fontSize: px(11),
  },
  timeEnd: {
    fontFamily: fonts.body,
    fontSize: px(11),
    color: "#64748b",
    marginTop: px(2),
  },
  dividerContainer: {
    alignItems: "center",
    marginHorizontal: px(6),
  },
  nodeDot: {
    width: px(12),
    height: px(12),
    borderRadius: px(6),
    marginTop: px(4),
    borderWidth: px(2),
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
    borderRadius: px(12),
    borderWidth: 1,
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
    fontFamily: fonts.bodyBold,
    fontSize: px(14.5),
    color: "#ffffff",
    paddingRight: px(8),
  },
  itemSubtitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: px(12),
    marginTop: px(3),
  },
  venueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: px(4),
    marginTop: px(6),
  },
  venueText: {
    fontFamily: fonts.body,
    fontSize: px(12),
    color: "#94a3b8",
  },
  tagBadge: {
    paddingVertical: px(2),
    paddingHorizontal: px(7),
    borderRadius: px(6),
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  tagGen: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  tagText: {
    fontFamily: fonts.pixelBold,
    fontSize: px(9),
    letterSpacing: px(0.4),
  },
});
