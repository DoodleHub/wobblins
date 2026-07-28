import { supabase } from "./client";
import type { Tables } from "./database.types";

export type WobblinSpecies = Tables<"wobblin_species">;

export type PlayerWobblin = Tables<"player_wobblins"> & {
  species: WobblinSpecies;
};

export type FeaturedWobblin = PlayerWobblin;

/**
 * The player's featured Wobblin for the home dashboard: whichever one they
 * last set active via `setActiveWobblin`, or — if they haven't chosen one —
 * the first one they came to own (by `acquired_at`, not `created_at` — a
 * traded or purchased Wobblin can carry a `created_at` from long before this
 * player ever had it, so ordering by that could surface a recently-received
 * Wobblin as the "starter" ahead of the one they've actually had longest).
 * The active-Wobblin lookup re-filters by `player_id`, so a spoofed
 * `active_wobblin_id` pointing at another player's row just fails to
 * resolve here rather than leaking it.
 */
export async function getFeaturedWobblin(playerId: string) {
  const { data: player, error: playerError } = await supabase
    .from("players")
    .select("active_wobblin_id")
    .eq("id", playerId)
    .maybeSingle();

  if (playerError) throw playerError;

  if (player?.active_wobblin_id) {
    const { data, error } = await supabase
      .from("player_wobblins")
      .select("*, species:wobblin_species(*)")
      .eq("id", player.active_wobblin_id)
      .eq("player_id", playerId)
      .maybeSingle();

    if (error) throw error;
    if (data) return data as FeaturedWobblin;
  }

  const { data, error } = await supabase
    .from("player_wobblins")
    .select("*, species:wobblin_species(*)")
    .eq("player_id", playerId)
    .order("acquired_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as FeaturedWobblin | null;
}

/** All Wobblins the player owns, most recently acquired first, for the Collection screen. */
export async function getPlayerWobblins(playerId: string) {
  const { data, error } = await supabase
    .from("player_wobblins")
    .select("*, species:wobblin_species(*)")
    .eq("player_id", playerId)
    .order("acquired_at", { ascending: false });

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

/** Stage-0 (base form) species only — the starting roster shown at character creation. */
export async function getStarterSpecies() {
  const { data, error } = await supabase
    .from("wobblin_species")
    .select("*")
    .eq("stage", 0)
    .order("name");

  if (error) throw error;
  return data;
}

/** Every species across all evolution stages, for the Collection screen's "species discovered" total. */
export async function getAllSpecies() {
  const { data, error } = await supabase.from("wobblin_species").select("*").order("name");

  if (error) throw error;
  return data;
}

/** Creates the player's starter `player_wobblins` row for a chosen species. */
export async function createStarterWobblin(playerId: string, species: WobblinSpecies) {
  const { error } = await supabase.from("player_wobblins").insert({
    player_id: playerId,
    species_id: species.id,
  });

  if (error) throw error;
}

export type EvolutionResult = {
  wobblin: PlayerWobblin;
  from_species_name: string;
  to_species_name: string;
};

/**
 * Evolves an owned Wobblin into its next stage via the `evolve_wobblin` RPC.
 * Eligibility (does this species have a next stage, has the Wobblin reached
 * the required level) and the resulting species are both re-derived
 * server-side — the client only ever reflects what the RPC returns.
 */
export async function evolveWobblin(playerWobblinId: string): Promise<EvolutionResult> {
  const { data, error } = await supabase.rpc("evolve_wobblin", {
    p_player_wobblin_id: playerWobblinId,
  });

  if (error) throw error;
  return data as unknown as EvolutionResult;
}

export type SacrificeResult = {
  wobblin: PlayerWobblin;
  consumed_species_name: string;
  consumed_stage: number;
  xp_granted: number;
  leveled_up: boolean;
  levels_gained: number;
};

/**
 * Feeds a duplicate Wobblin (same evolution chain, permanently consumed) to
 * another owned Wobblin for XP via the `sacrifice_wobblin` RPC. XP scales
 * with the consumed Wobblin's level *and* its evolution stage — a stage-2
 * duplicate is worth 3x a stage-0 one at the same level — so ownership
 * transfer, the same-chain check, and the XP formula are all re-derived
 * server-side rather than trusted from the client.
 */
export async function sacrificeWobblin(
  targetWobblinId: string,
  consumedWobblinId: string,
): Promise<SacrificeResult> {
  const { data, error } = await supabase.rpc("sacrifice_wobblin", {
    p_target_wobblin_id: targetWobblinId,
    p_consumed_wobblin_id: consumedWobblinId,
  });

  if (error) throw error;
  return data as unknown as SacrificeResult;
}
