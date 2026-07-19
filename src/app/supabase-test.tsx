import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";

import { supabase } from "@/supabase/client";
import { useSupabase } from "@/supabase/SupabaseProvider";

type ConnectionState =
  | { status: "checking" }
  | { status: "connected"; latencyMs: number }
  | { status: "error"; message: string };

export default function SupabaseTestScreen() {
  const { session, isLoading } = useSupabase();
  const [connection, setConnection] = useState<ConnectionState>({ status: "checking" });

  const runConnectionCheck = useCallback(async () => {
    setConnection({ status: "checking" });
    const startedAt = Date.now();
    try {
      // Hits the Storage API, which responds regardless of whether any
      // tables/buckets exist yet — a real network round trip to the project.
      const { error } = await supabase.storage.listBuckets();
      if (error) throw error;
      setConnection({ status: "connected", latencyMs: Date.now() - startedAt });
    } catch (err) {
      setConnection({
        status: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }, []);

  useEffect(() => {
    runConnectionCheck();
  }, [runConnectionCheck]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Supabase Connection Test</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Project URL</Text>
        <Text style={styles.value}>{process.env.EXPO_PUBLIC_SUPABASE_URL ?? "not set"}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>API connectivity</Text>
        {connection.status === "checking" && (
          <View style={styles.row}>
            <ActivityIndicator />
            <Text style={styles.value}>Checking…</Text>
          </View>
        )}
        {connection.status === "connected" && (
          <Text style={[styles.value, styles.success]}>
            ✅ Connected ({connection.latencyMs}ms)
          </Text>
        )}
        {connection.status === "error" && (
          <Text style={[styles.value, styles.error]}>❌ {connection.message}</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Auth session</Text>
        {isLoading ? (
          <Text style={styles.value}>Loading…</Text>
        ) : session ? (
          <Text style={styles.value}>Signed in as {session.user.email ?? session.user.id}</Text>
        ) : (
          <Text style={styles.value}>No active session (expected before login)</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    gap: 16,
    backgroundColor: "#0b0f1a",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#f5f5f5",
    marginBottom: 8,
  },
  card: {
    backgroundColor: "#161b2c",
    borderRadius: 12,
    padding: 16,
    gap: 6,
  },
  label: {
    fontSize: 13,
    color: "#8a90a6",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 15,
    color: "#f5f5f5",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  success: {
    color: "#4ade80",
  },
  error: {
    color: "#f87171",
  },
});
