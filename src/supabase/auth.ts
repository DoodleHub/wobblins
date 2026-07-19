import { supabase } from "./client";

export function signInWithEmail(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export function signUpWithEmail(email: string, password: string) {
  return supabase.auth.signUp({ email, password });
}

/** Whether the given auth user already has a `players` row (RLS-scoped to their own). */
export async function hasPlayerProfile(userId: string) {
  const { data, error } = await supabase
    .from("players")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data !== null;
}
