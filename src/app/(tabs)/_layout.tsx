import React from "react";
import { Tabs, Redirect } from "expo-router";
import { useAuth } from "@/modules/auth";
import { useNotifications } from "@/modules/notifications";
import { Hotbar } from "@/components/mc/Hotbar";
import { PixelIcon } from "@/components/mc/PixelIcon";

export default function TabLayout() {
  const { role } = useAuth();
  const { unreadCount } = useNotifications();

  if (!role) {
    return <Redirect href="/login" />;
  }

  const isTeam = role === "team";

  return (
    <Tabs
      // The bar is drawn wholesale by `Hotbar` — see that file for why the
      // stock one couldn't be styled into a hotbar from here.
      tabBar={(props) => <Hotbar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          headerShown: false,
          tabBarIcon: ({ focused }) => <PixelIcon name="home" size={24} opacity={focused ? 1 : undefined} />,
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: "Schedule",
          tabBarIcon: ({ focused }) => <PixelIcon name="schedule" size={24} opacity={focused ? 1 : undefined} />,
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: "Events",
          tabBarIcon: ({ focused }) => <PixelIcon name="events" size={24} opacity={focused ? 1 : undefined} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Alerts",
          tabBarIcon: ({ focused }) => <PixelIcon name="alerts" size={24} opacity={focused ? 1 : undefined} />,
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Settings",
          tabBarIcon: ({ focused }) => <PixelIcon name="settings" size={24} opacity={focused ? 1 : undefined} />,
        }}
      />
      <Tabs.Screen
        name="contact"
        options={{
          title: "Crew", // Seven hotbar slots leave ~55pt per label; "Team Contact" clipped.
          tabBarIcon: ({ focused }) => <PixelIcon name="crew" size={24} opacity={focused ? 1 : undefined} />,
          href: isTeam ? "/contact" : null, // hides the tab if not team
        }}
      />
      <Tabs.Screen
        name="broadcast"
        options={{
          title: "Shout",  // Likewise — and "shout" is what a broadcast is, in-world.
          tabBarIcon: ({ focused }) => <PixelIcon name="shout" size={24} opacity={focused ? 1 : undefined} />,
          href: isTeam ? "/broadcast" : null, // hides the tab if not team
        }}
      />
    </Tabs>
  );
}
