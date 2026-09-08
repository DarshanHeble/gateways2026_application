import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
  RefreshControl,
} from "react-native";
import { Image } from "expo-image";
import Animated, {
  FadeInDown,
  FadeInRight,
  Layout,
} from "react-native-reanimated";
import { colors, fonts } from "@/theme/tokens";
import { px } from "@/theme/scale";
import { fetchEvents, EventItem, MOCK_EVENTS } from "@/services/api";

export default function EventsTab() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [dataSource, setDataSource] = useState<"network" | "cache" | "fallback">("network");
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
    setExpandedId((prev) => (prev === id ? null : id));
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.gold.bright} />
        <Text style={styles.loadingText}>LOADING FEST EVENTS...</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: px(8), marginBottom: px(12) }}>
        <Text style={styles.subtitle}>Explore all events and competitions</Text>
        <View style={{
          paddingHorizontal: px(8),
          paddingVertical: px(2),
          borderRadius: px(4),
          backgroundColor: dataSource === "network" ? "rgba(62,232,154,0.15)" : "rgba(255,210,94,0.15)",
          borderWidth: 1,
          borderColor: dataSource === "network" ? colors.cta.lit : colors.gold.bright,
        }}>
          <Text style={{
            fontFamily: fonts.pixelBold,
            fontSize: px(8),
            color: dataSource === "network" ? colors.cta.lit : colors.gold.bright,
            letterSpacing: px(1),
          }}>
            {dataSource === "network" ? "🟢 LIVE SHEET" : dataSource === "cache" ? "💾 OFFLINE CACHE" : "⚠️ LOCAL BACKUP"}
          </Text>
        </View>
      </View>

      <Animated.FlatList
        data={events}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            progressViewOffset={20}
          />
        }
        renderItem={({ item, index }) => {
          const isExpanded = expandedId === item.id;
          return (
            <Animated.View
              entering={FadeInDown.delay(index * 80).duration(400)}
              layout={Layout.springify().damping(15)}
              style={styles.card}
            >
              {/* Event Image Banner */}
              {item.image_url ? (
                <Image
                  source={{ uri: item.image_url }}
                  style={styles.bannerImage}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  transition={200}
                />
              ) : null}

              {/* Card Header & Badges */}
              <View style={styles.cardHeader}>
                <View style={styles.titleColumn}>
                  <Text style={styles.eventTitle}>{item.title}</Text>
                  {item.subtitle ? <Text style={styles.eventSubtitle}>{item.subtitle}</Text> : null}
                </View>
                <View style={{ alignItems: "flex-end", gap: px(4) }}>
                  <View style={styles.typeBadge}>
                    <Text style={styles.typeBadgeText}>{(item.type || 'GENERAL').toUpperCase()}</Text>
                  </View>
                  {item.participation_type ? (
                    <View style={[styles.typeBadge, { backgroundColor: "#1e293b", borderColor: colors.gold.muted }]}>
                      <Text style={[styles.typeBadgeText, { color: colors.gold.bright, fontSize: px(9) }]}>
                        {item.participation_type.toUpperCase()}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>

              {/* Quick Info Grid */}
              <View style={styles.infoGrid}>
                <View style={styles.infoChip}>
                  <Text style={styles.infoChipText}>📅 {item.date}</Text>
                </View>
                <View style={styles.infoChip}>
                  <Text style={styles.infoChipText}>⏰ {item.from_time} - {item.end_time}</Text>
                </View>
                {item.prizes.pool ? (
                  <View style={[styles.infoChip, { borderColor: colors.cta.glow, backgroundColor: "rgba(62,232,154,0.12)" }]}>
                    <Text style={[styles.infoChipText, { color: colors.cta.lit }]}>💰 POOL: {item.prizes.pool}</Text>
                  </View>
                ) : null}
              </View>

              <Text style={styles.venueText}>📍 {item.venue}</Text>
              <Text style={styles.description} numberOfLines={isExpanded ? undefined : 2}>
                {item.description}
              </Text>

              {/* Expanded Animated Content */}
              {isExpanded && (
                <Animated.View entering={FadeInRight.duration(300)} style={styles.expandedContent}>
                  {/* Prize Section */}
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>🏆 PRIZES & POOL</Text>
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
                      <Text style={styles.sectionTitle}>📜 RULES & GUIDELINES</Text>
                      {item.rules.map((rule, idx) => (
                        <Text key={idx} style={styles.ruleItem}>
                          {rule}
                        </Text>
                      ))}
                    </View>
                  )}

                  {/* Eligibility */}
                  {item.eligibility.length > 0 && (
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>🎓 ELIGIBILITY</Text>
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
                      <Text style={styles.sectionTitle}>👤 EVENT HEADS</Text>
                      <View style={styles.headGrid}>
                        {item.event_heads.map((head, idx) => (
                          <View key={idx} style={styles.headCard}>
                            <Text style={styles.headName}>{head.name}</Text>
                            <Text style={styles.headRole}>{head.role}</Text>
                            <Text style={styles.headContact}>📞 {head.phone}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Rulebook Download */}
                  {item.rules_pdf_url ? (
                    <TouchableOpacity
                      style={styles.pdfBtn}
                      onPress={() => Linking.openURL(item.rules_pdf_url!)}
                    >
                      <Text style={styles.pdfBtnText}>📄 DOWNLOAD FULL RULEBOOK PDF</Text>
                    </TouchableOpacity>
                  ) : null}
                </Animated.View>
              )}

              {/* Toggle Button */}
              <TouchableOpacity style={styles.expandBtn} onPress={() => toggleExpand(item.id)}>
                <Text style={styles.expandBtnText}>
                  {isExpanded ? "SHOW LESS ▲" : "VIEW DETAILS & RULES ▼"}
                </Text>
              </TouchableOpacity>
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
  listContainer: {
    paddingBottom: px(30),
  },
  card: {
    backgroundColor: "#161b26",
    borderRadius: px(10),
    borderWidth: px(1.5),
    borderColor: "#34281a",
    marginBottom: px(16),
    overflow: "hidden",
    padding: px(14),
  },
  bannerImage: {
    height: px(120),
    width: "100%",
    borderRadius: px(6),
    marginBottom: px(12),
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: px(8),
  },
  titleColumn: {
    flex: 1,
    paddingRight: px(8),
  },
  eventTitle: {
    fontFamily: fonts.pixelBold,
    fontSize: px(16),
    color: "#ffe9b8",
  },
  eventSubtitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: px(13),
    color: "#e2af64",
    marginTop: px(2),
  },
  typeBadge: {
    backgroundColor: "#2a1e12",
    paddingVertical: px(4),
    paddingHorizontal: px(8),
    borderRadius: px(4),
    borderWidth: px(1),
    borderColor: "#c8a679",
  },
  typeBadgeText: {
    fontFamily: fonts.pixelBold,
    fontSize: px(9),
    color: "#ffe9b8",
  },
  infoGrid: {
    flexDirection: "row",
    gap: px(8),
    marginBottom: px(8),
  },
  infoChip: {
    backgroundColor: "#202736",
    paddingVertical: px(4),
    paddingHorizontal: px(10),
    borderRadius: px(4),
  },
  infoChipText: {
    fontFamily: fonts.bodyMedium,
    fontSize: px(12),
    color: "#d8c5a4",
  },
  venueText: {
    fontFamily: fonts.bodyMedium,
    fontSize: px(13),
    color: "#c8a679",
    marginBottom: px(6),
  },
  description: {
    fontFamily: fonts.body,
    fontSize: px(14),
    color: "#e0e0e0",
    lineHeight: px(20),
  },
  expandedContent: {
    marginTop: px(14),
    paddingTop: px(12),
    borderTopWidth: px(1),
    borderTopColor: "#2a3245",
  },
  section: {
    marginBottom: px(14),
  },
  sectionTitle: {
    fontFamily: fonts.pixelBold,
    fontSize: px(11),
    color: "#ffe9b8",
    marginBottom: px(6),
    letterSpacing: px(1),
  },
  prizeBox: {
    backgroundColor: "#221c13",
    padding: px(10),
    borderRadius: px(6),
    borderWidth: px(1),
    borderColor: "#4a3925",
  },
  prizeRank: {
    fontFamily: fonts.bodyBold,
    fontSize: px(13),
    color: "#d8c5a4",
    marginBottom: px(4),
  },
  prizeValue: {
    fontFamily: fonts.bodyBold,
    fontSize: px(13),
    color: "#52c480",
  },
  ruleItem: {
    fontFamily: fonts.body,
    fontSize: px(13),
    color: "#d0d0d0",
    lineHeight: px(18),
    marginBottom: px(4),
  },
  headGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: px(8),
  },
  headCard: {
    backgroundColor: "#202736",
    padding: px(8),
    borderRadius: px(6),
    flex: 1,
    minWidth: px(140),
  },
  headName: {
    fontFamily: fonts.bodyBold,
    fontSize: px(13),
    color: "#ffe9b8",
  },
  headRole: {
    fontFamily: fonts.body,
    fontSize: px(11),
    color: "#a08c70",
  },
  headContact: {
    fontFamily: fonts.bodyMedium,
    fontSize: px(12),
    color: "#52a3c4",
    marginTop: px(4),
  },
  pdfBtn: {
    backgroundColor: "#2e3b52",
    paddingVertical: px(10),
    borderRadius: px(6),
    alignItems: "center",
    marginTop: px(4),
  },
  pdfBtnText: {
    fontFamily: fonts.pixelBold,
    fontSize: px(11),
    color: "#ffffff",
  },
  expandBtn: {
    marginTop: px(10),
    backgroundColor: "#202736",
    paddingVertical: px(8),
    borderRadius: px(6),
    alignItems: "center",
  },
  expandBtnText: {
    fontFamily: fonts.pixelBold,
    fontSize: px(10),
    color: "#ffe9b8",
    letterSpacing: px(1),
  },
});
