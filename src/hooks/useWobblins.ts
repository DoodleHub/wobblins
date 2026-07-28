import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createStarterWobblin,
  evolveWobblin,
  getAllSpecies,
  getFeaturedWobblin,
  getPlayerWobblinById,
  getPlayerWobblins,
  getStarterSpecies,
  sacrificeWobblin,
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

/** Static stage-0 species list for the starter picker — rarely changes, safe to cache indefinitely. */
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

/**
 * Feeds a duplicate Wobblin to another owned Wobblin for XP via
 * `sacrifice_wobblin` — the consumed Wobblin is permanently deleted server-side.
 * There's no batch RPC, so a multi-select "feed" flow calls this once per
 * duplicate in sequence; each call still needs its own cache refresh.
 */
export function useSacrificeWobblin(playerId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      targetWobblinId,
      consumedWobblinId,
    }: {
      targetWobblinId: string;
      consumedWobblinId: string;
    }) => sacrificeWobblin(targetWobblinId, consumedWobblinId),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.wobblin(result.wobblin.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.playerWobblins(playerId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.featuredWobblin(playerId) });
    },
  });
}
