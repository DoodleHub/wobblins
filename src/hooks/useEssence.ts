import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  claimDailyEssence,
  claimPassiveEssence,
  getEssenceConfig,
  getEssenceGenerationRates,
  getWobblinLevelXpRequirements,
  spendEssenceForXp,
} from "@/supabase/essence";

import { queryKeys } from "./queryKeys";

export function useEssenceConfig() {
  return useQuery({
    queryKey: queryKeys.essenceConfig(),
    queryFn: getEssenceConfig,
    staleTime: Infinity,
  });
}

export function useWobblinLevelXpRequirements() {
  return useQuery({
    queryKey: queryKeys.essenceRequirements(),
    queryFn: getWobblinLevelXpRequirements,
    staleTime: Infinity,
  });
}

export function useEssenceGenerationRates() {
  return useQuery({
    queryKey: queryKeys.essenceGenerationRates(),
    queryFn: getEssenceGenerationRates,
    staleTime: Infinity,
  });
}

export function useClaimDailyEssence(playerId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: claimDailyEssence,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.player(playerId) });
    },
  });
}

export function useClaimPassiveEssence(playerId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: claimPassiveEssence,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.player(playerId) });
    },
  });
}

export function useSpendEssenceForXp(playerId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      playerWobblinId,
      essenceAmount,
    }: {
      playerWobblinId: string;
      essenceAmount: number;
    }) => spendEssenceForXp(playerWobblinId, essenceAmount),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.player(playerId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.wobblin(result.wobblin.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.playerWobblins(playerId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.featuredWobblin(playerId) });
    },
  });
}
