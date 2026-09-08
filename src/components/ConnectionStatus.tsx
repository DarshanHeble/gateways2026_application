import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { API_ROOT_URL } from '@/services/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function ConnectionStatus() {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const checkConnection = async () => {
      // 1. Try configured API_ROOT_URL
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);
        const res = await fetch(`${API_ROOT_URL}/health`, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
          setIsConnected(true);
          return;
        }
      } catch {}

      // 2. Fallback to direct USB adb reverse port
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const res = await fetch(`http://localhost:5000/health`, { signal: controller.signal });
        clearTimeout(timeoutId);
        setIsConnected(res.ok);
      } catch {
        setIsConnected(false);
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={[styles.container, { top: insets.top + 10 }]}>
      <View style={[styles.dot, { backgroundColor: isConnected ? '#55FF55' : '#FF5555' }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 20,
    zIndex: 9999,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 0, // Minecraft style block!
    borderWidth: 2,
    borderColor: '#12111A',
  }
});
