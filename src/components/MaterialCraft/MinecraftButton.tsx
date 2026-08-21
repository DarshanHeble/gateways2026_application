import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { Button, useTheme } from 'react-native-paper';

interface Props extends React.ComponentProps<typeof Button> {
  mode?: 'text' | 'outlined' | 'contained' | 'elevated' | 'contained-tonal';
  style?: ViewStyle;
}

export const MinecraftButton: React.FC<Props> = ({ style, mode = 'contained', children, ...props }) => {
  const theme = useTheme();

  return (
    <Button
      mode={mode}
      style={[
        styles.base,
        mode === 'contained' && {
          backgroundColor: theme.colors.primary,
          borderBottomWidth: 4,
          borderRightWidth: 4,
          borderTopWidth: 2,
          borderLeftWidth: 2,
          borderBottomColor: '#204E4E', // Darker shade for 3D depth
          borderRightColor: '#204E4E',
          borderTopColor: '#A4FFFF', // Lighter shade for 3D highlight
          borderLeftColor: '#A4FFFF',
        },
        mode === 'outlined' && {
          borderWidth: 2,
          borderColor: theme.colors.outline,
        },
        style
      ]}
      labelStyle={[
        styles.label,
        mode === 'contained' && { color: theme.colors.onPrimary }
      ]}
      {...props}
    >
      {children}
    </Button>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: 0,
    marginVertical: 4,
  },
  label: {
    fontFamily: 'Silkscreen_400Regular',
    fontSize: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 0,
  }
});
