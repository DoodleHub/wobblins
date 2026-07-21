import type { IconSpec } from "@/components/Icon";
import type { Element, Rarity } from "@/constants/theme";

/**
 * Wild Wobblins encountered while exploring. These are hardcoded for the MVP
 * rather than fetched from `wobblin_species` — exploration doesn't create a
 * `player_wobblins` row (there's no capture-from-database flow yet), so
 * there's nothing to join against for wild encounters.
 *
 * Only stage-1 (base form) species are ever listed here — evolved forms are
 * reached exclusively via `evolve_wobblin`, never caught in the wild. This
 * mirrors what `attempt_capture` enforces server-side.
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
  icon: IconSpec;
  /** Drives the card's border/icon/energy-pill tint and gradient background on the Explore screen — matches the location's single element. */
  accent: Element;
  description: string;
  energyCost: number;
  /** Minimum `players.level` required to explore here — enforced server-side in `spend_energy`, mirrored here only for the lock UI. */
  minPlayerLevel: number;
  species: EncounterSpecies[];
};

export const LOCATIONS: ExploreLocation[] = [
  {
    id: "forest",
    name: "Forest",
    icon: { family: "material-community", name: "pine-tree" },
    accent: "grass",
    description: "A calm woodland where Sproutlings root themselves for an afternoon nap.",
    energyCost: 5,
    minPlayerLevel: 1,
    species: [
      { name: "Sproutling", element: "grass", rarity: "common", base_hp: 95, base_attack: 17, base_defense: 20, base_speed: 13 },
    ],
  },
  {
    id: "sacred-grove",
    name: "Sacred Grove",
    icon: { family: "ionicons", name: "sunny" },
    accent: "light",
    description: "A sunlit clearing said to be blessed — Luminas gather here to bask.",
    energyCost: 6,
    minPlayerLevel: 1,
    species: [
      { name: "Lumina", element: "light", rarity: "common", base_hp: 90, base_attack: 18, base_defense: 18, base_speed: 20 },
    ],
  },
  {
    id: "sky-isles",
    name: "Sky Isles",
    icon: { family: "material-community", name: "weather-windy" },
    accent: "wind",
    description: "Floating islets wreathed in cloud, home to Zephyras riding the updrafts.",
    energyCost: 6,
    minPlayerLevel: 2,
    species: [
      { name: "Zephyra", element: "wind", rarity: "common", base_hp: 80, base_attack: 18, base_defense: 15, base_speed: 30 },
    ],
  },
  {
    id: "ocean",
    name: "Ocean",
    icon: { family: "ionicons", name: "water" },
    accent: "water",
    description: "Rolling tides hiding Aquabubs drifting just beneath the surface.",
    energyCost: 7,
    minPlayerLevel: 3,
    species: [
      { name: "Aquabub", element: "water", rarity: "common", base_hp: 100, base_attack: 16, base_defense: 22, base_speed: 14 },
    ],
  },
  {
    id: "tundra",
    name: "Frozen Tundra",
    icon: { family: "ionicons", name: "snow" },
    accent: "ice",
    description: "A windswept ice field where Frostlings leave frozen footprints behind.",
    energyCost: 8,
    minPlayerLevel: 4,
    species: [
      { name: "Frostling", element: "ice", rarity: "common", base_hp: 100, base_attack: 18, base_defense: 22, base_speed: 15 },
    ],
  },
  {
    id: "stone-quarry",
    name: "Stone Quarry",
    icon: { family: "material-community", name: "terrain" },
    accent: "rock",
    description: "A rubble-strewn quarry where stubborn Pebblits refuse to be moved.",
    energyCost: 8,
    minPlayerLevel: 4,
    species: [
      { name: "Pebblit", element: "rock", rarity: "common", base_hp: 110, base_attack: 16, base_defense: 28, base_speed: 8 },
    ],
  },
  {
    id: "volcano",
    name: "Volcano",
    icon: { family: "ionicons", name: "flame" },
    accent: "fire",
    description: "Scorched terrain home to fiery Emberlings.",
    energyCost: 9,
    minPlayerLevel: 5,
    species: [
      { name: "Emberling", element: "fire", rarity: "common", base_hp: 85, base_attack: 25, base_defense: 15, base_speed: 18 },
    ],
  },
  {
    id: "toxic-swamp",
    name: "Toxic Swamp",
    icon: { family: "ionicons", name: "skull" },
    accent: "poison",
    description: "A murky fen thick with fumes, where Venomites lurk just beneath the sludge.",
    energyCost: 9,
    minPlayerLevel: 6,
    species: [
      { name: "Venomite", element: "poison", rarity: "common", base_hp: 85, base_attack: 20, base_defense: 18, base_speed: 20 },
    ],
  },
  {
    id: "storm-peak",
    name: "Storm Peak",
    icon: { family: "ionicons", name: "flash" },
    accent: "thunder",
    description: "A lightning-lashed summit where twitchy Voltkits spark with every gust.",
    energyCost: 10,
    minPlayerLevel: 7,
    species: [
      { name: "Voltkit", element: "thunder", rarity: "common", base_hp: 75, base_attack: 22, base_defense: 13, base_speed: 28 },
    ],
  },
  {
    id: "shadow-realm",
    name: "Shadow Realm",
    icon: { family: "ionicons", name: "moon" },
    accent: "dark",
    description: "A dark rift where mischievous Shadowimps lurk. Costs the most energy to enter.",
    energyCost: 12,
    minPlayerLevel: 9,
    species: [
      { name: "Shadowimp", element: "dark", rarity: "common", base_hp: 80, base_attack: 24, base_defense: 14, base_speed: 22 },
    ],
  },
];

export function rollEncounter(location: ExploreLocation): EncounterSpecies {
  const index = Math.floor(Math.random() * location.species.length);
  return location.species[index];
}
