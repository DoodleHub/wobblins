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

/** Buys another player's active listing via the `buy_listed_wobblin` RPC (atomic, first-buyer-wins). */
export async function buyListedWobblin(listingId: string): Promise<BuyListedWobblinResult> {
  const { data, error } = await supabase.rpc("buy_listed_wobblin", { p_listing_id: listingId });

  if (error) throw error;
  return data as unknown as BuyListedWobblinResult;
}

export type TradeOffer = Tables<"trade_offers"> & {
  offered_wobblin: PlayerWobblin;
  requested_wobblin: PlayerWobblin;
  proposer: PlayerPublicProfile;
  recipient: PlayerPublicProfile;
};

const TRADE_OFFER_SELECT =
  "*, offered_wobblin:player_wobblins!trade_offers_offered_wobblin_id_fkey(*, species:wobblin_species(*)), requested_wobblin:player_wobblins!trade_offers_requested_wobblin_id_fkey(*, species:wobblin_species(*)), proposer:player_public_profiles!trade_offers_proposer_id_fkey(*), recipient:player_public_profiles!trade_offers_recipient_id_fkey(*)";

/** Trade offers awaiting the caller's response, for the Trade tab's Offers mode. */
export async function getIncomingTradeOffers(playerId: string) {
  const { data, error } = await supabase
    .from("trade_offers")
    .select(TRADE_OFFER_SELECT)
    .eq("recipient_id", playerId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as unknown as TradeOffer[];
}

/** Trade offers the caller has sent, for the Trade tab's Offers mode. */
export async function getOutgoingTradeOffers(playerId: string) {
  const { data, error } = await supabase
    .from("trade_offers")
    .select(TRADE_OFFER_SELECT)
    .eq("proposer_id", playerId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as unknown as TradeOffer[];
}

export type ProposeTradeOfferResult = { offer: Tables<"trade_offers"> };

/** Proposes a direct Wobblin-for-Wobblin trade via the `propose_trade_offer` RPC. */
export async function proposeTradeOffer(
  offeredWobblinId: string,
  recipientId: string,
  requestedWobblinId: string,
): Promise<ProposeTradeOfferResult> {
  const { data, error } = await supabase.rpc("propose_trade_offer", {
    p_offered_wobblin_id: offeredWobblinId,
    p_recipient_id: recipientId,
    p_requested_wobblin_id: requestedWobblinId,
  });

  if (error) throw error;
  return data as unknown as ProposeTradeOfferResult;
}

export type RespondToTradeOfferResult = {
  offer: Tables<"trade_offers">;
  success: boolean;
  reason?: string;
};

/**
 * Accepts or declines a trade offer via the `respond_to_trade_offer` RPC. On
 * accept, both Wobblins' ownership is re-validated at this exact moment —
 * either side may have sold/traded/sacrificed theirs since the offer was
 * proposed. `success: false` means the offer self-healed to `cancelled`
 * instead of completing; the client should surface that distinctly rather
 * than treat it as a normal request error.
 */
export async function respondToTradeOffer(
  offerId: string,
  accept: boolean,
): Promise<RespondToTradeOfferResult> {
  const { data, error } = await supabase.rpc("respond_to_trade_offer", {
    p_offer_id: offerId,
    p_accept: accept,
  });

  if (error) throw error;
  return data as unknown as RespondToTradeOfferResult;
}

/** Withdraws the caller's own still-pending outgoing offer via the `cancel_trade_offer` RPC. */
export async function cancelTradeOffer(offerId: string) {
  const { data, error } = await supabase.rpc("cancel_trade_offer", { p_offer_id: offerId });

  if (error) throw error;
  return data as unknown as { offer: Tables<"trade_offers"> };
}

/** Looks up another player's public profile (username/avatar) for the trade composer, by exact username. */
export async function findPlayerByUsername(username: string) {
  const { data, error } = await supabase
    .from("player_public_profiles")
    .select("*")
    .eq("username", username)
    .maybeSingle();

  if (error) throw error;
  return data as PlayerPublicProfile | null;
}

/** Another player's owned Wobblins, for browsing what to request in a trade offer. */
export async function getPlayerWobblinsForTrade(playerId: string) {
  const { data, error } = await supabase
    .from("player_wobblins")
    .select("*, species:wobblin_species(*)")
    .eq("player_id", playerId)
    .order("acquired_at", { ascending: false });

  if (error) throw error;
  return data as PlayerWobblin[];
}
