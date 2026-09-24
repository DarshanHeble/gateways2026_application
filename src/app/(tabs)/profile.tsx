import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
   
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
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  Easing,
  FadeInDown,
  FadeInUp,
  runOnJS,
  SharedValue,
} from "react-native-reanimated";
import { duration, stepped, timing } from "@/theme/motion";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { fonts, typography } from "@/theme/tokens";
import { px } from "@/theme/scale";
import { resolveAsset } from "@/services/assets";
import { useAssetsVersion } from "@/modules/assets";
import { useAuth } from "@/modules/auth";
import { useBlockTheme, BlockTheme } from "@/theme/BlockThemeContext";
import { coverScreen, revealScreen } from "@/modules/splash";
import { API_BASE_URL, apiClient } from "@/services/api";
import { enqueue } from "@/services/offline/outbox";
import { useAppData } from "@/modules/core/DataProvider";
import { McGlyph } from "@/components/mc/PixelIcon";
import { DirtBackground, Frame, Grain, McButton, McSlot, useSurface } from "@/components/mc";
import { Bevel } from "@/components/pixel/Primitives";
import { material, mcTextShadow, mojang } from "@/theme/minecraft";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

export interface MinecraftSkin {
  id: string;
  name: string;
  title: string;
  element: string;
  badge: string;
  themeColor: string;
  /**
   * CDN asset key, not a `require()`. This array is module-level, so it is built
   * before `AssetsProvider` primes the registry — resolve at render time.
   */
  assetKey: string;
  perk: string;
}

