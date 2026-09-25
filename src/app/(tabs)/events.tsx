import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
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
import { useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";

import { EventDetailSheet } from "@/components/EventDetailSheet";
import {
  ArtBackdrop,
  EventArt,
  LineupToggle,
  ORE,
  OreSwatch,
  PressScale,
  SectionHeader,
  categoryKey,
  categoryTag,
  oreFor,
} from "@/components/launcher";
import { useSurface } from "@/components/mc";
import { McGlyph, PixelIcon } from "@/components/mc/PixelIcon";
import { useAssetSource, useAssetsVersion } from "@/modules/assets";
import { useAppData } from "@/modules/core/DataProvider";
import type { EventItem } from "@/services/api";
import { getEventImage } from "@/services/EventAssets";
import { useBlockTheme } from "@/theme/BlockThemeContext";
import { mcTextShadow, mojang } from "@/theme/minecraft";
import { px, pxFont } from "@/theme/scale";
import { fonts, space } from "@/theme/tokens";
import { LINEUP_STORAGE_KEY, rupees, shortRupees, teamLabel } from "@/utils/fest";

/**
 * Events — the catalogue, in the Launcher language Home and Schedule use.
 *
 * It was a single column of identical list cards on a dirt background, where
 * the two things people actually choose an event by — what's on offer and
 * whether they can enter alone — weren't on the card at all. Now:
 *
 *  - a banner that leads with the fest's real numbers (events, prize money);
 *  - search, and the same ore-coloured filters as Schedule;
 *  - a spotlight on the biggest prize pool;
 *  - a grid of art tiles, each with its prize pool and team size, and a
 *    one-tap add to your lineup.
 */

const { width: SCREEN_W } = Dimensions.get("window");
const GUTTER = px(space.xl);
const GRID_GAP = px(12);
const TILE_W = (SCREEN_W - GUTTER * 2 - GRID_GAP) / 2;

type Filter = "all" | "tech" | "nontech" | "lineup";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "tech", label: "Tech" },
  { id: "nontech", label: "Non-Tech" },
  { id: "lineup", label: "My lineup" },
];

