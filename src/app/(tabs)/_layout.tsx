import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import type { ComponentProps } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { COLORS } from "@/constants/theme";
import { TAB_BAR_HEIGHT } from "@/hooks/useTabBarClearance";

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
          // Flush with the true bottom edge and full device width (edge-to-edge, no
          // floating side margins or rounded top corners) so there's no empty strip
          // below or beside the bar. The bar's own height absorbs the safe-area inset
          // instead — its background extends through that inset, with `paddingBottom`
          // keeping the tappable icons above it.
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: TAB_BAR_HEIGHT + insets.bottom,
          paddingBottom: insets.bottom,
          backgroundColor: COLORS.surface,
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
        },
        tabBarItemStyle: {
          justifyContent: "center",
        },
        tabBarLabelStyle: {
          fontFamily: "Manrope_600SemiBold",
          fontSize: 11,
          marginTop: 4,
        },
        tabBarIcon: ({ focused, color }) => (
          <Ionicons
            name={focused ? ICONS[route.name] : ICONS_OUTLINE[route.name]}
            size={22}
            color={color}
          />
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
