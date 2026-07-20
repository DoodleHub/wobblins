import { supabase } from "./client";
import type { Tables } from "./database.types";

export type Achievement = Tables<"achievements">;
export type PlayerAchievement = Tables<"player_achievements"> & { achievement: Achievement };

/** All achievement definitions, static reference data — ordered for stable display. */
export async function getAchievements() {
  const { data, error } = await supabase.from("achievements").select("*").order("sort_order");

  if (error) throw error;
  return data as Achievement[];
}

/** The achievements this player has already unlocked. */
export async function getPlayerAchievements(playerId: string) {
  const { data, error } = await supabase
    .from("player_achievements")
    .select("*, achievement:achievements(*)")
    .eq("player_id", playerId);

  if (error) throw error;
  return data as PlayerAchievement[];
}

export type CheckAchievementsResult = { unlocked: Achievement[]; gold_awarded: number };

/**
 * Re-derives which achievements the caller now qualifies for (Wobblins owned,
 * battles won, player level, login streak) via the `check_achievements` RPC,
 * inserts any newly met ones, and credits their gold reward — all server-side,
 * so a tampered client can't unlock achievements or grant itself gold directly.
 */
export async function checkAchievements() {
  const { data, error } = await supabase.rpc("check_achievements");

  if (error) throw error;
  return data as unknown as CheckAchievementsResult;
}
