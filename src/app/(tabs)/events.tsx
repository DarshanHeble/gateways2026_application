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
import { colors, fonts } from "@/theme/tokens";
import { px } from "@/theme/scale";
import { useM3Theme } from "@/theme/M3ThemeContext";
import { fetchEvents, EventItem, MOCK_EVENTS } from "@/services/api";

const { height: SCREEN_H } = Dimensions.get("window");
type EventFilterType = "all" | "technical" | "non-technical";

export default function EventsTab() {
  const insets = useSafeAreaInsets();
  const { theme, isDark, toggleColorMode } = useM3Theme();

  const [events, setEvents] = useState<EventItem[]>([]);
  const [filterType, setFilterType] = useState<EventFilterType>("all");
  const [dataSource, setDataSource] = useState<"network" | "cache" | "fallback">("network");
  const [loading, setLoading] = useState<boolean>(true);
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

  const loadEvents = useCallback(async (isMounted?: () => boolean) => {
    try {
      const res = await fetchEvents();
      if (isMounted && !isMounted()) return;
      setEvents(res.data);
      setDataSource(res.source);
    } catch {
      if (isMounted && !isMounted()) return;
      setEvents(MOCK_EVENTS);
      setDataSource("fallback");
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    loadEvents(() => mounted).finally(() => {
      if (mounted) setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [loadEvents]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadEvents();
    setRefreshing(false);
  }, [loadEvents]);

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
  const bgRoot = isDark ? "#0a0e17" : "#f4f6fa";
  const bgCard = isDark ? "#121824" : "#ffffff";
  const textPrimary = isDark ? "#ffffff" : "#0f172a";
  const textSecondary = isDark ? "#8e99a8" : "#64748b";
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
            <Text style={[styles.subtitle, { color: textSecondary }]}>Explore competitions, rules & schedules</Text>
          </View>

          {/* Dark / Light Mode Switcher */}
          <TouchableOpacity
            style={[
              styles.themeToggleBtn,
              {
                backgroundColor: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)",
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
              setLoading(true);
              loadEvents().finally(() => setLoading(false));
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

          return (
            <Animated.View
              entering={FadeInDown.delay(index * 45).duration(300)}
              layout={Layout.springify().damping(16)}
            >
              <TouchableOpacity
                activeOpacity={0.78}
                onPress={() => openEventDetails(item)}
                style={[
                  styles.cleanCard,
                  {
                    backgroundColor: isRegistered ? theme.primaryContainer : bgCard,
                  },
                ]}
              >
                <View style={styles.cardHeader}>
                  <Text style={[styles.itemTitle, { color: textPrimary }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <View
                    style={[
                      styles.tagBadge,
                      isRegistered
                        ? { backgroundColor: theme.primaryContainer }
                        : { backgroundColor: isDark ? "rgba(255, 255, 255, 0.05)" : "#f1f5f9" },
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

                <View style={styles.timeRow}>
                  <Ionicons name="time-outline" size={14} color={isRegistered ? theme.primary : textSecondary} />
                  <Text style={[styles.timeText, { color: isRegistered ? theme.primary : textSecondary }]}>
                    {item.from_time ? `${item.from_time}${item.end_time ? ` - ${item.end_time}` : ""}` : "Time TBA"}
                  </Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          );
        }}
      />

      {/* Full Event Details Bottom Sheet Modal */}
      <Modal
        visible={!!selectedEvent}
        transparent={true}
        animationType="slide"
        onRequestClose={closeBottomSheet}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeBottomSheet} />

          <Animated.View
            style={[
              styles.modalSheet,
              { backgroundColor: sheetBg, borderColor: sheetBorder },
              animatedSheetStyle,
            ]}
          >
            {/* Draggable Header Drag Bar */}
            <View {...panResponder.panHandlers} style={styles.modalDragHandleZone}>
              <View style={[styles.modalDragBar, { backgroundColor: isDark ? "#374151" : "#cbd5e1" }]} />
              <View style={styles.modalHeaderRow}>
                <View style={[styles.modalBadgePill, { backgroundColor: theme.primaryContainer }]}>
                  <Text style={[styles.modalBadgeText, { color: theme.primary }]}>
                    {(selectedEvent?.type || "COMPETITION").toUpperCase()}
                  </Text>
                </View>
                <TouchableOpacity onPress={closeBottomSheet} style={[styles.modalCloseBtn, { backgroundColor: isDark ? "rgba(255, 255, 255, 0.08)" : "#f1f5f9" }]} activeOpacity={0.7}>
                  <Ionicons name="close" size={18} color={textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetScrollContent}>
              {/* Event Main Banner inside Bottom Sheet if available */}
              {selectedEvent?.image_url ? (
                <View style={styles.sheetBannerWrap}>
                  <Image
                    source={{ uri: selectedEvent.image_url }}
                    style={styles.sheetBannerImage}
                    contentFit="cover"
                  />
                </View>
              ) : null}

              <Text style={[styles.modalMainTitle, { color: textPrimary }]}>{selectedEvent?.title}</Text>
              {selectedEvent?.subtitle ? (
                <Text style={[styles.modalSubTitle, { color: textSecondary }]}>{selectedEvent.subtitle}</Text>
              ) : null}

              {/* Meta Chips */}
              <View style={styles.modalMetaRow}>
                {selectedEvent?.date ? (
                  <View style={[styles.modalMetaChip, { backgroundColor: isDark ? "rgba(255, 255, 255, 0.06)" : "#f1f5f9" }]}>
                    <Text style={[styles.modalMetaChipText, { color: textPrimary }]}>📅 {selectedEvent.date}</Text>
                  </View>
                ) : null}
                {selectedEvent?.from_time ? (
                  <View style={[styles.modalMetaChip, { backgroundColor: isDark ? "rgba(255, 255, 255, 0.06)" : "#f1f5f9" }]}>
                    <Text style={[styles.modalMetaChipText, { color: textPrimary }]}>
                      ⏰ {selectedEvent.from_time}{selectedEvent.end_time ? ` - ${selectedEvent.end_time}` : ""}
                    </Text>
                  </View>
                ) : null}
                {selectedEvent?.venue ? (
                  <View style={[styles.modalMetaChip, { backgroundColor: isDark ? "rgba(255, 255, 255, 0.06)" : "#f1f5f9" }]}>
                    <Text style={[styles.modalMetaChipText, { color: textPrimary }]}>📍 {selectedEvent.venue}</Text>
                  </View>
                ) : null}
                {selectedEvent?.participation_type ? (
                  <View style={[styles.modalMetaChip, { backgroundColor: isDark ? "rgba(255, 255, 255, 0.06)" : "#f1f5f9" }]}>
                    <Text style={[styles.modalMetaChipText, { color: textPrimary }]}>
                      👥 {selectedEvent.participation_type.toUpperCase()}
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Bookmark / Add to Stage Action Button */}
              {selectedEvent && (
                <TouchableOpacity
                  style={[
                    styles.participateActionBtn,
                    myEvents.includes(selectedEvent.id)
                      ? [styles.participateActionBtnActive, { backgroundColor: theme.primaryContainer, borderColor: theme.primary }]
                      : { backgroundColor: theme.primary, borderColor: theme.primary },
                  ]}
                  activeOpacity={0.85}
                  onPress={() => toggleParticipate(selectedEvent.id)}
                >
                  <Ionicons
                    name={myEvents.includes(selectedEvent.id) ? "checkmark-circle" : "bookmark"}
                    size={17}
                    color={myEvents.includes(selectedEvent.id) ? theme.primary : "#ffffff"}
                  />
                  <Text
                    style={[
                      styles.participateActionBtnText,
                      { color: myEvents.includes(selectedEvent.id) ? theme.primary : "#ffffff" },
                    ]}
                  >
                    {myEvents.includes(selectedEvent.id) ? "ADDED TO FEST STAGE" : "+ ADD TO MY SCHEDULE"}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Overview */}
              <Text style={[styles.modalHeading, { color: theme.primary }]}>OVERVIEW</Text>
              <Text style={[styles.modalParagraph, { color: textSecondary }]}>
                {selectedEvent?.description || "Compete against top participants across colleges."}
              </Text>

              {/* Prizes */}
              {selectedEvent?.prizes && (
                <View style={styles.sheetSection}>
                  <Text style={[styles.modalHeading, { color: theme.primary }]}>🏆 PRIZES & AWARDS</Text>
                  <View style={[styles.prizeBox, { backgroundColor: isDark ? "rgba(255, 255, 255, 0.04)" : "#f8fafc", borderColor: borderSubtle }]}>
                    {selectedEvent.prizes.pool ? (
                      <Text style={[styles.prizeRank, { color: textPrimary }]}>
                        💎 Total Pool: <Text style={styles.prizeLit}>{selectedEvent.prizes.pool}</Text>
                      </Text>
                    ) : null}
                    {selectedEvent.prizes.winner ? (
                      <Text style={[styles.prizeRank, { color: textPrimary }]}>
                        🥇 1st Place: <Text style={[styles.prizeRankVal, { color: textSecondary }]}>{selectedEvent.prizes.winner}</Text>
                      </Text>
                    ) : null}
                    {selectedEvent.prizes.runner_up ? (
                      <Text style={[styles.prizeRank, { color: textPrimary }]}>
                        🥈 2nd Place: <Text style={[styles.prizeRankVal, { color: textSecondary }]}>{selectedEvent.prizes.runner_up}</Text>
                      </Text>
                    ) : null}
                    {selectedEvent.prizes.second_runner_up ? (
                      <Text style={[styles.prizeRank, { color: textPrimary }]}>
                        🥉 3rd Place: <Text style={[styles.prizeRankVal, { color: textSecondary }]}>{selectedEvent.prizes.second_runner_up}</Text>
                      </Text>
                    ) : null}
                    {selectedEvent.prizes.description ? (
                      <Text style={[styles.prizeDesc, { color: textMuted }]}>
                        {selectedEvent.prizes.description}
                      </Text>
                    ) : null}
                  </View>
                </View>
              )}

              {/* Rules & Guidelines */}
              {selectedEvent?.rules && selectedEvent.rules.length > 0 && (
                <View style={styles.sheetSection}>
                  <Text style={[styles.modalHeading, { color: theme.primary }]}>📜 RULES & GUIDELINES</Text>
                  {selectedEvent.rules.map((rule, idx) => (
                    <Text key={idx} style={[styles.ruleItem, { color: textSecondary }]}>
                      • {rule}
                    </Text>
                  ))}
                </View>
              )}

              {/* Eligibility */}
              {selectedEvent?.eligibility && selectedEvent.eligibility.length > 0 && (
                <View style={styles.sheetSection}>
                  <Text style={[styles.modalHeading, { color: theme.primary }]}>🎓 ELIGIBILITY</Text>
                  {selectedEvent.eligibility.map((el, idx) => (
                    <Text key={idx} style={[styles.ruleItem, { color: textSecondary }]}>
                      • {el}
                    </Text>
                  ))}
                </View>
              )}

              {/* Event Heads */}
              {selectedEvent?.event_heads && selectedEvent.event_heads.length > 0 && (
                <View style={styles.sheetSection}>
                  <Text style={[styles.modalHeading, { color: theme.primary }]}>👤 EVENT HEADS</Text>
                  <View style={styles.headsGrid}>
                    {selectedEvent.event_heads.map((head, idx) => (
                      <View
                        key={idx}
                        style={[
                          styles.headCard,
                          {
                            backgroundColor: isDark ? "rgba(255, 255, 255, 0.04)" : "#f8fafc",
                            borderColor: borderSubtle,
                          },
                        ]}
                      >
                        <Text style={[styles.headName, { color: textPrimary }]}>{head.name}</Text>
                        <Text style={[styles.headRole, { color: textSecondary }]}>{head.role}</Text>
                        {head.phone ? (
                          <TouchableOpacity onPress={() => Linking.openURL(`tel:${head.phone}`)}>
                            <Text style={styles.headPhone}>📞 {head.phone}</Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Full Rulebook Download Link */}
              {selectedEvent?.rules_pdf_url && (
                <TouchableOpacity
                  style={[
                    styles.pdfDownloadBtn,
                    {
                      backgroundColor: theme.primaryContainer,
                      borderColor: theme.primary,
                    },
                  ]}
                  activeOpacity={0.8}
                  onPress={() => Linking.openURL(selectedEvent.rules_pdf_url!)}
                >
                  <Ionicons name="document-text-outline" size={15} color={theme.primary} />
                  <Text style={[styles.pdfDownloadBtnText, { color: theme.primary }]}>
                    DOWNLOAD FULL RULEBOOK PDF
                  </Text>
                </TouchableOpacity>
              )}

              <View style={{ height: px(40) }} />
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
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
    fontSize: px(11),
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
    fontFamily: fonts.pixelBold,
    fontSize: px(17),
    letterSpacing: px(0.5),
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: px(12),
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
    fontSize: px(9.5),
    letterSpacing: px(0.5),
  },
  filterChipTextActive: {},

  listContainer: {
    paddingBottom: px(110),
  },

  // Minimal Clean Card
  cleanCard: {
    padding: px(16),
    marginBottom: px(8),
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
    paddingRight: px(8),
  },
  tagBadge: {
    paddingVertical: px(4),
    paddingHorizontal: px(8),
  },
  tagText: {
    fontFamily: fonts.pixelBold,
    fontSize: px(9),
    letterSpacing: px(0.4),
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: px(6),
    marginTop: px(12),
  },
  timeText: {
    fontFamily: fonts.body,
    fontSize: px(12),
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
    fontSize: px(9.5),
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
    fontFamily: fonts.pixelBold,
    fontSize: px(19),
    letterSpacing: 0.3,
  },
  modalSubTitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: px(13),
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
    fontSize: px(11),
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
    fontSize: px(10),
    letterSpacing: px(0.6),
  },
  sheetSection: {
    marginTop: px(14),
  },
  modalHeading: {
    fontFamily: fonts.pixelBold,
    fontSize: px(11),
    letterSpacing: px(0.8),
    marginBottom: px(6),
    marginTop: px(10),
  },
  modalParagraph: {
    fontFamily: fonts.body,
    fontSize: px(13),
    lineHeight: px(19),
  },
  prizeBox: {
    padding: px(12),
    gap: px(3),
  },
  prizeRank: {
    fontFamily: fonts.bodyBold,
    fontSize: px(12),
  },
  prizeRankVal: {
    fontFamily: fonts.bodyMedium,
  },
  prizeLit: {
    color: "#10b981",
  },
  prizeDesc: {
    fontFamily: fonts.body,
    fontSize: px(11.5),
    fontStyle: "italic",
    marginTop: px(4),
  },
  ruleItem: {
    fontFamily: fonts.body,
    fontSize: px(12.5),
    lineHeight: px(18),
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
    fontSize: px(12),
  },
  headRole: {
    fontFamily: fonts.body,
    fontSize: px(10.5),
    marginTop: px(1),
  },
  headPhone: {
    fontFamily: fonts.bodyMedium,
    fontSize: px(11),
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
    fontSize: px(9.5),
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
    paddingVertical: px(6),
    paddingHorizontal: px(12),
    alignSelf: "flex-start",
    marginTop: px(2),
  },
  fallbackRetryText: {
    fontFamily: fonts.pixelBold,
    fontSize: px(9),
    color: "#fca5a5",
    letterSpacing: px(0.5),
  },
});
