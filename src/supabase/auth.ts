import { supabase } from "./client";

export function signInWithEmail(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export function signUpWithEmail(email: string, password: string) {
  return supabase.auth.signUp({ email, password });
}

export function signOut() {
  return supabase.auth.signOut();
}

/**
 * Whether the given auth user has finished character creation. The `players`
 * row itself is always created server-side by a trigger on `auth.users`
 * insert (with a placeholder username), so row existence alone can't tell
 * onboarded players apart from ones who haven't chosen a username yet —
 * `onboarding_completed` is the flag that actually tracks that.
 */
export async function hasPlayerProfile(userId: string) {
  const { data, error } = await supabase
    .from("players")
    .select("onboarding_completed")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data?.onboarding_completed ?? false;
}

/**
 * Sets the username and avatar on the caller's `players` row and marks
 * onboarding complete. The row itself is created server-side by a trigger on
 * `auth.users` insert, so this only ever updates it (there is no
 * client-facing INSERT policy on `players`).
 */
export function completeCharacterCreation(userId: string, username: string, avatar: string) {
  return supabase
    .from("players")
    .update({ username, avatar, onboarding_completed: true })
    .eq("id", userId);
}
