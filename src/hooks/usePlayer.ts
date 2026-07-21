import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getPlayer, setActiveWobblin, spendEnergyForLocation } from "@/supabase/players";
import { ENERGY_REGEN_INTERVAL_SECONDS, getMaxEnergy } from "@/utils/energy";

import { queryKeys } from "./queryKeys";

/**
 * `getPlayer` runs the `sync_player_energy` RPC, which applies any pending
 * passive regen (1 energy per 5 minutes, capped at 50) before returning the
 * row.
 *
 * `refetchInterval` is scheduled dynamically for exactly when the next tick
 * is due (instead of a flat interval) so the displayed energy updates right
 * as the "Refills in" countdown on Explore hits 00:00 — a fixed poll period
 * shorter than the 5-minute tick would just be wasted network traffic most
 * of the time, and one longer than it (e.g. 60s) can leave the countdown
 * reset locally for up to that long before the real value catches up.
 */
export function usePlayer(playerId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.player(playerId),
    queryFn: () => getPlayer(),
    enabled: !!playerId,
    refetchInterval: (query) => {
      const player = query.state.data;
      if (!player) return 60_000;

      if (player.energy >= getMaxEnergy(player.level)) return 60_000;

      const elapsedMs = Date.now() - new Date(player.energy_updated_at).getTime();
      const tickMs = ENERGY_REGEN_INTERVAL_SECONDS * 1000;
      const msUntilNextTick = tickMs - (elapsedMs % tickMs);
      // +1s buffer so the refetch lands just after the server-side tick boundary, not right on it.
      return Math.max(1000, msUntilNextTick + 1000);
    },
  });
}

export function useSetActiveWobblin(playerId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (wobblinId: string) => setActiveWobblin(playerId!, wobblinId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.player(playerId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.featuredWobblin(playerId) });
    },
  });
}

/**
 * Spends energy for an exploration. Writes the RPC's returned row straight
 * into the `player` cache so every screen reading it (Home, Explore) updates
 * immediately — including screens that aren't currently focused, since the
 * tab navigator keeps them mounted.
 */
export function useSpendEnergy(playerId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (locationId: string) => spendEnergyForLocation(locationId),
    onSuccess: (updatedPlayer) => {
      queryClient.setQueryData(queryKeys.player(playerId), updatedPlayer);
    },
  });
}
