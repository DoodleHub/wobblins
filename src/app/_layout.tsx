import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
} from "@expo-google-fonts/manrope";
import {
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from "@expo-google-fonts/space-grotesk";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { View } from "react-native";

import { LoadingScreen } from "@/components/LoadingScreen";
import { COLORS } from "@/constants/theme";
import { SupabaseProvider, useSupabase } from "@/supabase/SupabaseProvider";

import "../../global.css";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SupabaseProvider>
        <RootNavigation />
      </SupabaseProvider>
    </QueryClientProvider>
  );
}

/**
 * Every screen outside login/signup reads `session.user.id` (directly or via a
 * query's `enabled: !!playerId`), so without a session those queries just sit
 * disabled forever — no request, no error, nothing but the skeleton. Nothing
 * upstream previously redirected an unauthenticated visit to "/" away from
 * the tab navigator, so hitting a protected route with no session (or an
 * expired one) looked like a stuck loading screen instead of a login prompt.
 */
function RootNavigation() {
  const { session, isLoading } = useSupabase();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    const inAuthGroup = segments[0] === "login" || segments[0] === "signup";
    if (!session && !inAuthGroup) {
      router.replace("/login");
    }
  }, [session, isLoading, segments, router]);

  return (
    <View className="flex-1 bg-background">
      <StatusBar style="light" />
      {isLoading ? (
        <LoadingScreen />
      ) : (
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: COLORS.background },
          }}
        />
      )}
    </View>
  );
}
