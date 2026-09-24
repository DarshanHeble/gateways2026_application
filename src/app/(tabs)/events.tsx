import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
} from "react-native";
import { Image } from "expo-image";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeInDown,
  Layout,
} from "react-native-reanimated";
import { duration, stepped } from "@/theme/motion";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fonts, space, typography } from "@/theme/tokens";
import { mcTextShadow, mojang } from "@/theme/minecraft";
import { px } from "@/theme/scale";
import { DirtBackground, Frame, Grain, McCard, useSurface } from "@/components/mc";
import { useAssetsVersion } from "@/modules/assets";
import { useBlockTheme } from "@/theme/BlockThemeContext";
import { EventItem } from "@/services/api";
import { EventDetailSheet } from "@/components/EventDetailSheet";
import { useAppData } from "@/modules/core/DataProvider";
import { getEventImage } from "@/services/EventAssets";
import { McGlyph, type GlyphName } from "@/components/mc/PixelIcon";

type EventFilterType = "all" | "technical" | "non-technical";


/**
 * A filter, as a widget button.
 *
 * Selected sinks and lights gold; unselected is a plain raised stone button.
 * The three chips were previously three near-identical 20-line blocks that only
 * differed by icon and label, so folding them into one component is what made
 * adding the press state tractable at all.
 */
