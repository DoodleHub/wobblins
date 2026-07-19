import { supabase } from "./client";
import type { Tables } from "./database.types";

export type Player = Tables<"players">;

export async function getPlayer(playerId: string) {
  const { data, error } = await supabase.from("players").select("*").eq("id", playerId).single();

  if (error) throw error;
  return data;
}
