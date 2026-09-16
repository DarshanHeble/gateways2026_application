import React from "react";
import { View, Pressable, StyleSheet, Platform } from "react-native";
import { Tabs, Redirect } from "expo-router";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/modules/auth";
import { useNotifications } from "@/modules/notifications";
import { useM3Theme } from "@/theme/M3ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { fonts } from "@/theme/tokens";
import { px } from "@/theme/scale";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { role } = useAuth();
  const { unreadCount } = useNotifications();
  const { theme, isDark } = useM3Theme();

  if (!role) {
    return <Redirect href="/login" />;
  }

  const isTeam = role === "team";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textDim,
        tabBarShowLabel: true,
        tabBarButton: (props: any) => {
          const isActive = props.accessibilityState?.selected;
          return (
            <Pressable
              {...props}
              android_ripple={{ color: theme.primaryContainer, borderless: false }}
              style={({ pressed }) => [
                props.style,
                {
                  borderWidth: 2,
                  borderColor: isActive ? theme.primary : "transparent",
                  backgroundColor: isActive ? theme.primaryContainer : (pressed ? theme.surfaceTint : "transparent"),
                  borderRadius: 0,
                  marginHorizontal: 8,
                  marginVertical: 4,
                  // Ensure flex layout centers the icon and text correctly within the border
                  justifyContent: 'center',
                  alignItems: 'center',
                  flex: 1,
                }
              ]}
            />
          );
        },
        tabBarLabelStyle: {
          fontFamily: fonts.pixelBold,
          fontSize: 11,
          letterSpacing: 0.5,
          marginTop: -2,
        },
        tabBarStyle: {
          height: 64 + insets.bottom,
          paddingBottom: insets.bottom + 4,
          paddingTop: 4,
          backgroundColor: theme.surfaceElevated,
          borderTopWidth: 1,
          borderTopColor: theme.border,
          elevation: 10,
        },

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
          title: "Settings",
          tabBarIcon: ({ color }) => <Ionicons name="settings" size={24} color={color} />,
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
