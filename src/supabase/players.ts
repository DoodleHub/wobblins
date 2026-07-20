import { supabase } from "./client";
import type { Tables } from "./database.types";

export type Player = Tables<"players">;

export async function getPlayer(playerId: string) {
  const { data, error } = await supabase.from("players").select("*").eq("id", playerId).single();

  if (error) throw error;
  return data;
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
