import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, RefreshControl, StatusBar } from "react-native";
import Animated, { FadeInDown, Layout } from "react-native-reanimated";

import { duration, stepped } from "@/theme/motion";
import { router } from "expo-router";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fonts } from "@/theme/tokens";
import { px } from "@/theme/scale";
import { useBlockTheme } from "@/theme/BlockThemeContext";
import { useNotifications } from "../../stores/NotificationsContext";
import { AppNotification, targetLabel } from "@/services/notificationTypes";
import { styles } from "./notifications.styles";
import { McGlyph, PixelIcon } from "@/components/mc/PixelIcon";
import { DirtBackground, Frame, Grain, useSurface } from "@/components/mc";
import { mcTextShadow } from "@/theme/minecraft";
import { typography } from "@/theme/tokens";

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
  const { theme, isDark } = useBlockTheme();
  const surface = useSurface();
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

      {/*
        The dirt menu background.

        Minecraft splits its backdrops: the title screen gets the panning
        panorama, and every menu behind it — options, inventory, controls — gets
        the dirt block tiled and darkened. Home is this app's title screen and
        carries the panorama; the list screens get the dirt, which is what makes
        them read as *inside* the same game rather than as a different app's
        settings page.
      */}
      <DirtBackground brightness={0.085} />

      <View style={[styles.contentWrapper, { paddingTop: insets.top + px(52) }]}>
        {/* Massive Bold Header Matching Home and Profile */}
        <View style={styles.heroHeaderRow}>
          <View style={styles.titleActionRow}>
            <Text
              style={[
                styles.heroMainTitle,
                { color: theme.text },
              ]}
            >
              ALERTS
            </Text>
            {unreadCount > 0 ? (
              <TouchableOpacity
                onPress={markAllRead}
                style={[styles.markAllPill, { backgroundColor: surface.slotActive }]}
                activeOpacity={0.8}
                accessibilityRole="button"
              >
                <Grain />
                <Frame depth="raised" />
                <McGlyph name="check" size={px(13)} color={theme.primary} />
                <Text
                  style={[
                    styles.markAllText,
                    { color: theme.primary },
                    mcTextShadow(theme.primary, 14),
                  ]}
                >
                  MARK ALL READ
                </Text>
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
              {/* The bell item, dimmed — a real sprite rather than the flat
                  `bellOff` glyph, which at 42px was an unreadable blob. */}
              <PixelIcon name="alerts" size={px(56)} opacity={0.35} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>NO ALERTS YET</Text>
              <Text style={[styles.emptySub, { color: theme.textDim }]}>
                Official notices and competition calls will appear here
              </Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.delay(index * 50).duration(duration.screen).easing(stepped(5))} layout={Layout.duration(duration.quick)}>
              <TouchableOpacity
                style={[
                  styles.card,
                  { backgroundColor: item.read ? theme.surfaceElevated : surface.slotActive },
                ]}
                onPress={() => onPressItem(item)}
                activeOpacity={0.82}
              >
                <Grain />
                {/* Unread wears the gold edge — the same "this one matters"
                    signal a registered event card uses. */}
                <Frame depth={item.read ? "raised" : "gold"} />
                <View style={styles.cardHeader}>
                  <View style={styles.titleWrap}>
                    <Text
                      style={[styles.title, { color: theme.text }]}
                      numberOfLines={2}
                    >
                      {item.title}
                    </Text>
                  </View>
                  {!item.read ? <View style={[styles.dot, { backgroundColor: theme.primary }]} /> : null}
                </View>
                <Text style={[styles.body, { color: theme.textDim }]}>{item.body}</Text>
                <View style={styles.metaRow}>
                  <View style={[styles.targetBadge, { backgroundColor: surface.slot }]}>
                    <Frame depth="sunken" />
                    <Text style={[styles.targetBadgeText, { color: theme.primary }]}>{targetLabel(item.target)}</Text>
                  </View>
                  <View style={styles.timeWrap}>
                    <McGlyph name="clock" size={px(12)} color={theme.textDim} />
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



