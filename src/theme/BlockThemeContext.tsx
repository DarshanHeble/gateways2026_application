import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import { LayoutAnimation, Platform, UIManager } from "react-native";
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import AsyncStorage from "@react-native-async-storage/async-storage";
import { mojang, scaleColor } from "./minecraft";
import * as Haptics from "expo-haptics";

export type BlockCategory =
  | "Gold"
  | "Diamond"
  | "Emerald"
  | "Amethyst"
  | "Redstone"
  | "Lapis";

export interface BlockTheme {
  id: string;
  /** What the block is called in game. This is what the picker shows. */
  name: string;
  category: BlockCategory;
  /** The block's own colour, and the accent the whole app takes on. */
  seedColor: string;
  palette: {
    primary: string;
    onPrimary: string;
    primaryContainer: string;
    surfaceTint: string;
    auraGlow: string;
    rimBorder: string;
    subtleText: string;
    ambientTop: string;
    ambientBottom: string;
  };
}

/**
 * The six accent themes, as blocks you can equip.
 *
 * These were previously named after Material 3 Expressive shapes — "Stadium
 * Pill", "Soft Squircle", "Clover Flower" — and each carried a `styleConfig` of
 * four corner radii that the home and profile screens interpolated between to
 * morph a rotating capsule. That machinery is gone: nothing in this UI is
 * round, so a shape picker had nothing left to pick. What the control actually
 * chose all along was a colour, so it now says so, in the game's own nouns.
 *
 * The hues are Minecraft's own block colours rather than the previous Material
 * palette — gold, diamond, emerald, amethyst, redstone and lapis are the six
 * everyone can name, and each is instantly readable as a block at 16px.
 *
 * **The ids are unchanged on purpose.** They are persisted in AsyncStorage, and
 * renaming them would silently reset every existing user's choice.
 */
export const BLOCK_THEMES: BlockTheme[] = [
  {
    id: "stadium_pill",
    name: "Gold Block",
    category: "Gold",
    seedColor: "#f7cf3f",
    palette: {
      primary: "#f7cf3f",
      onPrimary: "#2a1a04",
      primaryContainer: "rgba(247, 207, 63, 0.14)",
      surfaceTint: "rgba(247, 207, 63, 0.08)",
      auraGlow: "rgba(247, 207, 63, 0.24)",
      rimBorder: "rgba(247, 207, 63, 0.35)",
      subtleText: "#d6c8aa",
      ambientTop: "rgba(247, 207, 63, 0.10)",
      ambientBottom: "rgba(247, 207, 63, 0.12)",
    },
  },
  {
    id: "diamond_squircle",
    name: "Diamond Block",
    category: "Diamond",
    seedColor: "#4aedd9",
    palette: {
      primary: "#4aedd9",
      onPrimary: "#04231f",
      primaryContainer: "rgba(74, 237, 217, 0.16)",
      surfaceTint: "rgba(74, 237, 217, 0.08)",
      auraGlow: "rgba(74, 237, 217, 0.25)",
      rimBorder: "rgba(74, 237, 217, 0.38)",
      subtleText: "#cffafe",
      ambientTop: "rgba(74, 237, 217, 0.14)",
      ambientBottom: "rgba(50, 211, 196, 0.08)",
    },
  },
  {
    id: "clover_flower",
    name: "Emerald Block",
    category: "Emerald",
    seedColor: "#17dd62",
    palette: {
      primary: "#17dd62",
      onPrimary: "#032611",
      primaryContainer: "rgba(23, 221, 98, 0.15)",
      surfaceTint: "rgba(23, 221, 98, 0.08)",
      auraGlow: "rgba(23, 221, 98, 0.25)",
      rimBorder: "rgba(23, 221, 98, 0.35)",
      subtleText: "#d1fae5",
      ambientTop: "rgba(23, 221, 98, 0.14)",
      ambientBottom: "rgba(16, 150, 70, 0.12)",
    },
  },
  {
    id: "faceted_gem",
    name: "Amethyst Block",
    category: "Amethyst",
    seedColor: "#a05fe0",
    palette: {
      primary: "#a05fe0",
      onPrimary: "#ffffff",
      primaryContainer: "rgba(160, 95, 224, 0.16)",
      surfaceTint: "rgba(160, 95, 224, 0.08)",
      auraGlow: "rgba(160, 95, 224, 0.26)",
      rimBorder: "rgba(160, 95, 224, 0.4)",
      subtleText: "#e9d5ff",
      ambientTop: "rgba(160, 95, 224, 0.14)",
      ambientBottom: "rgba(78, 42, 107, 0.12)",
    },
  },
  {
    id: "solar_burst",
    name: "Redstone Block",
    category: "Redstone",
    seedColor: "#e0392c",
    palette: {
      primary: "#e0392c",
      onPrimary: "#ffffff",
      primaryContainer: "rgba(224, 57, 44, 0.16)",
      surfaceTint: "rgba(224, 57, 44, 0.08)",
      auraGlow: "rgba(224, 57, 44, 0.25)",
      rimBorder: "rgba(224, 57, 44, 0.38)",
      subtleText: "#ffccbc",
      ambientTop: "rgba(224, 57, 44, 0.14)",
      ambientBottom: "rgba(150, 20, 12, 0.10)",
    },
  },
  {
    id: "pure_circle",
    name: "Lapis Block",
    category: "Lapis",
    seedColor: "#3b6fe0",
    palette: {
      primary: "#3b6fe0",
      onPrimary: "#ffffff",
      primaryContainer: "rgba(59, 111, 224, 0.15)",
      surfaceTint: "rgba(59, 111, 224, 0.08)",
      auraGlow: "rgba(59, 111, 224, 0.24)",
      rimBorder: "rgba(59, 111, 224, 0.35)",
      subtleText: "#dbeafe",
      ambientTop: "rgba(59, 111, 224, 0.14)",
      ambientBottom: "rgba(29, 60, 160, 0.08)",
    },
  },
];

