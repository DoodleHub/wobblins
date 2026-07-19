import { Stack } from "expo-router";

import { SupabaseProvider } from "@/supabase/SupabaseProvider";

export default function RootLayout() {
  return (
    <SupabaseProvider>
      <Stack />
    </SupabaseProvider>
  );
}
