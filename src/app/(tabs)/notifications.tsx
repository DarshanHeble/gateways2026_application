import React, { Suspense, lazy } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { colors } from "@/theme/tokens";

const NotificationsScreen = lazy(() =>
  import("@/features/notifications/NotificationsScreen").then((mod) => ({
    default: mod.NotificationsScreen,
  }))
);

export default function NotificationsTab() {
  return (
    <Suspense
      fallback={
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.gold.bright} />
        </View>
      }
    >
      <NotificationsScreen />
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
