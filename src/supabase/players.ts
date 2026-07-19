import { supabase } from "./client";
import type { Tables } from "./database.types";

export type Player = Tables<"players">;

export async function getPlayer(playerId: string) {
  const { data, error } = await supabase.from("players").select("*").eq("id", playerId).single();

  if (error) throw error;
  return data;
}

/** Deducts energy after an exploration. Assumes the caller already checked the player can afford it. */
export async function spendEnergy(playerId: string, amount: number, currentEnergy: number) {
  const { data, error } = await supabase
    .from("players")
    .update({ energy: currentEnergy - amount })
    .eq("id", playerId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
