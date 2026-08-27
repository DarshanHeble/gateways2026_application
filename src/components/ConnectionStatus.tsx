import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import axios from 'axios';
import { API_BASE_URL } from '@/services/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function ConnectionStatus() {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const checkConnection = async () => {
      try {
        await axios.get(`${API_BASE_URL.replace('/api/v1', '')}/health`, { timeout: 3000 });
        setIsConnected(true);
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
