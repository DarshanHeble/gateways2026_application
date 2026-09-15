import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";

export interface M3ShapeDefinition {
  id: string;
  name: string;
  category: "Pill" | "Squircle" | "Flower" | "Burst" | "Gem" | "Circle";
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
  styleConfig: {
    width: number;
    height: number;
    borderTopLeftRadius: number;
    borderTopRightRadius: number;
    borderBottomRightRadius: number;
    borderBottomLeftRadius: number;
    svgType?: "path" | "polygon" | "none";
    svgPath?: string;
  };
}

export const M3_EXPRESSIVE_SHAPES: M3ShapeDefinition[] = [
  {
    id: "stadium_pill",
    name: "Stadium Pill",
    category: "Pill",
    seedColor: "#dfb15b", // Parallax Amber Gold
    palette: {
      primary: "#dfb15b",
      onPrimary: "#070b12",
      primaryContainer: "rgba(223, 177, 91, 0.14)",
      surfaceTint: "rgba(223, 177, 91, 0.08)",
      auraGlow: "rgba(223, 177, 91, 0.24)",
      rimBorder: "rgba(223, 177, 91, 0.35)",
      subtleText: "#d6c8aa",
      ambientTop: "rgba(91, 162, 184, 0.12)",
      ambientBottom: "rgba(223, 177, 91, 0.12)",
    },
    styleConfig: {
      width: 230,
      height: 300,
      borderTopLeftRadius: 115,
      borderTopRightRadius: 115,
      borderBottomRightRadius: 115,
      borderBottomLeftRadius: 115,
      svgType: "none",
    },
  },
  {
    id: "diamond_squircle",
    name: "Soft Squircle",
    category: "Squircle",
    seedColor: "#06b6d4", // Christ Cyan / Teal
    palette: {
      primary: "#06b6d4",
      onPrimary: "#070b12",
      primaryContainer: "rgba(6, 182, 212, 0.16)",
      surfaceTint: "rgba(6, 182, 212, 0.08)",
      auraGlow: "rgba(6, 182, 212, 0.25)",
      rimBorder: "rgba(6, 182, 212, 0.38)",
      subtleText: "#cffafe",
      ambientTop: "rgba(6, 182, 212, 0.16)",
      ambientBottom: "rgba(14, 116, 144, 0.08)",
    },
    styleConfig: {
      width: 260,
      height: 260,
      borderTopLeftRadius: 75,
      borderTopRightRadius: 75,
      borderBottomRightRadius: 75,
      borderBottomLeftRadius: 75,
      svgType: "none",
    },
  },
  {
    id: "clover_flower",
    name: "Clover Flower",
    category: "Flower",
    seedColor: "#10b981", // Lush Canopy Emerald
    palette: {
      primary: "#10b981",
      onPrimary: "#070b12",
      primaryContainer: "rgba(16, 185, 129, 0.15)",
      surfaceTint: "rgba(16, 185, 129, 0.08)",
      auraGlow: "rgba(16, 185, 129, 0.25)",
      rimBorder: "rgba(16, 185, 129, 0.35)",
      subtleText: "#d1fae5",
      ambientTop: "rgba(16, 185, 129, 0.14)",
      ambientBottom: "rgba(5, 150, 105, 0.12)",
    },
    styleConfig: {
      width: 260,
      height: 260,
      borderTopLeftRadius: 130,
      borderTopRightRadius: 36,
      borderBottomRightRadius: 130,
      borderBottomLeftRadius: 36,
      svgType: "none",
    },
  },
  {
    id: "faceted_gem",
    name: "Faceted Gem",
    category: "Gem",
    seedColor: "#a855f7", // Nether Amethyst / Portal Violet
    palette: {
      primary: "#a855f7",
      onPrimary: "#ffffff",
      primaryContainer: "rgba(168, 85, 247, 0.16)",
      surfaceTint: "rgba(168, 85, 247, 0.08)",
      auraGlow: "rgba(168, 85, 247, 0.26)",
      rimBorder: "rgba(168, 85, 247, 0.4)",
      subtleText: "#e9d5ff",
      ambientTop: "rgba(168, 85, 247, 0.14)",
      ambientBottom: "rgba(78, 42, 107, 0.12)",
    },
    styleConfig: {
      width: 260,
      height: 260,
      borderTopLeftRadius: 50,
      borderTopRightRadius: 50,
      borderBottomRightRadius: 50,
      borderBottomLeftRadius: 50,
      svgType: "none",
    },
  },
  {
    id: "solar_burst",
    name: "Solar Burst",
    category: "Burst",
    seedColor: "#ff5722", // Flame Solar Core
    palette: {
      primary: "#ff5722",
      onPrimary: "#070b12",
      primaryContainer: "rgba(255, 87, 34, 0.16)",
      surfaceTint: "rgba(255, 87, 34, 0.08)",
      auraGlow: "rgba(255, 87, 34, 0.25)",
      rimBorder: "rgba(255, 87, 34, 0.38)",
      subtleText: "#ffccbc",
      ambientTop: "rgba(255, 87, 34, 0.14)",
      ambientBottom: "rgba(191, 54, 12, 0.10)",
    },
    styleConfig: {
      width: 250,
      height: 250,
      borderTopLeftRadius: 52,
      borderTopRightRadius: 52,
      borderBottomRightRadius: 52,
      borderBottomLeftRadius: 52,
      svgType: "none",
    },
  },
  {
    id: "pure_circle",
    name: "Full Circle",
    category: "Circle",
    seedColor: "#3b82f6", // Electric Sapphire Blue
    palette: {
      primary: "#3b82f6",
      onPrimary: "#070b12",
      primaryContainer: "rgba(59, 130, 246, 0.15)",
      surfaceTint: "rgba(59, 130, 246, 0.08)",
      auraGlow: "rgba(59, 130, 246, 0.24)",
      rimBorder: "rgba(59, 130, 246, 0.35)",
      subtleText: "#dbeafe",
      ambientTop: "rgba(59, 130, 246, 0.14)",
      ambientBottom: "rgba(29, 78, 216, 0.08)",
    },
    styleConfig: {
      width: 260,
      height: 260,
      borderTopLeftRadius: 130,
      borderTopRightRadius: 130,
      borderBottomRightRadius: 130,
      borderBottomLeftRadius: 130,
      svgType: "none",
    },
  },
];