const STORAGE_SHAPE_KEY = "@gateways_m3_shape_id_v2";
const STORAGE_COLOR_MODE_KEY = "@gateways_color_mode_v1";

export type ColorMode = "dark" | "light";

export type ExtendedPalette = BlockTheme["palette"] & {
  background: string;
  surface: string;
  surfaceElevated: string;
  text: string;
  textDim: string;
  border: string;
  overlay: string;
}

interface BlockThemeContextType {
  activeShape: BlockTheme;
  shapes: BlockTheme[];
  setShapeById: (shapeId: string) => Promise<void>;
  theme: ExtendedPalette;
  colorMode: ColorMode;
  isDark: boolean;
  toggleColorMode: () => Promise<void>;
  setColorMode: (mode: ColorMode) => Promise<void>;
}

const DEFAULT_SHAPE = BLOCK_THEMES[0];

const DEFAULT_THEME_CONTEXT: BlockThemeContextType = {
  activeShape: DEFAULT_SHAPE,
  shapes: BLOCK_THEMES,
  setShapeById: async () => {},
  theme: {
    ...DEFAULT_SHAPE.palette,
    background: "#171615",
    surface: "#1d1e1e",
    surfaceElevated: "#262423",
    text: "#ffffff",
    textDim: "#aba09c",
    border: "#3a3634",
    overlay: "rgba(0, 0, 0, 0.82)",
  },
  colorMode: "dark",
  isDark: true,
  toggleColorMode: async () => {},
  setColorMode: async () => {},
};

const BlockThemeContext = createContext<BlockThemeContextType>(DEFAULT_THEME_CONTEXT);

