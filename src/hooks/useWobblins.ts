import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  captureWobblin,
  createStarterWobblin,
  getFeaturedWobblin,
  getPlayerWobblinById,
  getPlayerWobblins,
  getStarterSpecies,
  type WobblinSpecies,
} from "@/supabase/wobblins";

import { queryKeys } from "./queryKeys";

export function useFeaturedWobblin(playerId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.featuredWobblin(playerId),
    queryFn: () => getFeaturedWobblin(playerId!),
    enabled: !!playerId,
  });
}

export function usePlayerWobblins(playerId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.playerWobblins(playerId),
    queryFn: () => getPlayerWobblins(playerId!),
    enabled: !!playerId,
  });
}

export function useWobblin(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.wobblin(id),
    queryFn: () => getPlayerWobblinById(id!),
    enabled: !!id,
  });
}

/** Static species list for the starter picker — rarely changes, safe to cache indefinitely. */
export function useStarterSpecies() {
  return useQuery({
    queryKey: queryKeys.starterSpecies(),
    queryFn: getStarterSpecies,
    staleTime: Infinity,
  });
}

export function useCaptureWobblin(playerId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (speciesName: string) => captureWobblin(speciesName),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: queryKeys.playerWobblins(playerId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.featuredWobblin(playerId) });
      }
    },
  });
}

export function useCreateStarterWobblin(playerId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (species: WobblinSpecies) => createStarterWobblin(playerId!, species),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.playerWobblins(playerId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.featuredWobblin(playerId) });
    },
  });
}
