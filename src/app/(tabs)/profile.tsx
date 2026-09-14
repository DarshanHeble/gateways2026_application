import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Dimensions,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Pressable,
  PanResponder,
} from "react-native";
import { PixelToast } from "@/components/pixel/PixelToast";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  cancelAnimation,
  Easing,
  FadeInDown,
  FadeInUp,
  runOnJS,
  withSpring,
  SharedValue,
} from "react-native-reanimated";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { fonts } from "@/theme/tokens";
import { px } from "@/theme/scale";
import { useAuth } from "@/features/auth/AuthContext";
import { useM3Theme, M3ShapeDefinition } from "@/theme/M3ThemeContext";
import { coverScreen, revealScreen } from "@/features/splash/chunkTransition";
import { API_BASE_URL, apiClient } from "@/services/api";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

export interface MinecraftSkin {
  id: string;
  name: string;
  title: string;
  element: string;
  badge: string;
  themeColor: string;
  source: any;
  perk: string;
}

export const MINECRAFT_SKINS: MinecraftSkin[] = [
  {
    id: "archer_gold",
    name: "Blaze Archer",
    title: "Master Marksman",
    element: "Fire & Gold",
    badge: "🏹 RANGED",
    themeColor: "#ffd25e",
    source: require("../../../assets/images/characters/archer_gold.png"),
    perk: "+20% Precision in Coding Competitions",
  },
  {
    id: "archer_blue",
    name: "Storm Archer",
    title: "Lightning Striker",
    element: "Storm Blue",
    badge: "⚡ LIGHTNING",
    themeColor: "#63d9e8",
    source: require("../../../assets/images/characters/archer_blue.png"),
    perk: "+15% Velocity in Hackathons",
  },
  {
    id: "adventurer",
    name: "Alex Explorer",
    title: "Wilderness Pathfinder",
    element: "Emerald Earth",
    badge: "🧭 PATHFINDER",
    themeColor: "#3ee89a",
    source: require("../../../assets/images/characters/adventurer.png"),
    perk: "+25% Synergy in Team Events",
  },
  {
    id: "runner_pickaxe",
    name: "Diamond Miner",
    title: "Deep Delver",
    element: "Diamond Core",
    badge: "⛏️ MINER",
    themeColor: "#52a3c4",
    source: require("../../../assets/images/characters/runner_pickaxe.png"),
    perk: "+30% Resourcefulness in Debugging",
  },
];

interface UserProfileData {
  fullName: string;
  email: string;
  participantId: string;
  collegeName: string;
  department: string;
  phone: string;
  foodPref: "Veg" | "Non-Veg" | "Jain";
  tshirtSize: "S" | "M" | "L" | "XL" | "XXL";
  skinId: string;
}

const DEFAULT_PROFILE: UserProfileData = {
  fullName: "Steve Crafter",
  email: "participant@gateways2026.in",
  participantId: "GW26-4091",
  collegeName: "Christ (Deemed to be University)",
  department: "Department of Computer Science",
  phone: "+91 98765 43210",
  foodPref: "Veg",
  tshirtSize: "L",
  skinId: "archer_gold",
};

const STORAGE_PROFILE_KEY = "@gateways_user_profile_v1";

