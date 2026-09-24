import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import Animated, {
  Easing,
  Extrapolation,
  FadeInDown,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";

import { EventDetailSheet } from "@/components/EventDetailSheet";
import { McGlyph, PixelIcon, type PixelIconName } from "@/components/mc/PixelIcon";
import { McSlot, useSurface } from "@/components/mc";
import { useAssetSource, useAssetsVersion } from "@/modules/assets";
import { useAuth } from "@/modules/auth";
import { useAppData } from "@/modules/core/DataProvider";
import { resolveAsset } from "@/services/assets";
import { getEventImage } from "@/services/EventAssets";
import type { EventItem } from "@/services/api";
import { useBlockTheme } from "@/theme/BlockThemeContext";
import { mcTextShadow, mojang } from "@/theme/minecraft";
import { px } from "@/theme/scale";
import { fonts, space } from "@/theme/tokens";

import { MINECRAFT_SKINS } from "./profile";

/**
 * Home.
 *
 * Modelled on the Minecraft Launcher — the one screen Mojang ships that exists
 * to answer "what now?" — rather than on the game's HUD:
 *
 *  - **One piece of key art as the hero.** The fest's own poster, full-bleed,
 *    with its wordmark intact. It carries the brand so the interface does not
 *    have to perform it.
 *  - **One primary action.** The Launcher's green PLAY button, square, with the
 *    game's lit top edge — the single Minecraft widget on the page, which is what
 *    makes it read as the brand rather than as a costume.
 *  - **Content below, in plain tiles.** What is next, your lineup, what else is
 *    on. Square, flat, quiet.
 *
 * An earlier version tried to be Minecraft by *adding* Minecraft — a pixel sky,
 * splash text, particles, advancements, an XP bar, torches. Each was faithful
 * and together they made the page a toy. Everything that loops forever is gone;
 * motion is limited to the hero's scroll parallax, a single entrance, and press
 * feedback.
 */

const { height: SCREEN_H } = Dimensions.get("window");
/*
 * Tall enough that the welcome copy sits *below* the poster's own wordmark, on
 * art that has already faded into the page. At 58% the eyebrow landed on
 * half-faded sky right under "#PARALLEX" and lost its contrast.
 */
// Whole points: a fractional height left the fade's raster a sub-pixel short
// of the hero's clip, and a hairline of art showed along the bottom edge.
const HERO_H = Math.round(Math.max(px(520), SCREEN_H * 0.72));

const STORAGE_MY_EVENTS = "@gateways_my_events";
const STORAGE_PROFILE_KEY = "@gateways_user_profile_v1";

/** Local calendar date as `YYYY-MM-DD`. */
function localIso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Whole days between two `YYYY-MM-DD` dates. */
function daysBetween(a: string, b: string) {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Oct 8 – 9" style range, and where today sits relative to it. */
function festStatus(start: string, end: string, today: string) {
  const [, sm, sd] = start.split("-").map(Number);
  const [, em, ed] = end.split("-").map(Number);
  const range =
    start === end
      ? `${MONTHS[sm - 1]} ${sd}`
      : sm === em
        ? `${MONTHS[sm - 1]} ${sd} – ${ed}`
        : `${MONTHS[sm - 1]} ${sd} – ${MONTHS[em - 1]} ${ed}`;

  const toStart = daysBetween(today, start);
  if (toStart > 1) return { range, label: `${toStart} days to go` };
  if (toStart === 1) return { range, label: "Starts tomorrow" };
  if (daysBetween(today, end) >= 0) return { range, label: `Day ${daysBetween(start, today) + 1} · Live now` };
  return { range, label: "That's a wrap" };
}

export default function Home() {
  // `getEventImage` / `resolveAsset` are synchronous registry reads; this keeps
  // the screen subscribed so finished downloads swap in.
  useAssetsVersion();
  const insets = useSafeAreaInsets();
  const { role } = useAuth();
  const { theme, isDark } = useBlockTheme();
  const surface = useSurface();
  const { events: allEvents, schedule } = useAppData();
  const heroArt = useAssetSource("ui/login-bg");

  const [myEventIds, setMyEventIds] = useState<string[]>([]);
  const [profile, setProfile] = useState<{ fullName?: string; skinId?: string }>({});
  const [openEventId, setOpenEventId] = useState<string | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);

  /*
   * The character standing in the key art is a different one of the cast each
   * time you come back to Home — never the same one twice running — so the
   * screen you see most does not go stale. Your own skin stays on the avatar.
   * The first focus keeps the pick made at mount, so it doesn't swap on launch.
   */
  const [heroSkin, setHeroSkin] = useState(() => pickOtherSkin(-1));
  const seenFocus = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (seenFocus.current) setHeroSkin((prev) => pickOtherSkin(prev));
      seenFocus.current = true;
    }, []),
  );

  /*
   * Re-read on every focus, not just on mount. The Events tab and the profile
   * screen write the same keys, and a lineup built over there used to stay
   * invisible here until the app restarted.
   */
  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const [ids, prof] = await Promise.all([
          AsyncStorage.getItem(STORAGE_MY_EVENTS),
          AsyncStorage.getItem(STORAGE_PROFILE_KEY),
        ]);
        if (!active) return;
        try {
          setMyEventIds(ids ? JSON.parse(ids) : []);
        } catch {
          setMyEventIds([]);
        }
        try {
          setProfile(prof ? JSON.parse(prof) : {});
        } catch {
          setProfile({});
        }
      })();
      return () => {
        active = false;
      };
    }, []),
  );

  const toggleTracked = useCallback(
    async (id: string) => {
      Haptics.selectionAsync().catch(() => {});
      const next = myEventIds.includes(id)
        ? myEventIds.filter((x) => x !== id)
        : [...myEventIds, id];
      setMyEventIds(next);
      await AsyncStorage.setItem(STORAGE_MY_EVENTS, JSON.stringify(next));
    },
    [myEventIds],
  );

  // ── Derived ────────────────────────────────────────────────────────────────

  const tracked = useMemo(
    () => allEvents.filter((e) => myEventIds.includes(e.id)),
    [allEvents, myEventIds],
  );
  const upNext: EventItem | null = tracked[0] ?? allEvents[0] ?? null;
  const upNextIsTracked = !!upNext && myEventIds.includes(upNext.id);
  const lineupRest = upNextIsTracked ? tracked.slice(1) : tracked;
  const explore = useMemo(
    () => allEvents.filter((e) => !myEventIds.includes(e.id)).slice(0, 8),
    [allEvents, myEventIds],
  );
  const openEvent = allEvents.find((e) => e.id === openEventId) ?? null;

  const skin = MINECRAFT_SKINS.find((s) => s.id === profile.skinId) ?? MINECRAFT_SKINS[0];
  const firstName = (profile.fullName?.trim() || "Steve").split(/\s+/)[0];

  const fest = useMemo(() => {
    const dates = (schedule?.days ?? []).map((d) => d.date).filter(Boolean).sort();
    return festStatus(dates[0] ?? "2026-10-08", dates[dates.length - 1] ?? "2026-10-09", localIso(new Date()));
  }, [schedule]);

  // ── Scroll-linked motion ───────────────────────────────────────────────────

  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });

  /*
   * A very slow push-in on the key art — 6% over 28 seconds, eased, then back.
   * Slow enough that you never see it move, only that the page is not a
   * screenshot. The one ambient motion on the page, and deliberately below the
   * threshold of attention.
   */
  const drift = useSharedValue(0);
  useEffect(() => {
    drift.value = withRepeat(
      withTiming(1, { duration: 28_000, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [drift]);

  /** Parallax at under half speed, a stretch when pulled past the top. */
  const heroImageStyle = useAnimatedStyle(() => {
    const y = scrollY.value;
    return {
      transform: [
        { translateY: y < 0 ? y / 2 : y * 0.45 },
        { scale: (y < 0 ? 1 + -y / HERO_H : 1) * (1 + drift.value * 0.06) },
      ],
    };
  });

  /**
   * The character sits on a nearer plane than the backdrop: it scrolls at
   * nearly full speed while the art behind it lags, which is what gives the
   * hero real depth rather than a flat picture with a figure pasted on.
   */
  const heroCharacterStyle = useAnimatedStyle(() => {
    const y = scrollY.value;
    return {
      transform: [{ translateY: y < 0 ? 0 : y * 0.15 }],
      opacity: interpolate(y, [0, HERO_H * 0.6], [1, 0], Extrapolation.CLAMP),
    };
  });

  /** The welcome block drifts up and fades as the hero scrolls away. */
  const heroCopyStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, HERO_H * 0.45], [1, 0], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(scrollY.value, [0, HERO_H * 0.45], [0, -px(24)], Extrapolation.CLAMP) },
    ],
  }));

  /** A solid top bar fades in once the hero has gone. */
  const barStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [HERO_H - px(160), HERO_H - px(90)], [0, 1], Extrapolation.CLAMP),
  }));

  const goSchedule = () => router.navigate("/(tabs)/schedule" as never);
  const goEvents = () => router.navigate("/(tabs)/events" as never);
  const goProfile = () => router.navigate("/(tabs)/profile" as never);

  const barHeight = insets.top + px(52);

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: px(space["2xl"]) }}
      >
        {/* ── Hero ───────────────────────────────────────────────────────── */}
        {/* Clipped: the parallax moves the art down as you scroll, and without
            this it slid out of the hero and showed behind the content below. */}
        <View style={styles.hero}>
          <Animated.View style={[StyleSheet.absoluteFill, heroImageStyle]}>
            {heroArt ? (
              <Image
                source={heroArt}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                contentPosition="top"
                transition={250}
              />
            ) : null}
          </Animated.View>

          {/* Fade the art into the page, so the hero ends in the theme's own
              background rather than in a hard edge. */}
          {/* Explicit height rather than "100%": react-native-svg resolves a
              percentage once, so a changed hero height left the fade short and a
              band of unfaded art showed beneath it. */}
          <Svg style={StyleSheet.absoluteFill} width="100%" height={HERO_H}>
            <Defs>
              <LinearGradient id="heroFade" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor={theme.background} stopOpacity={0.25} />
                <Stop offset="18%" stopColor={theme.background} stopOpacity={0} />
                <Stop offset="46%" stopColor={theme.background} stopOpacity={0} />
                <Stop offset="64%" stopColor={theme.background} stopOpacity={0.9} />
                {/* Solid for the last stretch, so there is no hairline seam
                    where the hero's last row of art meets the page. */}
                <Stop offset="92%" stopColor={theme.background} stopOpacity={1} />
                <Stop offset="100%" stopColor={theme.background} stopOpacity={1} />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height={HERO_H} fill="url(#heroFade)" />
          </Svg>
          {/* And a solid foot under the fade, in case the art's drift scales
              it past the SVG's last row. */}
          <View pointerEvents="none" style={[styles.heroFoot, { backgroundColor: theme.background }]} />

          {/* One of the cast, standing in the key art. Keyed by skin so each
              new character steps in with the entrance rather than popping. */}
          <Animated.View
            key={MINECRAFT_SKINS[heroSkin].id}
            entering={FadeInDown.duration(520).delay(120)}
            style={styles.heroCharacter}
            pointerEvents="none"
          >
            <Animated.View style={[StyleSheet.absoluteFill, heroCharacterStyle]}>
              <Image
                source={resolveAsset(MINECRAFT_SKINS[heroSkin].assetKey)}
                style={StyleSheet.absoluteFill}
                contentFit="contain"
                contentPosition="bottom"
              />
            </Animated.View>
          </Animated.View>

          <Animated.View style={[styles.heroCopy, heroCopyStyle]}>
            <Text style={[styles.heroEyebrow, { color: theme.primary }]}>
              {fest.label.toUpperCase()} · {fest.range.toUpperCase()}
            </Text>
            {/* Two lines, the name in the accent: a lockup rather than a
                sentence, and room beside it for the character. */}
            <Text style={[styles.heroGreeting, { color: theme.text }]}>Welcome back,</Text>
            <Text
              style={[styles.heroTitle, styles.heroName, { color: theme.primary }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {firstName}
            </Text>
            <Text style={[styles.heroSub, { color: theme.textDim }]}>
              {tracked.length === 0
                ? "Build your lineup to get reminders for the events you care about."
                : `${tracked.length} ${tracked.length === 1 ? "event" : "events"} in your lineup.`}
            </Text>

            <View style={styles.heroActions}>
              <LauncherButton
                label={tracked.length === 0 ? "Build my lineup" : "My schedule"}
                icon={tracked.length === 0 ? "events" : "schedule"}
                onPress={tracked.length === 0 ? () => setPickerVisible(true) : goSchedule}
              />
            </View>
          </Animated.View>
        </View>

        <View style={styles.body}>
          {/* ── At a glance ──────────────────────────────────────────────── */}
          {/* Three inventory slots, each holding the item it counts, with the
              figure as the stack count — the way the game shows how many of
              something you have. Each one opens what it counts. */}
          <Animated.View
            entering={FadeInDown.duration(380)}
            style={[styles.stats, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}
          >
            <Stat icon="events" value={allEvents.length} label="Events" onPress={goEvents} />
            <View style={[styles.statRule, { backgroundColor: theme.border }]} />
            <Stat icon="schedule" value={schedule?.days?.length ?? 2} label="Days" onPress={goSchedule} />
            <View style={[styles.statRule, { backgroundColor: theme.border }]} />
            <Stat
              icon="diamond"
              value={tracked.length}
              label="Tracking"
              accent
              onPress={() => setPickerVisible(true)}
            />
          </Animated.View>

          {/* ── Up next ──────────────────────────────────────────────────── */}
          {upNext ? (
            <Animated.View entering={FadeInDown.duration(380).delay(60)}>
              <SectionHeader icon="schedule" title={upNextIsTracked ? "Up next" : "Featured"} />
              {/* Always dark, in either mode: a featured card is media, like the
                  Launcher's news hero, and a light scrim over blurred art just
                  turned it grey. The contrast is what marks it as the lead. */}
              <PressScale
                onPress={() => setOpenEventId(upNext.id)}
                style={[styles.feature, { backgroundColor: "#141313", borderColor: "#000000" }]}
              >
                {/* The event's own art, blurred into a colour field behind the
                    card — so each featured event carries its own mood rather
                    than every card being the same grey. */}
                <ArtBackdrop event={upNext} strength={0.5} tint="#0b0a0a" />
                <View style={[styles.featureArt, { backgroundColor: "rgba(0,0,0,0.35)", borderColor: "rgba(255,255,255,0.12)" }]}>
                  <EventArt event={upNext} size={px(96)} />
                </View>
                <View style={styles.featureBody}>
                  <Text style={[styles.metaCaps, { color: mojang.goldDeep }]}>
                    {(upNext.type || "Event").toUpperCase()}
                  </Text>
                  <Text style={[styles.featureTitle, { color: "#ffffff" }]} numberOfLines={2}>
                    {upNext.title}
                  </Text>
                  <Text style={[styles.meta, { color: "rgba(255,255,255,0.72)" }]} numberOfLines={1}>
                    {[upNext.from_time, upNext.venue].filter(Boolean).join(" · ")}
                  </Text>
                </View>
              </PressScale>
            </Animated.View>
          ) : null}

          {/* ── Lineup ───────────────────────────────────────────────────── */}
          <Animated.View entering={FadeInDown.duration(380).delay(120)}>
            <SectionHeader
              icon="events"
              title="Your lineup"
              count={tracked.length}
              action={tracked.length ? { label: "Edit", onPress: () => setPickerVisible(true) } : undefined}
            />
            <View style={[styles.list, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
              {lineupRest.length > 0 ? (
                lineupRest.map((ev, i) => (
                  <LineupRow
                    key={ev.id}
                    event={ev}
                    first={i === 0}
                    onPress={() => setOpenEventId(ev.id)}
                  />
                ))
              ) : (
                <Pressable
                  onPress={() => setPickerVisible(true)}
                  style={({ pressed }) => [styles.emptyRow, pressed && { opacity: 0.7 }]}
                  accessibilityRole="button"
                >
                  <View style={styles.emptyText}>
                    <Text style={[styles.rowTitle, { color: theme.text }]}>
                      {tracked.length === 0 ? "Nothing tracked yet" : "That's everything you're tracking"}
                    </Text>
                    <Text style={[styles.meta, { color: theme.textDim }]}>
                      {tracked.length === 0 ? "Pick the events you want to follow." : "Add more to fill out your fest."}
                    </Text>
                  </View>
                  <Text style={[styles.emptyAction, { color: theme.primary }]}>Add events</Text>
                </Pressable>
              )}
            </View>
          </Animated.View>

          {/* ── Explore ──────────────────────────────────────────────────── */}
          {explore.length > 0 ? (
            <Animated.View entering={FadeInDown.duration(380).delay(180)}>
              <SectionHeader icon="compass" title="Explore" action={{ label: "See all", onPress: goEvents }} />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tiles}
                decelerationRate="fast"
                snapToInterval={TILE_W + px(space.md)}
              >
                {explore.map((ev) => (
                  <PressScale
                    key={ev.id}
                    onPress={() => setOpenEventId(ev.id)}
                    style={[styles.tile, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}
                  >
                    <View style={[styles.tileArt, { backgroundColor: surface.slot }]}>
                      <ArtBackdrop event={ev} strength={isDark ? 0.35 : 0.4} />
                      <EventArt event={ev} size={TILE_W * 0.74} />
                      <View style={styles.tileTag}>
                        <Text style={styles.tileTagText}>{categoryTag(ev.type)}</Text>
                      </View>
                    </View>
                    <View style={styles.tileBody}>
                      <Text style={[styles.tileTitle, { color: theme.text }]} numberOfLines={1}>
                        {ev.title}
                      </Text>
                      <Text style={[styles.meta, { color: theme.textDim }]} numberOfLines={1}>
                        {ev.type || "Event"}
                      </Text>
                    </View>
                  </PressScale>
                ))}
              </ScrollView>
            </Animated.View>
          ) : null}

          <View style={styles.footer}>
            <PixelIcon name="home" size={px(14)} />
            <Text style={[styles.footerText, { color: theme.textDim }]}>Gateways 2026 · Christ University</Text>
          </View>
        </View>
      </Animated.ScrollView>

      {/* ── Top bar: transparent over the art, solid once it scrolls away ── */}
      <View style={[styles.bar, { height: barHeight, paddingTop: insets.top }]} pointerEvents="box-none">
        {/* Decoration only: at opacity 0 it was still a touch target across the
            whole top strip, swallowing taps meant for what floats above it. */}
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: theme.background, borderBottomColor: theme.border },
            styles.barSolid,
            barStyle,
          ]}
        />
        <Pressable
          onPress={goProfile}
          accessibilityRole="button"
          accessibilityLabel="Your profile"
          style={({ pressed }) => [styles.avatar, pressed && { opacity: 0.75 }]}
        >
          {/* The player's skin, cropped to the head the way the Launcher shows
              your account in its corner. */}
          <Image
            source={resolveAsset(skin.assetKey)}
            style={styles.avatarImage}
            contentFit="cover"
            contentPosition="top"
          />
        </Pressable>
        {/* Left, beside the avatar. Centred, it ran into the floating server
            status, which owns the right-hand side of every screen. */}
        <Animated.Text pointerEvents="none" style={[styles.barTitle, { color: theme.text }, barStyle]}>
          Gateways 2026
        </Animated.Text>
      </View>

      <EventDetailSheet
        visible={!!openEvent}
        event={openEvent}
        onClose={() => setOpenEventId(null)}
        action={
          openEvent
            ? {
                label: myEventIds.includes(openEvent.id) ? "Remove from lineup" : "Add to lineup",
                active: myEventIds.includes(openEvent.id),
                onPress: () => toggleTracked(openEvent.id),
              }
            : undefined
        }
      />

      <LineupPicker
        visible={pickerVisible}
        events={allEvents}
        selected={myEventIds}
        onToggle={toggleTracked}
        onClose={() => setPickerVisible(false)}
        roleLabel={role === "team" ? "Crew" : "Participant"}
      />
    </View>
  );
}

