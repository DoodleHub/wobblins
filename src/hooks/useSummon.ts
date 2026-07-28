import { useMutation, useQueryClient } from "@tanstack/react-query";

import { summonWobblin } from "@/supabase/summon";

import { queryKeys } from "./queryKeys";

export function useSummonWobblin(playerId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: summonWobblin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.player(playerId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.playerWobblins(playerId) });
    },
  });
}
