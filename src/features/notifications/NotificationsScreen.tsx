import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, RefreshControl, StatusBar } from "react-native";
import Animated, { FadeInDown, Layout } from "react-native-reanimated";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fonts } from "@/theme/tokens";
import { px } from "@/theme/scale";
import { useM3Theme } from "@/theme/M3ThemeContext";
import { useNotifications } from "./NotificationsContext";
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

export function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useM3Theme();
  const { notifications, unreadCount, refresh, markAllRead, markRead } = useNotifications();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const onPressItem = useCallback(
    (item: AppNotification) => {
      if (!item.read) markRead(item.id);
      if (item.route) router.push(item.route as never);
    },
    [markRead],
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#070b12" />

      {/* Atmospheric Radial Gradients Driven by Dynamic M3 Seed Color */}
      <View style={[styles.ambientAuraTop, { backgroundColor: theme.ambientTop }]} />
      <View style={[styles.ambientAuraBottom, { backgroundColor: theme.ambientBottom }]} />

      <View style={[styles.contentWrapper, { paddingTop: Math.max(insets.top, px(24)) + px(22) }]}>
        {/* Massive Bold Header Matching Home and Profile */}
        <View style={styles.heroHeaderRow}>
          <Text style={styles.heroSupTitle}>FESTIVAL BROADCASTS,</Text>
          <View style={styles.titleActionRow}>
            <Text style={styles.heroMainTitle}>ALERTS</Text>
            {unreadCount > 0 ? (
              <TouchableOpacity
                onPress={markAllRead}
                style={[styles.markAllPill, { backgroundColor: theme.primaryContainer, borderColor: theme.rimBorder }]}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark-done" size={13} color={theme.primary} />
                <Text style={[styles.markAllText, { color: theme.primary }]}>MARK ALL READ</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          <Text style={styles.heroSubtitle}>
            {unreadCount > 0 ? `${unreadCount} unread announcement${unreadCount > 1 ? "s" : ""}` : "You are completely up to date"}
          </Text>
        </View>

        <Animated.FlatList
          data={notifications}
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
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="notifications-off-outline" size={42} color="#475569" />
              <Text style={styles.emptyTitle}>No Alerts Yet</Text>
              <Text style={styles.emptySub}>Official notices and competition calls will appear here</Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.delay(index * 50).duration(320)} layout={Layout.springify().damping(15)}>
              <TouchableOpacity
                style={[
                  styles.card,
                  { borderColor: !item.read ? theme.primary : "rgba(255, 255, 255, 0.08)" },
                  !item.read && { backgroundColor: "rgba(255, 255, 255, 0.05)" },
                ]}
                onPress={() => onPressItem(item)}
                activeOpacity={0.82}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.titleWrap}>
                    <Text style={[styles.title, !item.read && { color: "#ffffff" }]} numberOfLines={2}>
                      {item.title}
                    </Text>
                  </View>
                  {!item.read ? <View style={[styles.dot, { backgroundColor: theme.primary }]} /> : null}
                </View>
                <Text style={styles.body}>{item.body}</Text>
                <View style={styles.metaRow}>
                  <View style={[styles.targetBadge, { backgroundColor: theme.primaryContainer }]}>
                    <Text style={[styles.targetBadgeText, { color: theme.primary }]}>{targetLabel(item.target)}</Text>
                  </View>
                  <View style={styles.timeWrap}>
                    <Ionicons name="time-outline" size={12} color="#64748b" />
                    <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            </Animated.View>
          )}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#070b12",
  },
  ambientAuraTop: {
    position: "absolute",
    top: -px(160),
    left: -px(100),
    width: px(450),
    height: px(450),
    borderRadius: px(225),
    opacity: 0.65,
  },
  ambientAuraBottom: {
    position: "absolute",
    bottom: px(10),
    right: -px(100),
    width: px(380),
    height: px(380),
    borderRadius: px(190),
    opacity: 0.45,
  },
  contentWrapper: {
    flex: 1,
    paddingHorizontal: px(20),
  },
  heroHeaderRow: {
    marginBottom: px(16),
  },
  heroSupTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: px(13),
    fontWeight: "700",
    letterSpacing: 2.2,
    color: "#d6c8aa",
    marginBottom: px(4),
  },
  titleActionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroMainTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: px(42),
    lineHeight: px(44),
    fontWeight: "900",
    color: "#ffffff",
    letterSpacing: -1,
  },
  heroSubtitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: px(13),
    color: "#8e9ea8",
    marginTop: px(4),
  },
  markAllPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: px(5),
    paddingHorizontal: px(12),
    paddingVertical: px(6),
    borderRadius: px(12),
    borderWidth: 1,
  },
  markAllText: {
    fontFamily: fonts.bodyBold,
    fontSize: px(10),
    letterSpacing: 0.5,
  },
  listContainer: {
    paddingBottom: px(120),
    flexGrow: 1,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: px(80),
    gap: px(8),
  },
  emptyTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: px(16),
    color: "#ffffff",
    marginTop: px(8),
  },
  emptySub: {
    fontFamily: fonts.body,
    fontSize: px(12),
    color: "#64748b",
    textAlign: "center",
  },
  card: {
    backgroundColor: "rgba(17, 24, 39, 0.55)",
    borderRadius: px(16),
    borderWidth: 1,
    marginBottom: px(12),
    padding: px(16),
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: px(8),
  },
  titleWrap: {
    flex: 1,
  },
  title: {
    fontFamily: fonts.bodyBold,
    fontSize: px(15),
    color: "#e2e8f0",
    lineHeight: px(20),
  },
  dot: {
    width: px(8),
    height: px(8),
    borderRadius: px(4),
    marginTop: px(4),
  },
  body: {
    fontFamily: fonts.body,
    fontSize: px(13),
    color: "#94a3b8",
    lineHeight: px(19),
    marginTop: px(6),
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: px(12),
    paddingTop: px(10),
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.06)",
  },
  targetBadge: {
    paddingVertical: px(3),
    paddingHorizontal: px(8),
    borderRadius: px(6),
  },
  targetBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: px(9.5),
    letterSpacing: 0.5,
  },
  timeWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: px(4),
  },
  time: {
    fontFamily: fonts.bodyMedium,
    fontSize: px(11),
    color: "#64748b",
  },
});