// ── Pieces ──────────────────────────────────────────────────────────────────

const TILE_W = px(148);

/**
 * The game's own button, in the Launcher's green: a black outline, a bevel lit
 * from the top-left and shaded at the bottom-right, and a dark lip underneath
 * that it sinks into when pressed. The label is set in the game's face with its
 * drop shadow, led by the item it takes you to.
 */
function LauncherButton({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: PixelIconName;
  onPress: () => void;
}) {
  const [pressed, setPressed] = useState(false);
  const lip = px(4);
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        setPressed(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }}
      onPressOut={() => setPressed(false)}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.cta, { marginTop: pressed ? lip : 0 }]}
    >
      <View style={[styles.ctaFace, pressed && styles.ctaFacePressed]}>
        <PixelIcon name={icon} size={px(18)} />
        <Text style={[styles.ctaLabel, mcTextShadow("#ffffff", px(13))]}>{label.toUpperCase()}</Text>
        <McGlyph name="arrowRight" size={px(12)} color="#ffffff" />
      </View>
      {pressed ? null : <View style={[styles.ctaLip, { height: lip }]} />}
    </Pressable>
  );
}

/** A random index into the cast, other than `except` when there is a choice. */
function pickOtherSkin(except: number): number {
  const n = MINECRAFT_SKINS.length;
  if (except < 0 || n <= 1) return Math.floor(Math.random() * n);
  // Draw from the other n - 1 and step over `except`: uniform, and no retry loop.
  const i = Math.floor(Math.random() * (n - 1));
  return i >= except ? i + 1 : i;
}