export default function EventsTab() {
  useAssetsVersion();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useBlockTheme();
  const { events, eventsLoading: loading, refreshData } = useAppData();
  const bannerArt = useAssetSource("ui/login-bg");

  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [lineup, setLineup] = useState<string[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Re-read on every focus: Home and Schedule edit the same lineup, and reading
  // it once on mount left this screen showing a stale one.
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

  const toggleLineup = useCallback(
    async (id: string) => {
      Haptics.selectionAsync().catch(() => {});
      const next = lineup.includes(id) ? lineup.filter((x) => x !== id) : [...lineup, id];
      setLineup(next);
      await AsyncStorage.setItem(LINEUP_STORAGE_KEY, JSON.stringify(next));
    },
    [lineup],
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  }, [refreshData]);

  // ── Derived ────────────────────────────────────────────────────────────────

  const totalPool = useMemo(() => events.reduce((n, e) => n + rupees(e.prizes?.pool), 0), [events]);
  const spotlight = useMemo(
    () => events.reduce<EventItem | null>((best, e) => (!best || rupees(e.prizes?.pool) > rupees(best.prizes?.pool) ? e : best), null),
    [events],
  );

  const counts: Record<Filter, number> = {
    all: events.length,
    tech: events.filter((e) => categoryKey(e.type) === "tech").length,
    nontech: events.filter((e) => categoryKey(e.type) === "nontech").length,
    lineup: events.filter((e) => lineup.includes(e.id)).length,
  };

  const q = query.trim().toLowerCase();
  const visible = events.filter((e) => {
    if (filter === "lineup" && !lineup.includes(e.id)) return false;
    if ((filter === "tech" || filter === "nontech") && categoryKey(e.type) !== filter) return false;
    if (!q) return true;
    return [e.title, e.subtitle, e.type, e.venue].some((f) => String(f ?? "").toLowerCase().includes(q));
  });
  // The spotlight is only worth its space on the unfiltered, unsearched view.
  const showSpotlight = !!spotlight && filter === "all" && !q;
  const grid = showSpotlight ? visible.filter((e) => e.id !== spotlight!.id) : visible;

  const openEvent = events.find((e) => e.id === openId) ?? null;

  // ── Scroll-linked motion ───────────────────────────────────────────────────

  const BANNER_H = insets.top + px(220);
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });
  const bannerArtStyle = useAnimatedStyle(() => {
    const y = scrollY.value;
    return {
      transform: [{ translateY: y < 0 ? y / 2 : y * 0.45 }, { scale: y < 0 ? 1 + -y / BANNER_H : 1 }],
    };
  });
  const barStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [BANNER_H - px(150), BANNER_H - px(90)], [0, 1], Extrapolation.CLAMP),
  }));

  if (loading && !events.length) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.primary }]}>LOADING EVENTS...</Text>
      </View>
    );
  }

  const viewKey = `${filter}-${q}`;

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
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
              <LinearGradient id="eventsFade" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor={theme.background} stopOpacity={0.3} />
                <Stop offset="22%" stopColor={theme.background} stopOpacity={0.05} />
                <Stop offset="58%" stopColor={theme.background} stopOpacity={0.82} />
                <Stop offset="90%" stopColor={theme.background} stopOpacity={1} />
                <Stop offset="100%" stopColor={theme.background} stopOpacity={1} />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height={BANNER_H} fill="url(#eventsFade)" />
          </Svg>
          <View pointerEvents="none" style={[styles.bannerFoot, { backgroundColor: theme.background }]} />

          <Animated.View entering={FadeInDown.duration(420)} style={styles.bannerCopy}>
            <Text style={[styles.eyebrow, { color: theme.primary }]}>COMPETE · WIN · CRAFT</Text>
            <Text style={[styles.title, { color: theme.text }, mcTextShadow(theme.text, 40)]}>Events</Text>
            <View style={styles.bannerStats}>
              <BannerStat value={String(events.length)} label="events" />
              <View style={[styles.bannerRule, { backgroundColor: theme.border }]} />
              <BannerStat value={shortRupees(totalPool)} label="in prizes" accent />
              <View style={[styles.bannerRule, { backgroundColor: theme.border }]} />
              <BannerStat value={String(counts.lineup)} label="in your lineup" />
            </View>
          </Animated.View>
        </View>

        <View style={styles.body}>
          {/* ── Search ───────────────────────────────────────────────── */}
          <View style={[styles.search, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
            <McGlyph name="search" size={px(14)} color={theme.textDim} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search events, e.g. quiz, hackathon"
              placeholderTextColor={theme.textDim}
              selectionColor={theme.primary}
              style={[styles.searchInput, { color: theme.text }]}
              returnKeyType="search"
              autoCorrect={false}
              clearButtonMode="never"
            />
            {query ? (
              <Pressable onPress={() => setQuery("")} hitSlop={px(10)} accessibilityRole="button" accessibilityLabel="Clear search">
                <McGlyph name="close" size={px(11)} color={theme.textDim} />
              </Pressable>
            ) : null}
          </View>

          {/* ── Filters ──────────────────────────────────────────────── */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filtersScroll}
            contentContainerStyle={styles.filters}
          >
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
                  {f.id === "lineup" ? (
                    <McGlyph name="star" size={px(11)} color={active ? theme.primary : theme.textDim} />
                  ) : null}
                  {f.id === "tech" ? <OreSwatch color={ORE.tech} /> : null}
                  {f.id === "nontech" ? <OreSwatch color={ORE.nontech} /> : null}
                  <Text style={[styles.chipText, { color: active ? theme.primary : theme.textDim }]}>{f.label}</Text>
                  <Text style={[styles.chipCount, { color: active ? theme.primary : theme.textDim }]}>
                    {counts[f.id]}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* ── Spotlight: the biggest prize pool ────────────────────── */}
          {showSpotlight && spotlight ? (
            <Animated.View entering={FadeInDown.duration(380)}>
              <SectionHeader icon="diamond" title="Biggest prize" />
              <Spotlight
                event={spotlight}
                tracked={lineup.includes(spotlight.id)}
                onPress={() => setOpenId(spotlight.id)}
                onToggle={() => toggleLineup(spotlight.id)}
              />
            </Animated.View>
          ) : null}

          {/* ── Grid ─────────────────────────────────────────────────── */}
          {grid.length ? (
            <View key={`grid-${viewKey}`}>
              <SectionHeader
                icon="events"
                title={q ? "Results" : filter === "lineup" ? "Your lineup" : showSpotlight ? "All events" : "Events"}
                count={grid.length}
              />
              <View style={styles.grid}>
                {grid.map((e, i) => (
                  <Animated.View key={e.id} entering={FadeInDown.duration(320).delay(Math.min(i, 8) * 40)}>
                    <EventTile
                      event={e}
                      tracked={lineup.includes(e.id)}
                      onPress={() => setOpenId(e.id)}
                      onToggle={() => toggleLineup(e.id)}
                    />
                  </Animated.View>
                ))}
              </View>
            </View>
          ) : !showSpotlight ? (
            <Animated.View
              key={`empty-${viewKey}`}
              entering={FadeInDown.duration(320)}
              style={[styles.empty, { borderColor: theme.border, backgroundColor: theme.surfaceElevated }]}
            >
              <PixelIcon name={filter === "lineup" && !q ? "diamond" : "compass"} size={px(30)} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                {q ? `Nothing matches "${query.trim()}"` : filter === "lineup" ? "Your lineup is empty" : "No events here yet"}
              </Text>
              <Text style={[styles.emptyBody, { color: theme.textDim }]}>
                {q
                  ? "Try a shorter word, or search all categories."
                  : filter === "lineup"
                    ? "Tap + on any event to add it. It'll show on Home and in your schedule."
                    : "Pull down to refresh."}
              </Text>
              <Pressable
                onPress={() => {
                  setQuery("");
                  setFilter("all");
                }}
                hitSlop={px(10)}
                accessibilityRole="button"
              >
                <Text style={[styles.emptyAction, { color: theme.primary }]}>Show all events</Text>
              </Pressable>
            </Animated.View>
          ) : null}

          <View style={styles.footer}>
            <PixelIcon name="events" size={px(14)} />
            <Text style={[styles.footerText, { color: theme.textDim }]}>Prize pools per event · pull to refresh</Text>
          </View>
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
        <Text style={[styles.barTitle, { color: theme.text }]}>Events</Text>
        <Text style={[styles.barMeta, { color: theme.textDim }]}>{visible.length} shown</Text>
      </Animated.View>

      <EventDetailSheet
        visible={!!openEvent}
        event={openEvent}
        onClose={() => setOpenId(null)}
        action={
          openEvent
            ? {
                label: lineup.includes(openEvent.id) ? "Remove from lineup" : "Add to lineup",
                active: lineup.includes(openEvent.id),
                onPress: () => toggleLineup(openEvent.id),
              }
            : undefined
        }
      />
    </View>
  );
}

