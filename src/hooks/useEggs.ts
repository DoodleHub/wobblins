import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { claimEgg, generateEggsForPlayer, getEggById, getMyEggs, hatchEgg, type Egg } from "@/supabase/eggs";

import { queryKeys } from "./queryKeys";

export function useMyEggs(playerId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.myEggs(playerId),
    queryFn: () => getMyEggs(playerId!),
    enabled: !!playerId,
  });
}

export function useEgg(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.egg(id),
    queryFn: () => getEggById(id!),
    enabled: !!id,
  });
}

/**
 * Silently produces eggs for every eligible stage-2 Wobblin the player owns.
 * Meant to be fired on screen focus (see Home's focus effect), not from a
 * button — production is automatic now, not a player action.
 */
export function useGenerateEggsForPlayer(playerId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: generateEggsForPlayer,
    onSuccess: (result) => {
      if (result.produced_count > 0) {
        queryClient.invalidateQueries({ queryKey: queryKeys.myEggs(playerId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.playerWobblins(playerId) });
      }
    },
  });
}

export function useClaimEgg(playerId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (eggId: string) => claimEgg(eggId),
    // `invalidateQueries` alone only schedules a background refetch — since
    // `isPending` flips back to false the instant this resolves, there'd be a
    // visible window where the "claiming" spinner is gone but the egg list
    // hasn't caught up yet (the just-claimed egg still reads as pending, so
    // an empty-looking slot doesn't repaint as empty until that refetch
    // lands a moment later). Writing the RPC's returned row straight into
    // the cache makes the slot correct the instant the mutation settles;
    // invalidateQueries stays as a background reconciliation pass.
    onSuccess: (updatedEgg) => {
      queryClient.setQueryData<Egg[]>(queryKeys.myEggs(playerId), (old) =>
        old?.map((egg) => (egg.id === updatedEgg.id ? { ...egg, ...updatedEgg } : egg)),
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.myEggs(playerId) });
    },
  });
}

export function useHatchEgg(playerId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (eggId: string) => hatchEgg(eggId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.myEggs(playerId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.playerWobblins(playerId) });
    },
  });
}