const STORAGE_SHAPE_KEY = "@gateways_m3_shape_id_v2";
const STORAGE_COLOR_MODE_KEY = "@gateways_color_mode_v1";

export type ColorMode = "dark" | "light";

interface M3ThemeContextType {
  activeShape: M3ShapeDefinition;
  shapes: M3ShapeDefinition[];
  setShapeById: (shapeId: string) => Promise<void>;
  theme: M3ShapeDefinition["palette"];
  colorMode: ColorMode;
  isDark: boolean;
  toggleColorMode: () => Promise<void>;
  setColorMode: (mode: ColorMode) => Promise<void>;
}

const DEFAULT_SHAPE = M3_EXPRESSIVE_SHAPES[0];

const DEFAULT_THEME_CONTEXT: M3ThemeContextType = {
  activeShape: DEFAULT_SHAPE,
  shapes: M3_EXPRESSIVE_SHAPES,
  setShapeById: async () => {},
  theme: DEFAULT_SHAPE.palette,
  colorMode: "dark",
  isDark: true,
  toggleColorMode: async () => {},
  setColorMode: async () => {},
};

const M3ThemeContext = createContext<M3ThemeContextType>(DEFAULT_THEME_CONTEXT);

export function M3ThemeProvider({ children }: { children: React.ReactNode }) {
  const [activeShapeId, setActiveShapeId] = useState<string>("stadium_pill");
  const [colorMode, setColorModeState] = useState<ColorMode>("dark");

  useEffect(() => {
    async function loadSavedState() {
      try {
        const [savedShape, savedMode] = await Promise.all([
          AsyncStorage.getItem(STORAGE_SHAPE_KEY),
          AsyncStorage.getItem(STORAGE_COLOR_MODE_KEY),
        ]);
        if (savedShape && M3_EXPRESSIVE_SHAPES.some((s) => s.id === savedShape)) {
          setActiveShapeId(savedShape);
        }
        if (savedMode === "light" || savedMode === "dark") {
          setColorModeState(savedMode);
        }
      } catch (err) {
        console.warn("Failed to load saved M3 theme settings:", err);
      }
    }
    loadSavedState();
  }, []);

  const activeShape = useMemo(() => {
    return (
      M3_EXPRESSIVE_SHAPES.find((s) => s.id === activeShapeId) ||
      DEFAULT_SHAPE
    );
  }, [activeShapeId]);

  const setShapeById = async (shapeId: string) => {
    const found = M3_EXPRESSIVE_SHAPES.find((s) => s.id === shapeId);
    if (!found) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setActiveShapeId(shapeId);
    try {
      await AsyncStorage.setItem(STORAGE_SHAPE_KEY, shapeId);
    } catch (err) {
      console.warn("Failed to save M3 shape:", err);
    }
  };

  const setColorMode = async (mode: ColorMode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
  const theme = useMemo(() => {
    const base = activeShape.palette;
    if (isDark) {
      return base;
    }
    // High-readability light mode overrides
    return {
      ...base,
      onPrimary: "#ffffff",
      primaryContainer: base.primaryContainer.replace(/0\.\d+/, "0.12"),
      surfaceTint: base.surfaceTint.replace(/0\.\d+/, "0.06"),
      auraGlow: base.auraGlow.replace(/0\.\d+/, "0.12"),
      rimBorder: base.rimBorder.replace(/0\.\d+/, "0.28"),
      subtleText: "#475569",
    };
  }, [activeShape.palette, isDark]);

  return (
    <M3ThemeContext.Provider
      value={{
        activeShape,
        shapes: M3_EXPRESSIVE_SHAPES,
        setShapeById,
        theme,
        colorMode,
        isDark,
        toggleColorMode,
        setColorMode,
      }}
    >
      {children}
    </M3ThemeContext.Provider>
  );
}

export function useM3Theme() {
  const context = useContext(M3ThemeContext);
  return context || DEFAULT_THEME_CONTEXT;
}

