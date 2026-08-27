import { MD3DarkTheme } from 'react-native-paper';
import { ThemeProp } from 'react-native-paper/lib/typescript/types';

// The Minecraft + Material UI Override Theme
export const minecraftTheme: ThemeProp = {
  ...MD3DarkTheme,
  // 1. Force all rounded corners to 0 for the blocky look
  roundness: 0, 
  
  colors: {
    ...MD3DarkTheme.colors,
    
    // Core Minecraft Palette
    primary: '#51E1DF', // Diamond Blue
    onPrimary: '#12111A', 
    primaryContainer: '#204E4E',
    onPrimaryContainer: '#51E1DF',
    
    secondary: '#FFAA00', // Gold
    onSecondary: '#12111A',
    secondaryContainer: '#4B3600',
    onSecondaryContainer: '#FFAA00',
    
    tertiary: '#55FF55', // Emerald Green
    onTertiary: '#12111A',
    tertiaryContainer: '#1C4B1C',
    onTertiaryContainer: '#55FF55',
    
    error: '#FF5555', // Redstone
    onError: '#12111A',
    errorContainer: '#4B1C1C',
    onErrorContainer: '#FF5555',
    
    // Backgrounds
    background: '#0d1018', // Deep slate
    onBackground: '#FFFFFF',
    surface: '#202736', // Stone gray
    onSurface: '#FFFFFF',
    surfaceVariant: '#34281a', // Dirt brown edge
    onSurfaceVariant: '#d8c5a4',
    
    outline: '#c8a679', // Wood trim
    outlineVariant: '#2a1e12', // Dark wood trim
    
    elevation: {
      level0: 'transparent',
      level1: '#161b26',
      level2: '#202736',
      level3: '#2a3245',
      level4: '#2e3b52',
      level5: '#384865',
    }
  },
  
  fonts: {
    ...MD3DarkTheme.fonts,
    labelLarge: {
      ...MD3DarkTheme.fonts.labelLarge,
      fontFamily: 'Rubik-Black', 
      letterSpacing: 1,
    }
  },
};
