import React, { useCallback, useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Modal,
  StatusBar,
  PanResponder,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSpring,
  cancelAnimation,
  Easing,
  interpolateColor,
  runOnJS,
  type SharedValue,
  useAnimatedScrollHandler,
} from "react-native-reanimated";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";

import { px } from "@/theme/scale";
import { fonts } from "@/theme/tokens";
import { useAuth } from "@/features/auth/AuthContext";
import { useM3Theme, M3ShapeDefinition } from "@/theme/M3ThemeContext";
import { fetchEvents, EventItem, MOCK_EVENTS } from "@/services/api";
import { MINECRAFT_SKINS } from "./profile";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

const STORAGE_MY_EVENTS = "@gateways_my_events";
const STORAGE_ACTIVE_EVENT = "@gateways_active_event_id";
const STORAGE_PROFILE_KEY = "@gateways_user_profile_v1";

// Helper to render mini M3 shape silhouette inside satellite orbs and shelf chips
function renderMiniGlyph(category: string, color: string, isSelected: boolean) {
  const bg = isSelected ? "#070b12" : color;
  switch (category) {
    case "Pill":
      return <View style={{ width: 8, height: 16, borderRadius: 4, backgroundColor: bg }} />;
    case "Squircle":
    case "Flower":
      return <View style={{ width: 13, height: 13, borderRadius: 4.5, backgroundColor: bg }} />;
    case "Gem":
      return (
        <View
          style={{
            width: 11,
            height: 11,
            transform: [{ rotate: "45deg" }],
            borderRadius: 1.5,
            backgroundColor: bg,
          }}
        />
      );
    case "Burst":
      return <Ionicons name="sparkles" size={13} color={bg} />;
    case "Circle":
    default:
      return <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: bg }} />;
  }
}

// Non-circular asymmetric flanking positions for floating shape pods
// Exactly 6 shapes: 3 on the left flank, 3 on the right flank
const FLANKING_POSITIONS = [
  { x: -px(150), y: -px(96) }, // 0: Upper Left (Stadium Pill)
  { x: -px(162), y: px(4) },   // 1: Mid Left (Soft Squircle)
  { x: -px(146), y: px(106) }, // 2: Lower Left (Clover Flower)
  { x: px(150), y: -px(96) },  // 3: Upper Right (Faceted Gem)
  { x: px(162), y: px(4) },    // 4: Mid Right (Solar Burst)
  { x: px(146), y: px(106) },  // 5: Lower Right (Full Circle)
];

// Individual Floating Satellite Component with organic gentle levitation dynamics (NON-CIRCULAR)
const FloatingSatellite = React.memo(function FloatingSatellite({
  item,
  index,
  floatProgress,
  isSelected,
  onPress,
}: {
  item: M3ShapeDefinition;
  index: number;
  floatProgress: SharedValue<number>;
  isSelected: boolean;
  onPress: () => void;
}) {
  const pos = FLANKING_POSITIONS[index % FLANKING_POSITIONS.length];
  const phase = index * 1.05;

  const animatedStyle = useAnimatedStyle(() => {
    // Gentle independent floating levitation (hovering in place, non-circular)
    const floatY = Math.sin(floatProgress.value * Math.PI * 2 + phase) * 6;
    const floatX = Math.cos(floatProgress.value * Math.PI * 2 + phase) * 3;

    return {
      transform: [
        { translateX: pos.x + floatX },
        { translateY: pos.y + floatY },
        { scale: isSelected ? 1.25 : 0.95 },
      ],
    };
  });

  return (
    <Animated.View style={[styles.satelliteWrapper, animatedStyle]}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onPress}
        style={[
          styles.satelliteOrb,
          {
            borderColor: item.seedColor,
            backgroundColor: isSelected
              ? item.seedColor
              : "rgba(10, 15, 26, 0.94)",
            shadowColor: item.seedColor,
          },
          isSelected && styles.satelliteOrbActive,
        ]}
      >
        {renderMiniGlyph(item.category, item.seedColor, isSelected)}
      </TouchableOpacity>
    </Animated.View>
  );
});

