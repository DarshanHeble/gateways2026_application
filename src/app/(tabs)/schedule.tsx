import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { colors, fonts } from "@/theme/tokens";
import { px } from "@/theme/scale";
import { fetchSchedule, ScheduleResponse, ScheduleItem } from "@/services/api";
import { PixelCard } from "@/components/pixel/PixelCard";
import { PixelButton } from "@/components/pixel/PixelButton";

export default function ScheduleTab() {
  const [scheduleData, setScheduleData] = useState<ScheduleResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchSchedule();
      setScheduleData(data);
    } catch (err) {
      setError("Unable to fetch schedule from Google Sheets backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.gold.bright} />
        <Text style={styles.loadingText}>LOADING AUTO-SORTED SCHEDULE...</Text>
      </View>
    );
  }

  if (error || !scheduleData || scheduleData.days.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error || "No schedule timeline found."}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadData}>
          <Text style={styles.retryButtonText}>RETRY</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const activeDay = scheduleData.days[selectedDayIndex] || scheduleData.days[0];

  return (
    <View style={styles.root}>
      <Text style={styles.screenTitle}>EVENT SCHEDULE</Text>
      <Text style={styles.subtitle}>Real-time auto-sorted timeline across all days</Text>

      {/* Day Selector Tabs */}
      <View style={styles.daySelectorRow}>
        {scheduleData.days.map((day, idx) => {
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

      {/* Timeline List for Selected Day */}
      <FlatList
        data={activeDay.timeline}
        keyExtractor={(item, idx) => `${item.id}-${idx}`}
        contentContainerStyle={styles.listContainer}
        renderItem={({ item }) => {
          return (
            <View style={styles.timelineRow}>
              {/* Left Time Pillar */}
              <View style={styles.timePillar}>
                <Text style={styles.timeText}>{item.from_time}</Text>
                <Text style={styles.timeEndText}>{item.end_time}</Text>
                <View style={styles.timelineDot} />
              </View>

              {/* Right Event Card */}
              <View style={styles.cardContainer}>
                <PixelCard
                  headerTitle={item.title}
                  badge={item.is_competition ? item.category : "General"}
                >
                  {item.subtitle ? (
                    <Text style={styles.subtitleText}>{item.subtitle}</Text>
                  ) : null}
                  <Text style={styles.venueText}>📍 Venue: {item.venue}</Text>
                </PixelCard>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.stage,
    paddingHorizontal: px(12),
    paddingTop: px(16),
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.stage,
    padding: px(16),
  },
  loadingText: {
    fontFamily: fonts.pixel,
    fontSize: px(11),
    color: colors.gold.title,
    marginTop: px(12),
  },
  errorText: {
    fontFamily: fonts.body,
    fontSize: px(14),
    color: colors.flame.outer,
    marginBottom: px(12),
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: colors.cta.base,
    paddingVertical: px(8),
    paddingHorizontal: px(16),
    borderRadius: px(4),
    borderWidth: px(1),
    borderColor: colors.cta.glow,
  },
  retryButtonText: {
    fontFamily: fonts.pixelBold,
    fontSize: px(11),
    color: colors.gold.text,
  },
  screenTitle: {
    fontFamily: fonts.pixelBold,
    fontSize: px(18),
    color: colors.gold.title,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: px(12),
    color: colors.body,
    textAlign: "center",
    marginBottom: px(12),
  },
  daySelectorRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: px(12),
    gap: px(8),
  },
  dayTab: {
    paddingVertical: px(6),
    paddingHorizontal: px(12),
    backgroundColor: colors.dirt.mid,
    borderRadius: px(4),
    borderWidth: px(1),
    borderColor: colors.dirt.light,
  },
  dayTabActive: {
    backgroundColor: colors.cta.base,
    borderColor: colors.cta.glow,
  },
  dayTabText: {
    fontFamily: fonts.pixel,
    fontSize: px(10),
    color: colors.gold.muted,
  },
  dayTabTextActive: {
    color: colors.gold.title,
  },
  listContainer: {
    paddingBottom: px(24),
  },
  timelineRow: {
    flexDirection: "row",
    marginBottom: px(4),
  },
  timePillar: {
    width: px(85),
    alignItems: "flex-end",
    paddingRight: px(10),
    paddingTop: px(12),
    borderRightWidth: px(2),
    borderRightColor: colors.gold.muted,
  },
  timeText: {
    fontFamily: fonts.pixelBold,
    fontSize: px(10),
    color: colors.gold.bright,
  },
  timeEndText: {
    fontFamily: fonts.body,
    fontSize: px(10),
    color: colors.gold.muted,
    marginTop: px(2),
  },
  timelineDot: {
    position: "absolute",
    right: px(-6),
    top: px(16),
    width: px(10),
    height: px(10),
    backgroundColor: colors.cta.glow,
    borderRadius: px(5),
  },
  cardContainer: {
    flex: 1,
    paddingLeft: px(10),
  },
  subtitleText: {
    fontFamily: fonts.bodyMedium,
    fontSize: px(12),
    color: colors.gold.bright,
    marginBottom: px(4),
  },
  venueText: {
    fontFamily: fonts.body,
    fontSize: px(11),
    color: colors.body,
  },
});
