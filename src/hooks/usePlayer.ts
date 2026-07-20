import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getPlayer, setActiveWobblin, spendEnergyForLocation } from "@/supabase/players";

import { queryKeys } from "./queryKeys";

/**
 * `getPlayer` runs the `sync_player_energy` RPC, which applies any pending
 * passive regen (1 energy per 5 minutes, capped at 50) before returning the
 * row. Refetching once a minute keeps the displayed energy value ticking up
 * on its own instead of only updating after an explore/battle mutation.
 */
export function usePlayer(playerId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.player(playerId),
    queryFn: () => getPlayer(),
    enabled: !!playerId,
    refetchInterval: 60_000,
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
