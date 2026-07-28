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

export type LevelUpQuote = {
  /** How many levels this quote is for. */
  levels: number;
  /** Essence cost to guarantee at least `levels` level-ups (server-side, via `spend_essence_for_xp`). */
  essenceCost: number;
  /** False once the walk hits a level past the soft cap (no `requirements` row) before finishing. */
  reachable: boolean;
};

/**
 * Client-side estimate only — `spend_essence_for_xp`/`add_wobblin_xp` are the
 * source of truth for what a given essence amount actually grants. This just
 * walks the same `wobblin_level_xp_requirements` table to quote the essence
 * needed to guarantee crossing `levelsToGain` level-up boundaries from the
 * Wobblin's current level/experience, so quick "+N levels" actions can show
 * (and gate) a cost up front.
 */
export function getLevelUpQuote(
  level: number,
  experience: number,
  levelsToGain: number,
  requirements: Record<number, number>,
  xpPerEssence: number,
): LevelUpQuote {
  let totalXp = 0;
  let reachable = true;

  for (let i = 0; i < levelsToGain; i++) {
    const xpForLevel = requirements[level + i];
    if (xpForLevel == null || xpForLevel <= 0) {
      reachable = false;
      break;
    }
    totalXp += i === 0 ? Math.max(xpForLevel - experience, 0) : xpForLevel;
  }

  const rate = xpPerEssence > 0 ? xpPerEssence : 1;
  const essenceCost = reachable ? Math.max(1, Math.ceil(totalXp / rate)) : 0;

  return { levels: levelsToGain, essenceCost, reachable };
}
