export type XpProgress = {
  /** XP earned so far within the current level. */
  xpIntoLevel: number;
  /** XP needed in total to go from this level to the next. */
  xpForLevel: number;
  /** 0-100 fill percentage for the current level's XP bar. */
  percent: number;
};

/**
 * `experience` is level-relative — it resets to 0 on every level-up — so
 * this is a direct lookup against `requirements[level]` rather than
 * deriving a window out of a cumulative total. `requirements` mirrors the
 * `wobblin_level_xp_requirements` table `add_wobblin_xp` reads from
 * server-side; a level with no entry (past the soft level cap) renders as
 * a full bar.
 */
export function getXpProgress(
  experience: number,
  level: number,
  requirements: Record<number, number>,
): XpProgress {
  const xpForLevel = requirements[level] ?? 0;

  if (xpForLevel <= 0) {
    return { xpIntoLevel: 0, xpForLevel: 0, percent: 100 };
  }

  const xpIntoLevel = Math.min(xpForLevel, Math.max(0, experience));
  const percent = Math.min(100, (xpIntoLevel / xpForLevel) * 100);

  return { xpIntoLevel, xpForLevel, percent };
}
