import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  captureWobblin,
  createStarterWobblin,
  evolveWobblin,
  getAllSpecies,
  getFeaturedWobblin,
  getPlayerWobblinById,
  getPlayerWobblins,
  getStarterSpecies,
  type WobblinSpecies,
} from "@/supabase/wobblins";

import { useCheckAchievements } from "./useAchievements";
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

/** Static stage-1 species list for the starter picker — rarely changes, safe to cache indefinitely. */
export function useStarterSpecies() {
  return useQuery({
    queryKey: queryKeys.starterSpecies(),
    queryFn: getStarterSpecies,
    staleTime: Infinity,
  });
}

/** Every species across all evolution stages — used for the Collection screen's "species discovered" total. */
export function useAllSpecies() {
  return useQuery({
    queryKey: queryKeys.allSpecies(),
    queryFn: getAllSpecies,
    staleTime: Infinity,
  });
}

/**
 * Also re-checks achievement progress on a successful capture (Wobblins-owned
 * achievements). The `checkAchievements` mutation is returned alongside the
 * capture mutation so the caller can read `checkAchievements.data?.unlocked`
 * to show an unlock toast once it resolves.
 */
export function useCaptureWobblin(playerId: string | undefined) {
  const queryClient = useQueryClient();
  const checkAchievements = useCheckAchievements(playerId);

  const mutation = useMutation({
    mutationFn: (speciesName: string) => captureWobblin(speciesName),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: queryKeys.playerWobblins(playerId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.featuredWobblin(playerId) });
        checkAchievements.mutate();
      }
    },
  });

  return Object.assign(mutation, { checkAchievements });
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

/** Evolves an owned Wobblin via `evolve_wobblin` and refreshes every screen showing it. */
export function useEvolveWobblin(playerId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (playerWobblinId: string) => evolveWobblin(playerWobblinId),
    onSuccess: (_result, playerWobblinId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.wobblin(playerWobblinId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.playerWobblins(playerId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.featuredWobblin(playerId) });
    },
  });
}
