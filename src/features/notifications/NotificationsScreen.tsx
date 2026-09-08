import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, RefreshControl } from "react-native";
import Animated, { FadeInDown, Layout } from "react-native-reanimated";
import { router } from "expo-router";

import { fonts } from "@/theme/tokens";
import { px } from "@/theme/scale";
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
      <View style={styles.headerRow}>
        <Text style={styles.subtitle}>
          {unreadCount > 0 ? `${unreadCount} UNREAD` : "ALL CAUGHT UP"}
        </Text>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={markAllRead}>
            <Text style={styles.markAllText}>MARK ALL READ</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <Animated.FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} progressViewOffset={20} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>NO NOTIFICATIONS YET</Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(index * 60).duration(350)} layout={Layout.springify().damping(15)}>
            <TouchableOpacity
              style={[styles.card, !item.read && styles.cardUnread]}
              onPress={() => onPressItem(item)}
              activeOpacity={0.8}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.title} numberOfLines={1}>
                  {item.title}
                </Text>
                {!item.read ? <View style={styles.dot} /> : null}
              </View>
              <Text style={styles.body}>{item.body}</Text>
              <View style={styles.metaRow}>
                <View style={styles.targetBadge}>
                  <Text style={styles.targetBadgeText}>{targetLabel(item.target)}</Text>
                </View>
                <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        )}
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
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: px(16),
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: px(13),
    color: "#a08c70",
  },
  markAllText: {
    fontFamily: fonts.pixelBold,
    fontSize: px(10),
    color: "#7dffc0",
    letterSpacing: px(0.5),
  },
  listContainer: {
    paddingBottom: px(30),
    flexGrow: 1,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: px(80),
  },
  emptyText: {
    fontFamily: fonts.pixelBold,
    fontSize: px(12),
    color: "#5a6478",
  },
  card: {
    backgroundColor: "#161b26",
    borderRadius: px(10),
    borderWidth: px(1.5),
    borderColor: "#2a3245",
    marginBottom: px(12),
    padding: px(14),
  },
  cardUnread: {
    borderColor: "#c8a679",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    flex: 1,
    fontFamily: fonts.bodyBold,
    fontSize: px(15),
    color: "#ffe9b8",
    paddingRight: px(8),
  },
  dot: {
    width: px(8),
    height: px(8),
    borderRadius: px(4),
    backgroundColor: "#3ee89a",
  },
  body: {
    fontFamily: fonts.body,
    fontSize: px(13),
    color: "#d0d0d0",
    lineHeight: px(18),
    marginTop: px(4),
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: px(10),
  },
  targetBadge: {
    backgroundColor: "#202736",
    paddingVertical: px(3),
    paddingHorizontal: px(8),
    borderRadius: px(4),
  },
  targetBadgeText: {
    fontFamily: fonts.pixelBold,
    fontSize: px(9),
    color: "#8090a8",
  },
  time: {
    fontFamily: fonts.body,
    fontSize: px(11),
    color: "#5a6478",
  },
});
