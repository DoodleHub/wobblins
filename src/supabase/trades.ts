import { supabase } from "./client";
import type { Tables } from "./database.types";
import type { PlayerWobblin } from "./wobblins";

export type PlayerPublicProfile = Tables<"player_public_profiles">;

export type MarketplaceListing = Tables<"marketplace_listings"> & {
  wobblin: PlayerWobblin;
  seller?: PlayerPublicProfile;
};

/** Active marketplace listings from any player, for the Trade tab's Listings mode. */
export async function getMarketplaceListings() {
  const { data, error } = await supabase
    .from("marketplace_listings")
    .select(
      "*, wobblin:player_wobblins(*, species:wobblin_species(*)), seller:player_public_profiles!marketplace_listings_seller_id_fkey(*)",
    )
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as unknown as MarketplaceListing[];
}

/** The caller's own listings (active, sold, or cancelled), for the "My Listings" section. */
export async function getMyListings(playerId: string) {
  const { data, error } = await supabase
    .from("marketplace_listings")
    .select("*, wobblin:player_wobblins(*, species:wobblin_species(*))")
    .eq("seller_id", playerId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as unknown as MarketplaceListing[];
}

export type ListWobblinForSaleResult = { listing: Tables<"marketplace_listings"> };

/** Lists an owned, unlocked Wobblin for sale at a fixed essence price via the `list_wobblin_for_sale` RPC. */
export async function listWobblinForSale(
  playerWobblinId: string,
  priceEssence: number,
): Promise<ListWobblinForSaleResult> {
  const { data, error } = await supabase.rpc("list_wobblin_for_sale", {
    p_player_wobblin_id: playerWobblinId,
    p_price_essence: priceEssence,
  });

  if (error) throw error;
  return data as unknown as ListWobblinForSaleResult;
}

/** Cancels the caller's own active listing via the `cancel_listing` RPC. */
export async function cancelListing(listingId: string) {
  const { data, error } = await supabase.rpc("cancel_listing", { p_listing_id: listingId });

  if (error) throw error;
  return data as unknown as { listing: Tables<"marketplace_listings"> };
}

export type BuyListedWobblinResult = {
  wobblin: Tables<"player_wobblins">;
  essence_spent: number;
  new_balance: number;
};

/** Buys another player's active essence listing via the `buy_listed_wobblin` RPC (atomic, first-buyer-wins). */
export async function buyListedWobblin(listingId: string): Promise<BuyListedWobblinResult> {
  const { data, error } = await supabase.rpc("buy_listed_wobblin", { p_listing_id: listingId });

  if (error) throw error;
  return data as unknown as BuyListedWobblinResult;
}

export type ListWobblinForOffersResult = { listing: Tables<"marketplace_listings"> };

/** Lists an owned Wobblin as open-to-offers (no fixed price) via the `list_wobblin_for_offers` RPC. */
export async function listWobblinForOffers(playerWobblinId: string): Promise<ListWobblinForOffersResult> {
  const { data, error } = await supabase.rpc("list_wobblin_for_offers", {
    p_player_wobblin_id: playerWobblinId,
  });

  if (error) throw error;
  return data as unknown as ListWobblinForOffersResult;
}

export type MarketplaceOffer = Tables<"marketplace_offers"> & {
  buyer?: PlayerPublicProfile;
  offered_wobblins: { player_wobblin: PlayerWobblin }[];
};

/** Every offer (any status) against one of the caller's own listings — RLS-gated to the listing's seller/each offer's buyer. */
export async function getOffersForListing(listingId: string): Promise<MarketplaceOffer[]> {
  const { data, error } = await supabase
    .from("marketplace_offers")
    .select(
      "*, buyer:player_public_profiles!marketplace_offers_buyer_id_fkey(*), offered_wobblins:marketplace_offer_wobblins(player_wobblin:player_wobblins(*, species:wobblin_species(*)))",
    )
    .eq("listing_id", listingId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as unknown as MarketplaceOffer[];
}

export type ProposeWobblinOfferResult = {
  offer: Tables<"marketplace_offers">;
  offered_wobblin_ids: string[];
};

/** Proposes one or more of the caller's own Wobblins in exchange for an offers-type listing, via `propose_wobblin_offer`. */
export async function proposeWobblinOffer(
  listingId: string,
  offeredWobblinIds: string[],
): Promise<ProposeWobblinOfferResult> {
  const { data, error } = await supabase.rpc("propose_wobblin_offer", {
    p_listing_id: listingId,
    p_offered_wobblin_ids: offeredWobblinIds,
  });

  if (error) throw error;
  return data as unknown as ProposeWobblinOfferResult;
}

export type RespondToWobblinOfferResult = {
  offer: Tables<"marketplace_offers">;
  success: boolean;
  reason?: "listing_no_longer_active" | "wobblin_no_longer_owned";
};

/**
 * Accepts or declines a pending offer on one of the caller's own listings via `respond_to_wobblin_offer`.
 * `success: false` means the server self-healed the offer to 'cancelled' instead of completing the swap
 * (the listing resolved via a different offer, or the buyer no longer owns what they offered) — an expected
 * race outcome, not a client error, same pattern as the old `respond_to_trade_offer`.
 */
export async function respondToWobblinOffer(
  offerId: string,
  accept: boolean,
): Promise<RespondToWobblinOfferResult> {
  const { data, error } = await supabase.rpc("respond_to_wobblin_offer", {
    p_offer_id: offerId,
    p_accept: accept,
  });

  if (error) throw error;
  return data as unknown as RespondToWobblinOfferResult;
}

/** Cancels the caller's own pending offer via the `cancel_wobblin_offer` RPC. */
export async function cancelWobblinOffer(offerId: string) {
  const { data, error } = await supabase.rpc("cancel_wobblin_offer", { p_offer_id: offerId });

  if (error) throw error;
  return data as unknown as { offer: Tables<"marketplace_offers"> };
}
