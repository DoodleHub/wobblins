import type { Achievement } from "@/supabase/achievements";

export type AchievementStats = {
  wobblinsOwned: number;
  battlesWon: number;
  playerLevel: number;
  loginStreak: number;
};

function getCurrentValue(achievement: Achievement, stats: AchievementStats): number {
  switch (achievement.requirement_type) {
    case "wobblins_owned":
      return stats.wobblinsOwned;
    case "battles_won":
      return stats.battlesWon;
    case "player_level":
      return stats.playerLevel;
    case "login_streak":
      return stats.loginStreak;
    default:
      return 0;
  }
}

/**
 * Client-side mirror of an achievement's progress, for the progress bar under
 * each card — unlocked state itself always comes from `player_achievements`
 * (server-derived via `check_achievements`), this only fills the bar between
 * unlocks using the same stats that RPC checks against.
 */
export function getAchievementProgress(achievement: Achievement, stats: AchievementStats, unlocked: boolean) {
  const current = getCurrentValue(achievement, stats);
  const target = achievement.requirement_value;
  const percent = unlocked ? 100 : target > 0 ? Math.min(100, (current / target) * 100) : 0;

  return { current, target, percent };
}
