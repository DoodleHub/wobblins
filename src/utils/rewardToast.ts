import type { RewardToastData } from "@/components/RewardToast";
import type { Achievement } from "@/supabase/achievements";
import type { ClaimDailyRewardResult } from "@/supabase/dailyReward";

/** Summarizes a batch of newly unlocked achievements into a single toast (multiple can unlock at once, e.g. hitting a level and a battle-count threshold together). */
export function achievementsToReward(unlocked: Achievement[]): RewardToastData | null {
  if (unlocked.length === 0) return null;

  const [first, ...rest] = unlocked;
  const goldAwarded = unlocked.reduce((sum, a) => sum + a.gold_reward, 0);

  return {
    icon: { family: first.icon_family, name: first.icon_name } as RewardToastData["icon"],
    title: rest.length > 0 ? `${unlocked.length} Achievements Unlocked!` : "Achievement Unlocked!",
    subtitle: rest.length > 0 ? `${first.name} +${rest.length} more` : first.name,
    goldAwarded,
  };
}

export function dailyRewardToReward(result: ClaimDailyRewardResult): RewardToastData | null {
  if (result.already_claimed || result.gold_awarded <= 0) return null;

  return {
    icon: { family: "ionicons", name: "calendar" },
    title: `Day ${result.streak} Streak!`,
    subtitle: "Daily login bonus",
    goldAwarded: result.gold_awarded,
  };
}
