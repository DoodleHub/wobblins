import { supabase } from "./client";
import type { Tables } from "./database.types";

export type Player = Tables<"players">;

/**
 * Fetches the caller's player row via the `sync_player_energy` RPC rather
 * than a plain select, so passive energy regen (1 per 5 minutes, capped at
 * 50) is applied server-side before every read — the client never computes
 * the regenerated value itself.
 */
export async function getPlayer() {
  const { data, error } = await supabase.rpc("sync_player_energy");

  if (error) throw error;
  return data as Player;
}

/**
 * Sets the player's featured Wobblin for the Home dashboard. Uses a plain
 * table update (allowed by the existing "update own row" RLS policy) rather
 * than an RPC — unlike gold/energy/stats this isn't a value that needs
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

/**
 * Deducts energy for an exploration via the `spend_energy` RPC. The cost is
 * looked up server-side from the location id (not trusted from the client),
 * and the balance check is enforced there too, so a tampered client can't
 * explore for free or claim an arbitrary refund.
 */
export async function spendEnergyForLocation(locationId: string) {
  const { data, error } = await supabase.rpc("spend_energy", { p_location_id: locationId });

  if (error) throw error;
  return data;
}
