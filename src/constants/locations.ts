import type { Element, Rarity } from "@/constants/theme";

/**
 * Wild Wobblins encountered while exploring. These are hardcoded for the MVP
 * rather than fetched from `wobblin_species` — exploration doesn't create a
 * `player_wobblins` row (there's no capture flow yet), so there's nothing to
 * join against the database for.
 */
export type EncounterSpecies = {
  name: string;
  element: Element;
  rarity: Rarity;
  base_hp: number;
  base_attack: number;
  base_defense: number;
  base_speed: number;
};

export type ExploreLocation = {
  id: string;
  name: string;
  icon: string;
  description: string;
  energyCost: number;
  species: EncounterSpecies[];
};

export const LOCATIONS: ExploreLocation[] = [
  {
    id: "forest",
    name: "Forest",
    icon: "🌲",
    description: "A calm woodland with common Wobblins hiding in the brush.",
    energyCost: 5,
    species: [
      { name: "Moss Slime", element: "nature", rarity: "common", base_hp: 90, base_attack: 15, base_defense: 20, base_speed: 12 },
      { name: "Leaf Bug", element: "nature", rarity: "common", base_hp: 70, base_attack: 18, base_defense: 12, base_speed: 22 },
    ],
  },
  {
    id: "volcano",
    name: "Volcano",
    icon: "🌋",
    description: "Scorched terrain home to fiery Wobblins.",
    energyCost: 8,
    species: [
      { name: "Emberling", element: "fire", rarity: "common", base_hp: 85, base_attack: 25, base_defense: 15, base_speed: 18 },
    ],
  },
  {
    id: "ocean",
    name: "Ocean",
    icon: "🌊",
    description: "Rolling tides hiding aquatic Wobblins beneath the surface.",
    energyCost: 8,
    species: [
      { name: "Tide Crab", element: "water", rarity: "common", base_hp: 95, base_attack: 18, base_defense: 24, base_speed: 10 },
    ],
  },
  {
    id: "shadow-realm",
    name: "Shadow Realm",
    icon: "🌑",
    description: "A dark rift where rare Wobblins lurk. Costs more energy to enter.",
    energyCost: 15,
    species: [
      { name: "Shade Wisp", element: "shadow", rarity: "rare", base_hp: 80, base_attack: 28, base_defense: 16, base_speed: 26 },
      { name: "Nightfang", element: "shadow", rarity: "epic", base_hp: 100, base_attack: 32, base_defense: 20, base_speed: 20 },
    ],
  },
];

export function rollEncounter(location: ExploreLocation): EncounterSpecies {
  const index = Math.floor(Math.random() * location.species.length);
  return location.species[index];
}
