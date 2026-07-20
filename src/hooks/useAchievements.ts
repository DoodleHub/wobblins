import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { checkAchievements, getAchievements, getPlayerAchievements } from "@/supabase/achievements";

import { queryKeys } from "./queryKeys";

/** Static achievement definitions — rarely change, safe to cache indefinitely (mirrors useStarterSpecies). */
export function useAchievements() {
  return useQuery({
    queryKey: queryKeys.achievements(),
    queryFn: getAchievements,
    staleTime: Infinity,
  });
}

export function usePlayerAchievements(playerId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.playerAchievements(playerId),
    queryFn: () => getPlayerAchievements(playerId!),
    enabled: !!playerId,
  });
}

/**
 * Re-checks the caller's achievement progress. Meant to be fired (fire-and-forget)
 * after any mutation that could satisfy a requirement — capture, battle win, daily
 * claim — so newly unlocked achievements surface without a dedicated polling loop.
 */
export function useCheckAchievements(playerId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: checkAchievements,
    onSuccess: (result) => {
      if (result.unlocked.length > 0) {
        queryClient.invalidateQueries({ queryKey: queryKeys.playerAchievements(playerId) });
      }
      if (result.gold_awarded > 0) {
        queryClient.invalidateQueries({ queryKey: queryKeys.player(playerId) });
      }
    },
  });
}