/** Gentle scale-down on press. Timed, not sprung — it settles, it doesn't bounce. */
function PressScale({
  children,
  onPress,
  style,
}: {
  children: React.ReactNode;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Pressable
      onPress={onPress}
      // Shared values are mutable by design; the compiler lint rule doesn't
      // recognise that yet (same exception as PixelButton).
      onPressIn={() => {
        // eslint-disable-next-line react-hooks/immutability
        scale.value = withTiming(0.975, { duration: 90 });
      }}
      onPressOut={() => {
        // eslint-disable-next-line react-hooks/immutability
        scale.value = withTiming(1, { duration: 140 });
      }}
      accessibilityRole="button"
    >
      <Animated.View style={[style, animated]}>{children}</Animated.View>
    </Pressable>
  );
}

function SectionHeader({
  title,
  count,
  action,
  icon,
}: {
  title: string;
  count?: number;
  action?: { label: string; onPress: () => void };
  /** A small item sprite marking the section — the game's own nouns. */
  icon?: PixelIconName;
}) {
  const { theme } = useBlockTheme();
  return (
    <View style={styles.sectionHead}>
      <View style={styles.sectionLead}>
        {icon ? <PixelIcon name={icon} size={px(18)} /> : null}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
        {title}
          {count ? <Text style={{ color: theme.textDim }}>  {count}</Text> : null}
        </Text>
      </View>
      {action ? (
        <Pressable onPress={action.onPress} hitSlop={px(10)} accessibilityRole="button">
          {({ pressed }) => (
            <Text style={[styles.sectionAction, { color: theme.primary, opacity: pressed ? 0.6 : 1 }]}>
              {action.label}
            </Text>
          )}
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * One figure in the at-a-glance strip: an item in a slot, with the figure as its
 * stack count in the bottom-right corner. Pressing it lights the slot the way
 * hovering one does in game.
 */
function Stat({
  icon,
  value,
  label,
  accent,
  onPress,
}: {
  icon: PixelIconName;
  value: number;
  label: string;
  accent?: boolean;
  onPress: () => void;
}) {
  const { theme, isDark } = useBlockTheme();
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      style={styles.stat}
      accessibilityRole="button"
      accessibilityLabel={`${value} ${label}`}
    >
      {({ pressed }) => (
        <>
          <McSlot size={52}>
            <PixelIcon name={icon} size={px(30)} />
            {pressed ? <View style={styles.statHover} pointerEvents="none" /> : null}
            {/* Vanilla's white count reads on the game's mid-grey slot; on the
                pale light-mode slot it vanished, so there it takes the ink. */}
            <Text
              style={[
                styles.statCount,
                isDark ? mcTextShadow("#ffffff", px(17)) : { color: theme.text },
              ]}
            >
              {value}
            </Text>
          </McSlot>
          <Text style={[styles.statLabel, { color: accent ? theme.primary : theme.textDim }]}>
            {label.toUpperCase()}
          </Text>
        </>
      )}
    </Pressable>
  );
}

/**
 * The event's own artwork, heavily blurred and scrimmed, filling its card.
 * `strength` is how much of the page colour is laid back over it.
 */
function ArtBackdrop({
  event,
  strength,
  tint,
}: {
  event: EventItem;
  strength: number;
  /** Scrim colour. Defaults to the page's surface. */
  tint?: string;
}) {
  const { theme } = useBlockTheme();
  const source = getEventImage(event.title) || (event.image_url ? { uri: event.image_url } : null);
  if (!source) return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Image
        source={source}
        style={[StyleSheet.absoluteFill, styles.backdropImage]}
        contentFit="cover"
        blurRadius={36}
      />
      <View
        style={[StyleSheet.absoluteFill, { backgroundColor: tint ?? theme.surfaceElevated, opacity: strength }]}
      />
    </View>
  );
}

/** "Technical" / "Non-Technical" / "Non Technical" → a short tile tag. */
function categoryTag(type?: string) {
  const t = (type ?? "").toLowerCase().replace(/[^a-z]/g, "");
  if (t === "technical") return "TECH";
  if (t === "nontechnical") return "NON-TECH";
  return (type ?? "EVENT").toUpperCase();
}

function EventArt({ event, size }: { event: EventItem; size: number }) {
  const source = getEventImage(event.title) || (event.image_url ? { uri: event.image_url } : null);
  if (!source) return null;
  return <Image source={source} style={{ width: size, height: size }} contentFit="contain" />;
}

function LineupRow({ event, first, onPress }: { event: EventItem; first: boolean; onPress: () => void }) {
  const { theme } = useBlockTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border },
        pressed && { backgroundColor: theme.surface },
      ]}
      accessibilityRole="button"
      accessibilityLabel={event.title}
    >
      <Text style={[styles.rowTime, { color: theme.textDim }]} numberOfLines={1}>
        {event.from_time || "TBA"}
      </Text>
      <View style={styles.rowBody}>
        <Text style={[styles.rowTitle, { color: theme.text }]} numberOfLines={1}>
          {event.title}
        </Text>
        {event.venue ? (
          <Text style={[styles.meta, { color: theme.textDim }]} numberOfLines={1}>
            {event.venue}
          </Text>
        ) : null}
      </View>
      <McGlyph name="chevronRight" size={px(11)} color={theme.textDim} />
    </Pressable>
  );
}