export function BlockThemeProvider({ children }: { children: React.ReactNode }) {
  const [activeShapeId, setActiveShapeId] = useState<string>("stadium_pill");
  const [colorMode, setColorModeState] = useState<ColorMode>("dark");

  useEffect(() => {
    async function loadSavedState() {
      try {
        const [savedShape, savedMode] = await Promise.all([
          AsyncStorage.getItem(STORAGE_SHAPE_KEY),
          AsyncStorage.getItem(STORAGE_COLOR_MODE_KEY),
        ]);
        if (savedShape && BLOCK_THEMES.some((s) => s.id === savedShape)) {
          setActiveShapeId(savedShape);
        }
        if (savedMode === "light" || savedMode === "dark") {
          setColorModeState(savedMode);
        }
      } catch (err) {
        console.warn("Failed to load saved theme settings:", err);
      }
    }
    loadSavedState();
  }, []);

  const activeShape = useMemo(() => {
    return (
      BLOCK_THEMES.find((s) => s.id === activeShapeId) ||
      DEFAULT_SHAPE
    );
  }, [activeShapeId]);

  const setShapeById = async (shapeId: string) => {
    const found = BLOCK_THEMES.find((s) => s.id === shapeId);
    if (!found) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setActiveShapeId(shapeId);
    try {
      await AsyncStorage.setItem(STORAGE_SHAPE_KEY, shapeId);
    } catch (err) {
      console.warn("Failed to save block theme:", err);
    }
  };

  const setColorMode = async (mode: ColorMode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.create(350, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity));
    setColorModeState(mode);
    try {
      await AsyncStorage.setItem(STORAGE_COLOR_MODE_KEY, mode);
    } catch (err) {
      console.warn("Failed to save color mode:", err);
    }
  };

  const toggleColorMode = async () => {
    const next = colorMode === "dark" ? "light" : "dark";
    await setColorMode(next);
  };

  const isDark = colorMode === "dark";

  // Compute theme palette adapted for light or dark mode
  const theme = useMemo<ExtendedPalette>(() => {
    const base = activeShape.palette;
    if (isDark) {
      return {
        ...base,
        /*
         * Mojang's product neutrals — warm, not blue. See `@/theme/minecraft`:
         * the blue-grey scheme this replaced is the default of every dark-mode
         * template going, and it was most of why the app read as generic rather
         * than as something Mojang would ship.
         */
        background: mojang.offBlack,
        surface: mojang.surface,
        // Opaque, not a translucent white wash: a panel is a tile sitting on the
        // canvas, and a bevel needs a solid fill under it to light convincingly.
        surfaceElevated: mojang.surfaceMid,
        text: mojang.offWhite,
        textDim: mojang.grey3,
        border: "#3a3634",
        overlay: "rgba(0, 0, 0, 0.82)",
      };
    }
    /*
     * Light is the same warm ramp, inverted — not a separate blue-grey scheme.
     *
     * It was `#f8fafc` / `#ffffff` / `#0f172a`, which is Tailwind's slate and
     * belongs to a different product. Mojang's light surfaces sit on the same
     * warm neutrals as the dark ones (`#ede5e2`, `#d0c5c0`), so the two modes
     * read as one design with the lights on or off rather than as two themes.
     */
    /*
     * The accent is darkened for light mode.
     *
     * Every block colour in `BLOCK_THEMES` is picked to sit on near-black, and
     * on a warm off-white canvas they wash out completely — gold `#f7cf3f` on
     * `#e6dcd8` is barely a colour at all, let alone readable as a heading. The
     * multiply keeps the hue and buys back the contrast.
     */
    const primary = scaleColor(base.primary, 0.58);

    return {
      ...base,
      primary,
      onPrimary: "#ffffff",
      primaryContainer: base.primaryContainer.replace(/0\.\d+/, "0.16"),
      surfaceTint: base.surfaceTint.replace(/0\.\d+/, "0.08"),
      auraGlow: base.auraGlow.replace(/0\.\d+/, "0.14"),
      rimBorder: base.rimBorder.replace(/0\.\d+/, "0.35"),
      subtleText: "#6b6461",
      background: "#e6dcd8",
      surface: "#ffffff",
      surfaceElevated: "#f7f2f0",
      text: mojang.offBlack,
      textDim: "#6b6461",
      border: "#c3b8b3",
      overlay: "rgba(23, 22, 21, 0.55)",
    };
  }, [activeShape.palette, isDark]);

  return (
    <BlockThemeContext.Provider
      value={{
        activeShape,
        shapes: BLOCK_THEMES,
        setShapeById,
        theme,
        colorMode,
        isDark,
        toggleColorMode,
        setColorMode,
      }}
    >
      {children}
    </BlockThemeContext.Provider>
  );
}

export function useBlockTheme() {
  const context = useContext(BlockThemeContext);
  return context || DEFAULT_THEME_CONTEXT;
}

