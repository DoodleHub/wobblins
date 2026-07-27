import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { claimEgg, feedEggEssence, getMyEggs, hatchEgg } from "@/supabase/eggs";

import { queryKeys } from "./queryKeys";

export function useMyEggs(playerId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.myEggs(playerId),
    queryFn: () => getMyEggs(playerId!),
    enabled: !!playerId,
  });
}

export function useClaimEgg(playerId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (playerWobblinId: string) => claimEgg(playerWobblinId),
    onSuccess: (_result, playerWobblinId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.myEggs(playerId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.wobblin(playerWobblinId) });
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

export function useFeedEggEssence(playerId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ eggId, essenceAmount }: { eggId: string; essenceAmount: number }) =>
      feedEggEssence(eggId, essenceAmount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.myEggs(playerId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.player(playerId) });
    },
  });
}
