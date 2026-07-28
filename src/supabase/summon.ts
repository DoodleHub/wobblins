import { supabase } from "./client";
import type { Tables } from "./database.types";
import type { WobblinSpecies } from "./wobblins";

export type SummonResult = {
  wobblin: Tables<"player_wobblins">;
  species: WobblinSpecies;
  essence_spent: number;
  new_balance: number;
};

/** Spends essence for a random Stage 0 Wobblin via the `summon_wobblin` RPC. */
export async function summonWobblin(): Promise<SummonResult> {
  const { data, error } = await supabase.rpc("summon_wobblin");

  if (error) throw error;
  return data as unknown as SummonResult;
}
