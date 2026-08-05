import { View, Text, StyleSheet, Pressable } from "react-native";
import { colors, fonts } from "@/theme/tokens";
import { px } from "@/theme/scale";
import { useAuth } from "@/features/auth/AuthContext";
import { router } from "expo-router";

export default function ProfileTab() {
  const { role, logout } = useAuth();

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Your Profile</Text>
      <Text style={styles.body}>Logged in as: {role?.toUpperCase()}</Text>

      <Pressable onPress={handleLogout} style={styles.button}>
        <Text style={styles.buttonText}>LOGOUT</Text>
      </Pressable>
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
    gap: px(16),
  },
  title: {
    fontFamily: fonts.pixelBold,
    fontSize: px(18),
    color: colors.gold.title,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: px(14),
    color: colors.body,
  },
  button: {
    marginTop: px(16),
    paddingVertical: px(12),
    paddingHorizontal: px(24),
    backgroundColor: colors.gold.muted,
    borderRadius: px(8),
  },
  buttonText: {
    fontFamily: fonts.pixelBold,
    color: colors.stage,
    fontSize: px(12),
  },
});
