import React, { useCallback, useMemo, useState } from "react";
import { Pressable, RefreshControl, StatusBar, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import Animated, {
  Extrapolation,
  FadeInDown,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";

import { EventArt, PressScale, SectionHeader } from "@/components/launcher";
import { useSurface } from "@/components/mc";
import { McGlyph, PixelIcon } from "@/components/mc/PixelIcon";
import { useAssetSource, useAssetsVersion } from "@/modules/assets";
import { useAppData } from "@/modules/core/DataProvider";
import type { EventItem } from "@/services/api";
import { getEventImage } from "@/services/EventAssets";
import { AppNotification, targetLabel } from "@/services/notificationTypes";
import { useBlockTheme } from "@/theme/BlockThemeContext";
import { mcTextShadow } from "@/theme/minecraft";
import { px, pxFont } from "@/theme/scale";
import { fonts, space } from "@/theme/tokens";
import { LINEUP_STORAGE_KEY } from "@/utils/fest";

import { useNotifications } from "../../stores/NotificationsContext";

/**
 * Alerts — announcements from the organisers, in the same Launcher language as
 * the other tabs.
 *
 * What changed besides the look:
 *  - an announcement names the event it's about ("Prompt Engineering
 *    Participants"), so it's shown with that event's art and opens it;
 *  - "For you" narrows to the events in your lineup;
 *  - the time shown is when this phone received it — the backend's timestamp
 *    was invented per request — and an expiry date shows as "until".
 */

type Filter = "all" | "unread" | "mine";

function timeAgo(ts: number): string {
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "Yesterday" : `${days}d ago`;
}

function untilLabel(ts: number): string {
  return `Until ${new Date(ts).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`;
}

const squash = (v?: string) => String(v ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

/** The event an announcement's audience names, by title or subtitle. */
function eventFor(n: AppNotification, events: EventItem[]): EventItem | null {
  const text = squash(`${n.audience ?? ""} ${n.title}`);
  if (!text) return null;
  return (
    events.find((e) => {
      const t = squash(e.title);
      const sub = squash(e.subtitle);
      return (t.length > 3 && text.includes(t)) || (sub.length > 3 && text.includes(sub));
    }) ?? null
  );
}

export function NotificationsScreen() {
  useAssetsVersion();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useBlockTheme();
  const { events } = useAppData();
  const { notifications, unreadCount, refresh, markAllRead, markRead } = useNotifications();
  const bannerArt = useAssetSource("ui/login-bg");

  const [filter, setFilter] = useState<Filter>("all");
  const [refreshing, setRefreshing] = useState(false);
  const [lineup, setLineup] = useState<string[]>([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      AsyncStorage.getItem(LINEUP_STORAGE_KEY).then((raw) => {
        if (!active) return;
        try {
          const ids = raw ? JSON.parse(raw) : [];
          setLineup(Array.isArray(ids) ? ids : []);
        } catch {
          setLineup([]);
        }
      });
      return () => {
        active = false;
      };
    }, []),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const items = useMemo(
    () => notifications.map((n) => ({ n, event: eventFor(n, events) })),
    [notifications, events],
  );
  const mineCount = items.filter(({ event }) => event && lineup.includes(event.id)).length;
  const visible = items.filter(({ n, event }) => {
    if (filter === "unread") return !n.read;
    if (filter === "mine") return !!event && lineup.includes(event.id);
    return true;
  });
  const fresh = visible.filter(({ n }) => !n.read);
  const earlier = visible.filter(({ n }) => n.read);

  const onOpen = useCallback(
    (n: AppNotification, event: EventItem | null) => {
      Haptics.selectionAsync().catch(() => {});
      if (!n.read) markRead(n.id);
      if (n.route) router.push(n.route as never);
      else if (event) router.navigate("/(tabs)/events" as never);
    },
    [markRead],
  );

  // ── Scroll-linked motion ───────────────────────────────────────────────────

  const BANNER_H = insets.top + px(200);
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });
  const bannerArtStyle = useAnimatedStyle(() => {
    const y = scrollY.value;
    return { transform: [{ translateY: y < 0 ? y / 2 : y * 0.45 }, { scale: y < 0 ? 1 + -y / BANNER_H : 1 }] };
  });
  const barStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [BANNER_H - px(150), BANNER_H - px(90)], [0, 1], Extrapolation.CLAMP),
  }));

  const FILTERS: { id: Filter; label: string; count: number }[] = [
    { id: "all", label: "All", count: notifications.length },
    { id: "unread", label: "Unread", count: unreadCount },
    { id: "mine", label: "For you", count: mineCount },
  ];

  const renderCard = ({ n, event }: { n: AppNotification; event: EventItem | null }, i: number) => (
    <Animated.View key={n.id} entering={FadeInDown.duration(320).delay(Math.min(i, 8) * 40)}>
      <AlertCard n={n} event={event} onPress={() => onOpen(n, event)} />
    </Animated.View>
  );

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: px(40) }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
            progressViewOffset={insets.top}
          />
        }
      >
        {/* ── Banner ──────────────────────────────────────────────────── */}
        <View style={[styles.banner, { height: BANNER_H }]}>
          <Animated.View style={[StyleSheet.absoluteFill, bannerArtStyle]}>
            {bannerArt ? (
              <Image
                source={bannerArt}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                contentPosition={{ top: "92%", left: "50%" }}
                transition={250}
              />
            ) : null}
          </Animated.View>
          <Svg style={StyleSheet.absoluteFill} width="100%" height={BANNER_H}>
            <Defs>
              <LinearGradient id="alertsFade" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor={theme.background} stopOpacity={0.3} />
                <Stop offset="22%" stopColor={theme.background} stopOpacity={0.05} />
                <Stop offset="58%" stopColor={theme.background} stopOpacity={0.82} />
                <Stop offset="90%" stopColor={theme.background} stopOpacity={1} />
                <Stop offset="100%" stopColor={theme.background} stopOpacity={1} />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height={BANNER_H} fill="url(#alertsFade)" />
          </Svg>
          <View pointerEvents="none" style={[styles.bannerFoot, { backgroundColor: theme.background }]} />

          <Animated.View entering={FadeInDown.duration(420)} style={styles.bannerCopy}>
            <Text style={[styles.eyebrow, { color: theme.primary }]}>FROM THE ORGANISERS</Text>
            <View style={styles.titleRow}>
              <Text style={[styles.title, { color: theme.text }, mcTextShadow(theme.text, 40)]}>Alerts</Text>
              {unreadCount > 0 ? (
                <Pressable
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    markAllRead();
                  }}
                  accessibilityRole="button"
                  hitSlop={px(8)}
                  style={({ pressed }) => [
                    styles.markAll,
                    { borderColor: theme.primary, backgroundColor: theme.primaryContainer, opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <McGlyph name="check" size={px(11)} color={theme.primary} />
                  <Text style={[styles.markAllText, { color: theme.primary }]}>Mark all read</Text>
                </Pressable>
              ) : null}
            </View>
            <Text style={[styles.subtitle, { color: theme.textDim }]}>
              {unreadCount > 0
                ? `${unreadCount} new ${unreadCount === 1 ? "announcement" : "announcements"}`
                : notifications.length
                  ? "You're all caught up"
                  : "Nothing from the organisers yet"}
            </Text>
          </Animated.View>
        </View>

        <View style={styles.body}>
          {notifications.length ? (
            <View style={styles.filters}>
              {FILTERS.map((f) => {
                const active = f.id === filter;
                return (
                  <Pressable
                    key={f.id}
                    onPress={() => {
                      Haptics.selectionAsync().catch(() => {});
                      setFilter(f.id);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    style={({ pressed }) => [
                      styles.chip,
                      {
                        borderColor: active ? theme.primary : theme.border,
                        backgroundColor: active ? theme.primaryContainer : theme.surfaceElevated,
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}
                  >
                    <Text style={[styles.chipText, { color: active ? theme.primary : theme.textDim }]}>{f.label}</Text>
                    <Text style={[styles.chipCount, { color: active ? theme.primary : theme.textDim }]}>{f.count}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          {fresh.length ? (
            <View key={`new-${filter}`}>
              <SectionHeader icon="alerts" title="New" count={fresh.length} />
              <View style={styles.list}>{fresh.map(renderCard)}</View>
            </View>
          ) : null}

          {earlier.length ? (
            <View key={`earlier-${filter}`}>
              <SectionHeader icon="schedule" title="Earlier" count={earlier.length} />
              <View style={styles.list}>{earlier.map(renderCard)}</View>
            </View>
          ) : null}

          {!visible.length ? (
            <Animated.View
              key={`empty-${filter}`}
              entering={FadeInDown.duration(320)}
              style={[styles.empty, { borderColor: theme.border, backgroundColor: theme.surfaceElevated }]}
            >
              <PixelIcon name="alerts" size={px(36)} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                {filter === "unread"
                  ? "Nothing unread"
                  : filter === "mine"
                    ? "Nothing about your lineup yet"
                    : "All quiet for now"}
              </Text>
              <Text style={[styles.emptyBody, { color: theme.textDim }]}>
                {filter === "mine"
                  ? "Announcements about events in your lineup will show up here."
                  : "Venue changes, reporting times and results land here the moment organisers post them. Pull down to check."}
              </Text>
              <Pressable
                onPress={() => (filter === "all" ? router.navigate("/(tabs)/events" as never) : setFilter("all"))}
                hitSlop={px(10)}
                accessibilityRole="button"
              >
                <Text style={[styles.emptyAction, { color: theme.primary }]}>
                  {filter === "all" ? "Browse events" : "Show all alerts"}
                </Text>
              </Pressable>
            </Animated.View>
          ) : null}
        </View>
      </Animated.ScrollView>

      {/* ── Top bar: appears once the banner scrolls away ──────────────── */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.bar,
          {
            height: insets.top + px(52),
            paddingTop: insets.top,
            backgroundColor: theme.background,
            borderBottomColor: theme.border,
          },
          barStyle,
        ]}
      >
        <Text style={[styles.barTitle, { color: theme.text }]}>Alerts</Text>
        {unreadCount ? <Text style={[styles.barMeta, { color: theme.primary }]}>{unreadCount} new</Text> : null}
      </Animated.View>
    </View>
  );
}

/** One announcement: who it's for, the message, and when. */
function AlertCard({ n, event, onPress }: { n: AppNotification; event: EventItem | null; onPress: () => void }) {
  const { theme } = useBlockTheme();
  const surface = useSurface();
  const hasArt = !!event && !!(getEventImage(event.title) || event.image_url);
  const audience = event ? event.title : n.audience || targetLabel(n.target);

  return (
    <PressScale
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: n.read ? theme.surfaceElevated : theme.primaryContainer,
          borderColor: n.read ? theme.border : theme.primary,
        },
      ]}
    >
      {/* Unread: a gold edge down the left, the "this one matters" mark. */}
      {!n.read ? <View style={[styles.unreadEdge, { backgroundColor: theme.primary }]} /> : null}
      <View style={[styles.cardIcon, { backgroundColor: surface.slot }]}>
        {hasArt ? <EventArt event={event!} size={px(38)} /> : <PixelIcon name="shout" size={px(24)} />}
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardHead}>
          <Text style={[styles.cardAudience, { color: n.read ? theme.textDim : theme.primary }]} numberOfLines={1}>
            {audience.toUpperCase()}
          </Text>
          <Text style={[styles.cardTime, { color: theme.textDim }]}>{timeAgo(n.createdAt)}</Text>
        </View>
        <Text style={[styles.cardText, { color: theme.text }]}>{n.body || n.title}</Text>
        {n.expiresAt ? (
          <View style={styles.cardFoot}>
            <McGlyph name="clock" size={px(11)} color={theme.textDim} />
            <Text style={[styles.cardFootText, { color: theme.textDim }]}>{untilLabel(n.expiresAt)}</Text>
          </View>
        ) : null}
      </View>
    </PressScale>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const GUTTER = px(space.xl);

const styles = StyleSheet.create({
  root: { flex: 1 },

  banner: { overflow: "hidden", justifyContent: "flex-end" },
  bannerFoot: { position: "absolute", left: 0, right: 0, bottom: 0, height: px(6) },
  bannerCopy: { paddingHorizontal: GUTTER, paddingBottom: px(14) },
  eyebrow: {
    fontFamily: fonts.pixelBold,
    fontSize: pxFont(12),
    lineHeight: Math.round(pxFont(12) * 1.25),
    letterSpacing: px(1.2),
  },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: px(4) },
  title: { fontFamily: fonts.display, fontSize: px(40), lineHeight: px(48) },
  subtitle: { fontFamily: fonts.body, fontSize: px(15), marginTop: px(2) },
  markAll: {
    flexDirection: "row",
    alignItems: "center",
    gap: px(6),
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: px(10),
    paddingVertical: px(6),
  },
  markAllText: { fontFamily: fonts.displayMedium, fontSize: px(13) },

  body: { paddingHorizontal: GUTTER },

  filters: { flexDirection: "row", gap: px(8), marginTop: px(4) },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: px(6),
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: px(7),
    paddingHorizontal: px(12),
  },
  chipText: { fontFamily: fonts.pixelBold, fontSize: pxFont(13), lineHeight: Math.round(pxFont(13) * 1.25) },
  chipCount: { fontFamily: fonts.body, fontSize: px(12), opacity: 0.8 },

  list: { gap: px(10) },
  card: {
    flexDirection: "row",
    gap: px(12),
    padding: px(12),
    paddingLeft: px(14),
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  unreadEdge: { position: "absolute", left: 0, top: 0, bottom: 0, width: px(3) },
  cardIcon: { width: px(46), height: px(46), alignItems: "center", justifyContent: "center" },
  cardBody: { flex: 1, minWidth: 0 },
  cardHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: px(8) },
  cardAudience: {
    flexShrink: 1,
    fontFamily: fonts.pixelBold,
    fontSize: pxFont(10.5),
    lineHeight: Math.round(pxFont(10.5) * 1.25),
    letterSpacing: px(0.8),
  },
  cardTime: { fontFamily: fonts.bodyMedium, fontSize: px(11.5) },
  cardText: { fontFamily: fonts.body, fontSize: px(14.5), lineHeight: px(20), marginTop: px(4) },
  cardFoot: { flexDirection: "row", alignItems: "center", gap: px(5), marginTop: px(8) },
  cardFootText: { fontFamily: fonts.bodyMedium, fontSize: px(12) },

  empty: {
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: px(32),
    paddingHorizontal: px(22),
    marginTop: px(space.lg),
  },
  emptyTitle: { fontFamily: fonts.display, fontSize: px(18), marginTop: px(12), textAlign: "center" },
  emptyBody: { fontFamily: fonts.body, fontSize: px(13.5), lineHeight: px(19), marginTop: px(6), textAlign: "center" },
  emptyAction: { fontFamily: fonts.displayMedium, fontSize: px(14), marginTop: px(16) },

  bar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: px(10),
    paddingHorizontal: GUTTER,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  barTitle: { fontFamily: fonts.display, fontSize: px(17) },
  barMeta: { fontFamily: fonts.bodyMedium, fontSize: px(12) },
});
