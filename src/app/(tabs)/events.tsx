import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
  ScrollView,
} from "react-native";
import { colors, fonts } from "@/theme/tokens";
import { px } from "@/theme/scale";
import { fetchEvents, EventItem } from "@/services/api";
import { PixelCard } from "@/components/pixel/PixelCard";
import { PixelButton } from "@/components/pixel/PixelButton";

export default function EventsTab() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchEvents();
      setEvents(data);
    } catch (err) {
      setError("Unable to connect to Google Sheets backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.gold.bright} />
        <Text style={styles.loadingText}>FETCHING EVENTS FROM GOOGLE SHEETS...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadData}>
          <Text style={styles.retryButtonText}>RETRY</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Text style={styles.screenTitle}>FEST EVENTS</Text>
      <Text style={styles.subtitle}>Explore all events synced live from Google Sheets</Text>

      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        renderItem={({ item }) => {
          const isExpanded = expandedId === item.id;
          return (
            <PixelCard headerTitle={item.title} badge={item.type}>
              {item.subtitle ? <Text style={styles.eventSubtitle}>{item.subtitle}</Text> : null}

              <View style={styles.metaRow}>
                <Text style={styles.metaText}>📅 {item.date}</Text>
                <Text style={styles.metaText}>⏰ {item.from_time} - {item.end_time}</Text>
              </View>
              <Text style={styles.metaText}>📍 {item.venue}</Text>

              <Text style={styles.description} numberOfLines={isExpanded ? undefined : 2}>
                {item.description}
              </Text>

              {isExpanded && (
                <View style={styles.expandedContent}>
                  {/* Prizes */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeader}>🏆 PRIZES</Text>
                    {item.prizes.winner ? (
                      <Text style={styles.prizeText}>1st Winner: {item.prizes.winner}</Text>
                    ) : null}
                    {item.prizes.runner_up ? (
                      <Text style={styles.prizeText}>Runner Up: {item.prizes.runner_up}</Text>
                    ) : null}
                    {item.prizes.second_runner_up ? (
                      <Text style={styles.prizeText}>2nd Runner Up: {item.prizes.second_runner_up}</Text>
                    ) : null}
                  </View>

                  {/* Rules */}
                  {item.rules.length > 0 && (
                    <View style={styles.section}>
                      <Text style={styles.sectionHeader}>📜 RULES</Text>
                      {item.rules.map((rule, idx) => (
                        <Text key={idx} style={styles.listText}>
                          • {rule}
                        </Text>
                      ))}
                    </View>
                  )}

                  {/* Eligibility */}
                  {item.eligibility.length > 0 && (
                    <View style={styles.section}>
                      <Text style={styles.sectionHeader}>🎓 ELIGIBILITY</Text>
                      {item.eligibility.map((el, idx) => (
                        <Text key={idx} style={styles.listText}>
                          • {el}
                        </Text>
                      ))}
                    </View>
                  )}

                  {/* Event Heads */}
                  {item.event_heads.length > 0 && (
                    <View style={styles.section}>
                      <Text style={styles.sectionHeader}>👤 EVENT HEADS</Text>
                      {item.event_heads.map((head, idx) => (
                        <View key={idx} style={styles.headCard}>
                          <Text style={styles.headName}>
                            {head.name} ({head.role})
                          </Text>
                          <Text style={styles.headContact}>
                            📞 {head.phone}  |  ✉️ {head.email}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* PDF Rulebook Link */}
                  {item.rules_pdf_url ? (
                    <TouchableOpacity
                      style={styles.pdfButton}
                      onPress={() => Linking.openURL(item.rules_pdf_url!)}
                    >
                      <Text style={styles.pdfText}>📥 DOWNLOAD RULEBOOK PDF</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              )}

              <TouchableOpacity style={styles.toggleBtn} onPress={() => toggleExpand(item.id)}>
                <Text style={styles.toggleText}>
                  {isExpanded ? "▲ SHOW LESS" : "▼ VIEW DETAILS & RULES"}
                </Text>
              </TouchableOpacity>
            </PixelCard>
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
  listContainer: {
    paddingBottom: px(24),
  },
  eventSubtitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: px(13),
    color: colors.gold.bright,
    marginBottom: px(6),
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: px(4),
  },
  metaText: {
    fontFamily: fonts.body,
    fontSize: px(12),
    color: colors.gold.muted,
  },
  description: {
    fontFamily: fonts.body,
    fontSize: px(13),
    color: colors.body,
    marginTop: px(6),
    lineHeight: px(18),
  },
  expandedContent: {
    marginTop: px(12),
    borderTopWidth: px(1),
    borderTopColor: colors.dirt.light,
    paddingTop: px(10),
  },
  section: {
    marginBottom: px(10),
  },
  sectionHeader: {
    fontFamily: fonts.pixelBold,
    fontSize: px(11),
    color: colors.gold.label,
    marginBottom: px(4),
  },
  prizeText: {
    fontFamily: fonts.bodyMedium,
    fontSize: px(12),
    color: colors.cta.glow,
  },
  listText: {
    fontFamily: fonts.body,
    fontSize: px(12),
    color: colors.body,
    marginBottom: px(2),
  },
  headCard: {
    backgroundColor: colors.dirt.shadow,
    padding: px(6),
    borderRadius: px(4),
    marginBottom: px(4),
  },
  headName: {
    fontFamily: fonts.bodyBold,
    fontSize: px(12),
    color: colors.gold.text,
  },
  headContact: {
    fontFamily: fonts.body,
    fontSize: px(11),
    color: colors.gold.muted,
    marginTop: px(2),
  },
  pdfButton: {
    backgroundColor: colors.google.base,
    paddingVertical: px(6),
    paddingHorizontal: px(10),
    borderRadius: px(4),
    alignItems: "center",
    marginTop: px(6),
  },
  pdfText: {
    fontFamily: fonts.pixel,
    fontSize: px(10),
    color: colors.gold.text,
  },
  toggleBtn: {
    marginTop: px(8),
    paddingVertical: px(6),
    alignItems: "center",
    backgroundColor: colors.dirt.shadow,
    borderRadius: px(2),
  },
  toggleText: {
    fontFamily: fonts.pixel,
    fontSize: px(10),
    color: colors.gold.bright,
  },
});
