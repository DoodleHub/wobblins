import { Stack } from "expo-router";

import { SupabaseProvider } from "@/supabase/SupabaseProvider";

import "../../global.css";

export default function RootLayout() {
  return (
    <SupabaseProvider>
      <Stack />
    </SupabaseProvider>
  );
}
