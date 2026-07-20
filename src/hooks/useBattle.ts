import { useMutation, useQueryClient } from "@tanstack/react-query";

import { resolveBattle } from "@/supabase/battles";

import { queryKeys } from "./queryKeys";

/**
 * Runs a full AI battle via `resolve_battle`. Modeled as a mutation, not a
 * query — every call has real side effects (rewards, a battle log row), so
 * it must never be triggered by React Query's own refetch-on-focus/mount/
 * reconnect behavior, only by an explicit `.mutate()` call.
 */
export function useResolveBattle(wobblinId: string | undefined, playerId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => resolveBattle(wobblinId!),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.wobblin(wobblinId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.playerWobblins(playerId) });
      if (result.winner === "player") {
        queryClient.invalidateQueries({ queryKey: queryKeys.player(playerId) });
      }
    },
  });
}
