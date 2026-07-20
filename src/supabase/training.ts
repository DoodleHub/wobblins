import { supabase } from "./client";
import type { PlayerWobblin } from "./wobblins";

export type TrainingOption = "attack" | "defense" | "speed";

/**
 * Spends one training point to grow a stat via the `train_wobblin` RPC. The
 * function enforces ownership and the training point balance server-side, so
 * this only ever succeeds if the caller owns the Wobblin and it still has
 * points left.
 */
export async function trainWobblinStat(playerWobblinId: string, option: TrainingOption) {
  const { data, error } = await supabase.rpc("train_wobblin", {
    p_player_wobblin_id: playerWobblinId,
    p_training_option: option,
  });

  if (error) throw error;
  return data as Omit<PlayerWobblin, "species">;
}
