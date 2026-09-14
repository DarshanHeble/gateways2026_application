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
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeInDown,
  FadeInRight,
  Layout,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts } from "@/theme/tokens";
import { px } from "@/theme/scale";
import { useM3Theme } from "@/theme/M3ThemeContext";
import { fetchEvents, EventItem, MOCK_EVENTS } from "@/services/api";

type EventFilterType = "all" | "technical" | "non-technical";

export default function EventsTab() {
  const insets = useSafeAreaInsets();
  const { theme } = useM3Theme();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [filterType, setFilterType] = useState<EventFilterType>("all");
  const [dataSource, setDataSource] = useState<"network" | "cache" | "fallback">("network");
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [myEvents, setMyEvents] = useState<string[]>([]);

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

  const loadEvents = useCallback(async () => {
    try {
      const res = await fetchEvents();
      setEvents(res.data);
      setDataSource(res.source);
    } catch {
      setEvents(MOCK_EVENTS);
      setDataSource("fallback");
    }
  }, []);

  useEffect(() => {
    loadEvents().finally(() => setLoading(false));
  }, [loadEvents]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadEvents();
    setRefreshing(false);
  }, [loadEvents]);

  const toggleExpand = (id: string) => {
    Haptics.selectionAsync();
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      if (filterType === "all") return true;
      const typeStr = (ev.type || "").toLowerCase();
      if (filterType === "technical") {
        return typeStr.includes("tech") && !typeStr.includes("non");
      }
      if (filterType === "non-technical") {
        return typeStr.includes("non") || typeStr.includes("cultur") || typeStr.includes("gaming") || !typeStr.includes("tech");
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

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.primary }]}>LOADING FEST EVENTS...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: Math.max(insets.top, px(16)) + px(8) }]}>
      {/* Header */}
      <View style={styles.topHeader}>
        <Text style={styles.headerTitle}>GATEWAYS EVENTS</Text>
        <Text style={styles.subtitle}>Explore all competitions, rules, and schedules</Text>
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
              color={filterType === "all" ? theme.primary : "#8e99a8"}
            />
            <Text
              style={[
                styles.filterChipText,
                filterType === "all" && [styles.filterChipTextActive, { color: theme.primary }],
              ]}
            >
              ALL ({counts.all})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
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
              color={filterType === "technical" ? theme.primary : "#8e99a8"}
            />
            <Text
              style={[
                styles.filterChipText,
                filterType === "technical" && [styles.filterChipTextActive, { color: theme.primary }],
              ]}
            >
              TECHNICAL ({counts.tech})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
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
              color={filterType === "non-technical" ? theme.primary : "#8e99a8"}
            />
            <Text
              style={[
                styles.filterChipText,
                filterType === "non-technical" && [styles.filterChipTextActive, { color: theme.primary }],
              ]}
            >
              NON-TECHNICAL ({counts.nonTech})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

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

      {/* Events FlatList */}
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
          const isExpanded = expandedId === item.id;
          const isRegistered = myEvents.includes(item.id);

          return (
            <Animated.View
              entering={FadeInDown.delay(index * 60).duration(380)}
              layout={Layout.springify().damping(16)}
              style={[
                styles.card,
                {
                  borderColor: isRegistered ? theme.primary : "rgba(255, 255, 255, 0.08)",
                },
              ]}
            >
              {/* Event Image Card Banner with Floating Info Bubbles */}
              <View style={styles.imageCardContainer}>
                {item.image_url ? (
                  <Image
                    source={{ uri: item.image_url }}
                    style={styles.bannerImage}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    transition={250}
                  />
                ) : (
                  <View style={[styles.placeholderBanner, { backgroundColor: theme.surfaceTint || "#1a2233" }]}>
                    <Ionicons name="trophy-outline" size={48} color={theme.primary} />
                  </View>
                )}

                {/* Dark Vignette Overlay so bubbles stand out */}
                <View style={styles.imageOverlayGradient} />

                {/* Floating Bubbles Row (Top of Card Image) */}
                <View style={styles.floatingTopBubblesRow}>
                  <View
                    style={[
                      styles.floatingBubble,
                      {
                        backgroundColor: "rgba(10, 15, 26, 0.82)",
                        borderColor: theme.rimBorder,
                      },
                    ]}
                  >
                    <Ionicons name="flash" size={11} color={theme.primary} />
                    <Text style={[styles.floatingBubbleText, { color: theme.primary }]}>
                      {(item.type || "GENERAL").toUpperCase()}
                    </Text>
                  </View>

                  {item.participation_type ? (
                    <View
                      style={[
                        styles.floatingBubble,
                        {
                          backgroundColor: "rgba(10, 15, 26, 0.82)",
                          borderColor: "rgba(255, 255, 255, 0.16)",
                        },
                      ]}
                    >
                      <Ionicons
                        name={item.participation_type.toLowerCase().includes("team") ? "people" : "person"}
                        size={11}
                        color="#cbd5e1"
                      />
                      <Text style={styles.floatingBubbleText}>
                        {item.participation_type.toUpperCase()}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* Floating Bubbles Row (Bottom of Card Image: Timeline, Date, Venue, Prize) */}
                <View style={styles.floatingBottomBubblesRow}>
                  {item.date ? (
                    <View style={styles.floatingBubble}>
                      <Ionicons name="calendar-outline" size={11} color={colors.gold.bright} />
                      <Text style={styles.floatingBubbleText}>{item.date}</Text>
                    </View>
                  ) : null}

                  {item.from_time ? (
                    <View style={styles.floatingBubble}>
                      <Ionicons name="time-outline" size={11} color="#67e8f9" />
                      <Text style={styles.floatingBubbleText}>
                        {item.from_time}{item.end_time ? ` - ${item.end_time}` : ""}
                      </Text>
                    </View>
                  ) : null}

                  {item.venue ? (
                    <View style={styles.floatingBubble}>
                      <Ionicons name="location-outline" size={11} color="#f472b6" />
                      <Text style={styles.floatingBubbleText} numberOfLines={1}>
                        {item.venue}
                      </Text>
                    </View>
                  ) : null}

                  {item.prizes.pool ? (
                    <View
                      style={[
                        styles.floatingBubble,
                        {
                          borderColor: "rgba(62, 232, 154, 0.4)",
                          backgroundColor: "rgba(10, 28, 20, 0.85)",
                        },
                      ]}
                    >
                      <Ionicons name="ribbon-outline" size={11} color="#3ee89a" />
                      <Text style={[styles.floatingBubbleText, { color: "#3ee89a" }]}>
                        {item.prizes.pool}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>

              {/* Card Body */}
              <View style={styles.cardBody}>
                {/* Title & Subtitle */}
                <Text style={styles.eventTitle}>{item.title}</Text>
                {item.subtitle ? <Text style={styles.eventSubtitle}>{item.subtitle}</Text> : null}

                {/* Participate / Bookmark Action Button */}
                <TouchableOpacity
                  style={[
                    styles.participateBtn,
                    isRegistered
                      ? [
                          styles.participateBtnActive,
                          { backgroundColor: theme.primaryContainer, borderColor: theme.primary },
                        ]
                      : { borderColor: theme.rimBorder },
                  ]}
                  activeOpacity={0.8}
                  onPress={() => toggleParticipate(item.id)}
                >
                  <Ionicons
                    name={isRegistered ? "checkmark-circle" : "bookmark-outline"}
                    size={15}
                    color={isRegistered ? theme.primary : "#c8a679"}
                  />
                  <Text
                    style={[
                      styles.participateBtnText,
                      isRegistered
                        ? [styles.participateBtnTextActive, { color: theme.primary }]
                        : { color: "#ffe9b8" },
                    ]}
                  >
                    {isRegistered ? "ADDED TO MY FEST STAGE" : "+ PARTICIPATE IN THIS EVENT"}
                  </Text>
                </TouchableOpacity>

                {/* Description Preview */}
                <Text style={styles.description} numberOfLines={isExpanded ? undefined : 2}>
                  {item.description}
                </Text>

                {/* Expanded Details Section */}
                {isExpanded && (
                  <Animated.View entering={FadeInRight.duration(280)} style={styles.expandedContent}>
                    {/* Prize Section */}
                    <View style={styles.section}>
                      <Text style={[styles.sectionTitle, { color: theme.primary }]}>🏆 PRIZES & AWARDS</Text>
                      <View style={styles.prizeBox}>
                        {item.prizes.pool ? (
                          <Text style={[styles.prizeRank, { marginBottom: px(4) }]}>
                            💎 Total Prize Pool: <Text style={[styles.prizeValue, { color: colors.cta.lit }]}>{item.prizes.pool}</Text>
                          </Text>
                        ) : null}
                        {item.prizes.winner ? (
                          <Text style={styles.prizeRank}>🥇 1st Place: <Text style={styles.prizeValue}>{item.prizes.winner}</Text></Text>
                        ) : null}
                        {item.prizes.runner_up ? (
                          <Text style={styles.prizeRank}>🥈 2nd Place: <Text style={styles.prizeValue}>{item.prizes.runner_up}</Text></Text>
                        ) : null}
                        {item.prizes.second_runner_up ? (
                          <Text style={styles.prizeRank}>🥉 3rd Place: <Text style={styles.prizeValue}>{item.prizes.second_runner_up}</Text></Text>
                        ) : null}
                        {item.prizes.description ? (
                          <Text style={[styles.ruleItem, { marginTop: px(4), fontStyle: "italic" }]}>
                            Awards: {item.prizes.description}
                          </Text>
                        ) : null}
                      </View>
                    </View>

                    {/* Rules */}
                    {item.rules.length > 0 && (
                      <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: theme.primary }]}>📜 RULES & GUIDELINES</Text>
                        {item.rules.map((rule, idx) => (
                          <Text key={idx} style={styles.ruleItem}>
                            • {rule}
                          </Text>
                        ))}
                      </View>
                    )}

                    {/* Eligibility */}
                    {item.eligibility.length > 0 && (
                      <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: theme.primary }]}>🎓 ELIGIBILITY</Text>
                        {item.eligibility.map((el, idx) => (
                          <Text key={idx} style={styles.ruleItem}>
                            • {el}
                          </Text>
                        ))}
                      </View>
                    )}

                    {/* Event Coordinators */}
                    {item.event_heads.length > 0 && (
                      <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: theme.primary }]}>👤 EVENT HEADS</Text>
                        <View style={styles.headGrid}>
                          {item.event_heads.map((head, idx) => (
                            <View key={idx} style={styles.headCard}>
                              <Text style={styles.headName}>{head.name}</Text>
                              <Text style={styles.headRole}>{head.role}</Text>
                              {head.phone ? (
                                <Text style={styles.headContact}>📞 {head.phone}</Text>
                              ) : null}
                            </View>
                          ))}
                        </View>
                      </View>
                    )}

                    {/* Rulebook Download */}
                    {item.rules_pdf_url ? (
                      <TouchableOpacity
                        style={[styles.pdfBtn, { backgroundColor: theme.primaryContainer, borderColor: theme.primary }]}
                        onPress={() => Linking.openURL(item.rules_pdf_url!)}
                      >
                        <Ionicons name="document-text-outline" size={14} color={theme.primary} />
                        <Text style={[styles.pdfBtnText, { color: theme.primary }]}>
                          DOWNLOAD FULL RULEBOOK PDF
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </Animated.View>
                )}

                {/* Toggle Button */}
                <TouchableOpacity
                  style={[styles.expandBtn, { borderColor: "rgba(255, 255, 255, 0.08)" }]}
                  onPress={() => toggleExpand(item.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.expandBtnText, { color: theme.primary }]}>
                    {isExpanded ? "SHOW LESS ▲" : "VIEW DETAILS & RULES ▼"}
                  </Text>
                </TouchableOpacity>
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
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
    paddingHorizontal: px(14),
    paddingVertical: px(8),
    borderRadius: px(20),
    backgroundColor: "rgba(22, 28, 40, 0.75)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  filterChipActive: {
    borderWidth: 1.2,
  },
  filterChipText: {
    fontFamily: fonts.pixelBold,
    fontSize: px(10),
    color: "#8e99a8",
    letterSpacing: px(0.5),
  },
  filterChipTextActive: {},

  listContainer: {
    paddingBottom: px(110), // Padding to keep clear of floating bottom tab bar
  },

  // Card Styles
  card: {
    backgroundColor: "#131824",
    borderRadius: px(18),
    borderWidth: 1.2,
    marginBottom: px(18),
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  imageCardContainer: {
    position: "relative",
    width: "100%",
    height: px(175),
    backgroundColor: "#1a2233",
  },
  bannerImage: {
    width: "100%",
    height: "100%",
  },
  placeholderBanner: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  imageOverlayGradient: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(10, 14, 23, 0.35)",
  },

  // Floating Info Bubbles
  floatingTopBubblesRow: {
    position: "absolute",
    top: px(10),
    left: px(10),
    right: px(10),
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  floatingBottomBubblesRow: {
    position: "absolute",
    bottom: px(10),
    left: px(10),
    right: px(10),
    flexDirection: "row",
    flexWrap: "wrap",
    gap: px(6),
  },
  floatingBubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: px(4),
    backgroundColor: "rgba(10, 15, 24, 0.82)",
    paddingHorizontal: px(10),
    paddingVertical: px(4.5),
    borderRadius: px(16),
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  floatingBubbleText: {
    fontFamily: fonts.bodyMedium,
    fontSize: px(11),
    color: "#e2e8f0",
  },

  // Card Body
  cardBody: {
    padding: px(14),
  },
  eventTitle: {
    fontFamily: fonts.pixelBold,
    fontSize: px(16),
    color: "#ffffff",
    letterSpacing: px(0.3),
  },
  eventSubtitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: px(13),
    color: "#94a3b8",
    marginTop: px(2),
  },
  participateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: px(6),
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    paddingVertical: px(8),
    borderRadius: px(10),
    marginTop: px(12),
    marginBottom: px(8),
  },
  participateBtnActive: {
    borderWidth: 1.2,
  },
  participateBtnText: {
    fontFamily: fonts.pixelBold,
    fontSize: px(9.5),
    letterSpacing: px(0.5),
  },
  participateBtnTextActive: {},
  description: {
    fontFamily: fonts.body,
    fontSize: px(13),
    color: "#cbd5e1",
    lineHeight: px(19),
    marginTop: px(4),
  },

  // Expanded Content
  expandedContent: {
    marginTop: px(14),
    paddingTop: px(12),
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
  },
  section: {
    marginBottom: px(14),
  },
  sectionTitle: {
    fontFamily: fonts.pixelBold,
    fontSize: px(11),
    marginBottom: px(6),
    letterSpacing: px(0.8),
  },
  prizeBox: {
    backgroundColor: "#0d131f",
    padding: px(10),
    borderRadius: px(8),
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  prizeRank: {
    fontFamily: fonts.bodyBold,
    fontSize: px(12.5),
    color: "#cbd5e1",
    marginBottom: px(4),
  },
  prizeValue: {
    fontFamily: fonts.bodyBold,
    fontSize: px(12.5),
    color: "#3ee89a",
  },
  ruleItem: {
    fontFamily: fonts.body,
    fontSize: px(12.5),
    color: "#94a3b8",
    lineHeight: px(18),
    marginBottom: px(4),
  },
  headGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: px(8),
  },
  headCard: {
    backgroundColor: "#0d131f",
    padding: px(8),
    borderRadius: px(8),
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    flex: 1,
    minWidth: px(130),
  },
  headName: {
    fontFamily: fonts.bodyBold,
    fontSize: px(12.5),
    color: "#ffffff",
  },
  headRole: {
    fontFamily: fonts.body,
    fontSize: px(10.5),
    color: "#94a3b8",
  },
  headContact: {
    fontFamily: fonts.bodyMedium,
    fontSize: px(11),
    color: "#38bdf8",
    marginTop: px(4),
  },
  pdfBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: px(6),
    paddingVertical: px(10),
    borderRadius: px(8),
    borderWidth: 1,
    marginTop: px(4),
  },
  pdfBtnText: {
    fontFamily: fonts.pixelBold,
    fontSize: px(10),
    letterSpacing: px(0.5),
  },
  expandBtn: {
    marginTop: px(10),
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    paddingVertical: px(8),
    borderRadius: px(10),
    alignItems: "center",
  },
  expandBtnText: {
    fontFamily: fonts.pixelBold,
    fontSize: px(9.5),
    letterSpacing: px(0.8),
  },

  // Fallback Notice
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
});
