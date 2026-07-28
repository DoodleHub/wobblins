import { supabase } from "./client";
import type { Tables } from "./database.types";
import type { WobblinSpecies } from "./wobblins";

const EGG_SELECT = "*, species:wobblin_species(*), source_wobblin:player_wobblins(id, nickname, species:wobblin_species(name))";

export type Egg = Tables<"eggs"> & {
  species: WobblinSpecies;
  /** The stage-2 Wobblin that produced this egg — null if it's since stopped existing (evolved away, sacrificed, sold, etc.), since `source_wobblin_id` is nullable on delete. */
  source_wobblin: { id: string; nickname: string | null; species: { name: string } } | null;
};

/**
 * Every egg the player owns, newest first — includes eggs still sitting in a
 * source Wobblin's slot (`collected_at` null), claimed-but-not-hatched eggs,
 * and already-hatched ones for history.
 */
export async function getMyEggs(playerId: string) {
  const { data, error } = await supabase
    .from("eggs")
    .select(EGG_SELECT)
    .eq("owner_id", playerId)
    .order("generated_at", { ascending: false });

  if (error) throw error;
  return data as unknown as Egg[];
}

/** A single owned egg by id, for the Egg Detail screen. RLS already scopes this to the caller's own eggs. */
export async function getEggById(id: string) {
  const { data, error } = await supabase.from("eggs").select(EGG_SELECT).eq("id", id).maybeSingle();

  if (error) throw error;
  return data as unknown as Egg | null;
}

export type GenerateEggsForPlayerResult = {
  produced: { egg: Tables<"eggs">; source_wobblin_id: string }[];
  produced_count: number;
};

/**
 * Automatically produces an egg into a slot for every one of the caller's
 * fully-evolved (stage 2) Wobblins that's both cadence-ready and has an open
 * slot, via the `generate_eggs_for_player` RPC — no per-Wobblin button, no
 * args. Eligibility is re-derived server-side per Wobblin; the client never
 * decides when a slot opens up. Meant to be called silently on focus, same
 * lazy/claim-on-read pattern as `claimPassiveEssence`.
 */
export async function generateEggsForPlayer(): Promise<GenerateEggsForPlayerResult> {
  const { data, error } = await supabase.rpc("generate_eggs_for_player");

  if (error) throw error;
  return data as unknown as GenerateEggsForPlayerResult;
}

/**
 * Claims an egg out of its source Wobblin's slot into the player's
 * Collection via the `claim_egg` RPC. This frees the slot for another egg to
 * generate, and starts the fixed hatch countdown (`hatch_ready_at`). Allowed
 * even if only one of the two slots is currently holding an egg.
 */
export async function claimEgg(eggId: string) {
  const { data, error } = await supabase.rpc("claim_egg", { p_egg_id: eggId });

  if (error) throw error;
  return data as Tables<"eggs">;
}

/**
 * Hatches a claimed egg into a new Stage 0 Wobblin via the `hatch_egg` RPC.
 * The server re-validates that the egg has been claimed and that
 * `hatch_ready_at` has passed — the client only shows the ready state, it
 * doesn't enforce it.
 */
export async function hatchEgg(eggId: string) {
  const { data, error } = await supabase.rpc("hatch_egg", { p_egg_id: eggId });

  if (error) throw error;
  return data as Tables<"player_wobblins">;
}
