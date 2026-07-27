import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { claimAchievementReward, getPlayerAchievements } from "@/supabase/achievements";

import { queryKeys } from "./queryKeys";

export function usePlayerAchievements(playerId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.achievements(playerId),
    queryFn: getPlayerAchievements,
    enabled: !!playerId,
  });
}

export function useClaimAchievementReward(playerId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: claimAchievementReward,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.achievements(playerId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.player(playerId) });
    },
  });
}
