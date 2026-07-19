import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Copy .env.example to .env and fill in your project values."
  );
}

// expo-router's web static output renders this module on Node, where
// `window` (and AsyncStorage's underlying localStorage) doesn't exist.
// No-op the storage adapter in that environment instead of crashing.
const isServer = typeof window === "undefined";

const storage = isServer
  ? {
      getItem: async () => null,
      setItem: async () => {},
      removeItem: async () => {},
    }
  : AsyncStorage;

export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    storage,
    autoRefreshToken: !isServer,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
