import { supabase } from "./client";
import type { Tables } from "./database.types";
import type { WobblinSpecies } from "./wobblins";

export type Egg = Tables<"eggs"> & { species: WobblinSpecies };

/** Every egg the player has claimed, newest first — includes already-hatched ones for history. */
export async function getMyEggs(playerId: string) {
  const { data, error } = await supabase
    .from("eggs")
    .select("*, species:wobblin_species(*)")
    .eq("owner_id", playerId)
    .order("claimed_at", { ascending: false });

  if (error) throw error;
  return data as Egg[];
}

export type ClaimEggResult = { egg: Tables<"eggs">; next_egg_at: string };

/**
 * Claims an egg from a fully-evolved (stage 2) Wobblin via the `claim_egg`
 * RPC. Eligibility (is this Wobblin stage 2, has its cadence elapsed) is
 * re-derived server-side from `last_egg_claimed_at` — the client never
 * decides when an egg is available.
 */
export async function claimEgg(playerWobblinId: string): Promise<ClaimEggResult> {
  const { data, error } = await supabase.rpc("claim_egg", { p_player_wobblin_id: playerWobblinId });

  if (error) throw error;
  return data as unknown as ClaimEggResult;
}

/** Hatches a claimed egg into a new Stage 0 Wobblin via the `hatch_egg` RPC. */
export async function hatchEgg(eggId: string) {
  const { data, error } = await supabase.rpc("hatch_egg", { p_egg_id: eggId });

  if (error) throw error;
  return data as Tables<"player_wobblins">;
}
