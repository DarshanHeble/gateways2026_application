import React from "react";
import { Tabs, Redirect } from "expo-router";
import { useAuth } from "@/modules/auth";
import { useNotifications } from "@/modules/notifications";
import { Hotbar } from "@/components/mc/Hotbar";
import { TabGlyph } from "@/components/mc/TabGlyph";

export default function TabLayout() {
  const { role } = useAuth();
  const { unreadCount } = useNotifications();

  if (!role) {
    return <Redirect href="/login" />;
  }

  const isTeam = role === "team";

  return (
    <Tabs
      // The bar is drawn by `Hotbar`, which also handles the selected and
      // unselected look of these icons.
      tabBar={(props) => <Hotbar {...props} />}
      screenOptions={{
        headerShown: false,
        lazy: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          headerShown: false,
          tabBarIcon: ({ focused, color, size }) => (
            <TabGlyph name="home" size={size} color={color} filled={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: "Schedule",
          tabBarIcon: ({ focused, color, size }) => (
            <TabGlyph name="schedule" size={size} color={color} filled={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: "Events",
          tabBarIcon: ({ focused, color, size }) => (
            <TabGlyph name="events" size={size} color={color} filled={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Alerts",
          tabBarIcon: ({ focused, color, size }) => (
            <TabGlyph name="alerts" size={size} color={color} filled={focused} />
          ),
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Settings",
          tabBarIcon: ({ focused, color, size }) => (
            <TabGlyph name="settings" size={size} color={color} filled={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="contact"
        options={{
          title: "Crew", // Seven hotbar slots leave ~55pt per label; "Team Contact" clipped.
          tabBarIcon: ({ focused, color, size }) => (
            <TabGlyph name="crew" size={size} color={color} filled={focused} />
          ),
          href: isTeam ? "/contact" : null, // hides the tab if not team
        }}
      />
      <Tabs.Screen
        name="broadcast"
        options={{
          title: "Shout",  // Likewise — and "shout" is what a broadcast is, in-world.
          tabBarIcon: ({ focused, color, size }) => (
            <TabGlyph name="shout" size={size} color={color} filled={focused} />
          ),
          href: isTeam ? "/broadcast" : null, // hides the tab if not team
        }}
      />
    </Tabs>
  );
}
