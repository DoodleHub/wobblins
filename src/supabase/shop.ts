import { supabase } from "./client";
import type { Tables } from "./database.types";
import type { WobblinSpecies } from "./wobblins";

export type ShopListing = {
  listing_id: string;
  species: WobblinSpecies;
  price_essence: number;
  purchased: boolean;
};

export type WeeklyShop = { week_start: string; listings: ShopListing[] };

/** Gets (or lazily generates, if this ISO week hasn't rotated yet) the current weekly shop via the `get_weekly_shop` RPC. */
export async function getWeeklyShop(): Promise<WeeklyShop> {
  const { data, error } = await supabase.rpc("get_weekly_shop");

  if (error) throw error;
  return data as unknown as WeeklyShop;
}

export type PurchaseShopListingResult = {
  wobblin: Tables<"player_wobblins">;
  essence_spent: number;
  new_balance: number;
};

/** Buys a Stage 0 Wobblin from the current weekly shop rotation via the `purchase_shop_listing` RPC (atomic, first-buyer-wins). */
export async function purchaseShopListing(listingId: string): Promise<PurchaseShopListingResult> {
  const { data, error } = await supabase.rpc("purchase_shop_listing", { p_listing_id: listingId });

  if (error) throw error;
  return data as unknown as PurchaseShopListingResult;
}