export default function ModernHomeTab() {
  const insets = useSafeAreaInsets();
  const { role } = useAuth();
  const { activeShape, setShapeById, shapes, theme, isDark, toggleColorMode } = useM3Theme();

  const [allEvents, setAllEvents] = useState<EventItem[]>(MOCK_EVENTS);
  const [myEventIds, setMyEventIds] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [userProfile, setUserProfile] = useState<{
    fullName?: string;
    skinId?: string;
    participantId?: string;
  }>({});
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [pickerModalVisible, setPickerModalVisible] = useState(false);

  // Scroll tracking for collapsible header
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((event: any) => {
    scrollY.value = event.contentOffset.y;
  });

  const HEADER_MAX_HEIGHT = px(480);
  const HEADER_MIN_HEIGHT = px(100) + insets.top;
  const SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;

  const animatedHeaderStyle = useAnimatedStyle(() => {
    const height = Math.max(HEADER_MIN_HEIGHT, HEADER_MAX_HEIGHT - scrollY.value);
    return {
      height,
    };
  });

  const animatedHeroTextStyle = useAnimatedStyle(() => {
    const opacity = Math.max(0, 1 - scrollY.value / (SCROLL_DISTANCE * 0.4));
    const scale = Math.max(0.8, 1 - scrollY.value / SCROLL_DISTANCE * 0.2);
    const translateY = -(scrollY.value * 0.3);
    return {
      opacity,
      transform: [{ scale }, { translateY }],
    };
  });

  const animatedSatellitesStyle = useAnimatedStyle(() => {
    const opacity = Math.max(0, 1 - scrollY.value / (SCROLL_DISTANCE * 0.3));
    return {
      opacity,
      display: opacity === 0 ? "none" : "flex",
    };
  });

  const animatedAvatarContainerStyle = useAnimatedStyle(() => {
    const progress = Math.min(1, Math.max(0, scrollY.value / SCROLL_DISTANCE));
    const scale = 1 - progress * 0.55; 
    const translateY = -(progress * px(160)); 
    const translateX = progress * px(120);

    return {
      transform: [
        { translateX },
        { translateY },
        { scale },
      ],
    };
  });

  // Gesture slide-down to close for Pick Events Modal
  const pickerSheetY = useSharedValue(0);

  const closePickerModal = useCallback(() => {
    setPickerModalVisible(false);
    pickerSheetY.value = 0;
  }, [pickerSheetY]);

  const pickerPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          gestureState.dy > 6 && Math.abs(gestureState.dx) < Math.abs(gestureState.dy),
        onPanResponderMove: (_, gestureState) => {
          if (gestureState.dy > 0) {
            pickerSheetY.value = gestureState.dy;
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dy > 110 || gestureState.vy > 0.7) {
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            } catch (_) {}
            pickerSheetY.value = withTiming(SCREEN_H * 0.85, { duration: 220 }, (done) => {
              if (done) {
                runOnJS(closePickerModal)();
              }
            });
          } else {
            pickerSheetY.value = withSpring(0, { damping: 18, stiffness: 220 });
          }
        },
      }),
    [closePickerModal, pickerSheetY]
  );

  const animatedPickerSheetStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: pickerSheetY.value }],
    };
  });

  useEffect(() => {
    if (pickerModalVisible) {
      pickerSheetY.value = 0;
    }
  }, [pickerModalVisible, pickerSheetY]);

  // Gesture slide-down to close for Event Detail Modal
  const detailSheetY = useSharedValue(0);

  const closeDetailModal = useCallback(() => {
    setDetailModalVisible(false);
    detailSheetY.value = 0;
  }, [detailSheetY]);

  const detailPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          gestureState.dy > 6 && Math.abs(gestureState.dx) < Math.abs(gestureState.dy),
        onPanResponderMove: (_, gestureState) => {
          if (gestureState.dy > 0) {
            detailSheetY.value = gestureState.dy;
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dy > 110 || gestureState.vy > 0.7) {
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            } catch (_) {}
            detailSheetY.value = withTiming(SCREEN_H * 0.85, { duration: 220 }, (done) => {
              if (done) {
                runOnJS(closeDetailModal)();
              }
            });
          } else {
            detailSheetY.value = withSpring(0, { damping: 18, stiffness: 220 });
          }
        },
      }),
    [closeDetailModal, detailSheetY]
  );

  const animatedDetailSheetStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: detailSheetY.value }],
    };
  });

  useEffect(() => {
    if (detailModalVisible) {
      detailSheetY.value = 0;
    }
  }, [detailModalVisible, detailSheetY]);

  // Floating levitation oscillation (gentle up and down floating, no 360 revolving)
  const floatProgress = useSharedValue(0);
  // Continuous smooth 360° rotation for the main shape container
  const rotationProgress = useSharedValue(0);

  useEffect(() => {
    floatProgress.value = withRepeat(
      withTiming(1, { duration: 3200, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, [floatProgress]);

  useEffect(() => {
    cancelAnimation(rotationProgress);
    rotationProgress.value = 0;
    rotationProgress.value = withRepeat(
      withTiming(1, { duration: 18000, easing: Easing.linear }),
      -1,
      false
    );
  }, [rotationProgress]);

  // Liquid-smooth shape morphing shared values (interpolates dimensions & radii without layout thrashing)
  const animWidth = useSharedValue(px(activeShape.styleConfig.width * 0.82));
  const animHeight = useSharedValue(px(activeShape.styleConfig.height * 0.82));
  const animTL = useSharedValue(px(activeShape.styleConfig.borderTopLeftRadius * 0.82));
  const animTR = useSharedValue(px(activeShape.styleConfig.borderTopRightRadius * 0.82));
  const animBR = useSharedValue(px(activeShape.styleConfig.borderBottomRightRadius * 0.82));
  const animBL = useSharedValue(px(activeShape.styleConfig.borderBottomLeftRadius * 0.82));

  // Trigger smooth, non-bouncy transition on shape morph
  useEffect(() => {
    const timingConf = { duration: 380, easing: Easing.out(Easing.cubic) };
    animWidth.value = withTiming(px(activeShape.styleConfig.width * 0.82), timingConf);
    animHeight.value = withTiming(px(activeShape.styleConfig.height * 0.82), timingConf);
    animTL.value = withTiming(px(activeShape.styleConfig.borderTopLeftRadius * 0.82), timingConf);
    animTR.value = withTiming(px(activeShape.styleConfig.borderTopRightRadius * 0.82), timingConf);
    animBR.value = withTiming(px(activeShape.styleConfig.borderBottomRightRadius * 0.82), timingConf);
    animBL.value = withTiming(px(activeShape.styleConfig.borderBottomLeftRadius * 0.82), timingConf);
  }, [activeShape, animWidth, animHeight, animTL, animTR, animBR, animBL]);

  // Burst layer opacity for M3 Expressive Sunny / SoftBurst 8-point rounded star geometry
  const burstLayerOpacity = useSharedValue(activeShape.category === "Burst" ? 1 : 0);
  useEffect(() => {
    burstLayerOpacity.value = withTiming(activeShape.category === "Burst" ? 1 : 0, {
      duration: 320,
      easing: Easing.out(Easing.cubic),
    });
  }, [activeShape, burstLayerOpacity]);

  const isCircle = activeShape.category === "Circle";

  // Central shape smoothly rotates 360° without bounce or vertical wobble
  // For circle shapes, rotation produces no visible change but causes subpixel rasterization flicker
  const rotatingShapeStyle = useAnimatedStyle(() => {
    const deg = isCircle ? 0 : rotationProgress.value * 360;
    return {
      width: animWidth.value,
      height: animHeight.value,
      borderTopLeftRadius: animTL.value,
      borderTopRightRadius: animTR.value,
      borderBottomRightRadius: animBR.value,
      borderBottomLeftRadius: animBL.value,
      transform: [{ rotate: `${deg}deg` }],
    };
  });

  // Secondary layer offset by 45° to form the Material 3 Expressive Sunny 8-pointed starburst
  const burstSecondaryStyle = useAnimatedStyle(() => {
    const deg = rotationProgress.value * 360 + 45;
    return {
      width: animWidth.value,
      height: animHeight.value,
      borderTopLeftRadius: animTL.value,
      borderTopRightRadius: animTR.value,
      borderBottomRightRadius: animBR.value,
      borderBottomLeftRadius: animBL.value,
      opacity: burstLayerOpacity.value,
      transform: [{ rotate: `${deg}deg` }],
    };
  });

  // Avatar inside stays strictly upright by counter-rotating by exact negative angle
  const counterRotateAvatarStyle = useAnimatedStyle(() => {
    const deg = isCircle ? 0 : -rotationProgress.value * 360;
    return {
      transform: [{ rotate: `${deg}deg` }],
    };
  });

  // Load events and user preferences
  const loadData = useCallback(async (isMounted?: () => boolean) => {
    try {
      const res = await fetchEvents();
      if (isMounted && !isMounted()) return;
      if (res.data && res.data.length > 0) {
        setAllEvents(res.data);
      }

      const storedEvents = await AsyncStorage.getItem(STORAGE_MY_EVENTS);
      if (isMounted && !isMounted()) return;
      let parsedIds: string[] = [];
      if (storedEvents) {
        try {
          parsedIds = JSON.parse(storedEvents);
          setMyEventIds(parsedIds);
        } catch {}
      }

      const activeId = await AsyncStorage.getItem(STORAGE_ACTIVE_EVENT);
      if (isMounted && !isMounted()) return;
      if (activeId && parsedIds.length > 0) {
        const foundIdx = parsedIds.indexOf(activeId);
        if (foundIdx >= 0) setActiveIndex(foundIdx);
      }

      const profileData = await AsyncStorage.getItem(STORAGE_PROFILE_KEY);
      if (isMounted && !isMounted()) return;
      if (profileData) {
        try {
          setUserProfile(JSON.parse(profileData));
        } catch {}
      }
    } catch (e) {
      console.warn("Error loading home data:", e);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    loadData(() => mounted);
    return () => {
      mounted = false;
    };
  }, [loadData]);

  // Derived list of participating events
  const participatingEvents = allEvents.filter((ev) => myEventIds.includes(ev.id));
  const activeEvent: EventItem | undefined =
    participatingEvents.length > 0
      ? participatingEvents[activeIndex % participatingEvents.length]
      : allEvents[0];

  // User avatar skin
  const userSkin =
    MINECRAFT_SKINS.find((s) => s.id === userProfile.skinId) || MINECRAFT_SKINS[0];

  // Clean user name display without fake 'PARTICIPANT GATEWAYS'
  const rawName = userProfile.fullName?.trim() || "Steve Crafter";
  const nameParts = rawName.split(/\s+/);
  const firstName = nameParts[0].toUpperCase();
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ").toUpperCase() : "";

  const toggleParticipate = async (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    let updated: string[];
    if (myEventIds.includes(id)) {
      updated = myEventIds.filter((item) => item !== id);
    } else {
      updated = [...myEventIds, id];
      await AsyncStorage.setItem(STORAGE_ACTIVE_EVENT, id);
    }
    setMyEventIds(updated);
    await AsyncStorage.setItem(STORAGE_MY_EVENTS, JSON.stringify(updated));
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#070b12" />

      {/* Atmospheric Radial Gradients Driven by Dynamic M3 Seed Color */}
      <View style={[styles.ambientAuraTop, { backgroundColor: theme.ambientTop }]} />
      <View style={[styles.ambientAuraBottom, { backgroundColor: theme.ambientBottom }]} />

      <Animated.ScrollView
        style={styles.scroll}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Generous top padding to clear status bar and notch */}
        <View style={{ height: Math.max(insets.top, px(24)) + px(22) }} />

        {/* Massive Bold Header (Participant Name) */}
        <Animated.View style={[styles.heroHeaderRow, animatedHeroTextStyle, { paddingTop: Math.max(insets.top, px(24)) + px(16), flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }]}>
          <View style={styles.titleColumn}>
            <Text style={styles.heroSupTitle}>WELCOME BACK,</Text>
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: px(6) }}>
              <Text style={styles.heroFirstNameTitle} numberOfLines={1}>
                {firstName}
              </Text>
              {lastName ? (
                <Text style={[styles.heroLastNameTitle, { color: theme.primary }]} numberOfLines={1}>
                  {lastName}
                </Text>
              ) : null}
            </View>
            <Text style={styles.heroSubtitle}>
              {participatingEvents.length > 0
                ? `${participatingEvents.length} event${participatingEvents.length > 1 ? "s" : ""} lined up for you`
                : "Your personal stage is ready"}
            </Text>
          </View>

          {/* Dark / Light Mode Switcher */}
          <TouchableOpacity
            style={{
              width: px(38),
              height: px(38),
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)",
              borderColor: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)",
            }}
            activeOpacity={0.7}
            onPress={toggleColorMode}
          >
            <Ionicons
              name={isDark ? "sunny-outline" : "moon-outline"}
              size={18}
              color={theme.primary}
            />
          </TouchableOpacity>
        </Animated.View>

        {/* The Artistic Centerpiece:
            Floating Shapes around the Avatar.
            User can tap floating shapes directly or the shelf below to change shape & theme color! */}
        <View style={styles.artisticCenterpieceWrapper}>
          {/* Subtle Ambient Glow Aura */}
          <View style={[styles.ambientCenterGlow, { backgroundColor: theme.surfaceTint }]} />

          {/* Floating Satellites in Left & Right Vertical Flanking Columns (Non-circular) */}
          {shapes.map((item, idx) => (
            <FloatingSatellite
              key={item.id}
              item={item}
              index={idx}
              floatProgress={floatProgress}
              isSelected={activeShape.id === item.id}
              onPress={() => {
                Haptics.selectionAsync();
                setShapeById(item.id);
              }}
            />
          ))}

          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.capsuleTouchable}
            onPress={() => router.push("/(tabs)/profile" as never)}
          >
            {/* Secondary Layer offset by 45° to render the Material 3 Expressive Sunny 8-Pointed Starburst */}
            {activeShape.category === "Burst" && (
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.floatingCapsuleShape,
                  {
                    position: "absolute",
                    borderColor: theme.primary,
                    shadowColor: theme.primary,
                    backgroundColor: theme.primaryContainer || "#0d131f",
                  },
                  burstSecondaryStyle,
                ]}
              >
                <View
                  style={[
                    styles.capsuleBackGlow,
                    { backgroundColor: theme.primary },
                  ]}
                />
              </Animated.View>
            )}

            {/* The Rotating Avatar Shape Container with Liquid Transitions */}
            <Animated.View
              style={[
                styles.floatingCapsuleShape,
                {
                  borderColor: theme.primary,
                  shadowColor: theme.primary,
                  backgroundColor: theme.primaryContainer || "#0d131f",
                },
                rotatingShapeStyle,
              ]}
            >
              {/* Dynamic Seed Glow Background filling the entire shape */}
              <View
                style={[
                  styles.capsuleBackGlow,
                  { backgroundColor: theme.primary },
                ]}
              />

              {/* Character Avatar (Counter-Rotated so character stays strictly upright) */}
              <Animated.View style={[styles.avatarCounterWrap, counterRotateAvatarStyle]}>
                <Image
                  source={userSkin.source}
                  style={styles.capsuleAvatarImage}
                  contentFit="contain"
                  priority="high"
                />
              </Animated.View>
            </Animated.View>
          </TouchableOpacity>

          {/* Identity Pill at the Base with Dynamic Theme Border */}
          <View style={[styles.avatarIdentityBadge, { borderColor: theme.rimBorder }]}>
            <Text style={styles.capsuleTagName}>{userSkin.name.toUpperCase()}</Text>
            <Text style={[styles.capsuleTagRole, { color: theme.primary }]}>
              {role === "team" ? "FEST CREW" : "PARTICIPANT"}
            </Text>
          </View>
        </View>

        {/* Color Themes & Shapes Selector Shelf */}
        <View style={styles.m3ShapeShelfSection}>
          <View style={styles.m3ShapeShelfHeader}>
            <View style={styles.m3HeaderBadge}>
              <Ionicons name="color-palette" size={13} color={theme.primary} />
              <Text style={[styles.m3ShelfTitle, { color: theme.primary }]}>
                COLOR THEMES & SHAPES
              </Text>
            </View>
            <Text style={styles.m3CurrentTag}>
              {activeShape.name.toUpperCase()}
            </Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.m3ShapeScrollContent}
          >
            {shapes.map((item) => {
              const isSelected = item.id === activeShape.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.m3ShapeChip,
                    isSelected && {
                      borderColor: item.seedColor,
                      backgroundColor: item.palette.primaryContainer,
                      shadowColor: item.seedColor,
                      shadowOpacity: 0.35,
                      shadowRadius: 10,
                      elevation: 6,
                    },
                  ]}
                  activeOpacity={0.78}
                  onPress={() => setShapeById(item.id)}
                >
                  <View
                    style={[
                      styles.shelfGlyphFrame,
                      {
                        borderColor: item.seedColor,
                        backgroundColor: isSelected ? item.seedColor : "rgba(10, 15, 26, 0.9)",
                      },
                    ]}
                  >
                    {renderMiniGlyph(item.category, item.seedColor, isSelected)}
                  </View>
                  <Text
                    style={[
                      styles.m3ShapeChipText,
                      isSelected && {
                        color: "#ffffff",
                        fontFamily: fonts.bodyBold,
                      },
                    ]}
                  >
                    {item.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Modern Event Lineup Deck (Different from regular cards or tables) */}
        <View style={styles.lineupDeckSection}>
          <View style={styles.lineupDeckHeader}>
            <Text style={styles.lineupDeckTitle}>YOUR STAGE LINEUP</Text>
            <TouchableOpacity
              style={[
                styles.managePill,
                {
                  backgroundColor: theme.primaryContainer,
                  borderColor: theme.rimBorder,
                },
              ]}
              activeOpacity={0.75}
              onPress={() => setPickerModalVisible(true)}
            >
              <Ionicons name="filter-outline" size={12} color={theme.primary} />
              <Text style={[styles.managePillText, { color: theme.primary }]}>PICK EVENTS</Text>
            </TouchableOpacity>
          </View>

          {participatingEvents.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.eventPillStrip}
            >
              {participatingEvents.map((ev, idx) => {
                const isActive = ev.id === activeEvent?.id;
                return (
                  <TouchableOpacity
                    key={ev.id}
                    style={[
                      styles.eventPill,
                      isActive && {
                        backgroundColor: theme.primary,
                        borderColor: theme.primary,
                      },
                    ]}
                    activeOpacity={0.8}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setActiveIndex(idx);
                      AsyncStorage.setItem(STORAGE_ACTIVE_EVENT, ev.id);
                    }}
                  >
                    <View
                      style={[
                        styles.eventPillDot,
                        { backgroundColor: isActive ? "#070b12" : theme.primary },
                      ]}
                    />
                    <Text
                      style={[
                        styles.eventPillText,
                        isActive && { color: theme.onPrimary, fontFamily: fonts.bodyBold },
                      ]}
                      numberOfLines={1}
                    >
                      {ev.title}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : (
            <TouchableOpacity
              style={[styles.emptyLineupCard, { borderColor: theme.rimBorder }]}
              activeOpacity={0.85}
              onPress={() => setPickerModalVisible(true)}
            >
              <Ionicons name="sparkles-outline" size={20} color={theme.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.emptyLineupTitle}>No Events Selected</Text>
                <Text style={styles.emptyLineupSub}>
                  Tap here to choose competitions you want to track
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.primary} />
            </TouchableOpacity>
          )}
          {participatingEvents.length > 0 && activeEvent && (
            <TouchableOpacity
              style={[styles.activeEventCard, { borderColor: theme.rimBorder }]}
              activeOpacity={0.85}
              onPress={() => setDetailModalVisible(true)}
            >
              <View style={styles.activeEventLeft}>
                <View style={[styles.activeEventIconWrap, { backgroundColor: theme.primaryContainer }]}>
                  <Ionicons name="information-circle" size={18} color={theme.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.activeEventName} numberOfLines={1}>
                    {activeEvent.title}
                  </Text>
                  <Text style={styles.activeEventDetails} numberOfLines={1}>
                    📍 {activeEvent.venue} • ⏰ {activeEvent.from_time}
                  </Text>
                </View>
              </View>
              <View style={[styles.viewDetailsBtn, { backgroundColor: theme.primaryContainer }]}>
                <Text style={[styles.viewDetailsBtnText, { color: theme.primary }]}>VIEW</Text>
                <Ionicons name="arrow-forward" size={13} color={theme.primary} />
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Generous bottom padding to clear the floating navigation bar */}
        <View style={{ height: px(115) }} />
      </Animated.ScrollView>

      {/* Full Event Details Modal with Slide-Down to Dismiss */}
      <Modal
        visible={detailModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={closeDetailModal}
      >
        <View style={styles.modalOverlay}>
          {/* Backdrop press dismisses sheet */}
          <Pressable style={StyleSheet.absoluteFill} onPress={closeDetailModal} />

          <Animated.View
            style={[
              styles.modalSheet,
              { borderColor: theme.rimBorder },
              animatedDetailSheetStyle,
            ]}
          >
            {/* Draggable Drag Zone */}
            <View {...detailPanResponder.panHandlers} style={styles.modalDragHandleZone}>
              <View style={[styles.modalDragBar, { backgroundColor: theme.primary, opacity: 0.8 }]} />
              <View style={styles.modalHeaderRow}>
                <View style={styles.modalBadgePill}>
                  <Text style={[styles.modalBadgeText, { color: theme.primary }]}>
                    {(activeEvent?.type || "COMPETITION").toUpperCase()}
                  </Text>
                </View>
                <TouchableOpacity onPress={closeDetailModal} style={styles.modalCloseBtn} activeOpacity={0.7}>
                  <Ionicons name="close" size={18} color="#cbd5e1" />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalMainTitle}>{activeEvent?.title}</Text>
              {activeEvent?.subtitle ? (
                <Text style={styles.modalSubTitle}>{activeEvent.subtitle}</Text>
              ) : null}

              {/* Meta Chips */}
              <View style={styles.modalMetaRow}>
                <View style={styles.modalMetaChip}>
                  <Text style={styles.modalMetaChipText}>📅 {activeEvent?.date}</Text>
                </View>
                <View style={styles.modalMetaChip}>
                  <Text style={styles.modalMetaChipText}>
                    ⏰ {activeEvent?.from_time} - {activeEvent?.end_time}
                  </Text>
                </View>
                <View style={styles.modalMetaChip}>
                  <Text style={styles.modalMetaChipText}>📍 {activeEvent?.venue}</Text>
                </View>
              </View>

              {/* Overview */}
              <Text style={styles.modalHeading}>OVERVIEW</Text>
              <Text style={styles.modalParagraph}>
                {activeEvent?.description || "Compete against top participants across colleges."}
              </Text>

              {/* Prizes */}
              {activeEvent?.prizes && (
                <>
                  <Text style={styles.modalHeading}>PRIZES</Text>
                  <View style={styles.prizingContainer}>
                    {activeEvent.prizes.winner && (
                      <Text style={styles.prizingText}>
                        🥇 Winner: {activeEvent.prizes.winner}
                      </Text>
                    )}
                    {activeEvent.prizes.runner_up && (
                      <Text style={styles.prizingText}>
                        🥈 Runner-Up: {activeEvent.prizes.runner_up}
                      </Text>
                    )}
                  </View>
                </>
              )}

              {/* Rules */}
              {activeEvent?.rules && activeEvent.rules.length > 0 && (
                <>
                  <Text style={styles.modalHeading}>RULES & GUIDELINES</Text>
                  {activeEvent.rules.map((r, i) => (
                    <Text key={i} style={styles.ruleItem}>
                      • {r}
                    </Text>
                  ))}
                </>
              )}

              {/* Participation Action */}
              {activeEvent && (
                <TouchableOpacity
                  style={[
                    styles.participateToggleAction,
                    myEventIds.includes(activeEvent.id) && styles.participateToggleActionActive,
                  ]}
                  activeOpacity={0.85}
                  onPress={() => toggleParticipate(activeEvent.id)}
                >
                  <Ionicons
                    name={
                      myEventIds.includes(activeEvent.id)
                        ? "checkmark-circle"
                        : "bookmark-outline"
                    }
                    size={18}
                    color={myEventIds.includes(activeEvent.id) ? "#0a0d14" : "#ffffff"}
                  />
                  <Text
                    style={[
                      styles.participateToggleText,
                      myEventIds.includes(activeEvent.id) && styles.participateToggleTextActive,
                    ]}
                  >
                    {myEventIds.includes(activeEvent.id)
                      ? "IN YOUR STAGE (TAP TO REMOVE)"
                      : "+ ADD TO MY STAGE"}
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      {/* Quick Event Selection Modal with Slide-Down to Dismiss */}
      <Modal
        visible={pickerModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={closePickerModal}
      >
        <View style={styles.modalOverlay}>
          {/* Backdrop press dismisses sheet */}
          <Pressable style={StyleSheet.absoluteFill} onPress={closePickerModal} />

          <Animated.View
            style={[
              styles.modalSheet,
              { maxHeight: "88%", borderColor: theme.rimBorder },
              animatedPickerSheetStyle,
            ]}
          >
            {/* Draggable Drag Handle Zone */}
            <View {...pickerPanResponder.panHandlers} style={styles.modalDragHandleZone}>
              <View style={[styles.modalDragBar, { backgroundColor: theme.primary, opacity: 0.8 }]} />
              <View style={styles.modalHeaderRow}>
                <View>
                  <Text style={styles.modalMainTitle}>Curate Your Lineup</Text>
                  <Text style={styles.modalSubTitle}>
                    {myEventIds.length} selected • Swipe down to close
                  </Text>
                </View>
                <TouchableOpacity onPress={closePickerModal} style={styles.modalCloseBtn} activeOpacity={0.7}>
                  <Ionicons name="close" size={18} color="#cbd5e1" />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: 8 }}>
              {allEvents.map((ev) => {
                const isSelected = myEventIds.includes(ev.id);
                return (
                  <TouchableOpacity
                    key={ev.id}
                    style={[
                      styles.pickerRow,
                      isSelected && [
                        styles.pickerRowSelected,
                        { borderColor: theme.primary, backgroundColor: theme.primaryContainer },
                      ],
                    ]}
                    activeOpacity={0.8}
                    onPress={() => toggleParticipate(ev.id)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.pickerRowTitle, isSelected && { color: theme.primary }]}>
                        {ev.title}
                      </Text>
                      <Text style={styles.pickerRowSub}>
                        {ev.type} • {ev.venue} • {ev.date}
                      </Text>
                    </View>
                    <Ionicons
                      name={isSelected ? "checkmark-circle" : "add-circle-outline"}
                      size={22}
                      color={isSelected ? theme.primary : "#5b6577"}
                    />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#070b12", // Deep charcoal/midnight from Parallax poster
  },
  ambientAuraTop: {
    position: "absolute",
    top: -SCREEN_W * 0.35,
    left: -SCREEN_W * 0.2,
    width: SCREEN_W * 0.95,
    height: SCREEN_W * 0.95,
    borderRadius: SCREEN_W * 0.47,
    backgroundColor: "rgba(91, 162, 184, 0.12)", // Christ Building Glass Cyan
  },
  ambientAuraBottom: {
    position: "absolute",
    bottom: px(60),
    right: -SCREEN_W * 0.3,
    width: SCREEN_W * 0.85,
    height: SCREEN_W * 0.85,
    borderRadius: SCREEN_W * 0.42,
    backgroundColor: "rgba(223, 177, 91, 0.10)", // Parallax Amber Gold
  },
  collapsibleHeaderContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    overflow: "hidden",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: px(20),
  },
  heroHeaderRow: {
    marginBottom: px(12),
    paddingHorizontal: px(20),
  },
  titleColumn: {
    gap: px(2),
  },
  heroSupTitle: {
    fontFamily: fonts.pixelBold,
    fontSize: px(11),
    color: "#8e99a8",
    letterSpacing: px(1),
    marginBottom: px(2),
  },
  heroFirstNameTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: px(36),
    lineHeight: px(40),
    fontWeight: "900",
    color: "#ffffff",
    letterSpacing: -1,
  },
  heroLastNameTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: px(36),
    lineHeight: px(40),
    fontWeight: "900",
    letterSpacing: -1,
  },
  heroSubtitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: px(13),
    color: "#64748b",
    marginTop: px(4),
  },
  artisticCenterpieceWrapper: {
    height: SCREEN_W * 0.9,
    justifyContent: "center",
    alignItems: "center",
    marginTop: px(10),
  },
  ambientCenterGlow: {
    position: "absolute",
    width: px(320),
    height: px(320),
    borderRadius: px(160),
    opacity: 0.35,
  },
  satelliteWrapper: {
    position: "absolute",
    zIndex: 20,
  },
  satelliteOrb: {
    width: px(34),
    height: px(34),
    borderRadius: px(17),
    borderWidth: 1.8,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 8,
  },
  satelliteOrbActive: {
    transform: [{ scale: 1.15 }],
    borderWidth: 2.4,
    shadowOpacity: 0.95,
    shadowRadius: 14,
    elevation: 14,
  },
  capsuleTouchable: {
    width: px(300),
    height: px(300),
    alignItems: "center",
    justifyContent: "center",
  },
  floatingCapsuleShape: {
    overflow: "hidden",
    backgroundColor: "#0d131f",
    position: "relative",
    shadowColor: "#dfb15b",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  capsuleBackGlow: {
    ...StyleSheet.absoluteFill,
    opacity: 0.28,
  },
  avatarCounterWrap: {
    width: px(230),
    height: px(230),
    alignItems: "center",
    justifyContent: "center",
  },
  capsuleAvatarImage: {
    width: "82%",
    height: "82%",
  },
  avatarIdentityBadge: {
    marginTop: px(14),
    alignItems: "center",
    backgroundColor: "rgba(11, 16, 26, 0.92)",
    paddingVertical: px(5),
    paddingHorizontal: px(18),
    borderColor: "rgba(223, 177, 91, 0.35)",
  },
  capsuleTagName: {
    fontFamily: fonts.bodyBold,
    fontSize: px(11),
    color: "#e8dec8", // Sandstone Parchment
    letterSpacing: 1.2,
  },
  capsuleTagRole: {
    fontFamily: fonts.bodyBold,
    fontSize: px(8.5),
    color: "#dfb15b", // Parallax Gold
    letterSpacing: 0.8,
    marginTop: px(2),
  },
  m3ShapeShelfSection: {
    marginVertical: px(12),
  },
  m3ShapeShelfHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: px(10),
  },
  m3HeaderBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: px(6),
  },
  m3ShelfTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: px(10.5),
    letterSpacing: 1.2,
  },
  m3CurrentTag: {
    fontFamily: fonts.bodyMedium,
    fontSize: px(10),
    color: "#8e9ea8",
    letterSpacing: 0.5,
  },
  m3ShapeScrollContent: {
    flexDirection: "row",
    gap: px(8),
    paddingRight: px(10),
  },
  m3ShapeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: px(8),
    paddingHorizontal: px(14),
    paddingVertical: px(8),
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  shelfGlyphFrame: {
    width: px(24),
    height: px(24),
    alignItems: "center",
    justifyContent: "center",
  },
  m3ShapeChipText: {
    fontFamily: fonts.bodyMedium,
    fontSize: px(12),
    color: "#c8d1dc",
  },
  lineupDeckSection: {
    marginTop: px(10),
  },
  lineupDeckHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: px(12),
  },
  lineupDeckTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: px(12),
    color: "#d6c8aa", // Sandstone Parchment
    letterSpacing: 1.2,
  },
  managePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: px(4),
    backgroundColor: "rgba(223, 177, 91, 0.12)",
    borderColor: "rgba(223, 177, 91, 0.28)",
    paddingHorizontal: px(10),
    paddingVertical: px(4),
  },
  managePillText: {
    fontFamily: fonts.bodyBold,
    fontSize: px(10),
    color: "#dfb15b",
    letterSpacing: 0.5,
  },
  eventPillStrip: {
    flexDirection: "row",
    gap: px(8),
  },
  eventPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: px(6),
    paddingHorizontal: px(14),
    paddingVertical: px(8),
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderColor: "rgba(214, 200, 170, 0.16)",
  },
  eventPillActive: {
    backgroundColor: "#dfb15b",
    borderColor: "#dfb15b",
  },
  eventPillDot: {
    width: px(6),
    height: px(6),
  },
  eventPillText: {
    fontFamily: fonts.bodyMedium,
    fontSize: px(12),
    color: "#d6c8aa",
  },
  eventPillTextActive: {
    color: "#070b12",
    fontFamily: fonts.bodyBold,
  },
  emptyLineupCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: px(12),
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderColor: "rgba(223, 177, 91, 0.18)",
    padding: px(14),
  },
  emptyLineupTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: px(13),
    color: "#ffffff",
  },
  emptyLineupSub: {
    fontFamily: fonts.body,
    fontSize: px(11),
    color: "#8e9aa8",
    marginTop: px(1),
  },
  activeEventCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderColor: "rgba(223, 177, 91, 0.3)",
    paddingVertical: px(12),
    paddingHorizontal: px(14),
    marginTop: px(12),
  },
  activeEventLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: px(10),
    flex: 1,
  },
  activeEventIconWrap: {
    width: px(34),
    height: px(34),
    backgroundColor: "rgba(91, 162, 184, 0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  activeEventName: {
    fontFamily: fonts.bodyBold,
    fontSize: px(13),
    color: "#ffffff",
  },
  activeEventDetails: {
    fontFamily: fonts.bodyMedium,
    fontSize: px(11),
    color: "#d6c8aa",
    marginTop: px(2),
  },
  viewDetailsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: px(4),
    backgroundColor: "rgba(91, 162, 184, 0.16)",
    paddingVertical: px(6),
    paddingHorizontal: px(10),
    marginLeft: px(8),
  },
  viewDetailsBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: px(10),
    color: "#5ba2b8",
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#0d131f",
    padding: px(20),
    maxHeight: "80%",
    borderColor: "rgba(223, 177, 91, 0.2)",
  },
  modalDragHandleZone: {
    paddingTop: px(2),
    paddingBottom: px(6),
  },
  modalDragBar: {
    width: px(42),
    height: px(5),
    backgroundColor: "#313845",
    alignSelf: "center",
    marginBottom: px(12),
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: px(10),
  },
  modalCloseBtn: {
    padding: px(6),
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  modalBadgePill: {
    backgroundColor: "rgba(223, 177, 91, 0.16)",
    paddingHorizontal: px(10),
    paddingVertical: px(4),
  },
  modalBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: px(10),
    color: "#dfb15b",
    letterSpacing: 1,
  },
  modalMainTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: px(22),
    color: "#ffffff",
    letterSpacing: -0.4,
  },
  modalSubTitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: px(13),
    color: "#8e9aa8",
    marginTop: px(2),
  },
  modalMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: px(8),
    marginVertical: px(12),
  },
  modalMetaChip: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    paddingHorizontal: px(10),
    paddingVertical: px(6),
  },
  modalMetaChipText: {
    fontFamily: fonts.bodyMedium,
    fontSize: px(11),
    color: "#d0d7de",
  },
  modalHeading: {
    fontFamily: fonts.bodyBold,
    fontSize: px(11),
    color: "#d6c8aa",
    letterSpacing: 1,
    marginTop: px(14),
    marginBottom: px(4),
  },
  modalParagraph: {
    fontFamily: fonts.body,
    fontSize: px(13),
    color: "#c9d1d9",
    lineHeight: px(19),
  },
  prizingContainer: {
    backgroundColor: "rgba(223, 177, 91, 0.1)",
    padding: px(12),
    gap: px(4),
  },
  prizingText: {
    fontFamily: fonts.bodyMedium,
    fontSize: px(12),
    color: "#dfb15b",
  },
  ruleItem: {
    fontFamily: fonts.body,
    fontSize: px(12),
    color: "#8e9aa8",
    marginVertical: px(2),
  },
  participateToggleAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: px(8),
    backgroundColor: "#3a6b35", // Mossy lush green from poster
    paddingVertical: px(14),
    marginTop: px(20),
    marginBottom: px(20),
  },
  participateToggleActionActive: {
    backgroundColor: "#dfb15b",
  },
  participateToggleText: {
    fontFamily: fonts.bodyBold,
    fontSize: px(12),
    color: "#ffffff",
    letterSpacing: 0.5,
  },
  participateToggleTextActive: {
    color: "#070b12",
  },
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    padding: px(14),
    marginBottom: px(8),
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  pickerRowSelected: {
    backgroundColor: "rgba(223, 177, 91, 0.14)",
    borderColor: "#dfb15b",
  },
  pickerRowTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: px(14),
    color: "#ffffff",
  },
  pickerRowSub: {
    fontFamily: fonts.body,
    fontSize: px(11),
    color: "#8e9aa8",
    marginTop: px(2),
  },
});
