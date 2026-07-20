import { useMutation, useQueryClient } from "@tanstack/react-query";

import { claimDailyReward } from "@/supabase/dailyReward";

import { queryKeys } from "./queryKeys";

/** Claims the daily login bonus. A mutation, not a query — it has real side effects (gold, streak), so it must only run from an explicit call, never React Query's background refetching. */
export function useClaimDailyReward(playerId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: claimDailyReward,
    onSuccess: (result) => {
      if (!result.already_claimed) {
        queryClient.invalidateQueries({ queryKey: queryKeys.player(playerId) });
      }
    },
  });
}
