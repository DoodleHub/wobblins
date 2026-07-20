import { useMutation, useQueryClient } from "@tanstack/react-query";

import { trainWobblinStat, type TrainingOption } from "@/supabase/training";
import type { PlayerWobblin } from "@/supabase/wobblins";

import { queryKeys } from "./queryKeys";

export function useTrainWobblin(wobblinId: string | undefined, playerId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (option: TrainingOption) => trainWobblinStat(wobblinId!, option),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.wobblin(wobblinId), (old: PlayerWobblin | null | undefined) =>
        old ? { ...old, ...updated } : old,
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.playerWobblins(playerId) });
    },
  });
}
