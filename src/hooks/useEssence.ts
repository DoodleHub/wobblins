import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  claimDailyEssence,
  claimPassiveEssence,
  getEssenceConfig,
  getEssenceGenerationRates,
  getWobblinLevelXpRequirements,
  spendEssenceForXp,
} from "@/supabase/essence";
import type { Player } from "@/supabase/players";

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
    // Home's focus effect (see (tabs)/index.tsx) already refetches the player
    // query on every focus. If that fetch is still in flight when this claim
    // resolves, invalidateQueries would just dedupe onto the same (pre-claim)
    // promise instead of firing a fresh request, leaving the button stuck on
    // "Daily". Write the RPC's own result straight into the cache instead.
    onSuccess: (result) => {
      queryClient.setQueryData(queryKeys.player(playerId), (old: Player | null | undefined) =>
        old
          ? {
              ...old,
              essence_balance: result.new_balance,
              last_daily_essence_claim_date: result.claim_date,
            }
          : old,
      );
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
