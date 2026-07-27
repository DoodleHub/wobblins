import { supabase } from "./client";
import type { Database } from "./database.types";

export type PlayerAchievement =
  Database["public"]["Functions"]["get_player_achievements"]["Returns"][number];

/**
 * Fetches the caller's progress across every achievement definition via the
 * `get_player_achievements` RPC. `current_value`/`unlocked` are always re-derived
 * server-side (live Wobblin counts plus lifetime counters on `players`), never
 * computed client-side — same "server computes truth" pattern as the rest of the app.
 */
export async function getPlayerAchievements(): Promise<PlayerAchievement[]> {
  const { data, error } = await supabase.rpc("get_player_achievements");

  if (error) throw error;
  return data ?? [];
}

export type ClaimAchievementRewardResult = {
  achievement_id: string;
  essence_granted: number;
  new_balance: number;
};

/** Claims the essence reward for an unlocked, not-yet-claimed achievement via the `claim_achievement_reward` RPC. */
export async function claimAchievementReward(
  achievementId: string,
): Promise<ClaimAchievementRewardResult> {
  const { data, error } = await supabase.rpc("claim_achievement_reward", {
    p_achievement_id: achievementId,
  });

  if (error) throw error;
  return data as unknown as ClaimAchievementRewardResult;
}
