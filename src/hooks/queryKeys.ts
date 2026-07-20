/** Central query key factory — keeps cache keys consistent across hooks so mutations invalidate the right screens. */
export const queryKeys = {
  player: (playerId: string | undefined) => ["player", playerId] as const,
  featuredWobblin: (playerId: string | undefined) => ["featuredWobblin", playerId] as const,
  playerWobblins: (playerId: string | undefined) => ["playerWobblins", playerId] as const,
  wobblin: (id: string | undefined) => ["wobblin", id] as const,
  starterSpecies: () => ["starterSpecies"] as const,
  achievements: () => ["achievements"] as const,
  playerAchievements: (playerId: string | undefined) => ["playerAchievements", playerId] as const,
};
