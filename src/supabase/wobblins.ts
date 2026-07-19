import { supabase } from "./client";
import type { Tables } from "./database.types";

export type WobblinSpecies = Tables<"wobblin_species">;

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
