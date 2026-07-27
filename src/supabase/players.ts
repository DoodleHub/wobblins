import { supabase } from "./client";
import type { Tables } from "./database.types";

export type Player = Tables<"players">;

export async function getPlayer(playerId: string) {
  const { data, error } = await supabase.from("players").select("*").eq("id", playerId).maybeSingle();

  if (error) throw error;
  return data as Player | null;
}

/**
 * Sets the player's featured Wobblin for the Home dashboard. Uses a plain
 * table update (allowed by the existing "update own row" RLS policy) rather
 * than an RPC — unlike ownership/locking this isn't a value that needs
 * server-side derivation, just an ownership pointer, and `getFeaturedWobblin`
 * re-filters by `player_id` when reading it back so a spoofed id can't
 * surface another player's Wobblin.
 */
export async function setActiveWobblin(playerId: string, wobblinId: string) {
  const { error } = await supabase
    .from("players")
    .update({ active_wobblin_id: wobblinId })
    .eq("id", playerId);

  if (error) throw error;
}
