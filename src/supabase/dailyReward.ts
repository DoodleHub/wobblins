import { supabase } from "./client";

export type ClaimDailyRewardResult = {
  already_claimed: boolean;
  streak: number;
  gold_awarded: number;
};

/**
 * Claims the caller's daily login bonus via the `claim_daily_reward` RPC,
 * which derives today's date and the streak/gold amount server-side. Safe to
 * call on every app open — a second call the same day just returns
 * `already_claimed: true` with no additional reward.
 */
export async function claimDailyReward() {
  const { data, error } = await supabase.rpc("claim_daily_reward");

  if (error) throw error;
  return data as unknown as ClaimDailyRewardResult;
}
