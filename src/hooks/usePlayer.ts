import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getPlayer, spendEnergyForLocation } from "@/supabase/players";

import { queryKeys } from "./queryKeys";

export function usePlayer(playerId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.player(playerId),
    queryFn: () => getPlayer(playerId!),
    enabled: !!playerId,
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
