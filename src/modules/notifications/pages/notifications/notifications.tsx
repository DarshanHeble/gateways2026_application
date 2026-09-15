import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, RefreshControl, StatusBar } from "react-native";
import Animated, { FadeInDown, Layout } from "react-native-reanimated";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fonts } from "@/theme/tokens";
import { px } from "@/theme/scale";
import { useM3Theme } from "@/theme/M3ThemeContext";
import { useNotifications } from "../../stores/NotificationsContext";
import { AppNotification, targetLabel } from "@/services/notificationTypes";
import { styles } from "./notifications.styles";

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
  const { theme, isDark } = useM3Theme();
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
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.background} />

      {/* Atmospheric Radial Gradients Driven by Dynamic M3 Seed Color */}
      <View style={[styles.ambientAuraTop, { backgroundColor: theme.ambientTop }]} />
      <View style={[styles.ambientAuraBottom, { backgroundColor: theme.ambientBottom }]} />

      <View style={[styles.contentWrapper, { paddingTop: Math.max(insets.top, px(24)) + px(22) }]}>
        {/* Massive Bold Header Matching Home and Profile */}
        <View style={styles.heroHeaderRow}>
          <View style={styles.titleActionRow}>
            <Text style={[styles.heroMainTitle, { color: theme.text }]}>ALERTS</Text>
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
          <Text style={[styles.heroSubtitle, { color: theme.textDim }]}>
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
                  { backgroundColor: theme.surfaceElevated },
                  { borderColor: !item.read ? theme.primary : theme.border },
                  !item.read && { backgroundColor: theme.surfaceTint },
                ]}
                onPress={() => onPressItem(item)}
                activeOpacity={0.82}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.titleWrap}>
                    <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
                      {item.title}
                    </Text>
                  </View>
                  {!item.read ? <View style={[styles.dot, { backgroundColor: theme.primary }]} /> : null}
                </View>
                <Text style={[styles.body, { color: theme.textDim }]}>{item.body}</Text>
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



