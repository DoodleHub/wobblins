import { supabase } from "./client";
import type { Tables } from "./database.types";

export type WobblinLevelXpRequirement = Tables<"wobblin_level_xp_requirements">;
export type EssenceGenerationRate = Tables<"essence_generation_rates">;
export type EssenceConfig = Tables<"essence_config">;

/** The single essence tuning-config row (daily claim amount, egg hatch threshold, etc.), cached indefinitely. */
export async function getEssenceConfig() {
  const { data, error } = await supabase.from("essence_config").select("*").single();

  if (error) throw error;
  return data as EssenceConfig;
}

/** The full per-level XP curve, fetched once and cached indefinitely — mirrors the curve `add_wobblin_xp` reads from server-side. */
export async function getWobblinLevelXpRequirements() {
  const { data, error } = await supabase
    .from("wobblin_level_xp_requirements")
    .select("*")
    .order("level");

  if (error) throw error;
  return data as WobblinLevelXpRequirement[];
}

/** Per-stage passive essence generation rates, for the "~X/hr" preview on a featured Wobblin. */
export async function getEssenceGenerationRates() {
  const { data, error } = await supabase.from("essence_generation_rates").select("*");

  if (error) throw error;
  return data as EssenceGenerationRate[];
}

export type ClaimDailyEssenceResult = { granted: number; new_balance: number; claim_date: string };

/** Claims the once-per-UTC-calendar-day essence reward via the `claim_daily_essence` RPC. */
export async function claimDailyEssence(): Promise<ClaimDailyEssenceResult> {
  const { data, error } = await supabase.rpc("claim_daily_essence");

  if (error) throw error;
  return data as unknown as ClaimDailyEssenceResult;
}

export type ClaimPassiveEssenceResult = {
  granted: number;
  new_balance: number;
  hourly_rate: number;
  elapsed_hours: number;
};

/**
 * Claims essence accrued since the last claim from the player's featured
 * Wobblin, via the `claim_passive_essence` RPC. Elapsed time and the hourly
 * rate (by stage + level) are both re-derived server-side and capped at
 * `essence_config.passive_accrual_cap_hours` — the client only reflects
 * whatever the RPC returns, never computes the accrual itself.
 */
export async function claimPassiveEssence(): Promise<ClaimPassiveEssenceResult> {
  const { data, error } = await supabase.rpc("claim_passive_essence");

  if (error) throw error;
  return data as unknown as ClaimPassiveEssenceResult;
}

export type SpendEssenceForXpResult = {
  wobblin: Tables<"player_wobblins">;
  essence_spent: number;
  xp_granted: number;
  leveled_up: boolean;
  levels_gained: number;
  new_balance: number;
};

/** Spends essence to directly grant XP to an owned, unlocked Wobblin via the `spend_essence_for_xp` RPC. */
export async function spendEssenceForXp(
  playerWobblinId: string,
  essenceAmount: number,
): Promise<SpendEssenceForXpResult> {
  const { data, error } = await supabase.rpc("spend_essence_for_xp", {
    p_player_wobblin_id: playerWobblinId,
    p_essence_amount: essenceAmount,
  });

  if (error) throw error;
  return data as unknown as SpendEssenceForXpResult;
}
