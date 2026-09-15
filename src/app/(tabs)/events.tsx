import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
  RefreshControl,
  ScrollView,
  Dimensions,
  Modal,
  PanResponder,
  Pressable,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeInDown,
  Layout,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts, typography } from "@/theme/tokens";
import { px } from "@/theme/scale";
import { useM3Theme } from "@/theme/M3ThemeContext";
import { EventItem } from "@/services/api";
import { EventDetailSheet } from "@/components/EventDetailSheet";
import { useAppData } from "@/modules/core/DataProvider";
import { getEventImage } from "@/services/EventAssets";

const { height: SCREEN_H } = Dimensions.get("window");
type EventFilterType = "all" | "technical" | "non-technical";

export default function EventsTab() {
  const insets = useSafeAreaInsets();
  const { theme, isDark, toggleColorMode } = useM3Theme();

  const { events, eventsSource: dataSource, eventsLoading: loading, refreshData } = useAppData();
  const [filterType, setFilterType] = useState<EventFilterType>("all");
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [myEvents, setMyEvents] = useState<string[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);

  // Bottom Sheet Gesture & Animation Shared Values
  const sheetY = useSharedValue(0);

  const closeBottomSheet = useCallback(() => {
    setSelectedEvent(null);
    sheetY.value = 0;
  }, [sheetY]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          gestureState.dy > 6 && Math.abs(gestureState.dx) < Math.abs(gestureState.dy),
        onPanResponderMove: (_, gestureState) => {
          if (gestureState.dy > 0) {
            sheetY.value = gestureState.dy;
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dy > 110 || gestureState.vy > 0.7) {
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            } catch (_) {}
            sheetY.value = withTiming(SCREEN_H * 0.85, { duration: 220 }, (done) => {
              if (done) {
                runOnJS(closeBottomSheet)();
              }
            });
          } else {
            sheetY.value = withSpring(0, { damping: 18, stiffness: 220 });
          }
        },
      }),
    [closeBottomSheet, sheetY]
  );

  const animatedSheetStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: sheetY.value }],
    };
  });

  useEffect(() => {
    if (selectedEvent) {
      sheetY.value = 0;
    }
  }, [selectedEvent, sheetY]);

  // Load user bookmarks / registered events
  useEffect(() => {
    AsyncStorage.getItem("@gateways_my_events").then((stored) => {
      if (stored) {
        try {
          setMyEvents(JSON.parse(stored));
        } catch {}
      }
    });
  }, []);

  const toggleParticipate = async (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    let updated: string[];
    if (myEvents.includes(id)) {
      updated = myEvents.filter((item) => item !== id);
    } else {
      updated = [...myEvents, id];
      await AsyncStorage.setItem("@gateways_active_event_id", id);
    }
    setMyEvents(updated);
    await AsyncStorage.setItem("@gateways_my_events", JSON.stringify(updated));
  };



  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  }, [refreshData]);

  const openEventDetails = (item: EventItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedEvent(item);
  };

  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      if (filterType === "all") return true;
      const typeStr = (ev.type || "").toLowerCase();
      if (filterType === "technical") {
        return typeStr.includes("tech") && !typeStr.includes("non");
      }
      if (filterType === "non-technical") {
        return (
          typeStr.includes("non") ||
          typeStr.includes("cultur") ||
          typeStr.includes("gaming") ||
          !typeStr.includes("tech")
        );
      }
      return true;
    });
  }, [events, filterType]);

  const counts = useMemo(() => {
    let tech = 0;
    let nonTech = 0;
    events.forEach((ev) => {
      const typeStr = (ev.type || "").toLowerCase();
      if (typeStr.includes("tech") && !typeStr.includes("non")) {
        tech++;
      } else {
        nonTech++;
      }
    });
    return { all: events.length, tech, nonTech };
  }, [events]);

  // Color tokens depending on Dark/Light mode
  const bgRoot = theme.background;
  const bgCard = theme.surfaceElevated;
  const textPrimary = theme.text;
  const textSecondary = theme.textDim;
  const textMuted = isDark ? "#637084" : "#94a3b8";
  const borderSubtle = isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)";
  const sheetBg = isDark ? "#0e1420" : "#ffffff";
  const sheetBorder = isDark ? theme.rimBorder : "rgba(0, 0, 0, 0.12)";
  const chipBg = isDark ? "rgba(22, 28, 40, 0.75)" : "#e9eef5";
  const chipBorder = isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)";
  const shadowColor = isDark ? "#000000" : "#0f172a";

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: bgRoot }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.primary }]}>LOADING FEST EVENTS...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: bgRoot, paddingTop: Math.max(insets.top, px(16)) + px(8) }]}>
      {/* Top Header Row with Title & Dark/Light Mode Toggle */}
      <View style={styles.topHeader}>
        <View style={styles.headerTitleRow}>
          <View>
            <Text style={[styles.headerTitle, { color: textPrimary }]}>GATEWAYS EVENTS</Text>
            
          </View>

          {/* Dark / Light Mode Switcher */}
          <TouchableOpacity
            style={[
              styles.themeToggleBtn,
              {
                backgroundColor: theme.surfaceElevated,
                borderColor: borderSubtle,
              },
            ]}
            activeOpacity={0.7}
            onPress={toggleColorMode}
          >
            <Ionicons
              name={isDark ? "sunny-outline" : "moon-outline"}
              size={18}
              color={theme.primary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Top Filter Bar */}
      <View style={styles.filterBarContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterBar}
        >
          <TouchableOpacity
            style={[
              styles.filterChip,
              { backgroundColor: chipBg, borderColor: chipBorder },
              filterType === "all" && [
                styles.filterChipActive,
                { backgroundColor: theme.primaryContainer, borderColor: theme.primary },
              ],
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setFilterType("all");
            }}
            activeOpacity={0.7}
          >
            <Ionicons
              name="sparkles"
              size={12}
              color={filterType === "all" ? theme.primary : textSecondary}
            />
            <Text
              style={[
                styles.filterChipText,
                { color: textSecondary },
                filterType === "all" && [styles.filterChipTextActive, { color: theme.primary }],
              ]}
            >
              ALL ({counts.all})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              { backgroundColor: chipBg, borderColor: chipBorder },
              filterType === "technical" && [
                styles.filterChipActive,
                { backgroundColor: theme.primaryContainer, borderColor: theme.primary },
              ],
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setFilterType("technical");
            }}
            activeOpacity={0.7}
          >
            <Ionicons
              name="code-slash"
              size={12}
              color={filterType === "technical" ? theme.primary : textSecondary}
            />
            <Text
              style={[
                styles.filterChipText,
                { color: textSecondary },
                filterType === "technical" && [styles.filterChipTextActive, { color: theme.primary }],
              ]}
            >
              TECHNICAL ({counts.tech})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              { backgroundColor: chipBg, borderColor: chipBorder },
              filterType === "non-technical" && [
                styles.filterChipActive,
                { backgroundColor: theme.primaryContainer, borderColor: theme.primary },
              ],
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setFilterType("non-technical");
            }}
            activeOpacity={0.7}
          >
            <Ionicons
              name="game-controller"
              size={12}
              color={filterType === "non-technical" ? theme.primary : textSecondary}
            />
            <Text
              style={[
                styles.filterChipText,
                { color: textSecondary },
                filterType === "non-technical" && [styles.filterChipTextActive, { color: theme.primary }],
              ]}
            >
              NON-TECHNICAL ({counts.nonTech})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Offline Backup Banner if Live Server fails */}
      {dataSource === "fallback" && (
        <View style={styles.fallbackNotice}>
          <View style={styles.fallbackNoticeHeader}>
            <Text style={styles.fallbackNoticeIcon}>⚠️</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.fallbackNoticeTitle}>OFFLINE DEMO BACKUP</Text>
              <Text style={styles.fallbackNoticeText}>
                Could not connect to live event servers. Showing placeholder events.
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.fallbackRetryBtn}
            onPress={() => {
              
              refreshData();
            }}
          >
            <Text style={styles.fallbackRetryText}>TAP TO RETRY SYNC</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Minimal, Decluttered Events List */}
      <Animated.FlatList
        data={filteredEvents}
        keyExtractor={(item) => item.id}
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
          const isRegistered = myEvents.includes(item.id);
          const hasImage = !!(getEventImage(item.title) || item.image_url);

          return (
            <Animated.View
              entering={FadeInDown.delay(index * 45).duration(300)}
              layout={Layout.springify().damping(16)}
            >
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => openEventDetails(item)}
                style={[
                  styles.eventCard,
                  {
                    backgroundColor: isRegistered ? theme.primaryContainer : theme.surfaceElevated,
                    borderColor: isRegistered ? theme.primary : theme.border,
                  },
                ]}
              >
                {/* Large Hero Banner */}
                {hasImage && (
                  <View style={[styles.cardBannerWrap, { backgroundColor: theme.surface }]}>
                    <Image
                      source={getEventImage(item.title) || { uri: item.image_url }}
                      style={styles.cardBannerImage}
                      contentFit="contain"
                    />
                    {isRegistered && (
                      <View style={[styles.registeredPill, { backgroundColor: theme.primary }]}>
                        <Ionicons name="checkmark-circle" size={12} color="#000" />
                        <Text style={styles.registeredPillText}>REGISTERED</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Content Section */}
                <View style={styles.cardContent}>
                  <View style={styles.cardHeader}>
                    <Text style={[styles.itemTitle, { color: textPrimary, flex: 1 }]} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <View
                      style={[
                        styles.tagBadge,
                        { backgroundColor: isRegistered ? "rgba(0,0,0,0.1)" : theme.surface },
                      ]}
                    >
                      <Text
                        style={[
                          styles.tagText,
                          isRegistered ? { color: theme.primary } : { color: textMuted },
                        ]}
                      >
                        {(item.type || "GENERAL").toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  {item.subtitle ? (
                    <Text style={[styles.itemSubtitle, { color: textSecondary }]} numberOfLines={1}>
                      {item.subtitle}
                    </Text>
                  ) : null}

                  <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                      <Ionicons name="time-outline" size={14} color={isRegistered ? theme.primary : textSecondary} />
                      <Text style={[styles.metaText, { color: isRegistered ? theme.primary : textSecondary }]}>
                        {item.from_time ? `${item.from_time}${item.end_time ? ` - ${item.end_time}` : ""}` : "Time TBA"}
                      </Text>
                    </View>
                    {item.venue ? (
                      <View style={styles.metaItem}>
                        <Ionicons name="location-outline" size={14} color={isRegistered ? theme.primary : textSecondary} />
                        <Text style={[styles.metaText, { color: isRegistered ? theme.primary : textSecondary }]} numberOfLines={1}>
                          {item.venue}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </TouchableOpacity>
            </Animated.View>
          );
        }}
      />

      {/* Full Event Details Bottom Sheet Modal */}
      <EventDetailSheet
        visible={!!selectedEvent}
        event={selectedEvent}
        onClose={closeBottomSheet}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: px(14),
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
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
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontFamily: typography.pageTitle.fontFamily,
    fontSize: px(typography.pageTitle.fontSize),
    lineHeight: px(typography.pageTitle.lineHeight),
    letterSpacing: typography.pageTitle.letterSpacing,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: px(16),
    marginTop: px(2),
  },
  themeToggleBtn: {
    width: px(38),
    height: px(38),
    alignItems: "center",
    justifyContent: "center",
  },

  // Filter Bar Styles
  filterBarContainer: {
    marginBottom: px(14),
  },
  filterBar: {
    flexDirection: "row",
    gap: px(8),
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: px(6),
    paddingHorizontal: px(13),
    paddingVertical: px(7),
  },
  filterChipActive: {
  },
  filterChipText: {
    fontFamily: fonts.pixelBold,
    fontSize: px(13.5),
    letterSpacing: px(0.5),
  },
  filterChipTextActive: {},

  listContainer: {
    paddingBottom: px(110),
  },

  eventCard: {
    marginBottom: px(16),
    borderRadius: px(8),
    borderWidth: 1,
    overflow: "hidden",
  },
  cardBannerWrap: {
    width: "100%",
    height: px(180),
    position: "relative",
    paddingVertical: px(8),
  },
  cardBannerImage: {
    width: "100%",
    height: "100%",
  },
  registeredPill: {
    position: "absolute",
    top: px(10),
    right: px(10),
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: px(8),
    paddingVertical: px(4),
    borderRadius: px(4),
    gap: px(4),
  },
  registeredPillText: {
    fontFamily: fonts.bodyBold,
    fontSize: px(14),
    color: "#000",
  },
  cardContent: {
    padding: px(14),
  },
  itemSubtitle: {
    fontFamily: typography.subtitle.fontFamily,
    fontSize: px(typography.subtitle.fontSize),
    marginTop: px(4),
    marginBottom: px(8),
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: px(12),
    marginTop: px(10),
    paddingTop: px(10),
    borderTopWidth: 1,
    borderTopColor: "rgba(150, 150, 150, 0.15)",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: px(4),
  },
  metaText: {
    fontFamily: typography.caption.fontFamily,
    fontSize: px(typography.caption.fontSize),
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
    paddingRight: px(8),
  },
  tagBadge: {
    paddingVertical: px(4),
    paddingHorizontal: px(8),
  },
  tagText: {
    fontFamily: typography.tag.fontFamily,
    fontSize: px(typography.tag.fontSize),
    letterSpacing: px(typography.tag.letterSpacing),
  },

  // Modal Bottom Sheet Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    paddingHorizontal: px(18),
    paddingTop: px(10),
    paddingBottom: px(24),
    maxHeight: "84%",
  },
  modalDragHandleZone: {
    paddingTop: px(2),
    paddingBottom: px(8),
  },
  modalDragBar: {
    width: px(40),
    height: px(4),
    alignSelf: "center",
    marginBottom: px(10),
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalCloseBtn: {
    padding: px(6),
  },
  modalBadgePill: {
    paddingHorizontal: px(8),
    paddingVertical: px(3),
  },
  modalBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: px(13.5),
    letterSpacing: 0.8,
  },
  sheetScrollContent: {
    paddingTop: px(8),
  },
  sheetBannerWrap: {
    width: "100%",
    height: px(150),
    overflow: "hidden",
    marginBottom: px(14),
  },
  sheetBannerImage: {
    width: "100%",
    height: "100%",
  },
  modalMainTitle: {
    fontFamily: fonts.pixelMedium,
    fontSize: px(23),
    letterSpacing: 0.3,
  },
  modalSubTitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: px(17),
    marginTop: px(3),
  },
  modalMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: px(6),
    marginVertical: px(12),
  },
  modalMetaChip: {
    paddingHorizontal: px(9),
    paddingVertical: px(5),
  },
  modalMetaChipText: {
    fontFamily: fonts.bodyMedium,
    fontSize: px(15),
  },
  participateActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: px(8),
    paddingVertical: px(11),
    marginBottom: px(14),
  },
  participateActionBtnActive: {},
  participateActionBtnText: {
    fontFamily: fonts.pixelBold,
    fontSize: px(14),
    letterSpacing: px(0.6),
  },
  sheetSection: {
    marginTop: px(14),
  },
  modalHeading: {
    fontFamily: fonts.pixelBold,
    fontSize: px(15),
    letterSpacing: px(0.8),
    marginBottom: px(6),
    marginTop: px(10),
  },
  modalParagraph: {
    fontFamily: fonts.body,
    fontSize: px(17),
    lineHeight: px(23),
  },
  prizeBox: {
    padding: px(12),
    gap: px(3),
  },
  prizeRank: {
    fontFamily: fonts.bodyBold,
    fontSize: px(16),
  },
  prizeRankVal: {
    fontFamily: fonts.bodyMedium,
  },
  prizeLit: {
    color: "#10b981",
  },
  prizeDesc: {
    fontFamily: fonts.body,
    fontSize: px(15.5),
    fontStyle: "italic",
    marginTop: px(4),
  },
  ruleItem: {
    fontFamily: fonts.body,
    fontSize: px(16.5),
    lineHeight: px(22),
    marginBottom: px(4),
  },
  headsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: px(8),
  },
  headCard: {
    padding: px(10),
    flex: 1,
    minWidth: px(130),
  },
  headName: {
    fontFamily: fonts.bodyBold,
    fontSize: px(16),
  },
  headRole: {
    fontFamily: fonts.body,
    fontSize: px(14.5),
    marginTop: px(1),
  },
  headPhone: {
    fontFamily: fonts.bodyMedium,
    fontSize: px(15),
    color: "#38bdf8",
    marginTop: px(4),
  },
  pdfDownloadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: px(6),
    paddingVertical: px(10),
    marginTop: px(16),
  },
  pdfDownloadBtnText: {
    fontFamily: fonts.pixelBold,
    fontSize: px(13.5),
    letterSpacing: px(0.5),
  },

  // Fallback Notice
  fallbackNotice: {
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderColor: "rgba(239, 68, 68, 0.35)",
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
    fontSize: px(22),
  },
  fallbackNoticeTitle: {
    fontFamily: fonts.pixelMedium,
    fontSize: px(15),
    color: "#f87171",
    letterSpacing: px(0.8),
  },
  fallbackNoticeText: {
    fontFamily: fonts.bodyMedium,
    fontSize: px(15),
    color: "#cbd5e1",
    marginTop: px(2),
  },
  fallbackRetryBtn: {
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    borderColor: "rgba(239, 68, 68, 0.5)",
    paddingVertical: px(6),
    paddingHorizontal: px(12),
    alignSelf: "flex-start",
    marginTop: px(2),
  },
  fallbackRetryText: {
    fontFamily: fonts.pixelBold,
    fontSize: px(13),
    color: "#fca5a5",
    letterSpacing: px(0.5),
  },
});