// ── Pieces ──────────────────────────────────────────────────────────────────

function BannerStat({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  const { theme } = useBlockTheme();
  return (
    <View>
      <Text style={[styles.statValue, { color: accent ? theme.primary : theme.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.textDim }]}>{label}</Text>
    </View>
  );
}

/** Art, or a gold ingot for an event without any. */
function ArtOrSprite({ event, size }: { event: EventItem; size: number }) {
  const hasArt = !!(getEventImage(event.title) || event.image_url);
  return hasArt ? <EventArt event={event} size={size} /> : <PixelIcon name="gold" size={size * 0.6} />;
}

/** Pool and team size — the two facts people pick an event by. */
function Facts({
  event,
  onDark = false,
  compact = false,
}: {
  event: EventItem;
  onDark?: boolean;
  /** Tiles: "₹29K", so pool and team always share one line at half width. */
  compact?: boolean;
}) {
  const { theme } = useBlockTheme();
  const pool = rupees(event.prizes?.pool);
  const team = teamLabel(event.participation_type);
  const dim = onDark ? "rgba(255,255,255,0.72)" : theme.textDim;
  return (
    <View style={styles.facts}>
      {pool ? (
        <View style={styles.fact}>
          <PixelIcon name="gold" size={px(12)} />
          <Text style={[styles.factText, { color: onDark ? mojang.goldDeep : theme.primary }]}>
            {compact ? shortRupees(pool) : `₹${pool.toLocaleString("en-IN")}`}
          </Text>
        </View>
      ) : null}
      {team ? (
        <View style={styles.fact}>
          <PixelIcon name="crew" size={px(12)} />
          <Text style={[styles.factText, { color: dim }]}>{team}</Text>
        </View>
      ) : null}
    </View>
  );
}

/** The biggest prize pool, as a media card that follows the colour mode. */
function Spotlight({
  event,
  tracked,
  onPress,
  onToggle,
}: {
  event: EventItem;
  tracked: boolean;
  onPress: () => void;
  onToggle: () => void;
}) {
  const { theme, isDark } = useBlockTheme();
  const surface = useSurface();
  return (
    <PressScale
      onPress={onPress}
      style={[styles.spot, !isDark && { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}
    >
      <ArtBackdrop event={event} strength={isDark ? 0.5 : 0.82} tint={isDark ? "#0b0a0a" : theme.surfaceElevated} />
      <View style={[styles.spotArt, !isDark && { backgroundColor: surface.slot, borderColor: theme.border }]}>
        <ArtOrSprite event={event} size={px(92)} />
      </View>
      <View style={styles.spotBody}>
        <View style={styles.spotTagRow}>
          <OreSwatch color={oreFor(event.type)} size={px(8)} />
          <Text style={[styles.spotTag, !isDark && { color: theme.textDim }]}>{categoryTag(event.type)}</Text>
        </View>
        <Text style={[styles.spotTitle, !isDark && { color: theme.text }]} numberOfLines={2}>
          {event.title}
        </Text>
        {event.subtitle ? (
          <Text style={[styles.spotSub, !isDark && { color: theme.textDim }]} numberOfLines={1}>
            {event.subtitle}
          </Text>
        ) : null}
        <Facts event={event} onDark={isDark} />
      </View>
      <View style={styles.spotToggle}>
        <LineupToggle active={tracked} title={event.title} onPress={onToggle} onArt={isDark} />
      </View>
    </PressScale>
  );
}

/** One event: art over a blurred copy of itself, then what, and the facts. */
function EventTile({
  event,
  tracked,
  onPress,
  onToggle,
}: {
  event: EventItem;
  tracked: boolean;
  onPress: () => void;
  onToggle: () => void;
}) {
  const { theme, isDark } = useBlockTheme();
  const surface = useSurface();
  return (
    <PressScale
      onPress={onPress}
      style={[
        styles.tile,
        {
          backgroundColor: theme.surfaceElevated,
          borderColor: tracked ? theme.primary : theme.border,
        },
      ]}
    >
      <View style={[styles.tileArt, { backgroundColor: surface.slot }]}>
        <ArtBackdrop event={event} strength={isDark ? 0.35 : 0.4} />
        <ArtOrSprite event={event} size={TILE_W * 0.62} />
        <View style={styles.tileTag}>
          <OreSwatch color={oreFor(event.type)} size={px(7)} />
          <Text style={styles.tileTagText}>{categoryTag(event.type)}</Text>
        </View>
        <View style={styles.tileToggle}>
          <LineupToggle active={tracked} title={event.title} onPress={onToggle} onArt />
        </View>
      </View>
      <View style={styles.tileBody}>
        <Text style={[styles.tileTitle, { color: theme.text }]} numberOfLines={1}>
          {event.title}
        </Text>
        <Text style={[styles.tileSub, { color: theme.textDim }]} numberOfLines={1}>
          {event.subtitle || event.venue || " "}
        </Text>
        <Facts event={event} compact />
      </View>
    </PressScale>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: {
    fontFamily: fonts.pixelBold,
    fontSize: pxFont(13),
    lineHeight: Math.round(pxFont(13) * 1.25),
    marginTop: px(12),
    letterSpacing: px(0.8),
  },

  banner: { overflow: "hidden", justifyContent: "flex-end" },
  bannerFoot: { position: "absolute", left: 0, right: 0, bottom: 0, height: px(6) },
  bannerCopy: { paddingHorizontal: GUTTER, paddingBottom: px(16) },
  eyebrow: {
    fontFamily: fonts.pixelBold,
    fontSize: pxFont(12),
    lineHeight: Math.round(pxFont(12) * 1.25),
    letterSpacing: px(1.2),
  },
  title: { fontFamily: fonts.display, fontSize: px(40), lineHeight: px(48), marginTop: px(4) },
  bannerStats: { flexDirection: "row", alignItems: "center", gap: px(16), marginTop: px(8) },
  bannerRule: { width: StyleSheet.hairlineWidth, alignSelf: "stretch" },
  statValue: { fontFamily: fonts.display, fontSize: px(20), lineHeight: px(24) },
  statLabel: { fontFamily: fonts.body, fontSize: px(12) },

  body: { paddingHorizontal: GUTTER },

  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: px(10),
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: px(12),
    height: px(44),
    marginTop: px(4),
  },
  searchInput: { flex: 1, fontFamily: fonts.body, fontSize: px(15), paddingVertical: 0 },

  filtersScroll: { marginTop: px(12), marginHorizontal: -GUTTER },
  filters: { flexDirection: "row", gap: px(8), paddingHorizontal: GUTTER },
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

  spot: {
    flexDirection: "row",
    alignItems: "center",
    gap: px(14),
    padding: px(14),
    backgroundColor: "#141313",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#000000",
    overflow: "hidden",
  },
  spotArt: {
    width: px(104),
    height: px(104),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.12)",
  },
  spotBody: { flex: 1, minWidth: 0 },
  spotTagRow: { flexDirection: "row", alignItems: "center", gap: px(6) },
  spotTag: {
    fontFamily: fonts.pixelBold,
    fontSize: pxFont(10.5),
    lineHeight: Math.round(pxFont(10.5) * 1.25),
    letterSpacing: px(1),
    color: "rgba(255,255,255,0.8)",
  },
  spotTitle: { fontFamily: fonts.display, fontSize: px(22), lineHeight: px(26), color: "#ffffff", marginTop: px(4) },
  spotSub: { fontFamily: fonts.body, fontSize: px(13), color: "rgba(255,255,255,0.72)", marginTop: px(2) },
  spotToggle: { position: "absolute", top: px(10), right: px(10) },

  facts: { flexDirection: "row", alignItems: "center", gap: px(12), marginTop: px(8) },
  fact: { flexDirection: "row", alignItems: "center", gap: px(5) },
  factText: { fontFamily: fonts.bodyBold, fontSize: px(12.5) },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: GRID_GAP },
  tile: { width: TILE_W, borderWidth: StyleSheet.hairlineWidth },
  tileArt: {
    width: "100%",
    height: TILE_W * 0.82,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  tileTag: {
    position: "absolute",
    top: px(8),
    left: px(8),
    flexDirection: "row",
    alignItems: "center",
    gap: px(5),
    paddingHorizontal: px(6),
    paddingVertical: px(3),
    backgroundColor: "rgba(0,0,0,0.62)",
  },
  tileTagText: {
    fontFamily: fonts.pixelBold,
    fontSize: pxFont(9.5),
    lineHeight: Math.round(pxFont(9.5) * 1.25),
    letterSpacing: px(1),
    color: "#ffffff",
  },
  tileToggle: { position: "absolute", top: px(6), right: px(6) },
  tileBody: { padding: px(10) },
  tileTitle: { fontFamily: fonts.display, fontSize: px(15), lineHeight: px(19) },
  tileSub: { fontFamily: fonts.body, fontSize: px(12), marginTop: px(2) },

  empty: {
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: px(28),
    paddingHorizontal: px(20),
    marginTop: px(space.xl),
  },
  emptyTitle: { fontFamily: fonts.display, fontSize: px(17), marginTop: px(12), textAlign: "center" },
  emptyBody: { fontFamily: fonts.body, fontSize: px(13), lineHeight: px(18), marginTop: px(4), textAlign: "center" },
  emptyAction: { fontFamily: fonts.displayMedium, fontSize: px(14), marginTop: px(14) },

  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: px(8),
    marginTop: px(space["2xl"]),
  },
  footerText: { fontFamily: fonts.body, fontSize: px(12) },

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
