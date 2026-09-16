import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNetwork } from '@/modules/core/NetworkProvider';

/**
 * The little corner dot. It used to run its own /health poll every 5 seconds;
 * connectivity now comes from NetworkProvider, so this is purely presentational
 * and the whole app agrees on what "online" means.
 *
 * Three states, because "device is offline" and "our tunnel is down" are
 * different problems and the second one is the common one in dev:
 *   green  — backend reachable
 *   amber  — device online, backend not answering (dead tunnel / server down)
 *   red    — device offline
 */
export function ConnectionStatus() {
  const insets = useSafeAreaInsets();
  const { isOnline, isBackendReachable } = useNetwork();

  const color = !isOnline
    ? '#FF5555'
    : isBackendReachable === false
      ? '#FFAA00'
      : isBackendReachable
        ? '#55FF55'
        : '#8D8D8D'; // not yet probed

  return (
    <View style={[styles.container, { top: insets.top + 10 }]} pointerEvents="none">
      <View style={[styles.dot, { backgroundColor: color }]} />
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
