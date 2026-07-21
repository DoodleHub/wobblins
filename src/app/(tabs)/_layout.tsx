import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import type { ComponentProps } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { COLORS } from "@/constants/theme";

const ICONS: Record<string, ComponentProps<typeof Ionicons>["name"]> = {
  index: "home",
  explore: "compass",
  collection: "library",
  profile: "person",
};

const ICONS_OUTLINE: Record<string, ComponentProps<typeof Ionicons>["name"]> = {
  index: "home-outline",
  explore: "compass-outline",
  collection: "library-outline",
  profile: "person-outline",
};

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSubtle,
        tabBarStyle: {
          position: "absolute",
          left: 16,
          right: 16,
          bottom: insets.bottom + 8,
          height: 78,
          paddingBottom: 0,
          borderRadius: 24,
          backgroundColor: COLORS.surface,
          borderWidth: 1,
          borderColor: COLORS.border,
          elevation: 8,
          shadowColor: "#000",
          shadowOpacity: 0.3,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
        },
        tabBarItemStyle: {
          paddingTop: 12,
        },
        tabBarLabelStyle: {
          fontFamily: "Manrope_600SemiBold",
          fontSize: 11,
          marginTop: 2,
        },
        tabBarIcon: ({ focused, color }) => (
          <View
            className="items-center justify-center rounded-2xl"
            style={{ width: 40, height: 28, backgroundColor: focused ? COLORS.primary : "transparent" }}
          >
            <Ionicons
              name={focused ? ICONS[route.name] : ICONS_OUTLINE[route.name]}
              size={20}
              color={focused ? "#ffffff" : color}
            />
          </View>
        ),
      })}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="explore" options={{ title: "Explore" }} />
      <Tabs.Screen name="collection" options={{ title: "Collection" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
