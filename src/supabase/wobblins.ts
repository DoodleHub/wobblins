import type { Rarity } from "@/constants/theme";

import { supabase } from "./client";
import type { Tables } from "./database.types";

export type WobblinSpecies = Tables<"wobblin_species">;

export type PlayerWobblin = Tables<"player_wobblins"> & {
  species: WobblinSpecies;
};

export type FeaturedWobblin = PlayerWobblin;

/**
 * The player's featured Wobblin for the home dashboard. There's no
 * `is_active` flag yet, so this falls back to their oldest (starter)
 * Wobblin until a proper "set active" feature exists.
 */
export async function getFeaturedWobblin(playerId: string) {
  const { data, error } = await supabase
    .from("player_wobblins")
    .select("*, species:wobblin_species(*)")
    .eq("player_id", playerId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as FeaturedWobblin | null;
}

/** All Wobblins the player owns, newest first, for the Collection screen. */
export async function getPlayerWobblins(playerId: string) {
  const { data, error } = await supabase
    .from("player_wobblins")
    .select("*, species:wobblin_species(*)")
    .eq("player_id", playerId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as PlayerWobblin[];
}

/** A single owned Wobblin by id, for the Monster Detail screen. */
export async function getPlayerWobblinById(id: string) {
  const { data, error } = await supabase
    .from("player_wobblins")
    .select("*, species:wobblin_species(*)")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data as PlayerWobblin | null;
}

export async function getStarterSpecies() {
  const { data, error } = await supabase.from("wobblin_species").select("*").order("name");

  if (error) throw error;
  return data;
}

/** Creates the player's starter `player_wobblins` row from a species' base stats. */
export function createStarterWobblin(playerId: string, species: WobblinSpecies) {
  return supabase.from("player_wobblins").insert({
    player_id: playerId,
    species_id: species.id,
    hp: species.base_hp,
    attack: species.base_attack,
    defense: species.base_defense,
    speed: species.base_speed,
  });
}

/** How many percentage points rarer Wobblins subtract from the base capture chance. */
const RARITY_CAPTURE_PENALTY: Record<Rarity, number> = {
  common: 0,
  uncommon: 10,
  rare: 25,
  epic: 40,
  legendary: 55,
};

const BASE_CAPTURE_CHANCE = 90;
const MIN_CAPTURE_CHANCE = 10;

/** Odds (0-100) of successfully capturing a wild Wobblin of the given rarity. */
export function getCaptureChance(rarity: Rarity) {
  return Math.max(MIN_CAPTURE_CHANCE, BASE_CAPTURE_CHANCE - RARITY_CAPTURE_PENALTY[rarity]);
}

export type CaptureResult = { success: true; wobblin: PlayerWobblin } | { success: false };

/**
 * Rolls the capture chance for a wild Wobblin encountered while exploring, and
 * on success adds it to the player's collection. Wild species are matched by
 * name against `wobblin_species` (seeded to mirror the hardcoded encounter
 * table in `constants/locations.ts`).
 */
export async function captureWobblin(
  playerId: string,
  encounter: { name: string; rarity: Rarity },
): Promise<CaptureResult> {
  const roll = Math.random() * 100;
  if (roll >= getCaptureChance(encounter.rarity)) {
    return { success: false };
  }

  const { data: species, error: speciesError } = await supabase
    .from("wobblin_species")
    .select("*")
    .eq("name", encounter.name)
    .single();

  if (speciesError) throw speciesError;

  const { data, error } = await supabase
    .from("player_wobblins")
    .insert({
      player_id: playerId,
      species_id: species.id,
      hp: species.base_hp,
      attack: species.base_attack,
      defense: species.base_defense,
      speed: species.base_speed,
    })
    .select("*, species:wobblin_species(*)")
    .single();

  if (error) throw error;
  return { success: true, wobblin: data as PlayerWobblin };
}
