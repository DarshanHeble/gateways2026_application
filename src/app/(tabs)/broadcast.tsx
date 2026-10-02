import { FadeOnFocus } from "@/components/FadeOnFocus";
import React, { Suspense, lazy } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { colors } from "@/theme/tokens";

const BroadcastScreen = lazy(() =>
  import("@/modules/notifications").then((mod) => ({
    default: mod.BroadcastScreen,
  }))
);

export default function BroadcastTab() {
  return (
    <View style={{ flex: 1, backgroundColor: "#0d1018" }}>
      <FadeOnFocus>
        <Suspense
          fallback={
            <View style={styles.center}>
              <ActivityIndicator size="large" color={colors.gold.bright} />
            </View>
          }
        >
          <BroadcastScreen />
        </Suspense>
      </FadeOnFocus>
    </View>
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