export const MINECRAFT_SKINS: MinecraftSkin[] = [
  {
    id: "archer_gold",
    name: "Blaze Archer",
    title: "Master Marksman",
    element: "Fire & Gold",
    badge: "RANGED",
    themeColor: "#ffd25e",
    assetKey: "character/archer_gold",
    perk: "+20% Precision in Coding Competitions",
  },
  {
    id: "archer_blue",
    name: "Storm Archer",
    title: "Lightning Striker",
    element: "Storm Blue",
    badge: "LIGHTNING",
    themeColor: "#63d9e8",
    assetKey: "character/archer_blue",
    perk: "+15% Velocity in Hackathons",
  },
  {
    id: "adventurer",
    name: "Alex Explorer",
    title: "Wilderness Pathfinder",
    element: "Emerald Earth",
    badge: "PATHFINDER",
    themeColor: "#3ee89a",
    assetKey: "character/adventurer",
    perk: "+25% Synergy in Team Events",
  },
  {
    id: "runner_pickaxe",
    name: "Diamond Miner",
    title: "Deep Delver",
    element: "Diamond Core",
    badge: "MINER",
    themeColor: "#52a3c4",
    assetKey: "character/runner_pickaxe",
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

// 6 non-circular flanking positions around avatar

// Floating satellite pod component

/**
 * One "label + control" row inside a settings card.
 *
 * Each of these used to be written inline as a `space-between` row whose text
 * column had no `flex`. The description ("Toggle between light and dark mode")
 * therefore claimed its full intrinsic width and pushed the control past the
 * card's padding — which is why CHANGE SKIN was visibly clipped at the screen
 * edge. The text has to be the flexible side; the control keeps its natural size.
 */
function SettingRow({
  title,
  description,
  theme,
  children,
}: {
  title: string;
  description: string;
  theme: any;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingRowText}>
        <Text style={[styles.fieldValue, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.fieldLabel, { color: theme.textDim, marginTop: px(4) }]}>
          {description}
        </Text>
      </View>
      <View style={styles.settingRowControl}>{children}</View>
    </View>
  );
}

export default function ProfileTab() {
  // Subscribe to the asset registry: `getEventImage`/`resolveAsset` are plain
  // synchronous reads, so without this the screen would keep whatever was
  // resolvable on first render and never pick up a completed download.
  useAssetsVersion();
  const insets = useSafeAreaInsets();
  const { role, logout } = useAuth();
  const { activeShape, setShapeById, shapes, theme, isDark, toggleColorMode } = useBlockTheme();
  const surface = useSurface();
  const { refreshPending, schedule } = useAppData();

  /** "8 – 9" / "OCTOBER 2026", derived from the schedule's first and last day. */
  const festDates = useMemo(() => {
    const dates = (schedule?.days ?? []).map((d) => d.date).filter(Boolean).sort();
    const start = dates[0] ?? "2026-10-08";
    const end = dates[dates.length - 1] ?? start;
    const [y, m, d1] = start.split("-").map(Number);
    const d2 = Number(end.split("-")[2]);
    const month = new Date(y, m - 1, 1)
      .toLocaleString("en-US", { month: "long" })
      .toUpperCase();
    return { days: d1 === d2 ? `${d1}` : `${d1} – ${d2}`, monthYear: `${month} ${y}` };
  }, [schedule]);

  const [profile, setProfile] = useState<UserProfileData>(DEFAULT_PROFILE);
  const [activeSkin, setActiveSkin] = useState<MinecraftSkin>(MINECRAFT_SKINS[0]);
  const [skinModalVisible, setSkinModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  // Set when a save had to be queued instead of sent, so the banner can tell
  // the truth ("saved on device") rather than claiming a server round-trip.
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  /*
   * The rotating, morphing avatar capsule that used to live here — six
   * interpolated corner radii, a 360deg spin, a counter-rotating inner layer and
   * an 8-point starburst variant — has been removed along with its Material 3
   * shape system. The screen stopped rendering it some time ago; only the
   * animation machinery was still running. See `BlockThemeContext` for what
   * replaced the shapes.
   */

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
            skinSheetY.value = withTiming(0, timing.sheet);
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
    let isMounted = true;
    let toastTimer: any = null;

    async function loadData() {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_PROFILE_KEY);
        if (!isMounted) return;
        if (stored) {
          const parsed = JSON.parse(stored);
          setProfile((prev) => ({ ...prev, ...parsed }));
          const skin = MINECRAFT_SKINS.find((s) => s.id === parsed.skinId);
          if (skin) setActiveSkin(skin);
          setToastMessage("LOADED FROM LOCAL STORAGE");
          clearTimeout(toastTimer);
          toastTimer = setTimeout(() => {
            if (isMounted) setToastMessage(null);
          }, 2400);
        }

        apiClient<{ session?: { email?: string; userId?: string } }>(`${API_BASE_URL}/auth/me`, {
          timeout: 4000,
          skipAuthRedirect: true,
        })
          .then((res) => {
            if (!isMounted) return;
            if (res.data?.session?.email) {
              setProfile((prev) => ({
                ...prev,
                email: res.data.session?.email || prev.email,
                participantId: `GW26-${(res.data.session?.userId || "4091").slice(-4).toUpperCase()}`,
              }));
              setToastMessage("SYNCED WITH SERVER");
              clearTimeout(toastTimer);
              toastTimer = setTimeout(() => {
                if (isMounted) setToastMessage(null);
              }, 2400);
            }
          })
          .catch(() => {});
      } catch (err) {
        console.warn("Failed to load profile:", err);
      }
    }
    loadData();

    return () => {
      isMounted = false;
      if (toastTimer) clearTimeout(toastTimer);
    };
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

      const payload = {
        fullName: profile.fullName,
        phone: profile.phone,
        customCollegeName: profile.collegeName,
        tshirtSize: profile.tshirtSize,
        dietaryPref: profile.foodPref,
      };

      // Try to send immediately; if that fails for any reason (offline, dead
      // tunnel, server down) queue it instead of swallowing the error, which is
      // what this used to do — the user saw "saved" and the server never knew.
      try {
        await apiClient(`${API_BASE_URL}/profile`, {
          method: "POST",
          body: JSON.stringify(payload),
          timeout: 4000,
          skipAuthRedirect: true,
        });
        setSyncNotice(null);
      } catch {
        await enqueue({
          endpoint: "/profile",
          method: "POST",
          body: payload,
          label: "Profile update",
          // Repeated edits while offline collapse into one pending request.
          dedupeKey: "profile",
        });
        await refreshPending();
        setSyncNotice("SAVED ON DEVICE · WILL SYNC WHEN ONLINE");
      }

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
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
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

      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Generous top clearance matching Home page */}
        <View style={{ height: insets.top + px(52) }} />

        {/* Hero Massive Bold Header */}
        <View style={styles.heroHeaderRow}>
          <View style={styles.titleColumn}>
            <Text style={[styles.heroSupTitle, { color: theme.textDim }]}>STAGE IDENTITY,</Text>
            {/*
              `wrap` + shrinkable children: a long name used to run straight off
              the right edge, because two `numberOfLines={1}` Texts in a row with
              no `flexShrink` will happily overflow their parent rather than
              truncate.
            */}
            <View style={styles.heroNameRow}>
              <Text style={[styles.heroFirstNameTitle, styles.heroNamePart, { color: theme.text }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.55}>
                {firstName}
              </Text>
              {lastName ? (
                <Text style={[styles.heroLastNameTitle, styles.heroNamePart, { color: theme.primary }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.55}>
                  {lastName}
                </Text>
              ) : null}
            </View>
            <Text style={[styles.heroSubtitle, { color: theme.textDim }]} numberOfLines={2}>
              {profile.participantId} • {activeSkin.title}
            </Text>
          </View>
        </View>

        

        
        <View style={{ marginTop: px(32), marginBottom: px(8) }}>
          <Text style={[styles.sectionHeading, { color: theme.textDim }]}>APP PREFERENCES</Text>
          
          <View style={[styles.credentialsCard, { backgroundColor: theme.surfaceElevated, marginBottom: px(16) }]}>
            <Grain />
            <Frame depth="raised" />
            <SettingRow
              title="Color Theme"
              description="Toggle between light and dark mode"
              theme={theme}
            >
              <Pressable
                style={[styles.iconToggle, { backgroundColor: surface.slot }]}
                onPress={toggleColorMode}
                accessibilityRole="button"
                accessibilityLabel={isDark ? "Switch to light mode" : "Switch to dark mode"}
                hitSlop={px(8)}
              >
                <Frame depth="raised" />
                <McGlyph name={isDark ? "sun" : "moon"} size={px(18)} color={theme.primary} />
              </Pressable>
            </SettingRow>
          </View>

          {/*
            The accent picker, moved here from the home screen.

            It lived under the character on the landing page as six saturated
            blocks in a row — the loudest thing on the front door and the least
            useful thing to put there. As a row of slots in Settings, beside the
            light/dark control it belongs with, it does the same job quietly.
          */}
          <View style={[styles.credentialsCard, { backgroundColor: theme.surfaceElevated, marginBottom: px(16) }]}>
            <Grain />
            <Frame depth="raised" />
            <View style={styles.accentHeader}>
              <Text style={[styles.fieldValue, { color: theme.text }]}>Accent Block</Text>
              <Text style={[styles.accentValue, { color: theme.primary }]}>
                {activeShape.name.toUpperCase()}
              </Text>
            </View>
            <View style={styles.accentRow}>
              {shapes.map((block) => (
                <McSlot
                  key={block.id}
                  size={38}
                  selected={activeShape.id === block.id}
                  accessibilityLabel={block.name}
                  onPress={() => setShapeById(block.id)}
                >
                  <View style={[styles.accentSwatch, { backgroundColor: block.seedColor }]}>
                    <Bevel
                      top={{ color: "rgba(255,255,255,0.4)", size: 2 }}
                      left={{ color: "rgba(255,255,255,0.22)", size: 2 }}
                      bottom={{ color: "rgba(0,0,0,0.45)", size: 2 }}
                      right={{ color: "rgba(0,0,0,0.3)", size: 2 }}
                    />
                  </View>
                </McSlot>
              ))}
            </View>
          </View>

          <View style={[styles.credentialsCard, { backgroundColor: theme.surfaceElevated }]}>
            <Grain />
            <Frame depth="raised" />
            <SettingRow
              title="Minecraft Skin"
              description="Choose your stage identity"
              theme={theme}
            >
              <McButton label="Change skin" onPress={() => setSkinModalVisible(true)} />
            </SettingRow>
          </View>
        </View>
    

        {/* Success Alert Banner */}
        {saveSuccess ? (<Animated.View entering={FadeInUp.duration(duration.screen).easing(stepped(5))} style={[styles.successBanner, { backgroundColor: theme.surfaceElevated }]}>
            <Grain />
            <Frame depth={syncNotice ? "raised" : "gold"} />
            <McGlyph
              name={syncNotice ? "bellOff" : "check"}
              size={px(18)}
              color={syncNotice ? "#FFAA00" : theme.primary}
            />
            <Text style={[styles.successBannerText, { color: syncNotice ? "#FFAA00" : theme.primary }]}>
              {syncNotice ?? "PROFILE UPDATED IN THE REALM"}
            </Text>
          </Animated.View>) : null}

        <View style={{ marginTop: px(24) }}>
          <Text style={[styles.sectionHeading, { color: theme.textDim }]}>ACCOUNT PROFILE</Text>
        {/* Player Credentials Spotlight Card */}
        <View style={[styles.credentialsCard, { backgroundColor: theme.surfaceElevated }]}>
            <Grain />
            <Frame depth="raised" />
          <View style={styles.credentialsHeader}>
            <View style={styles.settingRowText}>
              <Text style={[styles.credentialsSectionTitle, { color: theme.text }]}>PLAYER CREDENTIALS</Text>
              <Text style={[styles.credentialsSubtitle, { color: theme.textDim }]}>Registered festival details & preferences</Text>
            </View>
            <Pressable
              style={[
                styles.editToggleBtn,
                styles.settingRowControl,
                {
                  backgroundColor: theme.primaryContainer,
                  borderColor: theme.rimBorder,
                },
              ]}
              onPress={() => setIsEditing(!isEditing)}
              accessibilityRole="button"
              accessibilityLabel={isEditing ? "Stop editing profile" : "Edit profile"}
            >
              <McGlyph name={isEditing ? "close" : "pencil"} size={px(14)} color={theme.primary} />
              <Text style={[styles.editToggleText, { color: theme.primary }]}>
                {isEditing ? "CANCEL" : "EDIT"}
              </Text>
            </Pressable>
          </View>

          {/* Full Name */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: theme.textDim }]}>PLAYER / FULL NAME</Text>
            {isEditing ? (
              <TextInput
                style={[styles.inputField, { borderColor: theme.rimBorder }]}
                value={profile.fullName}
                onChangeText={(text) => setProfile((p) => ({ ...p, fullName: text }))}
                placeholder="Enter full name"
                placeholderTextColor={mojang.greySoft}
              />
            ) : (
              <Text style={[styles.fieldValue, { color: theme.text }]}>{profile.fullName}</Text>
            )}
          </View>

          {/* Email (read only) */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: theme.textDim }]}>REGISTERED EMAIL</Text>
            <Text style={[styles.fieldValue, { color: theme.primary }]}>{profile.email}</Text>
          </View>

          {/* Phone Number */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: theme.textDim }]}>PHONE NUMBER</Text>
            {isEditing ? (
              <TextInput
                style={[styles.inputField, { borderColor: theme.rimBorder }]}
                value={profile.phone}
                onChangeText={(text) => setProfile((p) => ({ ...p, phone: text }))}
                placeholder="+91 00000 00000"
                placeholderTextColor={mojang.greySoft}
                keyboardType="phone-pad"
              />
            ) : (
              <Text style={[styles.fieldValue, { color: theme.text }]}>{profile.phone}</Text>
            )}
          </View>

          {/* College / Institution */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: theme.textDim }]}>COLLEGE / INSTITUTION</Text>
            {isEditing ? (
              <TextInput
                style={[styles.inputField, { borderColor: theme.rimBorder }]}
                value={profile.collegeName}
                onChangeText={(text) => setProfile((p) => ({ ...p, collegeName: text }))}
                placeholder="College Name"
                placeholderTextColor={mojang.greySoft}
              />
            ) : (
              <Text style={[styles.fieldValue, { color: theme.text }]}>{profile.collegeName}</Text>
            )}
          </View>

          {/* Department */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: theme.textDim }]}>DEPARTMENT / PROGRAM</Text>
            {isEditing ? (
              <TextInput
                style={[styles.inputField, { borderColor: theme.rimBorder }]}
                value={profile.department}
                onChangeText={(text) => setProfile((p) => ({ ...p, department: text }))}
                placeholder="Department"
                placeholderTextColor={mojang.greySoft}
              />
            ) : (
              <Text style={[styles.fieldValue, { color: theme.text }]}>{profile.department}</Text>
            )}
          </View>

          {/* Food Preference Selection */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: theme.textDim }]}>DIETARY PREFERENCE</Text>
            {isEditing ? (
              <View style={styles.chipRow}>
                {(["Veg", "Non-Veg", "Jain"] as const).map((pref) => {
                  const isActive = profile.foodPref === pref;
                  return (
                    <Pressable
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
                        {pref === "Veg" ? "VEG" : pref === "Non-Veg" ? "NON-VEG" : "JAIN"}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <Text style={[styles.fieldValue, { color: theme.text }]}>
                {profile.foodPref === "Veg"
                  ? "Vegetarian"
                  : profile.foodPref === "Non-Veg"
                  ? "Non-Vegetarian"
                  : "Jain"}
              </Text>
            )}
          </View>

          {/* T-Shirt Size Selection */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: theme.textDim }]}>FEST T-SHIRT SIZE</Text>
            {isEditing ? (
              <View style={styles.chipRow}>
                {(["S", "M", "L", "XL", "XXL"] as const).map((size) => {
                  const isActive = profile.tshirtSize === size;
                  return (
                    <Pressable
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
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <Text style={[styles.fieldValue, { color: theme.text }]}>{profile.tshirtSize}</Text>
            )}
          </View>

          {/* Save Profile Button */}
          {isEditing && (
            <Pressable
              style={[styles.saveBtn, { backgroundColor: theme.primary }]}
              onPress={handleSaveProfile}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color={theme.onPrimary} />
              ) : (
                <Text style={[styles.saveBtnText, { color: theme.onPrimary }]}>SAVE PROFILE</Text>
              )}
            </Pressable>
          )}
        </View>

        {/* Quick Fest Information Cards */}
        <View style={styles.festInfoGrid}>
          <View style={[styles.festInfoCard, { backgroundColor: theme.surfaceElevated }]}>
            <Grain />
            <Frame depth="raised" />
            {/* From the schedule, not typed in: this read "10 – 11 October"
                while the programme itself runs on the 8th and 9th. */}
            <Text style={[styles.festInfoNumber, { color: theme.primary }]}>{festDates.days}</Text>
            <Text style={[styles.festInfoTitle, { color: theme.text }]}>{festDates.monthYear}</Text>
            <Text style={[styles.festInfoSub, { color: theme.textDim }]}>Fest Dates</Text>
          </View>
          <View style={[styles.festInfoCard, { backgroundColor: theme.surfaceElevated }]}>
            <Grain />
            <Frame depth="raised" />
            <Text style={[styles.festInfoNumber, { color: theme.primary }]}>CENTRAL</Text>
            <Text style={[styles.festInfoTitle, { color: theme.text }]}>CAMPUS</Text>
            <Text style={[styles.festInfoSub, { color: theme.textDim }]}>Main Auditorium</Text>
          </View>
        </View>

        {/* Logout Button */}
        <Pressable
          style={styles.logoutBtn}
          onPress={handleLogout}
          accessibilityRole="button"
        >
          <Grain />
          <Frame depth="raised" />
          <McGlyph name="door" size={px(18)} color="#ff8080" />
          <Text style={[styles.logoutBtnText, mcTextShadow("#ff8080", 16)]}>
            LOGOUT FROM REALM
          </Text>
        </Pressable>

        </View>

        {/* Bottom padding to clear floating navigation bar */}
        <View style={{ height: px(24) }} />
      </ScrollView>

      {/* Skin Selection Modal with Slide-Down Gesture */}
      <Modal
        visible={skinModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={closeSkinModal}
      >
        <View style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}>
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
                  <Text style={[styles.modalMainTitle, { color: theme.text }]}>Choose Minecraft Skin</Text>
                  <Text style={[styles.modalSubTitle, { color: theme.textDim }]}>Equip your live 3D avatar & traits • Swipe down to close</Text>
                </View>
                <Pressable onPress={closeSkinModal} style={[styles.modalCloseBtn, { backgroundColor: theme.surfaceElevated }]}>
                  <McGlyph name="close" size={px(18)} color="#cbd5e1" />
                </Pressable>
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
                  <Pressable
                    key={skin.id}
                    style={[
                      styles.skinCard,
                      isSelected && [
                        styles.skinCardActive,
                        { borderColor: theme.primary, backgroundColor: theme.primaryContainer },
                      ],
                    ]}
                    onPress={() => handleSelectSkin(skin)}
                  >
                    {isSelected && (
                      <View style={[styles.activeCheckPill, { backgroundColor: theme.primary }]}>
                        <Text style={[styles.activeCheckPillText, { color: theme.onPrimary }]}>EQUIPPED</Text>
                      </View>
                    )}

                    <View style={styles.skinCardImageWrap}>
                      <Image
                        source={resolveAsset(skin.assetKey)}
                        style={styles.skinCardImage}
                        contentFit="contain"
                      />
                    </View>

                    <Text style={[styles.skinCardName, { color: theme.text }]}>{skin.name}</Text>
                    <Text style={[styles.skinCardBadge, { color: theme.primary }]}>
                      {skin.badge}
                    </Text>
                    <Text style={[styles.skinCardPerk, { color: theme.textDim }]} numberOfLines={2}>
                      {skin.perk}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      {/* Local & Server Sync Toast Notification */}
      <PixelToast message={toastMessage} bottom={100} />
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
  heroHeaderRow: {
    marginBottom: px(12),
  },
  titleColumn: {
    width: "100%",
  },
  heroNameRow: {
    flexDirection: "row",
    alignItems: "baseline",
    // Wrap rather than overflow when both names can't share a line.
    flexWrap: "wrap",
    gap: px(6),
  },
  heroNamePart: {
    // Lets a long single name truncate inside the row instead of running past
    // the screen edge.
    flexShrink: 1,
  },
  heroSupTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: px(16),
    fontWeight: "700",
    letterSpacing: px(2.2),
    color: "#d6c8aa",
    marginBottom: px(4),
  },
  heroFirstNameTitle: {
    fontFamily: typography.pageTitle.fontFamily,
    fontSize: px(typography.pageTitle.fontSize),
    lineHeight: px(typography.pageTitle.lineHeight),
    color: "#ffffff",
    letterSpacing: typography.pageTitle.letterSpacing,
  },
  heroLastNameTitle: {
    fontFamily: typography.pageTitle.fontFamily,
    fontSize: px(typography.pageTitle.fontSize),
    lineHeight: px(typography.pageTitle.lineHeight),
    letterSpacing: typography.pageTitle.letterSpacing,
    marginBottom: px(4),
  },
  heroSubtitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: px(16),
    color: mojang.greySoft,
    marginTop: px(4),
  },
  artisticCenterpieceWrapper: {
    alignItems: "center",
    justifyContent: "center",
    height: px(390),
    position: "relative",
    marginVertical: px(12),
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
  },
  capsuleTagName: {
    fontFamily: fonts.bodyBold,
    fontSize: px(15),
    color: "#e8dec8",
    letterSpacing: 1.2,
  },
  capsuleTagRole: {
    fontFamily: fonts.bodyBold,
    fontSize: px(12.5),
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
    marginBottom: px(8),
  },
  switchSkinPillText: {
    fontFamily: fonts.bodyBold,
    fontSize: px(15),
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
    fontFamily: fonts.pixelMedium,
    fontSize: px(14.5),
    letterSpacing: 1.2,
  },
  m3CurrentTag: {
    fontFamily: fonts.bodyMedium,
    fontSize: px(14),
    color: mojang.greySoft,
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
    fontSize: px(14.5),
    color: "#c8d1dc",
  },
  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: px(10),
    padding: px(13),
    marginBottom: px(12),
    borderRadius: 0,
    overflow: "hidden",
  },
  successBannerText: {
    fontFamily: fonts.bodyBold,
    fontSize: px(15),
    letterSpacing: 0.5,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: px(12),
  },
  settingRowText: {
    // Takes the slack and, crucially, is allowed to shrink: without `minWidth: 0`
    // a flex child in a row refuses to go below its content's intrinsic width.
    flex: 1,
    minWidth: 0,
  },
  settingRowControl: {
    flexShrink: 0,
  },
  iconToggle: {
    width: px(38),
    height: px(38),
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 0,
    overflow: "hidden",
  },
  credentialsCard: {
    // Opaque stone, not a translucent wash: a bevel needs a solid fill beneath
    // it, and a 55%-alpha panel let the background through the highlight.
    padding: px(18),
    gap: px(14),
    marginVertical: px(8),
    borderRadius: 0,
    overflow: "hidden",
  },
  credentialsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    // Without a gap the subtitle butts straight up against the EDIT control.
    gap: px(12),
    borderBottomWidth: px(1),
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
    paddingBottom: px(10),
  },
  /*
   * A card heading, set like its siblings.
   *
   * "Color Theme", "Accent Block" and "Minecraft Skin" are all sans card
   * headings; this one was the pixel face at display size, so it read as a
   * section break inside a card and competed with the real section eyebrow
   * above it.
   */
  credentialsSectionTitle: {
    fontFamily: typography.h3.fontFamily,
    fontSize: px(typography.h3.fontSize),
    letterSpacing: typography.h3.letterSpacing,
  },
  credentialsSubtitle: {
    fontFamily: fonts.body,
    fontSize: px(15),
    color: mojang.greySoft,
    marginTop: px(2),
  },
  editToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: px(4),
    paddingHorizontal: px(12),
    paddingVertical: px(5),
  },
  editToggleText: {
    fontFamily: fonts.bodyBold,
    fontSize: px(14),
    letterSpacing: 0.5,
  },
  fieldGroup: {
    gap: px(4),
  },
  fieldLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: px(13.5),
    color: mojang.greySoft,
    letterSpacing: 0.8,
  },
  fieldValue: {
    fontFamily: fonts.bodyMedium,
    fontSize: px(15),
    color: "#ffffff",
  },
  inputField: {
    backgroundColor: "rgba(10, 15, 26, 0.9)",
    paddingHorizontal: px(12),
    paddingVertical: px(8),
    color: "#ffffff",
    fontFamily: fonts.bodyMedium,
    fontSize: px(15),
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
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  choiceChipText: {
    fontFamily: fonts.bodyMedium,
    fontSize: px(15),
    color: mojang.greySoft,
  },
  sizeChip: {
    paddingHorizontal: px(16),
    paddingVertical: px(7),
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  sizeChipText: {
    fontFamily: fonts.bodyMedium,
    fontSize: px(15),
    color: mojang.greySoft,
  },
  saveBtn: {
    paddingVertical: px(12),
    alignItems: "center",
    marginTop: px(6),
  },
  saveBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: px(14.5),
    letterSpacing: 1,
  },
  festInfoGrid: {
    flexDirection: "row",
    gap: px(12),
    marginTop: px(8),
  },
  festInfoCard: {
    flex: 1,
    padding: px(16),
    alignItems: "center",
    borderRadius: 0,
    overflow: "hidden",
  },
  festInfoNumber: {
    fontFamily: fonts.bodyBold,
    fontSize: px(20),
  },
  festInfoTitle: {
    fontFamily: fonts.pixelMedium,
    fontSize: px(14),
    color: "#ffffff",
    letterSpacing: 1,
    marginTop: px(2),
  },
  festInfoSub: {
    fontFamily: fonts.body,
    fontSize: px(15),
    color: mojang.greySoft,
    marginTop: px(2),
  },
  accentHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: px(10),
  },
  accentValue: {
    fontFamily: typography.eyebrow.fontFamily,
    fontSize: px(typography.eyebrow.fontSize),
    letterSpacing: typography.eyebrow.letterSpacing,
  },
  accentRow: {
    flexDirection: "row",
    gap: px(10),
    marginTop: px(4),
  },
  accentSwatch: {
    width: px(18),
    height: px(18),
  },
  /** An eyebrow, not a heading — small, tracked, in the pixel face. */
  sectionHeading: {
    fontFamily: typography.eyebrow.fontFamily,
    fontSize: px(typography.eyebrow.fontSize),
    letterSpacing: typography.eyebrow.letterSpacing,
    marginBottom: px(14),
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: px(8),
    backgroundColor: "#4a1f1f",
    paddingVertical: px(14),
    marginTop: px(14),
    borderRadius: 0,
    overflow: "hidden",
  },
  logoutBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: px(14.5),
    color: "#ff8080",
    letterSpacing: 0.8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.82)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: mojang.surface,
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
    marginBottom: px(14),
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  modalMainTitle: {
    fontFamily: fonts.pixelMedium,
    fontSize: px(22),
    color: "#ffffff",
  },
  modalSubTitle: {
    fontFamily: fonts.body,
    fontSize: px(15),
    color: mojang.greySoft,
    marginTop: px(2),
  },
  modalCloseBtn: {
    width: px(32),
    height: px(32),
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
    borderColor: "rgba(255, 255, 255, 0.08)",
    padding: px(12),
    alignItems: "center",
    position: "relative",
  },
  skinCardActive: {
  },
  activeCheckPill: {
    position: "absolute",
    top: px(8),
    right: px(8),
    paddingHorizontal: px(6),
    paddingVertical: px(2),
  },
  activeCheckPillText: {
    fontFamily: fonts.bodyBold,
    fontSize: px(12),
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
    fontSize: px(14.5),
    color: "#ffffff",
    textAlign: "center",
  },
  skinCardBadge: {
    fontFamily: fonts.bodyBold,
    fontSize: px(13),
    letterSpacing: 0.5,
    marginVertical: px(2),
  },
  skinCardPerk: {
    fontFamily: fonts.body,
    fontSize: px(14),
    color: mojang.greySoft,
    textAlign: "center",
    marginTop: px(2),
  },
});

