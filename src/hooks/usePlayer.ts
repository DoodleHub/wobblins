import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getPlayer, setActiveWobblin } from "@/supabase/players";

import { queryKeys } from "./queryKeys";

export function usePlayer(playerId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.player(playerId),
    queryFn: () => getPlayer(playerId!),
    enabled: !!playerId,
  });
}

export function useSetActiveWobblin(playerId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (wobblinId: string) => setActiveWobblin(playerId!, wobblinId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.player(playerId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.featuredWobblin(playerId) });
    },
  });
}
