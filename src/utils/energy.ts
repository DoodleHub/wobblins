/**
 * Client-side mirror of the max-energy formula computed server-side in
 * `regen_player_energy` (`v_max_energy := 50 + 5 * (level - 1)`) — must stay
 * in sync if that formula ever changes.
 */
export function getMaxEnergy(level: number): number {
  return 50 + 5 * (level - 1);
}
