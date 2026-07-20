const XP_STEP = 100;

/** Total XP required to have already completed `level` (level 0 = 0 XP). */
function cumulativeXpForLevel(level: number) {
  return (XP_STEP * level * (level + 1)) / 2;
}

export type XpProgress = {
  /** XP earned so far within the current level. */
  xpIntoLevel: number;
  /** XP needed in total to go from this level to the next. */
  xpForLevel: number;
  /** 0-100 fill percentage for the current level's XP bar. */
  percent: number;
};

/**
 * Mirrors the leveling curve computed server-side in the `add_player_xp` /
 * `add_wobblin_xp` Postgres functions: to reach level L, cumulative XP must
 * be >= 100*(L-1)*L/2. Used to render an XP bar scoped to the current level
 * rather than raw lifetime XP.
 */
export function getXpProgress(experience: number, level: number): XpProgress {
  const levelFloorXp = cumulativeXpForLevel(level - 1);
  const levelCeilingXp = cumulativeXpForLevel(level);
  const xpForLevel = levelCeilingXp - levelFloorXp;
  const xpIntoLevel = Math.min(xpForLevel, Math.max(0, experience - levelFloorXp));
  const percent = xpForLevel > 0 ? Math.min(100, (xpIntoLevel / xpForLevel) * 100) : 100;

  return { xpIntoLevel, xpForLevel, percent };
}
