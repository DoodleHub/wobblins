/** Central query key factory — keeps cache keys consistent across hooks so mutations invalidate the right screens. */
export const queryKeys = {
  player: (playerId: string | undefined) => ["player", playerId] as const,
  featuredWobblin: (playerId: string | undefined) => ["featuredWobblin", playerId] as const,
  playerWobblins: (playerId: string | undefined) => ["playerWobblins", playerId] as const,
  wobblin: (id: string | undefined) => ["wobblin", id] as const,
  starterSpecies: () => ["starterSpecies"] as const,
  allSpecies: () => ["allSpecies"] as const,
  myEggs: (playerId: string | undefined) => ["myEggs", playerId] as const,
  essenceConfig: () => ["essenceConfig"] as const,
  essenceRequirements: () => ["essenceRequirements"] as const,
  essenceGenerationRates: () => ["essenceGenerationRates"] as const,
  marketplaceListings: () => ["marketplaceListings"] as const,
  myListings: (playerId: string | undefined) => ["myListings", playerId] as const,
  offersForListing: (listingId: string | undefined) => ["offersForListing", listingId] as const,
  myOffers: (playerId: string | undefined) => ["myOffers", playerId] as const,
  achievements: (playerId: string | undefined) => ["achievements", playerId] as const,
};
