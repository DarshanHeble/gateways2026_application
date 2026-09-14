import React from "react";
import { View, StyleSheet, Platform } from "react-native";
import { Tabs, Redirect } from "expo-router";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/features/auth/AuthContext";
import { useNotifications } from "@/features/notifications/NotificationsContext";
import { useM3Theme } from "@/theme/M3ThemeContext";
import { Ionicons } from "@expo/vector-icons";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { role } = useAuth();
  const { unreadCount } = useNotifications();
  const { theme } = useM3Theme();

  if (!role) {
    return <Redirect href="/login" />;
  }

  const isTeam = role === "team";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: "#7e8b9b",
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
          marginTop: -2,
        },
        tabBarStyle: {
          position: "absolute",
          bottom: Platform.OS === "ios" ? Math.max(insets.bottom, 12) + 6 : 16,
          left: 16,
          right: 16,
          height: 64,
          borderRadius: 24,
          backgroundColor: "transparent",
          borderTopWidth: 0,
          borderWidth: 1.2,
          borderColor: theme.rimBorder,
          shadowColor: theme.primary,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.35,
          shadowRadius: 18,
          elevation: 12,
          overflow: "hidden",
          paddingBottom: Platform.OS === "ios" ? 0 : 8,
          paddingTop: 8,
        },
        tabBarBackground: () => (
          <View style={StyleSheet.absoluteFill}>
            <BlurView
              intensity={Platform.OS === "ios" ? 50 : 70}
              tint="dark"
              blurMethod="none"
              style={StyleSheet.absoluteFill}
            />
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor: "rgba(10, 15, 26, 0.65)", // Translucent tinted glass - elements behind are visible through the blur!
                },
              ]}
            />
          </View>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          headerShown: false,
          tabBarIcon: ({ color }) => <Ionicons name="home" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: "Schedule",
          tabBarIcon: ({ color }) => <Ionicons name="calendar" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: "Events",
          tabBarIcon: ({ color }) => <Ionicons name="list" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Alerts",
          tabBarIcon: ({ color }) => <Ionicons name="notifications" size={24} color={color} />,
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => <Ionicons name="person" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="contact"
        options={{
          title: "Team Contact",
          tabBarIcon: ({ color }) => <Ionicons name="call" size={24} color={color} />,
          href: isTeam ? "/contact" : null, // hides the tab if not team
        }}
      />
      <Tabs.Screen
        name="broadcast"
        options={{
          title: "Broadcast",
          tabBarIcon: ({ color }) => <Ionicons name="megaphone" size={24} color={color} />,
          href: isTeam ? "/broadcast" : null, // hides the tab if not team
        }}
      />
    </Tabs>
  );
}
