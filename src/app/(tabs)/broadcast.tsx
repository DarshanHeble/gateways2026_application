import React, { Suspense, lazy } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { colors } from "@/theme/tokens";

const BroadcastScreen = lazy(() =>
  import("@/features/notifications/BroadcastScreen").then((mod) => ({
    default: mod.BroadcastScreen,
  }))
);

export default function BroadcastTab() {
  return (
    <Suspense
      fallback={
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.gold.bright} />
        </View>
      }
    >
      <BroadcastScreen />
    </Suspense>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: "#0d1018",
    alignItems: "center",
    justifyContent: "center",
  },
});
