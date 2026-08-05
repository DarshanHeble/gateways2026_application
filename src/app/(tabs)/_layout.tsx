import { Tabs, Redirect } from "expo-router";
import { useAuth } from "@/features/auth/AuthContext";
import { colors } from "@/theme/tokens";
import { Ionicons } from "@expo/vector-icons";

export default function TabLayout() {
  const { role } = useAuth();

  if (!role) {
    return <Redirect href="/login" />;
  }

  const isTeam = role === "team";

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.stage },
        headerTintColor: colors.gold.title,
        tabBarStyle: { backgroundColor: colors.stage, borderTopColor: colors.gold.muted },
        tabBarActiveTintColor: colors.gold.title,
        tabBarInactiveTintColor: colors.gold.muted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
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
    </Tabs>
  );
}
