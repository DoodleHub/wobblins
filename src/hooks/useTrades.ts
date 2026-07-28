import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  buyListedWobblin,
  cancelListing,
  cancelWobblinOffer,
  getMarketplaceListings,
  getMyListings,
  getMyOffers,
  getOffersForListing,
  getPendingOffersCount,
  listWobblinForOffers,
  listWobblinForSale,
  proposeWobblinOffer,
  respondToWobblinOffer,
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
    onSuccess: (_result, listingId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.myListings(playerId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.marketplaceListings() });
      // Cancelling a listing cascades server-side to cancel any pending offers on it too.
      queryClient.invalidateQueries({ queryKey: queryKeys.offersForListing(listingId) });
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

export function useListWobblinForOffers(playerId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (playerWobblinId: string) => listWobblinForOffers(playerWobblinId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.myListings(playerId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.marketplaceListings() });
    },
  });
}

export function useOffersForListing(listingId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.offersForListing(listingId),
    queryFn: () => getOffersForListing(listingId!),
    enabled: !!listingId,
  });
}

export function useProposeWobblinOffer(playerId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ listingId, offeredWobblinIds }: { listingId: string; offeredWobblinIds: string[] }) =>
      proposeWobblinOffer(listingId, offeredWobblinIds),
    onSuccess: (_result, { listingId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.offersForListing(listingId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.myOffers(playerId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.playerWobblins(playerId) });
    },
  });
}

/** The caller's own outgoing offers (any status) across any seller's listing, for the "My Offers" screen. */
export function useMyOffers(playerId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.myOffers(playerId),
    queryFn: () => getMyOffers(playerId!),
    enabled: !!playerId,
  });
}

export function useRespondToWobblinOffer(playerId: string | undefined, listingId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ offerId, accept }: { offerId: string; accept: boolean }) =>
      respondToWobblinOffer(offerId, accept),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.offersForListing(listingId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.myListings(playerId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.marketplaceListings() });
      queryClient.invalidateQueries({ queryKey: queryKeys.playerWobblins(playerId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.featuredWobblin(playerId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.achievements(playerId) });
    },
  });
}

/** Total pending offers across the caller's own active offers-type listings, for the Home screen nudge. */
export function usePendingOffersCount(playerId: string | undefined, listingIds: string[]) {
  return useQuery({
    queryKey: queryKeys.pendingOffersCount(playerId, listingIds),
    queryFn: () => getPendingOffersCount(listingIds),
    enabled: !!playerId,
  });
}

export function useCancelWobblinOffer(playerId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (offerId: string) => cancelWobblinOffer(offerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.myOffers(playerId) });
    },
  });
}
