import { View, Text, StyleSheet } from "react-native";
import { colors, fonts } from "@/theme/tokens";
import { px } from "@/theme/scale";

export default function ScheduleTab() {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>Event Schedule</Text>
      <Text style={styles.body}>View the upcoming timelines and stages here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.stage,
    padding: px(16),
  },
  title: {
    fontFamily: fonts.pixelBold,
    fontSize: px(18),
    color: colors.gold.title,
    marginBottom: px(8),
  },
  body: {
    fontFamily: fonts.body,
    fontSize: px(14),
    color: colors.body,
  },
});