function FilterChip({
  icon,
  label,
  active,
  activeColor,
  idleColor,
  onPress,
}: {
  icon: GlyphName;
  label: string;
  active: boolean;
  activeColor: string;
  idleColor: string;
  onPress: () => void;
}) {
  const color = active ? activeColor : idleColor;
  const surface = useSurface();
  return (
    <TouchableOpacity
      style={[
        styles.filterChip,
        { backgroundColor: active ? surface.slotActive : surface.stone },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Grain />
      <Frame depth={active ? "gold" : "raised"} />
      <McGlyph name={icon} size={px(13)} color={color} />
      <Text style={[styles.filterChipText, { color }, mcTextShadow(color, 13.5)]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function EventsTab() {
  // Subscribe to the asset registry: `getEventImage`/`resolveAsset` are plain
  // synchronous reads, so without this the screen would keep whatever was
  // resolvable on first render and never pick up a completed download.
  useAssetsVersion();
  const insets = useSafeAreaInsets();
  const { theme } = useBlockTheme();
  const surface = useSurface();

  const { events, eventsLoading: loading, refreshData } = useAppData();
  const [filterType, setFilterType] = useState<EventFilterType>("all");
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [myEvents, setMyEvents] = useState<string[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);

  // The sheet owns its own gesture and animation; this screen only says which
  // event is open.
  const closeBottomSheet = useCallback(() => setSelectedEvent(null), []);

  // Load user bookmarks / registered events
  useEffect(() => {
    AsyncStorage.getItem("@gateways_my_events").then((stored) => {
      if (stored) {
        try {
          setMyEvents(JSON.parse(stored));
        } catch {}
      }
    });
  }, []);




  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  }, [refreshData]);

  const openEventDetails = (item: EventItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedEvent(item);
  };

  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      if (filterType === "all") return true;
      const typeStr = (ev.type || "").toLowerCase();
      if (filterType === "technical") {
        return typeStr.includes("tech") && !typeStr.includes("non");
      }
      if (filterType === "non-technical") {
        return (
          typeStr.includes("non") ||
          typeStr.includes("cultur") ||
          typeStr.includes("gaming") ||
          !typeStr.includes("tech")
        );
      }
      return true;
    });
  }, [events, filterType]);

  const counts = useMemo(() => {
    let tech = 0;
    let nonTech = 0;
    events.forEach((ev) => {
      const typeStr = (ev.type || "").toLowerCase();
      if (typeStr.includes("tech") && !typeStr.includes("non")) {
        tech++;
      } else {
        nonTech++;
      }
    });
    return { all: events.length, tech, nonTech };
  }, [events]);

  // Color tokens depending on Dark/Light mode
  const bgRoot = theme.background;
  const textPrimary = theme.text;
  const textSecondary = theme.textDim;
  const textMuted = mojang.greySoft;

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: bgRoot }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.primary }]}>LOADING FEST EVENTS...</Text>
      </View>
    );
  }

  const FILTERS = [
    { key: "all" as const, icon: "star" as const, label: "ALL", count: counts.all },
    { key: "technical" as const, icon: "filter" as const, label: "TECHNICAL", count: counts.tech },
    {
      key: "non-technical" as const,
      icon: "plus" as const,
      label: "NON-TECHNICAL",
      count: counts.nonTech,
    },
  ];

  return (
    <View style={[styles.root, { backgroundColor: bgRoot, paddingTop: insets.top + px(52) }]}>
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
      {/* Title only. The day/night toggle that sat here duplicated the one in
          Settings, and its corner now belongs to the floating server status. */}
      <View style={styles.topHeader}>
        <Text style={[styles.headerTitle, { color: textPrimary }]}>EVENTS</Text>
      </View>

      {/* Top Filter Bar */}
      <View style={styles.filterBarContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterBar}
        >
          {FILTERS.map(({ key, icon, label, count }) => (
            <FilterChip
              key={key}
              icon={icon}
              label={`${label} (${count})`}
              active={filterType === key}
              activeColor={theme.primary}
              idleColor={textSecondary}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setFilterType(key);
              }}
            />
          ))}
        </ScrollView>
      </View>


      {/* Minimal, Decluttered Events List */}
      <Animated.FlatList
        data={filteredEvents}
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
        renderItem={({ item, index }) => {
          const isRegistered = myEvents.includes(item.id);
          const hasImage = !!(getEventImage(item.title) || item.image_url);

          return (
            <Animated.View
              entering={FadeInDown.delay(index * 45).duration(duration.screen).easing(stepped(5))}
              layout={Layout.duration(duration.quick)}
            >
              {/*
                Artwork in a slot beside the text, not a full-width banner above
                it.

                The badges are circular renders on a transparent ground, so a
                banner the width of the card could only ever be `contain`ed —
                every card led with a wide strip of empty background and you
                could fit two on a screen. Side-by-side is the same composition
                the lineup picker and the Up Next card use, it has no dead space,
                and it doubles the number of events you can scan at once.
              */}
              <McCard
                onPress={() => openEventDetails(item)}
                depth={isRegistered ? "gold" : "raised"}
                fill={isRegistered ? surface.slotActive : theme.surfaceElevated}
                style={styles.eventCard}
                accessibilityLabel={item.title}
              >
                {hasImage ? (
                  <View style={[styles.cardArt, { backgroundColor: surface.slot }]}>
                    <Frame depth="sunken" />
                    <Image
                      source={getEventImage(item.title) || { uri: item.image_url }}
                      style={styles.cardArtImage}
                      contentFit="contain"
                    />
                  </View>
                ) : null}

                <View style={styles.cardBody}>
                  <View style={styles.cardHeader}>
                    <Text style={[styles.itemTitle, { color: textPrimary }]} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <View style={[styles.tagBadge, { backgroundColor: surface.slot }]}>
                      <Frame depth="sunken" />
                      <Text
                        style={[
                          styles.tagText,
                          { color: isRegistered ? theme.primary : textMuted },
                        ]}
                      >
                        {(item.type || "GENERAL").toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  {item.subtitle ? (
                    <Text style={[styles.itemSubtitle, { color: textSecondary }]} numberOfLines={1}>
                      {item.subtitle}
                    </Text>
                  ) : null}

                  <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                      <McGlyph name="clock" size={px(13)} color={textSecondary} />
                      <Text style={[styles.metaText, { color: textSecondary }]}>
                        {item.from_time
                          ? `${item.from_time}${item.end_time ? ` – ${item.end_time}` : ""}`
                          : "Time TBA"}
                      </Text>
                    </View>
                    {item.venue ? (
                      <View style={styles.metaItem}>
                        <McGlyph name="pin" size={px(13)} color={textSecondary} />
                        <Text
                          style={[styles.metaText, { color: textSecondary }]}
                          numberOfLines={1}
                        >
                          {item.venue}
                        </Text>
                      </View>
                    ) : null}
                    {isRegistered ? (
                      <View style={styles.metaItem}>
                        <McGlyph name="check" size={px(13)} color={theme.primary} />
                        <Text style={[styles.metaText, { color: theme.primary }]}>TRACKING</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </McCard>
            </Animated.View>
          );
        }}
      />

      {/* Full Event Details Bottom Sheet Modal */}
      <EventDetailSheet
        visible={!!selectedEvent}
        event={selectedEvent}
        onClose={closeBottomSheet}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: px(14),
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontFamily: fonts.pixelBold,
    fontSize: px(15),
    marginTop: px(12),
    letterSpacing: px(0.8),
  },
  topHeader: {
    marginBottom: px(12),
  },
  headerTitle: {
    fontFamily: typography.pageTitle.fontFamily,
    fontSize: px(typography.pageTitle.fontSize),
    lineHeight: px(typography.pageTitle.lineHeight),
    letterSpacing: typography.pageTitle.letterSpacing,
  },

  // Filter Bar Styles
  filterBarContainer: {
    marginBottom: px(14),
  },
  filterBar: {
    flexDirection: "row",
    gap: px(8),
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: px(6),
    paddingHorizontal: px(14),
    paddingVertical: px(8),
    borderRadius: 0,
    overflow: "hidden",
  },

  filterChipText: {
    fontFamily: fonts.pixelBold,
    fontSize: px(13.5),
    letterSpacing: px(0.5),
  },
  filterChipTextActive: {},

  listContainer: {
    paddingBottom: px(24),
  },

  eventCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: px(space.md),
    marginBottom: px(space.md),
    padding: px(space.md),
  },
  cardArt: {
    width: px(64),
    height: px(64),
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 0,
    overflow: "hidden",
  },
  cardArtImage: { width: "88%", height: "88%" },
  cardBody: { flex: 1, minWidth: 0 },

  itemSubtitle: {
    fontFamily: typography.subtitle.fontFamily,
    fontSize: px(typography.subtitle.fontSize),
    marginTop: px(4),
    marginBottom: px(8),
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: px(12),
    marginTop: px(10),
    paddingTop: px(10),
    borderTopWidth: 1,
    borderTopColor: "rgba(150, 150, 150, 0.15)",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: px(4),
  },
  metaText: {
    fontFamily: typography.caption.fontFamily,
    fontSize: px(typography.caption.fontSize),
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  itemTitle: {
    flex: 1,
    fontFamily: typography.h3.fontFamily,
    fontSize: px(typography.h3.fontSize),
    letterSpacing: typography.h3.letterSpacing,
    paddingRight: px(8),
  },
  tagBadge: {
    paddingVertical: px(3),
    paddingHorizontal: px(7),
    marginLeft: px(space.sm),
    borderRadius: 0,
    overflow: "hidden",
  },
  tagText: {
    fontFamily: typography.tag.fontFamily,
    fontSize: px(typography.tag.fontSize),
    letterSpacing: px(typography.tag.letterSpacing),
  },

  // Modal Bottom Sheet Styles
  participateActionBtnActive: {},

  // Fallback Notice
});
