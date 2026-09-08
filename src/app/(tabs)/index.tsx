import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
} from "react-native";
import Animated, { FadeInDown, Layout } from "react-native-reanimated";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { colors, fonts } from "@/theme/tokens";
import { px } from "@/theme/scale";
import { useNotifications } from "@/features/notifications/NotificationsContext";
import { useAuth } from "@/features/auth/AuthContext";
import { AppNotification, targetLabel } from "@/services/notificationTypes";

function timeAgo(ts: number): string {
  const diffMs = Date.now() - ts;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "JUST NOW";
  if (mins < 60) return `${mins}M AGO`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}H AGO`;
  return `${Math.floor(hours / 24)}D AGO`;
}

export default function HomeTab() {
  const { role } = useAuth();
  const { notifications, unreadCount, refresh, markRead } = useNotifications();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const onPressNotification = (item: AppNotification) => {
    if (!item.read) markRead(item.id);
    if (item.route) router.push(item.route as never);
    else router.push("/(tabs)/notifications" as never);
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.gold.bright}
          colors={[colors.gold.bright]}
        />
      }
    >
      {/* Banner / Realm Welcome */}
      <View style={styles.heroBanner}>
        <View style={styles.heroGlow} />
        <View style={styles.badgeRow}>
          <View style={styles.badgePill}>
            <Text style={styles.badgePillText}>CHRIST UNIVERSITY</Text>
          </View>
          <View style={[styles.badgePill, styles.rolePill]}>
            <Text style={[styles.badgePillText, styles.rolePillText]}>
              {role === "team" ? "🛡️ CREW" : "⚔️ PARTICIPANT"}
            </Text>
          </View>
        </View>

        <Text style={styles.festTitle}>GATEWAYS 2026</Text>
        <Text style={styles.festSub}>NATIONAL LEVEL IT FEST</Text>
        <Text style={styles.festDates}>OCTOBER 10 - 11, 2026</Text>
      </View>

      {/* Quick Access Action Grid */}
      <View style={styles.quickGrid}>
        <TouchableOpacity
          style={styles.actionCard}
          activeOpacity={0.8}
          onPress={() => router.push("/(tabs)/events" as never)}
        >
          <View style={[styles.actionIconWrap, { backgroundColor: "rgba(99,217,232,0.15)" }]}>
            <Ionicons name="trophy-outline" size={20} color={colors.cyan} />
          </View>
          <Text style={styles.actionTitle}>EVENTS</Text>
          <Text style={styles.actionDesc}>Competitions</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          activeOpacity={0.8}
          onPress={() => router.push("/(tabs)/schedule" as never)}
        >
          <View style={[styles.actionIconWrap, { backgroundColor: "rgba(255,210,94,0.15)" }]}>
            <Ionicons name="calendar-outline" size={20} color={colors.gold.bright} />
          </View>
          <Text style={styles.actionTitle}>SCHEDULE</Text>
          <Text style={styles.actionDesc}>Day 1 & Day 2</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          activeOpacity={0.8}
          onPress={() => router.push("/(tabs)/profile" as never)}
        >
          <View style={[styles.actionIconWrap, { backgroundColor: "rgba(62,232,154,0.15)" }]}>
            <Ionicons name="id-card-outline" size={20} color={colors.cta.glow} />
          </View>
          <Text style={styles.actionTitle}>PASS</Text>
          <Text style={styles.actionDesc}>Digital badge</Text>
        </TouchableOpacity>
      </View>

      {/* Announcements Section Header */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="megaphone" size={18} color={colors.gold.bright} />
          <Text style={styles.sectionTitle}>LIVE ANNOUNCEMENTS</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount} NEW</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          onPress={() => router.push("/(tabs)/notifications" as never)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.viewAllText}>VIEW ALL &gt;</Text>
        </TouchableOpacity>
      </View>

      {/* Announcements Bulletin Feed */}
      {notifications.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="notifications-off-outline" size={28} color="#55627a" />
          <Text style={styles.emptyText}>NO ANNOUNCEMENTS YET</Text>
          <Text style={styles.emptySub}>Official broadcast updates will appear here in real-time.</Text>
        </View>
      ) : (
        notifications.slice(0, 4).map((item, index) => (
          <Animated.View
            key={item.id}
            entering={FadeInDown.delay(index * 80).duration(300)}
            layout={Layout.springify().damping(15)}
          >
            <TouchableOpacity
              style={[styles.announcementCard, !item.read && styles.announcementUnread]}
              onPress={() => onPressNotification(item)}
              activeOpacity={0.85}
            >
              <View style={styles.cardTopRow}>
                <View style={styles.announcementBadge}>
                  <Text style={styles.announcementBadgeText}>
                    {targetLabel(item.target).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.timeText}>{timeAgo(item.createdAt)}</Text>
              </View>

              <View style={styles.cardHeader}>
                <Text style={styles.announcementTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                {!item.read && <View style={styles.unreadDot} />}
              </View>

              <Text style={styles.announcementBody} numberOfLines={3}>
                {item.body}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#090c13",
  },
  scrollContent: {
    paddingHorizontal: px(14),
    paddingTop: px(14),
    paddingBottom: px(40),
  },
  heroBanner: {
    backgroundColor: "#131a28",
    borderWidth: 2,
    borderColor: "#2a364f",
    borderRadius: px(6),
    padding: px(18),
    alignItems: "center",
    marginBottom: px(16),
    position: "relative",
    overflow: "hidden",
  },
  heroGlow: {
    position: "absolute",
    top: -40,
    width: "120%",
    height: 80,
    backgroundColor: "rgba(255,210,94,0.06)",
    borderRadius: 100,
  },
  badgeRow: {
    flexDirection: "row",
    gap: px(8),
    marginBottom: px(10),
  },
  badgePill: {
    paddingHorizontal: px(8),
    paddingVertical: px(3),
    backgroundColor: "#1c2538",
    borderWidth: 1,
    borderColor: "#3a4763",
    borderRadius: px(3),
  },
  badgePillText: {
    fontFamily: fonts.pixel,
    fontSize: px(8),
    color: colors.gold.title,
    letterSpacing: px(1),
  },
  rolePill: {
    borderColor: colors.cta.base,
    backgroundColor: "rgba(20,154,91,0.2)",
  },
  rolePillText: {
    color: colors.cta.glow,
  },
  festTitle: {
    fontFamily: fonts.pixelBold,
    fontSize: px(22),
    color: colors.gold.bright,
    letterSpacing: px(2),
    textAlign: "center",
    textShadowColor: "rgba(255,210,94,0.4)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  festSub: {
    fontFamily: fonts.pixel,
    fontSize: px(10),
    color: colors.link,
    letterSpacing: px(1.5),
    marginTop: px(4),
  },
  festDates: {
    fontFamily: fonts.bodyMedium,
    fontSize: px(11),
    color: "#a08c70",
    marginTop: px(6),
  },
  quickGrid: {
    flexDirection: "row",
    gap: px(10),
    marginBottom: px(20),
  },
  actionCard: {
    flex: 1,
    backgroundColor: "#101622",
    borderWidth: 1.5,
    borderColor: "#222c3f",
    borderRadius: px(6),
    padding: px(12),
    alignItems: "center",
  },
  actionIconWrap: {
    width: px(38),
    height: px(38),
    borderRadius: px(8),
    alignItems: "center",
    justifyContent: "center",
    marginBottom: px(8),
  },
  actionTitle: {
    fontFamily: fonts.pixelBold,
    fontSize: px(10),
    color: colors.gold.title,
    letterSpacing: px(0.5),
  },
  actionDesc: {
    fontFamily: fonts.body,
    fontSize: px(10),
    color: "#7e8ba3",
    marginTop: px(2),
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: px(12),
    paddingHorizontal: px(2),
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: px(6),
  },
  sectionTitle: {
    fontFamily: fonts.pixelBold,
    fontSize: px(12),
    color: colors.gold.bright,
    letterSpacing: px(1),
  },
  unreadBadge: {
    backgroundColor: colors.google.red,
    paddingHorizontal: px(6),
    paddingVertical: px(1),
    borderRadius: px(3),
  },
  unreadBadgeText: {
    fontFamily: fonts.pixelBold,
    fontSize: px(8),
    color: "#fff",
  },
  viewAllText: {
    fontFamily: fonts.pixelBold,
    fontSize: px(10),
    color: colors.link,
    letterSpacing: px(0.5),
  },
  emptyCard: {
    backgroundColor: "#101622",
    borderWidth: 1,
    borderColor: "#202838",
    borderRadius: px(6),
    padding: px(24),
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontFamily: fonts.pixelBold,
    fontSize: px(11),
    color: "#7e8ba3",
    letterSpacing: px(1),
    marginTop: px(8),
  },
  emptySub: {
    fontFamily: fonts.body,
    fontSize: px(11),
    color: "#55627a",
    textAlign: "center",
    marginTop: px(4),
  },
  announcementCard: {
    backgroundColor: "#111724",
    borderWidth: 1.5,
    borderColor: "#232e42",
    borderRadius: px(6),
    padding: px(14),
    marginBottom: px(10),
  },
  announcementUnread: {
    borderColor: colors.gold.bright,
    backgroundColor: "#161e30",
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: px(6),
  },
  announcementBadge: {
    paddingHorizontal: px(6),
    paddingVertical: px(2),
    borderRadius: px(3),
    backgroundColor: "rgba(255,210,94,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,210,94,0.3)",
  },
  announcementBadgeText: {
    fontFamily: fonts.pixelBold,
    fontSize: px(8),
    color: colors.gold.title,
    letterSpacing: px(0.5),
  },
  timeText: {
    fontFamily: fonts.body,
    fontSize: px(10),
    color: "#758299",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: px(4),
  },
  announcementTitle: {
    flex: 1,
    fontFamily: fonts.pixelBold,
    fontSize: px(12),
    color: colors.gold.bright,
    lineHeight: px(16),
  },
  unreadDot: {
    width: px(8),
    height: px(8),
    borderRadius: px(4),
    backgroundColor: colors.cta.glow,
    marginLeft: px(6),
    marginTop: px(3),
  },
  announcementBody: {
    fontFamily: fonts.body,
    fontSize: px(12),
    color: colors.body,
    lineHeight: px(18),
  },
});
