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
import { colors, fonts } from "@/theme/tokens";
import { px } from "@/theme/scale";
import { fetchSchedule, ScheduleResponse, MOCK_SCHEDULE } from "@/services/api";

export default function ScheduleTab() {
  const [scheduleData, setScheduleData] = useState<ScheduleResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);

  const loadSchedule = useCallback(async () => {
    try {
      const data = await fetchSchedule();
      setScheduleData(data);
    } catch {
      setScheduleData(MOCK_SCHEDULE);
    }
  }, []);

  useEffect(() => {
    loadSchedule().finally(() => setLoading(false));
  }, [loadSchedule]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadSchedule();
    setRefreshing(false);
  }, [loadSchedule]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.gold.bright} />
        <Text style={styles.loadingText}>LOADING MASTER SCHEDULE...</Text>
      </View>
    );
  }

  const activeDay = scheduleData?.days[selectedDayIndex] || MOCK_SCHEDULE.days[0];

  return (
    <View style={styles.root}>
      <Text style={styles.subtitle}>Auto-sorted master timeline for Gateways 2026</Text>

      {/* Day Selector Tabs */}
      <View style={styles.daySelectorRow}>
        {(scheduleData?.days || MOCK_SCHEDULE.days).map((day, idx) => {
          const isSelected = idx === selectedDayIndex;
          return (
            <TouchableOpacity
              key={idx}
              style={[styles.dayTab, isSelected && styles.dayTabActive]}
              onPress={() => setSelectedDayIndex(idx)}
            >
              <Text style={[styles.dayTabText, isSelected && styles.dayTabTextActive]}>
                {day.display_date}
              </Text>
            </TouchableOpacity>
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
            tintColor={colors.gold.bright}
            colors={[colors.gold.bright]}
            progressBackgroundColor="#161b26"
          />
        }
        renderItem={({ item, index }) => {
          return (
            <Animated.View
              entering={FadeInDown.delay(index * 70).duration(350)}
              layout={Layout.springify().damping(15)}
              style={styles.timelineCard}
            >
              {/* Time Column */}
              <View style={styles.timeColumn}>
                <Text style={styles.timeStart}>{item.from_time}</Text>
                <Text style={styles.timeEnd}>to {item.end_time}</Text>
              </View>

              {/* Vertical Line Divider with Animated Pulse Node */}
              <View style={styles.dividerContainer}>
                <Animated.View
                  entering={ZoomIn.delay(index * 70 + 100).duration(300)}
                  style={[styles.nodeDot, item.is_competition && styles.nodeDotComp]}
                />
                <View style={styles.verticalLine} />
              </View>

              {/* Card Body */}
              <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  <View style={[styles.tagBadge, item.is_competition ? styles.tagComp : styles.tagGen]}>
                    <Text style={styles.tagText}>{item.category.toUpperCase()}</Text>
                  </View>
                </View>

                {item.subtitle ? <Text style={styles.itemSubtitle}>{item.subtitle}</Text> : null}
                <Text style={styles.venueText}>📍 {item.venue}</Text>
              </View>
            </Animated.View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0d1018",
    paddingHorizontal: px(14),
    paddingTop: px(16),
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0d1018",
  },
  loadingText: {
    fontFamily: fonts.pixelBold,
    fontSize: px(12),
    color: colors.gold.title,
    marginTop: px(12),
  },
  screenTitle: {
    fontFamily: fonts.pixelBold,
    fontSize: px(20),
    color: colors.gold.title,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: px(13),
    color: "#a08c70",
    textAlign: "center",
    marginBottom: px(16),
  },
  daySelectorRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: px(16),
    gap: px(10),
  },
  dayTab: {
    paddingVertical: px(8),
    paddingHorizontal: px(16),
    backgroundColor: "#161b26",
    borderRadius: px(6),
    borderWidth: px(1),
    borderColor: "#2a3245",
  },
  dayTabActive: {
    backgroundColor: "#2a1e12",
    borderColor: "#c8a679",
  },
  dayTabText: {
    fontFamily: fonts.pixelBold,
    fontSize: px(11),
    color: "#8090a8",
  },
  dayTabTextActive: {
    color: "#ffe9b8",
  },
  listContainer: {
    paddingBottom: px(30),
  },
  timelineCard: {
    flexDirection: "row",
    marginBottom: px(12),
  },
  timeColumn: {
    width: px(75),
    paddingRight: px(8),
    alignItems: "flex-end",
    paddingTop: px(4),
  },
  timeStart: {
    fontFamily: fonts.pixelBold,
    fontSize: px(11),
    color: "#ffe9b8",
  },
  timeEnd: {
    fontFamily: fonts.body,
    fontSize: px(11),
    color: "#8090a8",
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
    backgroundColor: "#52a3c4",
    marginTop: px(4),
    borderWidth: px(2),
    borderColor: "#0d1018",
  },
  nodeDotComp: {
    backgroundColor: "#52c480",
  },
  verticalLine: {
    flex: 1,
    width: px(2),
    backgroundColor: "#2a3245",
    marginTop: px(4),
  },
  cardContent: {
    flex: 1,
    backgroundColor: "#161b26",
    padding: px(12),
    borderRadius: px(8),
    borderWidth: px(1),
    borderColor: "#2a3245",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  itemTitle: {
    flex: 1,
    fontFamily: fonts.bodyBold,
    fontSize: px(15),
    color: "#ffffff",
    paddingRight: px(6),
  },
  itemSubtitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: px(12),
    color: "#e2af64",
    marginTop: px(2),
  },
  venueText: {
    fontFamily: fonts.body,
    fontSize: px(12),
    color: "#a08c70",
    marginTop: px(6),
  },
  tagBadge: {
    paddingVertical: px(2),
    paddingHorizontal: px(6),
    borderRadius: px(4),
  },
  tagComp: {
    backgroundColor: "#173425",
  },
  tagGen: {
    backgroundColor: "#202c3d",
  },
  tagText: {
    fontFamily: fonts.pixelBold,
    fontSize: px(9),
    color: "#d0d0d0",
  },
});
