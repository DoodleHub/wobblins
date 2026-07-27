import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getWeeklyShop, purchaseShopListing } from "@/supabase/shop";

import { queryKeys } from "./queryKeys";

export function useWeeklyShop() {
  return useQuery({
    queryKey: queryKeys.weeklyShop(),
    queryFn: getWeeklyShop,
  });
}

export function usePurchaseShopListing(playerId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (listingId: string) => purchaseShopListing(listingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.weeklyShop() });
      queryClient.invalidateQueries({ queryKey: queryKeys.player(playerId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.playerWobblins(playerId) });
    },
  });
}
