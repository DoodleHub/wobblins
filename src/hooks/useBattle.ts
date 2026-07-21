import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getPlayerBattles, resolveBattle } from "@/supabase/battles";

import { useCheckAchievements } from "./useAchievements";
import { queryKeys } from "./queryKeys";

/** The player's full battle history — backs Profile's Recent Activity feed and battles-won achievement progress. */
export function usePlayerBattles(playerId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.playerBattles(playerId),
    queryFn: () => getPlayerBattles(playerId!),
    enabled: !!playerId,
  });
}

/**
 * Runs a full AI battle via `resolve_battle`. Modeled as a mutation, not a
 * query — every call has real side effects (rewards, a battle log row), so
 * it must never be triggered by React Query's own refetch-on-focus/mount/
 * reconnect behavior, only by an explicit `.mutate()` call.
 *
 * Also re-checks achievement progress on a win (battles-won and player-level
 * achievements). `checkAchievements` is returned alongside so the caller can
 * read `checkAchievements.data?.unlocked` once it resolves.
 */
export function useResolveBattle(wobblinId: string | undefined, playerId: string | undefined) {
  const queryClient = useQueryClient();
  const checkAchievements = useCheckAchievements(playerId);

  const mutation = useMutation({
    mutationFn: () => resolveBattle(wobblinId!),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.wobblin(wobblinId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.playerWobblins(playerId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.playerBattles(playerId) });
      if (result.winner === "player") {
        queryClient.invalidateQueries({ queryKey: queryKeys.player(playerId) });
        checkAchievements.mutate();
      }
    },
  });

  return Object.assign(mutation, { checkAchievements });
}