/** Full-screen lineup editor. A plain checklist: art, name, type, tick. */
function LineupPicker({
  visible,
  events,
  selected,
  onToggle,
  onClose,
  roleLabel,
}: {
  visible: boolean;
  events: EventItem[];
  selected: string[];
  onToggle: (id: string) => void;
  onClose: () => void;
  roleLabel: string;
}) {
  const { theme } = useBlockTheme();
  const surface = useSurface();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.pickerRoot, { backgroundColor: theme.background }]}>
        <View style={[styles.pickerHead, { borderBottomColor: theme.border }]}>
          <View>
            <Text style={[styles.pickerTitle, { color: theme.text }]}>Your lineup</Text>
            <Text style={[styles.meta, { color: theme.textDim }]}>
              {selected.length} selected · {roleLabel}
            </Text>
          </View>
          <Pressable onPress={onClose} hitSlop={px(10)} accessibilityRole="button">
            {({ pressed }) => (
              <Text style={[styles.pickerDone, { color: theme.primary, opacity: pressed ? 0.6 : 1 }]}>
                Done
              </Text>
            )}
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + px(space.xl) }}>
          {events.map((ev, i) => {
            const on = selected.includes(ev.id);
            return (
              <Pressable
                key={ev.id}
                onPress={() => onToggle(ev.id)}
                style={({ pressed }) => [
                  styles.pickerRow,
                  i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border },
                  pressed && { backgroundColor: theme.surfaceElevated },
                ]}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityLabel={ev.title}
              >
                <View style={[styles.pickerArt, { backgroundColor: surface.slot }]}>
                  <EventArt event={ev} size={px(34)} />
                </View>
                <View style={styles.rowBody}>
                  <Text style={[styles.rowTitle, { color: theme.text }]} numberOfLines={1}>
                    {ev.title}
                  </Text>
                  <Text style={[styles.meta, { color: theme.textDim }]} numberOfLines={1}>
                    {[ev.type, ev.from_time].filter(Boolean).join(" · ")}
                  </Text>
                </View>
                <View
                  style={[
                    styles.check,
                    on
                      ? { backgroundColor: mojang.green5, borderColor: mojang.green5 }
                      : { borderColor: theme.border },
                  ]}
                >
                  {on ? <McGlyph name="check" size={px(11)} color="#ffffff" /> : null}
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: { height: HERO_H, overflow: "hidden" },
  heroFoot: { position: "absolute", left: 0, right: 0, bottom: 0, height: px(6) },

  heroCopy: {
    position: "absolute",
    left: px(space.xl),
    right: px(space.xl),
    bottom: px(space.lg),
  },
  /**
   * The character's plane. Right-aligned, feet on the hero's floor, a little
   * under half the hero tall — large enough to be the subject, small enough to
   * leave the headline its own column.
   */
  heroCharacter: {
    position: "absolute",
    right: -px(12),
    bottom: px(4),
    height: HERO_H * 0.44,
    width: HERO_H * 0.44 * 0.72,
  },
  heroEyebrow: {
    fontFamily: fonts.bodyBold,
    fontSize: px(12),
    letterSpacing: px(1.2),
  },
  /*
   * A small greeting over a large name. At 34pt "Welcome back," wrapped inside
   * its column and the lockup ran to three lines, which pushed the whole block
   * up onto art that had not faded yet.
   */
  heroGreeting: {
    fontFamily: fonts.bodyMedium,
    fontSize: px(22),
    letterSpacing: -0.4,
    marginTop: px(8),
  },
  heroTitle: {
    fontFamily: fonts.bodyBold,
    maxWidth: "64%",
  },
  heroName: {
    fontSize: px(52),
    lineHeight: px(56),
    letterSpacing: -1.8,
  },
  heroSub: {
    fontFamily: fonts.body,
    fontSize: px(15),
    lineHeight: px(21),
    marginTop: px(8),
    maxWidth: "62%",
  },
  heroActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: px(space.xl),
    marginTop: px(space.lg),
  },

  cta: {
    borderWidth: px(2),
    borderColor: "#000000",
    backgroundColor: "#000000",
  },
  ctaFace: {
    flexDirection: "row",
    alignItems: "center",
    gap: px(10),
    backgroundColor: mojang.green5,
    paddingLeft: px(14),
    paddingRight: px(16),
    paddingVertical: px(12),
    borderTopWidth: px(3),
    borderLeftWidth: px(3),
    borderBottomWidth: px(3),
    borderRightWidth: px(3),
    borderTopColor: mojang.green3,
    borderLeftColor: mojang.green4,
    borderBottomColor: mojang.green6,
    borderRightColor: mojang.green6,
  },
  /** Pressed: the bevel inverts, so the face reads as pushed in. */
  ctaFacePressed: {
    backgroundColor: mojang.green6,
    borderTopColor: "#1d4a14",
    borderLeftColor: "#1d4a14",
    borderBottomColor: mojang.green5,
    borderRightColor: mojang.green5,
  },
  ctaLip: { backgroundColor: "#1d4a14" },
  ctaLabel: {
    fontFamily: fonts.pixelBold,
    fontSize: px(13),
    letterSpacing: px(0.5),
    color: "#ffffff",
  },

  textButton: { flexDirection: "row", alignItems: "center", gap: px(6) },
  textButtonLabel: { fontFamily: fonts.bodyBold, fontSize: px(14) },

  body: { paddingHorizontal: px(space.xl) },

  sectionHead: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginTop: px(space.xl),
    marginBottom: px(space.md),
  },
  sectionLead: { flexDirection: "row", alignItems: "center", gap: px(10) },
  sectionTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: px(19),
    letterSpacing: -0.3,
  },
  sectionAction: { fontFamily: fonts.bodyBold, fontSize: px(14) },

  stats: {
    flexDirection: "row",
    alignItems: "stretch",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 0,
    marginTop: px(space.sm),
  },
  stat: { flex: 1, alignItems: "center", paddingTop: px(16), paddingBottom: px(12) },
  statRule: { width: StyleSheet.hairlineWidth, marginVertical: px(14) },
  /** Vanilla's slot highlight: white at half strength over the item. */
  statHover: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: "rgba(255,255,255,0.4)" },
  /** The stack count: bottom-right, overhanging the item, white with shadow. */
  statCount: {
    position: "absolute",
    right: px(3),
    bottom: px(1),
    fontFamily: fonts.pixelBold,
    fontSize: px(17),
    color: "#ffffff",
  },
  statLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: px(10.5),
    letterSpacing: px(1.2),
    marginTop: px(10),
  },

  feature: {
    flexDirection: "row",
    alignItems: "center",
    gap: px(space.lg),
    padding: px(space.md),
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 0,
    overflow: "hidden",
  },
  featureArt: {
    width: px(104),
    height: px(104),
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 0,
    borderWidth: StyleSheet.hairlineWidth,
  },
  /** Oversized so the blur has no soft edge inside the card. */
  backdropImage: { transform: [{ scale: 1.6 }] },
  featureBody: { flex: 1, minWidth: 0 },
  featureTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: px(20),
    letterSpacing: -0.3,
    marginTop: px(4),
  },

  metaCaps: { fontFamily: fonts.bodyBold, fontSize: px(11), letterSpacing: px(1) },
  meta: { fontFamily: fonts.body, fontSize: px(13), marginTop: px(3) },

  list: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 0 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: px(space.md),
    paddingHorizontal: px(space.md),
    paddingVertical: px(14),
  },
  rowTime: {
    width: px(64),
    fontFamily: fonts.bodyMedium,
    fontSize: px(13),
    fontVariant: ["tabular-nums"],
  },
  rowBody: { flex: 1, minWidth: 0 },
  rowTitle: { fontFamily: fonts.bodyBold, fontSize: px(15) },
  emptyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: px(space.md),
    padding: px(space.md),
  },
  emptyText: { flex: 1, minWidth: 0 },
  emptyAction: { fontFamily: fonts.bodyBold, fontSize: px(14) },

  tiles: { gap: px(space.md), paddingRight: px(space.xl) },
  tile: { width: TILE_W, borderWidth: StyleSheet.hairlineWidth, borderRadius: 0 },
  tileArt: {
    width: "100%",
    height: TILE_W,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  tileTag: {
    position: "absolute",
    top: px(8),
    left: px(8),
    paddingHorizontal: px(6),
    paddingVertical: px(3),
    backgroundColor: "rgba(0,0,0,0.62)",
  },
  tileTagText: {
    fontFamily: fonts.bodyBold,
    fontSize: px(9.5),
    letterSpacing: px(1),
    color: "#ffffff",
  },
  tileBody: { padding: px(10) },
  tileTitle: { fontFamily: fonts.bodyBold, fontSize: px(14) },

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
    gap: px(12),
    paddingHorizontal: px(space.lg),
  },
  barSolid: { borderBottomWidth: StyleSheet.hairlineWidth },
  barTitle: { fontFamily: fonts.bodyBold, fontSize: px(16) },
  avatar: {
    width: px(36),
    height: px(36),
    borderRadius: 0,
    overflow: "hidden",
    borderWidth: px(1.5),
    borderColor: "rgba(255,255,255,0.75)",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  avatarImage: { width: "100%", height: "180%" },

  pickerRoot: { flex: 1 },
  pickerHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: px(space.xl),
    paddingTop: px(space.xl),
    paddingBottom: px(space.md),
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pickerTitle: { fontFamily: fonts.bodyBold, fontSize: px(22), letterSpacing: -0.4 },
  pickerDone: { fontFamily: fonts.bodyBold, fontSize: px(16) },
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: px(space.md),
    paddingHorizontal: px(space.xl),
    paddingVertical: px(12),
  },
  pickerArt: {
    width: px(44),
    height: px(44),
    alignItems: "center",
    justifyContent: "center",
  },
  check: {
    width: px(24),
    height: px(24),
    borderWidth: px(1.5),
    borderRadius: 0,
    alignItems: "center",
    justifyContent: "center",
  },
});
