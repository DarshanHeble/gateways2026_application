import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Dimensions, Pressable, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import Animated, {
  Extrapolation,
  FadeInDown,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
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
import { SelectionFrame, useSurface } from "@/components/mc";
import { McGlyph, PixelIcon } from "@/components/mc/PixelIcon";
import { Tooltip } from "@/components/mc/Tooltip";
import { useAssetSource, useAssetsVersion } from "@/modules/assets";
import { useAppData } from "@/modules/core/DataProvider";
import type { EventItem, ScheduleDay, ScheduleItem } from "@/services/api";
import { getEventImage } from "@/services/EventAssets";
import { SEED_SCHEDULE } from "@/services/offline/seed";
import { useBlockTheme } from "@/theme/BlockThemeContext";
import { mcTextShadow, mojang, scaleColor } from "@/theme/minecraft";
import { timing } from "@/theme/motion";
import { px, pxFont } from "@/theme/scale";
import { fonts, space } from "@/theme/tokens";
import { LINEUP_STORAGE_KEY, clockMinutes, daysBetween, festDaysIn, festStatus, localIso, shortDate } from "@/utils/fest";

/**
 * Schedule, in the same Launcher language as Home.
 *
 * The data decides the shape. Most of the programme has no time yet — on Day 1
 * eleven of fourteen rows are "TBA – TBA" — so a single timeline, which is what
 * this was, drew a rail of eleven identical "TBA" stops and buried the three
 * slots that are actually fixed. It is now two things:
 *
 *  - **On the clock**: the timed slots, in order, on a time rail, with how long
 *    each runs and a LIVE mark on the one that is happening;
 *  - **Time to be announced**: everything else, as art tiles, because for those
 *    the useful information is *what* and *where*, not *when*.
 *
 * Days are picked with the hotbar's own selector, which slides between them.
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

/** "8h", "1h 30m", "45m". An end equal to the start is a 24-hour event. */
function durationLabel(item: ScheduleItem): string | null {
  const start = clockMinutes(item.from_time);
  const end = clockMinutes(item.end_time);
  if (start === null || end === null) return null;
  let mins = end - start;
  if (mins <= 0) mins += 24 * 60;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h && m ? `${h}h ${m}m` : h ? `${h}h` : `${m}m`;
}

/** `"9:00 AM"` → `["9:00", "AM"]`, for the rail's two-size time. */
function splitClock(value: string): [string, string] {
  const m = value.trim().match(/^(\d{1,2}:\d{2})\s*([AP]M)$/i);
  return m ? [m[1], m[2].toUpperCase()] : [value, ""];
}

/** Minutes → "9am", "9:30am", "12pm". */
function shortClock(m: number): string {
  const h24 = Math.floor(m / 60) % 24;
  const mm = m % 60;
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h}${mm ? `:${String(mm).padStart(2, "0")}` : ""}${h24 < 12 ? "am" : "pm"}`;
}

/** "9–10am", "11am–6pm", "10am → 10am next day". */
function shortRange(item: ScheduleItem): string {
  const s0 = clockMinutes(item.from_time);
  const e0 = clockMinutes(item.end_time);
  if (s0 === null) return "Time TBA";
  if (e0 === null) return shortClock(s0);
  if (e0 <= s0) return `${shortClock(s0)} → ${shortClock(e0)} next day`;
  const sameHalf = s0 < 720 === e0 < 720;
  const start = shortClock(s0);
  return `${sameHalf ? start.replace(/am|pm/, "") : start}–${shortClock(e0)}`;
}

/** Is this slot running right now? Only ever true on the day itself. */
function isLive(day: ScheduleDay, item: ScheduleItem, now: Date): boolean {
  if (day.date !== localIso(now)) return false;
  const start = clockMinutes(item.from_time);
  const end = clockMinutes(item.end_time);
  if (start === null || end === null) return false;
  const t = now.getHours() * 60 + now.getMinutes();
  return end > start ? t >= start && t < end : t >= start;
}

/** Minutes the slot ends at; a 24-hour or overnight slot runs to midnight. */
function endMinutes(item: ScheduleItem): number | null {
  const start = clockMinutes(item.from_time);
  const end = clockMinutes(item.end_time);
  if (start === null) return null;
  if (end === null) return start + 60;
  return end > start ? end : 24 * 60;
}

/** Re-render on a slow tick so countdowns and the LIVE mark stay true. */
function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

type Countdown = { eyebrow: string; hud: string; live: boolean };

/**
 * What to say about the day's lead slot, relative to now: days out before the
 * fest, hours and minutes on the day, LIVE while it runs, nothing once it's done.
 */
function countdownFor(day: ScheduleDay, item: ScheduleItem, now: Date): Countdown | null {
  const dayDiff = daysBetween(localIso(now), day.date);
  if (dayDiff > 1) return { eyebrow: "First up", hud: `IN ${dayDiff} DAYS`, live: false };
  if (dayDiff === 1) return { eyebrow: "First up", hud: "TOMORROW", live: false };
  if (dayDiff < 0) return null;
  const start = clockMinutes(item.from_time) ?? 0;
  const end = endMinutes(item) ?? start;
  const t = now.getHours() * 60 + now.getMinutes();
  if (t >= start && t < end) return { eyebrow: "Happening now", hud: "LIVE NOW", live: true };
  if (t < start) {
    const mins = start - t;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return { eyebrow: "Up next", hud: h ? `IN ${h}H ${m}M` : `IN ${m}M`, live: false };
  }
  return null;
}

/**
 * The sheet wants a full event. Competitions have one in the events feed (same
 * ids); ceremonies only exist on the schedule, so they get a minimal one built
 * from the row.
 */
/**
 * Put every slot on the days its own date names.
 *
 * The backend files each two-day event under Day 1 only, and puts a pre-fest
 * online event (24° Shift, 30 Sep – 1 Oct) on 8 Oct. Each row carries the
 * organisers' date text, so it is re-placed from that: two-day events appear
 * on both days, and anything dated outside the fest goes to `preFest`. Rows
 * with no usable date keep the backend's placement.
 */
function placeByDate(source: ScheduleDay[]): { days: ScheduleDay[]; preFest: ScheduleItem[]; unique: number } {
  const festDates = source.map((d) => d.date);
  const firstSeen = new Map<string, { item: ScheduleItem; home: string }>();
  source.forEach((d) =>
    d.timeline.forEach((item) => {
      if (!firstSeen.has(item.id)) firstSeen.set(item.id, { item, home: d.date });
    }),
  );
  const perDay = new Map<string, ScheduleItem[]>(festDates.map((d) => [d, []]));
  const preFest: ScheduleItem[] = [];
  firstSeen.forEach(({ item, home }) => {
    const on = festDaysIn(item.date, festDates);
    if (on && on.length === 0) {
      preFest.push(item);
      return;
    }
    (on ?? [home]).forEach((iso) => perDay.get(iso)?.push(item));
  });
  return {
    days: source.map((d) => ({ ...d, timeline: perDay.get(d.date) ?? [] })),
    preFest,
    unique: firstSeen.size,
  };
}

function asEvent(item: ScheduleItem, events: EventItem[]): EventItem {
  return (
    events.find((e) => e.id === item.id) ?? {
      id: item.id,
      title: item.title,
      subtitle: item.subtitle,
      date: item.date,
      from_time: item.from_time,
      end_time: item.end_time,
      venue: item.venue,
      type: item.category,
      description: item.subtitle ?? "",
      rules: [],
      eligibility: [],
      prizes: {},
      event_heads: [],
    }
  );
}

export default function ScheduleTab() {
  useAssetsVersion();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useBlockTheme();
  const { schedule, events, refreshData } = useAppData();
  const bannerArt = useAssetSource("ui/login-bg");

  const sourceDays = schedule?.days?.length ? schedule.days : SEED_SCHEDULE.days;
  const { days, preFest, unique: totalEvents } = useMemo(() => placeByDate(sourceDays), [sourceDays]);

  // Open on today during the fest; Day 1 otherwise.
  const [dayIndex, setDayIndex] = useState(() => {
    const today = localIso(new Date());
    return Math.max(0, days.findIndex((d) => d.date === today));
  });
  const safeDay = Math.min(dayIndex, days.length - 1);
  const day = days[safeDay];

  const [filter, setFilter] = useState<Filter>("all");
  // Home's "See all in your schedule" arrives with ?filter=lineup. Applied when
  // the param changes (during render, React's pattern for derived resets), so
  // choosing another filter afterwards still works.
  const { filter: filterParam } = useLocalSearchParams<{ filter?: string }>();
  const [appliedParam, setAppliedParam] = useState<string | undefined>(undefined);
  if (filterParam !== appliedParam) {
    setAppliedParam(filterParam);
    if (filterParam === "lineup" || filterParam === "tech" || filterParam === "nontech" || filterParam === "all") {
      setFilter(filterParam);
    }
  }
  const [lineup, setLineup] = useState<string[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Re-read on focus: Home and Events edit the same lineup.
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

  const now = useNow();
  const fest = useMemo(() => {
    const dates = days.map((d) => d.date).filter(Boolean).sort();
    return festStatus(dates[0], dates[dates.length - 1], localIso(new Date()));
  }, [days]);

  const visible = day.timeline.filter((item) => {
    if (filter === "lineup") return lineup.includes(item.id);
    if (filter === "tech" || filter === "nontech") return categoryKey(item.category) === filter;
    return true;
  });
  const timed = visible
    .filter((item) => clockMinutes(item.from_time) !== null)
    .sort((a, b) => (clockMinutes(a.from_time) ?? 0) - (clockMinutes(b.from_time) ?? 0));
  const unscheduled = visible.filter((item) => clockMinutes(item.from_time) === null);
  const lineupOnDay = day.timeline.filter((item) => lineup.includes(item.id)).length;
  const filterCounts: Record<Filter, number> = {
    all: day.timeline.length,
    tech: day.timeline.filter((i) => categoryKey(i.category) === "tech").length,
    nontech: day.timeline.filter((i) => categoryKey(i.category) === "nontech").length,
    lineup: lineupOnDay,
  };

  // The day's fixed slots, whatever the filter: the day card is about the day.
  const dayTimed = day.timeline
    .filter((item) => clockMinutes(item.from_time) !== null)
    .sort((a, b) => (clockMinutes(a.from_time) ?? 0) - (clockMinutes(b.from_time) ?? 0));
  const lead = dayTimed.find((item) => countdownFor(day, item, now)) ?? null;
  const leadCountdown = lead ? countdownFor(day, lead, now) : null;

  const openItem = [...day.timeline, ...preFest].find((i) => i.id === openId) ?? null;
  const openEvent = openItem ? asEvent(openItem, events) : null;

  // ── Scroll-linked motion ───────────────────────────────────────────────────

  const BANNER_H = insets.top + px(236);
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });
  const bannerArtStyle = useAnimatedStyle(() => {
    const y = scrollY.value;
    return {
      transform: [
        { translateY: y < 0 ? y / 2 : y * 0.45 },
        { scale: y < 0 ? 1 + -y / BANNER_H : 1 },
      ],
    };
  });
  const barStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [BANNER_H - px(150), BANNER_H - px(90)], [0, 1], Extrapolation.CLAMP),
  }));

  // A key per view, so rows replay their entrance when the day or filter changes.
  const viewKey = `${safeDay}-${filter}`;

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
        {/* ── Banner: the key art again, shorter, fading into the page ───── */}
        <View style={[styles.banner, { height: BANNER_H }]}>
          <Animated.View style={[StyleSheet.absoluteFill, bannerArtStyle]}>
            {bannerArt ? (
              <Image
                source={bannerArt}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                contentPosition={{ top: "64%", left: "50%" }}
                transition={250}
              />
            ) : null}
          </Animated.View>
          <Svg style={StyleSheet.absoluteFill} width="100%" height={BANNER_H}>
            <Defs>
              <LinearGradient id="scheduleFade" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor={theme.background} stopOpacity={0.3} />
                <Stop offset="22%" stopColor={theme.background} stopOpacity={0.05} />
                <Stop offset="58%" stopColor={theme.background} stopOpacity={0.82} />
                <Stop offset="90%" stopColor={theme.background} stopOpacity={1} />
                <Stop offset="100%" stopColor={theme.background} stopOpacity={1} />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height={BANNER_H} fill="url(#scheduleFade)" />
          </Svg>
          <View pointerEvents="none" style={[styles.bannerFoot, { backgroundColor: theme.background }]} />

          <Animated.View entering={FadeInDown.duration(420)} style={styles.bannerCopy}>
            <Text style={[styles.eyebrow, { color: theme.primary }]}>
              {fest.label.toUpperCase()} · {fest.range.toUpperCase()}
            </Text>
            <Text style={[styles.title, { color: theme.text }, mcTextShadow(theme.text, 40)]}>Schedule</Text>
            <Text style={[styles.subtitle, { color: theme.textDim }]}>
              {totalEvents} events across {days.length} {days.length === 1 ? "day" : "days"}
            </Text>
          </Animated.View>
        </View>

        <View style={styles.body}>
          {/* ── Days ─────────────────────────────────────────────────────── */}
          {/* ── Dated outside the fest (the online hackathon) ────────────── */}
          {preFest.length ? (
            <View style={[styles.preFest, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
              <Text style={[styles.preFestEyebrow, { color: theme.primary }]}>BEFORE THE FEST</Text>
              {preFest.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => setOpenId(item.id)}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.preFestRow, pressed && { opacity: 0.6 }]}
                >
                  <OreSwatch color={oreFor(item.category)} />
                  <View style={styles.preFestBody}>
                    <Text style={[styles.preFestTitle, { color: theme.text }]} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={[styles.preFestMeta, { color: theme.textDim }]} numberOfLines={1}>
                      {[String(item.date).replace(/,?\s*\d{4}\s*$/, ""), item.from_time !== "TBA" ? item.from_time : null, item.venue]
                        .filter(Boolean)
                        .join(" · ")}
                    </Text>
                  </View>
                  <McGlyph name="chevronRight" size={px(12)} color={theme.textDim} />
                </Pressable>
              ))}
            </View>
          ) : null}

          <DayPicker
            days={days}
            selected={safeDay}
            lineup={lineup}
            onSelect={(i) => {
              if (i === safeDay) return;
              Haptics.selectionAsync().catch(() => {});
              setDayIndex(i);
            }}
          />

          {/* ── The day: what's first, and the whole day on one track ─────── */}
          {dayTimed.length ? (
            <DayCard
              key={`card-${safeDay}`}
              day={day}
              timed={dayTimed}
              lead={lead}
              leadEvent={lead ? asEvent(lead, events) : null}
              countdown={leadCountdown}
              now={now}
              untimedCount={day.timeline.length - dayTimed.length}
              onOpen={(id) => setOpenId(id)}
            />
          ) : null}

          {/* ── Filters ──────────────────────────────────────────────────── */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filtersScroll}
            contentContainerStyle={styles.filters}
          >
            {FILTERS.map((f) => {
              const active = f.id === filter;
              const count = filterCounts[f.id];
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
                  {f.id === "lineup" ? <McGlyph name="star" size={px(11)} color={active ? theme.primary : theme.textDim} /> : null}
                  {f.id === "tech" ? <OreSwatch color={ORE.tech} /> : null}
                  {f.id === "nontech" ? <OreSwatch color={ORE.nontech} /> : null}
                  <Text style={[styles.chipText, { color: active ? theme.primary : theme.textDim }]}>{f.label}</Text>
                  <Text style={[styles.chipCount, { color: active ? theme.primary : theme.textDim }]}>{count}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* ── On the clock ─────────────────────────────────────────────── */}
          {timed.length ? (
            <View key={`timed-${viewKey}`}>
              <SectionHeader icon="schedule" title="On the clock" count={timed.length} />
              {timed.map((item, i) => (
                <Animated.View key={item.id} entering={FadeInDown.duration(320).delay(i * 50)}>
                  <TimeRow
                    item={item}
                    event={asEvent(item, events)}
                    last={i === timed.length - 1}
                    live={isLive(day, item, now)}
                    tracked={lineup.includes(item.id)}
                    onPress={() => setOpenId(item.id)}
                    onToggle={() => toggleLineup(item.id)}
                  />
                </Animated.View>
              ))}
            </View>
          ) : null}

          {/* ── Time to be announced ─────────────────────────────────────── */}
          {unscheduled.length ? (
            <View key={`tba-${viewKey}`}>
              <SectionHeader icon="compass" title="Time to be announced" count={unscheduled.length} />
              <Text style={[styles.sectionHint, { color: theme.textDim }]}>
                {"Slots move up to the clock as they're confirmed. Tap any event for details."}
              </Text>
              <View style={styles.grid}>
                {unscheduled.map((item, i) => (
                  <Animated.View key={item.id} entering={FadeInDown.duration(320).delay(i * 40)}>
                    <TbaTile
                      item={item}
                      event={asEvent(item, events)}
                      tracked={lineup.includes(item.id)}
                      onPress={() => setOpenId(item.id)}
                      onToggle={() => toggleLineup(item.id)}
                    />
                  </Animated.View>
                ))}
              </View>
            </View>
          ) : null}

          {/* ── Nothing to show ──────────────────────────────────────────── */}
          {!timed.length && !unscheduled.length ? (
            <Animated.View
              key={`empty-${viewKey}`}
              entering={FadeInDown.duration(320)}
              style={[styles.empty, { borderColor: theme.border, backgroundColor: theme.surfaceElevated }]}
            >
              <PixelIcon name={filter === "lineup" ? "diamond" : "events"} size={px(30)} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                {filter === "lineup" ? "Nothing from your lineup today" : "Nothing here on this day"}
              </Text>
              <Text style={[styles.emptyBody, { color: theme.textDim }]}>
                {filter === "lineup"
                  ? "Open any event and add it to your lineup to see it here."
                  : "Try another day, or clear the filter."}
              </Text>
              <Pressable onPress={() => setFilter("all")} hitSlop={px(10)} accessibilityRole="button">
                <Text style={[styles.emptyAction, { color: theme.primary }]}>Show everything</Text>
              </Pressable>
            </Animated.View>
          ) : null}

          <View style={styles.footer}>
            <PixelIcon name="schedule" size={px(14)} />
            <Text style={[styles.footerText, { color: theme.textDim }]}>
              Times are IST and may change · pull to refresh
            </Text>
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
        <Text style={[styles.barTitle, { color: theme.text }]}>Schedule</Text>
        <Text style={[styles.barDay, { color: theme.textDim }]}>Day {day.day_number}</Text>
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

/**
 * The days as tiles, with the hotbar selector sliding to the chosen one — the
 * same gesture as the tab bar, so choosing a day feels like choosing a slot.
 */
function DayPicker({
  days,
  selected,
  lineup,
  onSelect,
}: {
  days: ScheduleDay[];
  selected: number;
  lineup: string[];
  onSelect: (index: number) => void;
}) {
  const { theme } = useBlockTheme();
  const [rowWidth, setRowWidth] = useState(0);
  const gap = px(10);
  const tileW = days.length ? (rowWidth - gap * (days.length - 1)) / days.length : 0;

  const x = useSharedValue(-1);
  useEffect(() => {
    if (tileW <= 0) return;
    const target = selected * (tileW + gap);
    // Land without sliding on first layout; slide on every later change.
    x.value = x.value < 0 ? target : withTiming(target, timing.select);
  }, [selected, tileW, gap, x]);
  const selectorStyle = useAnimatedStyle(() => ({
    opacity: x.value < 0 ? 0 : 1,
    transform: [{ translateX: Math.max(0, x.value) }],
  }));

  return (
    <View style={[styles.days, { gap }]} onLayout={(e) => setRowWidth(e.nativeEvent.layout.width)}>
      {days.map((d, i) => {
        const active = i === selected;
        const mine = d.timeline.filter((item) => lineup.includes(item.id)).length;
        return (
          <Pressable
            key={d.date || i}
            onPress={() => onSelect(i)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`Day ${d.day_number}, ${shortDate(d.date)}`}
            style={[
              styles.day,
              {
                borderColor: theme.border,
                backgroundColor: active ? theme.surfaceElevated : "transparent",
              },
            ]}
          >
            <Text style={[styles.dayEyebrow, { color: active ? theme.primary : theme.textDim }]}>
              DAY {d.day_number}
            </Text>
            <Text style={[styles.dayDate, { color: active ? theme.text : theme.textDim }]}>{shortDate(d.date)}</Text>
            <Text style={[styles.dayMeta, { color: theme.textDim }]}>
              {d.timeline.length} {d.timeline.length === 1 ? "event" : "events"}
              {mine ? ` · ${mine} yours` : ""}
            </Text>
          </Pressable>
        );
      })}

      {tileW > 0 ? (
        <Animated.View pointerEvents="none" style={[styles.daySelector, { width: tileW }, selectorStyle]}>
          <SelectionFrame />
        </Animated.View>
      ) : null}
    </View>
  );
}

/**
 * The day card: what's first, then the whole day on one clock.
 *
 * The first version was a dark media block with a row of unlabeled colour bars
 * under it — pretty, but you had to already know what each bar was. Now every
 * timed slot gets its own labelled row (name and times, then a bar on a shared
 * 8 AM → 8 PM scale), there is a legend for the ore colours, a "now" line on the
 * day itself, and a slot that runs past midnight says so. It follows the colour
 * mode like the rest of the page; only the countdown tooltip stays dark, because
 * it is an in-game overlay.
 */
function DayCard({
  day,
  timed,
  lead,
  leadEvent,
  countdown,
  now,
  untimedCount,
  onOpen,
}: {
  day: ScheduleDay;
  timed: ScheduleItem[];
  lead: ScheduleItem | null;
  leadEvent: EventItem | null;
  countdown: Countdown | null;
  now: Date;
  untimedCount: number;
  onOpen: (id: string) => void;
}) {
  const { theme, isDark } = useBlockTheme();
  const surface = useSurface();
  const [trackWidth, setTrackWidth] = useState(0);
  const [expanded, setExpanded] = useState(false);
  // A busy day stays a glance: the first few rows, then everything on request.
  const LANE_CAP = 5;
  const shown = expanded ? timed : timed.slice(0, LANE_CAP);
  const hidden = timed.length - shown.length;

  // The scale: 8 AM to 8 PM, widened to whole hours if a slot falls outside.
  // A slot that runs past midnight doesn't widen it; it runs off the edge.
  const runsOvernight = (i: ScheduleItem) => {
    const s0 = clockMinutes(i.from_time);
    const e0 = clockMinutes(i.end_time);
    return s0 !== null && e0 !== null && e0 <= s0;
  };
  const starts = timed.map((i) => clockMinutes(i.from_time) ?? 0);
  const ends = timed.filter((i) => !runsOvernight(i)).map((i) => endMinutes(i) ?? 0);
  const winStart = Math.min(8 * 60, Math.floor(Math.min(...starts) / 60) * 60);
  const rawEnd = Math.max(20 * 60, Math.min(24 * 60, Math.ceil(Math.max(0, ...ends) / 60) * 60));
  // End on a whole two-hour step so the last scale label sits on the edge.
  const winEnd = Math.min(24 * 60, winStart + Math.ceil((rawEnd - winStart) / 120) * 120);
  const span = winEnd - winStart;
  const x = (m: number) => (Math.min(Math.max(m, winStart), winEnd) - winStart) / span * trackWidth;

  const ticks: number[] = [];
  for (let m = winStart; m <= winEnd; m += 120) ticks.push(m);
  const tickLabel = (m: number) => {
    const h = Math.floor(m / 60) % 24;
    return `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? "am" : "pm"}`;
  };

  const isToday = day.date === localIso(now);
  const t = now.getHours() * 60 + now.getMinutes();
  const showNow = isToday && t >= winStart && t <= winEnd;

  // Ore colours, deepened a touch in light mode so a bar reads on cream.
  const ore = (category?: string) => (isDark ? oreFor(category) : scaleColor(oreFor(category), 0.8));
  const legend = [
    { key: "tech", label: "Tech" },
    { key: "nontech", label: "Non-Tech" },
    { key: "general", label: "Ceremony" },
  ].filter((l) => timed.some((i) => categoryKey(i.category) === l.key));

  return (
    <Animated.View
      entering={FadeInDown.duration(380)}
      style={[styles.dayCard, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}
    >
      {/* ── First up ─────────────────────────────────────────────────── */}
      {lead && leadEvent && countdown ? (
        <PressScale onPress={() => onOpen(lead.id)} style={styles.leadRow}>
          <ArtBackdrop event={leadEvent} strength={isDark ? 0.6 : 0.78} />
          <View style={[styles.leadArt, { backgroundColor: surface.slot, borderColor: theme.border }]}>
            <ArtOrSprite event={leadEvent} size={px(58)} />
          </View>
          <View style={styles.leadBody}>
            <Text style={[styles.leadEyebrow, { color: countdown.live ? mojang.green4 : theme.primary }]}>
              {countdown.eyebrow.toUpperCase()}
            </Text>
            <Text style={[styles.leadTitle, { color: theme.text }]} numberOfLines={2}>
              {lead.title}
            </Text>
            <Text style={[styles.leadMeta, { color: theme.textDim }]} numberOfLines={1}>
              {[`${lead.from_time}`, lead.venue].filter(Boolean).join(" · ")}
            </Text>
            <Tooltip padding={px(4)} style={styles.leadHud}>
              <Text
                style={[
                  styles.leadHudText,
                  { color: countdown.live ? "#55ff55" : "#ffff55" },
                  mcTextShadow(countdown.live ? "#55ff55" : "#ffff55", 11),
                ]}
              >
                {countdown.hud}
              </Text>
            </Tooltip>
          </View>
        </PressScale>
      ) : null}

      {/* ── The day on one clock ─────────────────────────────────────── */}
      <View style={[styles.glance, lead && countdown ? { borderTopColor: theme.border, borderTopWidth: StyleSheet.hairlineWidth } : null]}>
        <View style={styles.glanceHead}>
          <Text style={[styles.glanceTitle, { color: theme.text }]}>Day at a glance</Text>
          <Text style={[styles.glanceRange, { color: theme.textDim }]}>
            {tickLabel(winStart)} – {tickLabel(winEnd)}
          </Text>
        </View>

        {/* Hour scale */}
        <View style={styles.scaleRow} onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}>
          {trackWidth > 0
            ? ticks.map((m, i) => (
                <Text
                  key={m}
                  style={[
                    styles.scaleLabel,
                    { color: theme.textDim },
                    i === 0
                      ? { left: 0, textAlign: "left" }
                      : i === ticks.length - 1
                        ? { right: 0, textAlign: "right" }
                        : { left: x(m) - px(20), textAlign: "center" },
                  ]}
                >
                  {tickLabel(m)}
                </Text>
              ))
            : null}
        </View>

        {/* One labelled row per slot, over a faint hour grid */}
        <View style={styles.lanes}>
          {shown.map((item) => {
            const s0 = clockMinutes(item.from_time) ?? winStart;
            const overnight = runsOvernight(item);
            const e0 = overnight ? winEnd : Math.min(endMinutes(item) ?? s0 + 60, winEnd);
            const live = isLive(day, item, now);
            const color = ore(item.category);
            const left = x(s0);
            const width = Math.max(px(10), x(e0) - left);
            return (
              <Pressable
                key={item.id}
                onPress={() => onOpen(item.id)}
                accessibilityRole="button"
                accessibilityLabel={`${item.title}, ${item.from_time} to ${item.end_time}`}
                style={({ pressed }) => [styles.lane, pressed && { opacity: 0.6 }]}
              >
                <View style={styles.laneLabel}>
                  <Text style={[styles.laneTitle, { color: theme.text }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={[styles.laneTime, { color: live ? mojang.green4 : theme.textDim }]} numberOfLines={1}>
                    {live ? "LIVE · " : ""}
                    {shortRange(item)}
                  </Text>
                </View>
                <View style={[styles.laneTrack, { backgroundColor: surface.slot }]}>
                  {/* Hour grid, inside the track only so it never crosses a label. */}
                  {ticks.slice(1, -1).map((m) => (
                    <View key={m} style={[styles.gridLine, { left: x(m), backgroundColor: theme.border }]} />
                  ))}
                  <View
                    style={[
                      styles.laneBar,
                      {
                        left,
                        width: overnight ? Math.max(px(10), trackWidth - left - px(7)) : width,
                        backgroundColor: color,
                        borderRightWidth: overnight ? 0 : px(2),
                      },
                    ]}
                  />
                  {overnight ? (
                    <View style={[styles.laneOvernight, { borderLeftColor: color }]} />
                  ) : null}
                </View>
              </Pressable>
            );
          })}

          {showNow && trackWidth > 0 ? (
            <View pointerEvents="none" style={[styles.nowLine, { left: x(t) }]}>
              <View style={styles.nowDot} />
            </View>
          ) : null}
        </View>

        {timed.length > LANE_CAP ? (
          <Pressable
            onPress={() => setExpanded((v) => !v)}
            hitSlop={px(8)}
            accessibilityRole="button"
            style={({ pressed }) => [styles.lanesMore, { borderColor: theme.border, opacity: pressed ? 0.6 : 1 }]}
          >
            <Text style={[styles.lanesMoreText, { color: theme.primary }]}>
              {expanded ? "Show less" : `Show all ${timed.length} · ${hidden} more`}
            </Text>
          </Pressable>
        ) : null}

        {/* Legend */}
        <View style={styles.legend}>
          {legend.map((l) => (
            <View key={l.key} style={styles.legendItem}>
              <OreSwatch color={ore(l.key === "general" ? "General" : l.key === "tech" ? "Technical" : "Non Technical")} />
              <Text style={[styles.legendText, { color: theme.textDim }]}>{l.label}</Text>
            </View>
          ))}
          {untimedCount ? (
            <Text style={[styles.legendText, styles.legendMore, { color: theme.textDim }]}>
              +{untimedCount} time TBA
            </Text>
          ) : null}
        </View>
      </View>
    </Animated.View>
  );
}

/** An item sprite for rows with no artwork — the ceremonies. */
function ArtOrSprite({ event, size }: { event: EventItem; size: number }) {
  const hasArt = !!(getEventImage(event.title) || event.image_url);
  return hasArt ? <EventArt event={event} size={size} /> : <PixelIcon name="gold" size={size * 0.6} />;
}

/** One timed slot: the time, a stop on the rail, and the card. */
function TimeRow({
  item,
  event,
  last,
  live,
  tracked,
  onPress,
  onToggle,
}: {
  item: ScheduleItem;
  event: EventItem;
  last: boolean;
  live: boolean;
  tracked: boolean;
  onPress: () => void;
  onToggle: () => void;
}) {
  const { theme } = useBlockTheme();
  const surface = useSurface();
  const [clock, meridiem] = splitClock(item.from_time);
  const length = durationLabel(item);
  const tag = categoryTag(item.category);
  const ore = oreFor(item.category);

  return (
    <View style={styles.row}>
      <View style={styles.rowTime}>
        <Text style={[styles.rowClock, { color: live ? mojang.green3 : theme.text }]}>{clock}</Text>
        {meridiem ? <Text style={[styles.rowMeridiem, { color: theme.textDim }]}>{meridiem}</Text> : null}
      </View>

      <View style={styles.rail}>
        <OreSwatch color={ore} size={px(11)} style={styles.railStop} />
        {last ? null : <View style={[styles.railLine, { backgroundColor: theme.border }]} />}
      </View>

      <PressScale
        onPress={onPress}
        containerStyle={styles.cardTarget}
        style={[
          styles.card,
          {
            backgroundColor: theme.surfaceElevated,
            borderColor: live ? mojang.green3 : theme.border,
          },
        ]}
      >
        <View style={[styles.cardArt, { backgroundColor: surface.slot }]}>
          <ArtOrSprite event={event} size={px(46)} />
        </View>
        <View style={styles.cardBody}>
          <View style={styles.cardTags}>
            {live ? (
              <View style={[styles.liveTag, { backgroundColor: mojang.green5 }]}>
                <Text style={styles.liveTagText}>LIVE</Text>
              </View>
            ) : null}
            <OreSwatch color={ore} size={px(8)} />
            <Text style={[styles.cardCaps, { color: theme.textDim }]}>{tag}</Text>
          </View>
          <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={[styles.cardMeta, { color: theme.textDim }]} numberOfLines={1}>
            {[item.venue, length].filter(Boolean).join(" · ")}
          </Text>
        </View>
        <LineupToggle active={tracked} title={item.title} onPress={onToggle} />
      </PressScale>
    </View>
  );
}

/** An untimed event: art first, then what and where. */
function TbaTile({
  item,
  event,
  tracked,
  onPress,
  onToggle,
}: {
  item: ScheduleItem;
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
      style={[styles.tile, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}
    >
      <View style={[styles.tileArt, { backgroundColor: surface.slot }]}>
        <ArtBackdrop event={event} strength={isDark ? 0.35 : 0.4} />
        <ArtOrSprite event={event} size={TILE_W * 0.62} />
        <View style={styles.tileTag}>
          <OreSwatch color={oreFor(item.category)} size={px(7)} />
          <Text style={styles.tileTagText}>{categoryTag(item.category)}</Text>
        </View>
        <View style={styles.tileToggle}>
          <LineupToggle active={tracked} title={item.title} onPress={onToggle} onArt />
        </View>
      </View>
      <View style={styles.tileBody}>
        <Text style={[styles.tileTitle, { color: theme.text }]} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={[styles.tileMeta, { color: theme.textDim }]} numberOfLines={1}>
          {item.subtitle || item.venue || "Venue to be announced"}
        </Text>
      </View>
    </PressScale>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },

  banner: { overflow: "hidden", justifyContent: "flex-end" },
  bannerFoot: { position: "absolute", left: 0, right: 0, bottom: 0, height: px(6) },
  bannerCopy: { paddingHorizontal: GUTTER, paddingBottom: px(18) },
  eyebrow: { fontFamily: fonts.pixelBold, fontSize: pxFont(12), lineHeight: Math.round(pxFont(12) * 1.25), letterSpacing: px(1.2) },
  title: {
    fontFamily: fonts.display,
    fontSize: pxFont(40),
    lineHeight: px(48),
    letterSpacing: 0,
    marginTop: px(4),
  },
  subtitle: { fontFamily: fonts.body, fontSize: px(15), marginTop: px(2) },

  body: { paddingHorizontal: GUTTER },

  days: { flexDirection: "row" },
  preFest: { borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: px(14), paddingVertical: px(10), marginBottom: px(12) },
  preFestEyebrow: { fontFamily: fonts.pixelBold, fontSize: pxFont(10.5), lineHeight: Math.round(pxFont(10.5) * 1.25), letterSpacing: px(1) },
  preFestRow: { flexDirection: "row", alignItems: "center", gap: px(10), paddingVertical: px(6) },
  preFestBody: { flex: 1, minWidth: 0 },
  preFestTitle: { fontFamily: fonts.display, fontSize: px(15) },
  preFestMeta: { fontFamily: fonts.body, fontSize: px(12), marginTop: px(1) },
  day: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: px(12),
    paddingHorizontal: px(14),
  },
  dayEyebrow: { fontFamily: fonts.pixelBold, fontSize: pxFont(11), lineHeight: Math.round(pxFont(11) * 1.25), letterSpacing: px(1) },
  dayDate: { fontFamily: fonts.display, fontSize: pxFont(18), lineHeight: Math.round(pxFont(18) * 1.25), marginTop: px(4), letterSpacing: 0 },
  dayMeta: { fontFamily: fonts.body, fontSize: px(12), marginTop: px(2) },
  daySelector: { position: "absolute", top: 0, bottom: 0, left: 0 },

  // Bleeds to the screen edges so the row reads as scrollable.
  filtersScroll: { marginTop: px(14), marginHorizontal: -GUTTER },
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

  dayCard: {
    marginTop: px(14),
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  leadRow: { flexDirection: "row", alignItems: "center", gap: px(12), padding: px(14), overflow: "hidden" },
  leadArt: {
    width: px(68),
    height: px(68),
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  leadBody: { flex: 1, minWidth: 0 },
  leadEyebrow: { fontFamily: fonts.pixelBold, fontSize: pxFont(10.5), lineHeight: Math.round(pxFont(10.5) * 1.25), letterSpacing: px(1) },
  leadTitle: { fontFamily: fonts.display, fontSize: px(19), lineHeight: px(23), marginTop: px(2) },
  leadMeta: { fontFamily: fonts.body, fontSize: px(12.5), marginTop: px(2) },
  leadHud: { alignSelf: "flex-start", marginTop: px(8) },
  leadHudText: { fontFamily: fonts.pixelBold, fontSize: pxFont(10.5), lineHeight: Math.round(pxFont(10.5) * 1.25) },

  glance: { padding: px(14) },
  glanceHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  glanceTitle: { fontFamily: fonts.display, fontSize: px(16) },
  glanceRange: { fontFamily: fonts.bodyMedium, fontSize: px(12) },
  scaleRow: { height: px(16), marginTop: px(12) },
  scaleLabel: { position: "absolute", width: px(40), fontFamily: fonts.bodyMedium, fontSize: px(10.5) },
  lanes: { marginTop: px(4) },
  gridLine: { position: "absolute", top: 0, bottom: 0, width: StyleSheet.hairlineWidth },
  lane: { paddingVertical: px(6) },
  laneLabel: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: px(8) },
  laneTitle: { flexShrink: 1, fontFamily: fonts.displayMedium, fontSize: px(13.5) },
  laneTime: { fontFamily: fonts.bodyMedium, fontSize: px(11.5) },
  laneTrack: { height: px(12), marginTop: px(5) },
  laneBar: {
    position: "absolute",
    top: 0,
    bottom: 0,
    borderBottomWidth: px(2),
    borderColor: "rgba(0,0,0,0.28)",
  },
  /** A little arrowhead off the right edge: this one carries on past midnight. */
  laneOvernight: {
    position: "absolute",
    right: 0,
    top: 0,
    width: 0,
    height: 0,
    borderTopWidth: px(6),
    borderBottomWidth: px(6),
    borderLeftWidth: px(6),
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
  },
  nowLine: { position: "absolute", top: -px(4), bottom: 0, width: px(2), marginLeft: -px(1), backgroundColor: mojang.green4 },
  nowDot: { position: "absolute", top: -px(3), left: -px(3), width: px(8), height: px(8), backgroundColor: mojang.green4 },
  lanesMore: { alignSelf: "stretch", alignItems: "center", paddingVertical: px(8), marginTop: px(6), borderWidth: StyleSheet.hairlineWidth },
  lanesMoreText: { fontFamily: fonts.displayMedium, fontSize: px(13) },
  legend: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: px(14), marginTop: px(12) },
  legendItem: { flexDirection: "row", alignItems: "center", gap: px(6) },
  legendText: { fontFamily: fonts.bodyMedium, fontSize: px(12) },
  legendMore: { marginLeft: "auto" },


  sectionHint: { fontFamily: fonts.body, fontSize: px(13), lineHeight: px(18), marginTop: -px(6), marginBottom: px(14) },

  row: { flexDirection: "row", alignItems: "stretch" },
  rowTime: { width: px(52), alignItems: "flex-end", paddingTop: px(12) },
  rowClock: { fontFamily: fonts.display, fontSize: pxFont(15), lineHeight: Math.round(pxFont(15) * 1.25), fontVariant: ["tabular-nums"] },
  rowMeridiem: { fontFamily: fonts.pixelBold, fontSize: pxFont(10), lineHeight: Math.round(pxFont(10) * 1.25), letterSpacing: px(1), marginTop: px(1) },
  rail: { width: px(26), alignItems: "center" },
  railStop: { marginTop: px(16) },
  railLine: { flex: 1, width: StyleSheet.hairlineWidth * 2, marginTop: px(4) },
  cardTarget: { flex: 1 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: px(12),
    padding: px(10),
    marginBottom: px(12),
    borderWidth: StyleSheet.hairlineWidth,
  },
  cardArt: { width: px(58), height: px(58), alignItems: "center", justifyContent: "center", overflow: "hidden" },
  cardBody: { flex: 1, minWidth: 0 },
  cardTags: { flexDirection: "row", alignItems: "center", gap: px(8) },
  cardCaps: { fontFamily: fonts.pixelBold, fontSize: pxFont(10.5), lineHeight: Math.round(pxFont(10.5) * 1.25), letterSpacing: px(1) },
  cardTitle: { fontFamily: fonts.display, fontSize: pxFont(16), lineHeight: Math.round(pxFont(16) * 1.25), marginTop: px(3), letterSpacing: 0 },
  cardMeta: { fontFamily: fonts.body, fontSize: px(12.5), marginTop: px(3) },
  liveTag: { paddingHorizontal: px(5), paddingVertical: px(1) },
  liveTagText: { fontFamily: fonts.pixelBold, fontSize: pxFont(10), lineHeight: Math.round(pxFont(10) * 1.25), color: "#ffffff", letterSpacing: px(0.5) },

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
  tileTagText: { fontFamily: fonts.pixelBold, fontSize: pxFont(9.5), lineHeight: Math.round(pxFont(9.5) * 1.25), letterSpacing: px(1), color: "#ffffff" },
  tileToggle: { position: "absolute", top: px(6), right: px(6) },
  tileBody: { padding: px(10) },
  tileTitle: { fontFamily: fonts.display, fontSize: pxFont(14), lineHeight: Math.round(pxFont(14) * 1.25) },
  tileMeta: { fontFamily: fonts.body, fontSize: px(12), marginTop: px(2) },

  empty: {
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: px(28),
    paddingHorizontal: px(20),
    marginTop: px(space.xl),
  },
  emptyTitle: { fontFamily: fonts.display, fontSize: pxFont(16), lineHeight: Math.round(pxFont(16) * 1.25), marginTop: px(12), textAlign: "center" },
  emptyBody: { fontFamily: fonts.body, fontSize: px(13), lineHeight: px(18), marginTop: px(4), textAlign: "center" },
  emptyAction: { fontFamily: fonts.pixelBold, fontSize: pxFont(14), lineHeight: Math.round(pxFont(14) * 1.25), marginTop: px(14) },

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
  barTitle: { fontFamily: fonts.display, fontSize: pxFont(16), lineHeight: Math.round(pxFont(16) * 1.25) },
  barDay: { fontFamily: fonts.pixelBold, fontSize: pxFont(12), lineHeight: Math.round(pxFont(12) * 1.25), letterSpacing: px(0.5) },
});
