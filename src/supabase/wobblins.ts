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
 * their oldest (starter) Wobblin. The active-Wobblin lookup re-filters by
 * `player_id`, so a spoofed `active_wobblin_id` pointing at another player's
 * row just fails to resolve here rather than leaking it.
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
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as FeaturedWobblin | null;
}

/** All Wobblins the player owns, newest first, for the Collection screen. */
export async function getPlayerWobblins(playerId: string) {
  const { data, error } = await supabase
    .from("player_wobblins")
    .select("*, species:wobblin_species(*)")
    .eq("player_id", playerId)
    .order("created_at", { ascending: false });

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

/** Stage-1 (base form) species only — the starting roster shown at character creation. */
export async function getStarterSpecies() {
  const { data, error } = await supabase
    .from("wobblin_species")
    .select("*")
    .eq("stage", 1)
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

/** Creates the player's starter `player_wobblins` row from a species' base stats. */
export async function createStarterWobblin(playerId: string, species: WobblinSpecies) {
  const { error } = await supabase.from("player_wobblins").insert({
    player_id: playerId,
    species_id: species.id,
    hp: species.base_hp,
    attack: species.base_attack,
    defense: species.base_defense,
    speed: species.base_speed,
  });

  if (error) throw error;
}

export type CaptureResult = { success: true; wobblin: PlayerWobblin } | { success: false };

/**
 * Attempts to capture a wild Wobblin encountered while exploring, via the
 * `attempt_capture` RPC. The odds and the resulting Wobblin's stats are both
 * derived server-side from the `wobblin_species` row (matched by name, mirroring
 * the hardcoded encounter table in `constants/locations.ts`) — never from the
 * client — so a tampered client can't inflate its own odds or stats.
 */
export async function captureWobblin(speciesName: string): Promise<CaptureResult> {
  const { data, error } = await supabase.rpc("attempt_capture", { p_species_name: speciesName });

  if (error) throw error;

  const result = data as unknown as { success: boolean; wobblin?: PlayerWobblin };
  if (!result.success || !result.wobblin) {
    return { success: false };
  }

  return { success: true, wobblin: result.wobblin };
}

export type EvolutionResult = {
  wobblin: PlayerWobblin;
  from_species_name: string;
  to_species_name: string;
};

/**
 * Evolves an owned Wobblin into its next stage via the `evolve_wobblin` RPC.
 * Eligibility (does this species have a next stage, has the Wobblin reached
 * the required level) and the resulting stats are both re-derived
 * server-side — the client only ever reflects what the RPC returns.
 */
export async function evolveWobblin(playerWobblinId: string): Promise<EvolutionResult> {
  const { data, error } = await supabase.rpc("evolve_wobblin", {
    p_player_wobblin_id: playerWobblinId,
  });

  if (error) throw error;
  return data as unknown as EvolutionResult;
}