// Mini shape silhouette renderer matching index.tsx
function renderMiniGlyph(category: string, color: string, isSelected: boolean) {
  const bg = isSelected ? "#070b12" : color;
  switch (category) {
    case "Pill":
      return <View style={{ width: 8, height: 16, borderRadius: 4, backgroundColor: bg }} />;
    case "Squircle":
      return <View style={{ width: 13, height: 13, borderRadius: 4.5, backgroundColor: bg }} />;
    case "Flower":
      return (
        <View
          style={{
            width: 14,
            height: 14,
            borderTopLeftRadius: 7,
            borderTopRightRadius: 1.5,
            borderBottomRightRadius: 7,
            borderBottomLeftRadius: 1.5,
            backgroundColor: bg,
          }}
        />
      );
    case "Gem":
      return (
        <View
          style={{
            width: 11,
            height: 11,
            borderRadius: 1.5,
            transform: [{ rotate: "45deg" }],
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

// 6 non-circular flanking positions around avatar
const FLANKING_POSITIONS = [
  { x: -px(150), y: -px(96) }, // 0: Upper Left (Stadium Pill)
  { x: -px(162), y: px(4) },   // 1: Mid Left (Soft Squircle)
  { x: -px(146), y: px(106) }, // 2: Lower Left (Clover Flower)
  { x: px(150), y: -px(96) },  // 3: Upper Right (Faceted Gem)
  { x: px(162), y: px(4) },    // 4: Mid Right (Solar Burst)
  { x: px(146), y: px(106) },  // 5: Lower Right (Full Circle)
];

// Floating satellite pod component
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
            backgroundColor: isSelected ? item.seedColor : "rgba(10, 15, 26, 0.94)",
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

export default function ProfileTab() {
  const insets = useSafeAreaInsets();
  const { role, logout } = useAuth();
  const { activeShape, setShapeById, shapes, theme } = useM3Theme();

  const [profile, setProfile] = useState<UserProfileData>(DEFAULT_PROFILE);
  const [activeSkin, setActiveSkin] = useState<MinecraftSkin>(MINECRAFT_SKINS[0]);
  const [skinModalVisible, setSkinModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  // Floating levitation oscillation
  const floatProgress = useSharedValue(0);
  // Continuous smooth 360° rotation
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

  // Liquid-smooth shape morphing shared values
  const animWidth = useSharedValue(px(activeShape.styleConfig.width * 0.82));
  const animHeight = useSharedValue(px(activeShape.styleConfig.height * 0.82));
  const animTL = useSharedValue(px(activeShape.styleConfig.borderTopLeftRadius * 0.82));
  const animTR = useSharedValue(px(activeShape.styleConfig.borderTopRightRadius * 0.82));
  const animBR = useSharedValue(px(activeShape.styleConfig.borderBottomRightRadius * 0.82));
  const animBL = useSharedValue(px(activeShape.styleConfig.borderBottomLeftRadius * 0.82));

  useEffect(() => {
    const timingConf = { duration: 380, easing: Easing.out(Easing.cubic) };
    animWidth.value = withTiming(px(activeShape.styleConfig.width * 0.82), timingConf);
    animHeight.value = withTiming(px(activeShape.styleConfig.height * 0.82), timingConf);
    animTL.value = withTiming(px(activeShape.styleConfig.borderTopLeftRadius * 0.82), timingConf);
    animTR.value = withTiming(px(activeShape.styleConfig.borderTopRightRadius * 0.82), timingConf);
    animBR.value = withTiming(px(activeShape.styleConfig.borderBottomRightRadius * 0.82), timingConf);
    animBL.value = withTiming(px(activeShape.styleConfig.borderBottomLeftRadius * 0.82), timingConf);
  }, [activeShape, animWidth, animHeight, animTL, animTR, animBR, animBL]);

  // Burst layer opacity for M3 Expressive Sunny 8-point rounded star geometry
  const burstLayerOpacity = useSharedValue(activeShape.category === "Burst" ? 1 : 0);
  useEffect(() => {
    burstLayerOpacity.value = withTiming(activeShape.category === "Burst" ? 1 : 0, {
      duration: 320,
      easing: Easing.out(Easing.cubic),
    });
  }, [activeShape, burstLayerOpacity]);

  // Primary rotating centerpiece
  const rotatingShapeStyle = useAnimatedStyle(() => {
    const deg = rotationProgress.value * 360;
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

  // Secondary layer offset by 45° for 8-point Sunny Starburst
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

  // Upright counter-rotating avatar
  const counterRotateAvatarStyle = useAnimatedStyle(() => {
    const deg = -rotationProgress.value * 360;
    return {
      transform: [{ rotate: `${deg}deg` }],
    };
  });

  // Slide down gesture for Skin Selection Modal
  const skinSheetY = useSharedValue(0);

  const closeSkinModal = useCallback(() => {
    setSkinModalVisible(false);
    skinSheetY.value = 0;
  }, [skinSheetY]);

  const skinPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          gestureState.dy > 6 && Math.abs(gestureState.dx) < Math.abs(gestureState.dy),
        onPanResponderMove: (_, gestureState) => {
          if (gestureState.dy > 0) {
            skinSheetY.value = gestureState.dy;
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dy > 110 || gestureState.vy > 0.7) {
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            } catch (_) {}
            skinSheetY.value = withTiming(SCREEN_H * 0.85, { duration: 220 }, (done) => {
              if (done) {
                runOnJS(closeSkinModal)();
              }
            });
          } else {
            skinSheetY.value = withSpring(0, { damping: 18, stiffness: 220 });
          }
        },
      }),
    [closeSkinModal, skinSheetY]
  );

  const animatedSkinSheetStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: skinSheetY.value }],
    };
  });

  useEffect(() => {
    if (skinModalVisible) {
      skinSheetY.value = 0;
    }
  }, [skinModalVisible, skinSheetY]);

  // Load saved profile & avatar on startup
  useEffect(() => {
    async function loadData() {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_PROFILE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setProfile((prev) => ({ ...prev, ...parsed }));
          const skin = MINECRAFT_SKINS.find((s) => s.id === parsed.skinId);
          if (skin) setActiveSkin(skin);
        }

        apiClient<{ session?: { email?: string; userId?: string } }>(`${API_BASE_URL}/auth/me`, {
          timeout: 4000,
          skipAuthRedirect: true,
        })
          .then((res) => {
            if (res.data?.session?.email) {
              setProfile((prev) => ({
                ...prev,
                email: res.data.session?.email || prev.email,
                participantId: `GW26-${(res.data.session?.userId || "4091").slice(-4).toUpperCase()}`,
              }));
            }
          })
          .catch(() => {});
      } catch (err) {
        console.warn("Failed to load profile:", err);
      }
    }
    loadData();
  }, []);

  const handleSelectSkin = async (skin: MinecraftSkin) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setActiveSkin(skin);
    const updated = { ...profile, skinId: skin.id };
    setProfile(updated);
    closeSkinModal();
    await AsyncStorage.setItem(STORAGE_PROFILE_KEY, JSON.stringify(updated));
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await AsyncStorage.setItem(STORAGE_PROFILE_KEY, JSON.stringify(profile));

      await apiClient(`${API_BASE_URL}/profile`, {
        method: "POST",
        body: JSON.stringify({
          fullName: profile.fullName,
          phone: profile.phone,
          customCollegeName: profile.collegeName,
          tshirtSize: profile.tshirtSize,
          dietaryPref: profile.foodPref,
        }),
        timeout: 4000,
        skipAuthRedirect: true,
      }).catch(() => {});

      setIsEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      console.warn("Failed to save profile:", e);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    coverScreen(() => {
      logout();
      router.replace("/login");
      setTimeout(revealScreen, 300);
    });
  };

  // Header name tokens
  const rawName = profile.fullName?.trim() || "Steve Crafter";
  const nameParts = rawName.split(/\s+/);
  const firstName = nameParts[0].toUpperCase();
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ").toUpperCase() : "";

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#070b12" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor="#070b12" />

      {/* Atmospheric Radial Gradients Driven by Dynamic M3 Seed Color */}
      <View style={[styles.ambientAuraTop, { backgroundColor: theme.ambientTop }]} />
      <View style={[styles.ambientAuraBottom, { backgroundColor: theme.ambientBottom }]} />

      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Generous top clearance matching Home page */}
        <View style={{ height: Math.max(insets.top, px(24)) + px(22) }} />

        {/* Hero Massive Bold Header */}
        <View style={styles.heroHeaderRow}>
          <View style={styles.titleColumn}>
            <Text style={styles.heroSupTitle}>STAGE IDENTITY,</Text>
            <Text style={styles.heroFirstNameTitle} numberOfLines={1}>
              {firstName}
            </Text>
            {lastName ? (
              <Text style={[styles.heroLastNameTitle, { color: theme.primary }]} numberOfLines={1}>
                {lastName}
              </Text>
            ) : null}
            <Text style={styles.heroSubtitle}>
              {profile.participantId} • {activeSkin.title}
            </Text>
          </View>
        </View>

        {/* The Artistic Centerpiece:
            Smooth 360 rotating centerpiece surrounded by 6 floating shape pods */}
        <View style={styles.artisticCenterpieceWrapper}>
          {/* Subtle Ambient Glow Aura */}
          <View style={[styles.ambientCenterGlow, { backgroundColor: theme.surfaceTint }]} />

          {/* Floating Shape Pods in Left & Right Vertical Flanking Columns */}
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
            onPress={() => setSkinModalVisible(true)}
          >
            {/* Secondary Layer offset by 45° for Material 3 Expressive Sunny Starburst */}
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
              <View style={[styles.capsuleBackGlow, { backgroundColor: theme.primary }]} />
            </Animated.View>

            {/* Rotating Shape Container with Liquid Corner Transitions */}
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
              {/* Dynamic Seed Glow Background */}
              <View style={[styles.capsuleBackGlow, { backgroundColor: theme.primary }]} />

              {/* Character Avatar (Counter-Rotated so character stays upright) */}
              <Animated.View style={[styles.avatarCounterWrap, counterRotateAvatarStyle]}>
                <Image
                  source={activeSkin.source}
                  style={styles.capsuleAvatarImage}
                  contentFit="contain"
                  priority="high"
                />
              </Animated.View>
            </Animated.View>
          </TouchableOpacity>

          {/* Identity Pill at the Base */}
          <View style={[styles.avatarIdentityBadge, { borderColor: theme.rimBorder }]}>
            <Text style={styles.capsuleTagName}>{activeSkin.name.toUpperCase()}</Text>
            <Text style={[styles.capsuleTagRole, { color: theme.primary }]}>
              {role === "team" ? "FEST CREW" : "PARTICIPANT"}
            </Text>
          </View>
        </View>

        {/* Change Skin Action Chip */}
        <TouchableOpacity
          style={[styles.switchSkinPill, { borderColor: theme.rimBorder, backgroundColor: theme.primaryContainer }]}
          activeOpacity={0.8}
          onPress={() => setSkinModalVisible(true)}
        >
          <Ionicons name="sparkles" size={13} color={theme.primary} />
          <Text style={[styles.switchSkinPillText, { color: theme.primary }]}>CHANGE MINECRAFT SKIN</Text>
          <Ionicons name="chevron-forward" size={13} color={theme.primary} />
        </TouchableOpacity>

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

        {/* Success Alert Banner */}
        {saveSuccess && (
          <Animated.View entering={FadeInUp.duration(300)} style={[styles.successBanner, { borderColor: theme.primary }]}>
            <Ionicons name="checkmark-circle" size={18} color={theme.primary} />
            <Text style={[styles.successBannerText, { color: theme.primary }]}>PROFILE UPDATED IN THE REALM</Text>
          </Animated.View>
        )}

        {/* Player Credentials Spotlight Card */}
        <View style={[styles.credentialsCard, { borderColor: theme.rimBorder }]}>
          <View style={styles.credentialsHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.credentialsSectionTitle}>PLAYER CREDENTIALS</Text>
              <Text style={styles.credentialsSubtitle}>Registered festival details & preferences</Text>
            </View>
            <TouchableOpacity
              style={[
                styles.editToggleBtn,
                {
                  backgroundColor: theme.primaryContainer,
                  borderColor: theme.rimBorder,
                },
              ]}
              onPress={() => setIsEditing(!isEditing)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isEditing ? "close-circle-outline" : "create-outline"}
                size={14}
                color={theme.primary}
              />
              <Text style={[styles.editToggleText, { color: theme.primary }]}>
                {isEditing ? "CANCEL" : "EDIT"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Full Name */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>PLAYER / FULL NAME</Text>
            {isEditing ? (
              <TextInput
                style={[styles.inputField, { borderColor: theme.rimBorder }]}
                value={profile.fullName}
                onChangeText={(text) => setProfile((p) => ({ ...p, fullName: text }))}
                placeholder="Enter full name"
                placeholderTextColor="#64748b"
              />
            ) : (
              <Text style={styles.fieldValue}>{profile.fullName}</Text>
            )}
          </View>

          {/* Email (read only) */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>REGISTERED EMAIL</Text>
            <Text style={[styles.fieldValue, { color: theme.primary }]}>{profile.email}</Text>
          </View>

          {/* Phone Number */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>PHONE NUMBER</Text>
            {isEditing ? (
              <TextInput
                style={[styles.inputField, { borderColor: theme.rimBorder }]}
                value={profile.phone}
                onChangeText={(text) => setProfile((p) => ({ ...p, phone: text }))}
                placeholder="+91 00000 00000"
                placeholderTextColor="#64748b"
                keyboardType="phone-pad"
              />
            ) : (
              <Text style={styles.fieldValue}>{profile.phone}</Text>
            )}
          </View>

          {/* College / Institution */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>COLLEGE / INSTITUTION</Text>
            {isEditing ? (
              <TextInput
                style={[styles.inputField, { borderColor: theme.rimBorder }]}
                value={profile.collegeName}
                onChangeText={(text) => setProfile((p) => ({ ...p, collegeName: text }))}
                placeholder="College Name"
                placeholderTextColor="#64748b"
              />
            ) : (
              <Text style={styles.fieldValue}>{profile.collegeName}</Text>
            )}
          </View>

          {/* Department */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>DEPARTMENT / PROGRAM</Text>
            {isEditing ? (
              <TextInput
                style={[styles.inputField, { borderColor: theme.rimBorder }]}
                value={profile.department}
                onChangeText={(text) => setProfile((p) => ({ ...p, department: text }))}
                placeholder="Department"
                placeholderTextColor="#64748b"
              />
            ) : (
              <Text style={styles.fieldValue}>{profile.department}</Text>
            )}
          </View>

          {/* Food Preference Selection */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>DIETARY PREFERENCE</Text>
            {isEditing ? (
              <View style={styles.chipRow}>
                {(["Veg", "Non-Veg", "Jain"] as const).map((pref) => {
                  const isActive = profile.foodPref === pref;
                  return (
                    <TouchableOpacity
                      key={pref}
                      style={[
                        styles.choiceChip,
                        isActive && {
                          backgroundColor: theme.primary,
                          borderColor: theme.primary,
                        },
                      ]}
                      onPress={() => setProfile((p) => ({ ...p, foodPref: pref }))}
                    >
                      <Text
                        style={[
                          styles.choiceChipText,
                          isActive && { color: theme.onPrimary, fontFamily: fonts.bodyBold },
                        ]}
                      >
                        {pref === "Veg" ? "🥗 VEG" : pref === "Non-Veg" ? "🍗 NON-VEG" : "🌿 JAIN"}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <Text style={styles.fieldValue}>
                {profile.foodPref === "Veg"
                  ? "🥗 Vegetarian"
                  : profile.foodPref === "Non-Veg"
                  ? "🍗 Non-Vegetarian"
                  : "🌿 Jain"}
              </Text>
            )}
          </View>

          {/* T-Shirt Size Selection */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>FEST T-SHIRT SIZE</Text>
            {isEditing ? (
              <View style={styles.chipRow}>
                {(["S", "M", "L", "XL", "XXL"] as const).map((size) => {
                  const isActive = profile.tshirtSize === size;
                  return (
                    <TouchableOpacity
                      key={size}
                      style={[
                        styles.sizeChip,
                        isActive && {
                          backgroundColor: theme.primary,
                          borderColor: theme.primary,
                        },
                      ]}
                      onPress={() => setProfile((p) => ({ ...p, tshirtSize: size }))}
                    >
                      <Text
                        style={[
                          styles.sizeChipText,
                          isActive && { color: theme.onPrimary, fontFamily: fonts.bodyBold },
                        ]}
                      >
                        {size}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <Text style={styles.fieldValue}>{profile.tshirtSize}</Text>
            )}
          </View>

          {/* Save Profile Button */}
          {isEditing && (
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: theme.primary }]}
              activeOpacity={0.8}
              onPress={handleSaveProfile}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color={theme.onPrimary} />
              ) : (
                <Text style={[styles.saveBtnText, { color: theme.onPrimary }]}>SAVE PROFILE</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Quick Fest Information Cards */}
        <View style={styles.festInfoGrid}>
          <View style={[styles.festInfoCard, { borderColor: theme.rimBorder }]}>
            <Text style={[styles.festInfoNumber, { color: theme.primary }]}>10 - 11</Text>
            <Text style={styles.festInfoTitle}>OCTOBER 2026</Text>
            <Text style={styles.festInfoSub}>Fest Dates</Text>
          </View>
          <View style={[styles.festInfoCard, { borderColor: theme.rimBorder }]}>
            <Text style={[styles.festInfoNumber, { color: theme.primary }]}>CENTRAL</Text>
            <Text style={styles.festInfoTitle}>CAMPUS</Text>
            <Text style={styles.festInfoSub}>Main Auditorium</Text>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutBtn}
          activeOpacity={0.8}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={18} color="#ff8080" />
          <Text style={styles.logoutBtnText}>LOGOUT FROM REALM</Text>
        </TouchableOpacity>

        {/* Bottom padding to clear floating navigation bar */}
        <View style={{ height: px(115) }} />
      </ScrollView>

      {/* Skin Selection Modal with Slide-Down Gesture */}
      <Modal
        visible={skinModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={closeSkinModal}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeSkinModal} />

          <Animated.View
            style={[
              styles.modalSheet,
              { borderColor: theme.rimBorder },
              animatedSkinSheetStyle,
            ]}
          >
            {/* Draggable Drag Zone */}
            <View {...skinPanResponder.panHandlers} style={styles.modalDragHandleZone}>
              <View style={[styles.modalDragBar, { backgroundColor: theme.primary, opacity: 0.8 }]} />
              <View style={styles.modalHeaderRow}>
                <View>
                  <Text style={styles.modalMainTitle}>Choose Minecraft Skin</Text>
                  <Text style={styles.modalSubTitle}>Equip your live 3D avatar & traits • Swipe down to close</Text>
                </View>
                <TouchableOpacity onPress={closeSkinModal} style={styles.modalCloseBtn} activeOpacity={0.7}>
                  <Ionicons name="close" size={18} color="#cbd5e1" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Skins Grid */}
            <ScrollView
              contentContainerStyle={styles.skinsGrid}
              showsVerticalScrollIndicator={false}
            >
              {MINECRAFT_SKINS.map((skin) => {
                const isSelected = activeSkin.id === skin.id;
                return (
                  <TouchableOpacity
                    key={skin.id}
                    style={[
                      styles.skinCard,
                      isSelected && [
                        styles.skinCardActive,
                        { borderColor: theme.primary, backgroundColor: theme.primaryContainer },
                      ],
                    ]}
                    activeOpacity={0.85}
                    onPress={() => handleSelectSkin(skin)}
                  >
                    {isSelected && (
                      <View style={[styles.activeCheckPill, { backgroundColor: theme.primary }]}>
                        <Text style={[styles.activeCheckPillText, { color: theme.onPrimary }]}>EQUIPPED</Text>
                      </View>
                    )}

                    <View style={styles.skinCardImageWrap}>
                      <Image
                        source={skin.source}
                        style={styles.skinCardImage}
                        contentFit="contain"
                      />
                    </View>

                    <Text style={styles.skinCardName}>{skin.name}</Text>
                    <Text style={[styles.skinCardBadge, { color: theme.primary }]}>
                      {skin.badge}
                    </Text>
                    <Text style={styles.skinCardPerk} numberOfLines={2}>
                      {skin.perk}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: px(20),
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
  heroHeaderRow: {
    marginBottom: px(12),
  },
  titleColumn: {
    width: "100%",
  },
  heroSupTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: px(13),
    fontWeight: "700",
    letterSpacing: 2.2,
    color: "#d6c8aa",
    marginBottom: px(4),
  },
  heroFirstNameTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: px(42),
    lineHeight: px(44),
    fontWeight: "900",
    color: "#ffffff",
    letterSpacing: -1,
  },
  heroLastNameTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: px(42),
    lineHeight: px(44),
    fontWeight: "900",
    letterSpacing: -1,
    marginBottom: px(4),
  },
  heroSubtitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: px(13),
    color: "#8e9ea8",
    marginTop: px(4),
  },
  artisticCenterpieceWrapper: {
    alignItems: "center",
    justifyContent: "center",
    height: px(390),
    position: "relative",
    marginVertical: px(12),
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
    shadowColor: "#000000",
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
    borderWidth: 2,
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
    borderRadius: px(12),
    borderWidth: 1,
  },
  capsuleTagName: {
    fontFamily: fonts.bodyBold,
    fontSize: px(11),
    color: "#e8dec8",
    letterSpacing: 1.2,
  },
  capsuleTagRole: {
    fontFamily: fonts.bodyBold,
    fontSize: px(8.5),
    letterSpacing: 0.8,
    marginTop: px(2),
  },
  switchSkinPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: px(8),
    paddingVertical: px(10),
    paddingHorizontal: px(16),
    borderRadius: px(14),
    borderWidth: 1,
    marginBottom: px(8),
  },
  switchSkinPillText: {
    fontFamily: fonts.bodyBold,
    fontSize: px(11),
    letterSpacing: 0.8,
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
    borderRadius: px(18),
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  shelfGlyphFrame: {
    width: px(24),
    height: px(24),
    borderRadius: px(12),
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  m3ShapeChipText: {
    fontFamily: fonts.bodyMedium,
    fontSize: px(12),
    color: "#c8d1dc",
  },
  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: px(8),
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderRadius: px(10),
    padding: px(12),
    marginBottom: px(12),
  },
  successBannerText: {
    fontFamily: fonts.bodyBold,
    fontSize: px(11),
    letterSpacing: 0.5,
  },
  credentialsCard: {
    backgroundColor: "rgba(17, 24, 39, 0.55)",
    borderWidth: 1,
    borderRadius: px(16),
    padding: px(16),
    gap: px(14),
    marginVertical: px(8),
  },
  credentialsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
    paddingBottom: px(10),
  },
  credentialsSectionTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: px(12),
    color: "#d6c8aa",
    letterSpacing: 1.2,
  },
  credentialsSubtitle: {
    fontFamily: fonts.body,
    fontSize: px(11),
    color: "#8e9ea8",
    marginTop: px(2),
  },
  editToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: px(4),
    paddingHorizontal: px(12),
    paddingVertical: px(5),
    borderRadius: px(12),
    borderWidth: 1,
  },
  editToggleText: {
    fontFamily: fonts.bodyBold,
    fontSize: px(10),
    letterSpacing: 0.5,
  },
  fieldGroup: {
    gap: px(4),
  },
  fieldLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: px(9.5),
    color: "#8e9ea8",
    letterSpacing: 0.8,
  },
  fieldValue: {
    fontFamily: fonts.bodyMedium,
    fontSize: px(13),
    color: "#ffffff",
  },
  inputField: {
    backgroundColor: "rgba(10, 15, 26, 0.9)",
    borderWidth: 1,
    borderRadius: px(8),
    paddingHorizontal: px(12),
    paddingVertical: px(8),
    color: "#ffffff",
    fontFamily: fonts.bodyMedium,
    fontSize: px(13),
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: px(8),
    marginTop: px(4),
  },
  choiceChip: {
    paddingHorizontal: px(14),
    paddingVertical: px(7),
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: px(14),
  },
  choiceChipText: {
    fontFamily: fonts.bodyMedium,
    fontSize: px(11),
    color: "#94a3b8",
  },
  sizeChip: {
    paddingHorizontal: px(16),
    paddingVertical: px(7),
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: px(14),
  },
  sizeChipText: {
    fontFamily: fonts.bodyMedium,
    fontSize: px(11),
    color: "#94a3b8",
  },
  saveBtn: {
    paddingVertical: px(12),
    borderRadius: px(12),
    alignItems: "center",
    marginTop: px(6),
  },
  saveBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: px(12),
    letterSpacing: 1,
  },
  festInfoGrid: {
    flexDirection: "row",
    gap: px(12),
    marginTop: px(8),
  },
  festInfoCard: {
    flex: 1,
    backgroundColor: "rgba(17, 24, 39, 0.55)",
    borderWidth: 1,
    borderRadius: px(14),
    padding: px(14),
    alignItems: "center",
  },
  festInfoNumber: {
    fontFamily: fonts.bodyBold,
    fontSize: px(16),
  },
  festInfoTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: px(10),
    color: "#ffffff",
    letterSpacing: 1,
    marginTop: px(2),
  },
  festInfoSub: {
    fontFamily: fonts.body,
    fontSize: px(11),
    color: "#8e9ea8",
    marginTop: px(2),
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: px(8),
    backgroundColor: "rgba(255, 99, 99, 0.10)",
    borderWidth: 1,
    borderColor: "rgba(255, 99, 99, 0.3)",
    paddingVertical: px(14),
    borderRadius: px(14),
    marginTop: px(14),
  },
  logoutBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: px(12),
    color: "#ff8080",
    letterSpacing: 0.8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.82)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#0d131f",
    borderTopLeftRadius: px(24),
    borderTopRightRadius: px(24),
    borderWidth: 1,
    maxHeight: "85%",
    paddingHorizontal: px(20),
    paddingBottom: px(36),
  },
  modalDragHandleZone: {
    paddingTop: px(10),
    paddingBottom: px(14),
    alignItems: "center",
  },
  modalDragBar: {
    width: px(38),
    height: px(4),
    borderRadius: px(2),
    marginBottom: px(14),
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  modalMainTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: px(18),
    color: "#ffffff",
  },
  modalSubTitle: {
    fontFamily: fonts.body,
    fontSize: px(11),
    color: "#8e9ea8",
    marginTop: px(2),
  },
  modalCloseBtn: {
    width: px(32),
    height: px(32),
    borderRadius: px(16),
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  skinsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: px(12),
    paddingTop: px(6),
    paddingBottom: px(20),
  },
  skinCard: {
    width: (SCREEN_W - px(64)) / 2,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: px(14),
    padding: px(12),
    alignItems: "center",
    position: "relative",
  },
  skinCardActive: {
    borderWidth: 1.8,
  },
  activeCheckPill: {
    position: "absolute",
    top: px(8),
    right: px(8),
    paddingHorizontal: px(6),
    paddingVertical: px(2),
    borderRadius: px(4),
  },
  activeCheckPillText: {
    fontFamily: fonts.bodyBold,
    fontSize: px(8),
    letterSpacing: 0.5,
  },
  skinCardImageWrap: {
    width: px(90),
    height: px(120),
    marginVertical: px(6),
    alignItems: "center",
    justifyContent: "center",
  },
  skinCardImage: {
    width: "100%",
    height: "100%",
  },
  skinCardName: {
    fontFamily: fonts.bodyBold,
    fontSize: px(12),
    color: "#ffffff",
    textAlign: "center",
  },
  skinCardBadge: {
    fontFamily: fonts.bodyBold,
    fontSize: px(9),
    letterSpacing: 0.5,
    marginVertical: px(2),
  },
  skinCardPerk: {
    fontFamily: fonts.body,
    fontSize: px(10),
    color: "#8e9ea8",
    textAlign: "center",
    marginTop: px(2),
  },
});

