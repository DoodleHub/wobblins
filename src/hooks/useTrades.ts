import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  buyListedWobblin,
  cancelListing,
  cancelTradeOffer,
  findPlayerByUsername,
  getIncomingTradeOffers,
  getMarketplaceListings,
  getMyListings,
  getOutgoingTradeOffers,
  getPlayerWobblinsForTrade,
  listWobblinForSale,
  proposeTradeOffer,
  respondToTradeOffer,
} from "@/supabase/trades";

import { queryKeys } from "./queryKeys";

export function useMarketplaceListings() {
  return useQuery({
    queryKey: queryKeys.marketplaceListings(),
    queryFn: getMarketplaceListings,
  });
}

export function useMyListings(playerId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.myListings(playerId),
    queryFn: () => getMyListings(playerId!),
    enabled: !!playerId,
  });
}

export function useIncomingTradeOffers(playerId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.incomingTradeOffers(playerId),
    queryFn: () => getIncomingTradeOffers(playerId!),
    enabled: !!playerId,
  });
}

export function useOutgoingTradeOffers(playerId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.outgoingTradeOffers(playerId),
    queryFn: () => getOutgoingTradeOffers(playerId!),
    enabled: !!playerId,
  });
}

export function usePlayerWobblinsForTrade(playerId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.playerWobblinsForTrade(playerId),
    queryFn: () => getPlayerWobblinsForTrade(playerId!),
    enabled: !!playerId,
  });
}

export function useFindPlayerByUsername() {
  return useMutation({
    mutationFn: (username: string) => findPlayerByUsername(username),
  });
}

export function useListWobblinForSale(playerId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      playerWobblinId,
      priceEssence,
    }: {
      playerWobblinId: string;
      priceEssence: number;
    }) => listWobblinForSale(playerWobblinId, priceEssence),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.myListings(playerId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.marketplaceListings() });
      queryClient.invalidateQueries({ queryKey: queryKeys.playerWobblins(playerId) });
    },
  });
}

export function useCancelListing(playerId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (listingId: string) => cancelListing(listingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.myListings(playerId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.marketplaceListings() });
    },
  });
}

export function useBuyListedWobblin(playerId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (listingId: string) => buyListedWobblin(listingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.marketplaceListings() });
      queryClient.invalidateQueries({ queryKey: queryKeys.player(playerId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.playerWobblins(playerId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.featuredWobblin(playerId) });
    },
  });
}

export function useProposeTradeOffer(playerId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      offeredWobblinId,
      recipientId,
      requestedWobblinId,
    }: {
      offeredWobblinId: string;
      recipientId: string;
      requestedWobblinId: string;
    }) => proposeTradeOffer(offeredWobblinId, recipientId, requestedWobblinId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.outgoingTradeOffers(playerId) });
    },
  });
}

export function useRespondToTradeOffer(playerId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ offerId, accept }: { offerId: string; accept: boolean }) =>
      respondToTradeOffer(offerId, accept),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.incomingTradeOffers(playerId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.outgoingTradeOffers(playerId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.playerWobblins(playerId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.featuredWobblin(playerId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.marketplaceListings() });
    },
  });
}

export function useCancelTradeOffer(playerId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (offerId: string) => cancelTradeOffer(offerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.outgoingTradeOffers(playerId) });
    },
  });
}
