import { supabase } from "./client";

export type BattleTurn = {
  actor: "player" | "enemy";
  damage: number;
  player_hp: number;
  enemy_hp: number;
};

export type BattleEnemy = {
  id: string;
  name: string;
  element: string;
  rarity: string;
  max_hp: number;
  speed: number;
};

export type BattleResult = {
  winner: "player" | "enemy";
  /** Which combatant's (level-scaled) speed was higher and struck first each round — ties are broken randomly server-side. */
  first_actor: "player" | "enemy";
  enemy: BattleEnemy;
  player_max_hp: number;
  player_speed: number;
  turns: BattleTurn[];
  gold_reward: number;
  xp_reward: number;
};

/**
 * Runs a full AI battle server-side via the `resolve_battle` RPC: picks a
 * random wild opponent, resolves every turn, and — on a win — credits gold
 * and XP and logs the result, all atomically. The client only replays the
 * returned turns for the Attack-button feel; it never reports its own
 * outcome, so rewards can't be forged by calling the client helpers directly.
 */
export async function resolveBattle(wobblinId: string) {
  const { data, error } = await supabase.rpc("resolve_battle", { p_wobblin_id: wobblinId });

  if (error) throw error;
  return data as unknown as BattleResult;
}
