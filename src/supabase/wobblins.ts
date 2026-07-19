import { supabase } from "./client";
import type { Tables } from "./database.types";

export type WobblinSpecies = Tables<"wobblin_species">;

export type FeaturedWobblin = Tables<"player_wobblins"> & {
  species: WobblinSpecies;
};

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
