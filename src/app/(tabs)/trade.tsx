import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { Icon } from "@/components/Icon";
import { RewardToast, type RewardToastData } from "@/components/RewardToast";
import { SlideUpModal } from "@/components/SlideUpModal";
import { TraitBadge } from "@/components/TraitBadge";
import { SPECIES_ART } from "@/constants/speciesArt";
import { COLORS, ELEMENT_COLORS, ELEMENT_ICON, RARITY_COLORS, type Element, type Rarity } from "@/constants/theme";
import { TAB_BAR_HEIGHT, useScrollScreenContentStyle } from "@/hooks/useTabBarClearance";
import {
  useBuyListedWobblin,
  useCancelListing,
  useCancelWobblinOffer,
  useMarketplaceListings,
  useMyListings,
  useMyOffers,
} from "@/hooks/useTrades";
import { usePlayerWobblins } from "@/hooks/useWobblins";
import { useSupabase } from "@/supabase/SupabaseProvider";
import type { MarketplaceListing, MyOffer } from "@/supabase/trades";
import { getErrorMessage } from "@/utils/errors";

export default function TradeScreen() {
  const { session } = useSupabase();
  const playerId = session?.user.id;
  const router = useRouter();

  const { data: listings, isPending: listingsPending, refetch: refetchListings } = useMarketplaceListings();
  const { data: myListings, refetch: refetchMyListings } = useMyListings(playerId);
  const { data: myWobblins } = usePlayerWobblins(playerId);
  const { data: myOffers, refetch: refetchMyOffers } = useMyOffers(playerId);
  const buyListedWobblin = useBuyListedWobblin(playerId);
  const cancelListing = useCancelListing(playerId);
  const cancelOffer = useCancelWobblinOffer(playerId);

  const [actionError, setActionError] = useState<string | null>(null);
  const [footerHeight, setFooterHeight] = useState(0);
  const [toast, setToast] = useState<RewardToastData | null>(null);

  // The Trade tab stays mounted (frozen, not unmounted) while pushed screens
  // like make-offer/offer-detail sit on top of it, so a cache invalidation
  // that lands while it's unfocused (e.g. resending an offer) doesn't
  // reliably repaint once we return here — same quirk Home/Collection work
  // around with an explicit refetch-on-focus.
  useFocusEffect(
    useCallback(() => {
      refetchListings();
      refetchMyListings();
      refetchMyOffers();
    }, [refetchListings, refetchMyListings, refetchMyOffers]),
  );

  // A Wobblin already listed (essence or offers) carries `locked_reason` — no
  // need to cross-reference listings separately, the flag is authoritative.
  const sellable = (myWobblins ?? []).filter((w) => w.locked_reason == null);
  const othersListings = (listings ?? []).filter((l) => l.seller_id !== playerId);
  const myActiveListings = (myListings ?? []).filter((l) => l.status === "active");
  const myPendingOfferByListingId = new Map(
    (myOffers ?? []).filter((o) => o.status === "pending").map((o) => [o.listing_id, o]),
  );

  const contentStyle = useScrollScreenContentStyle(24, 1);

  return (
    <View className="flex-1 bg-background">
      <RewardToast reward={toast} offsetTop={8} />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ ...contentStyle, paddingBottom: contentStyle.paddingBottom + footerHeight }}
      >
        <View className="mb-4">
          <Text className="font-display-bold text-3xl text-text">Trade</Text>
        </View>

        <ListingsView
          listings={othersListings}
          listingsPending={listingsPending}
          myActiveListings={myActiveListings}
          myPendingOfferByListingId={myPendingOfferByListingId}
          buyListedWobblin={buyListedWobblin}
          cancelListing={cancelListing}
          cancelOffer={cancelOffer}
          actionError={actionError}
          setActionError={setActionError}
          setToast={setToast}
        />
      </ScrollView>

      <TradeFooter
        sellableCount={sellable.length}
        onChoose={() => router.push("/trade/choose-wobblin")}
        onLayout={setFooterHeight}
      />
    </View>
  );
}

function TradeFooter({
  sellableCount,
  onChoose,
  onLayout,
}: {
  sellableCount: number;
  onChoose: () => void;
  onLayout: (height: number) => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View
      onLayout={(e) => onLayout(e.nativeEvent.layout.height)}
      className="absolute left-0 right-0 border-t border-border bg-surface px-6 pb-4 pt-4"
      style={{ bottom: TAB_BAR_HEIGHT + insets.bottom }}
    >
      <View className="gap-1.5">
        <Button label="Trade" onPress={onChoose} disabled={sellableCount === 0} />
        {sellableCount === 0 && (
          <Text className="text-center font-sans text-xs text-text-subtle">No eligible Wobblins to list.</Text>
        )}
      </View>
    </View>
  );
}

function ListingsView({
  listings: othersListings,
  listingsPending,
  myActiveListings,
  myPendingOfferByListingId,
  buyListedWobblin,
  cancelListing,
  cancelOffer,
  actionError,
  setActionError,
  setToast,
}: {
  listings: MarketplaceListing[];
  listingsPending: boolean;
  myActiveListings: MarketplaceListing[];
  myPendingOfferByListingId: Map<string, MyOffer>;
  buyListedWobblin: ReturnType<typeof useBuyListedWobblin>;
  cancelListing: ReturnType<typeof useCancelListing>;
  cancelOffer: ReturnType<typeof useCancelWobblinOffer>;
  actionError: string | null;
  setActionError: (error: string | null) => void;
  setToast: (toast: RewardToastData | null) => void;
}) {
  const router = useRouter();
  const [notEnoughEssenceVisible, setNotEnoughEssenceVisible] = useState(false);

  const myOfferListings = othersListings.filter((l) => myPendingOfferByListingId.has(l.id));
  const browseListings = othersListings.filter((l) => !myPendingOfferByListingId.has(l.id));

  return (
    <View className="gap-6">
      {myActiveListings.length > 0 && (
        <View className="gap-3">
          <Text className="font-display text-sm uppercase tracking-wide text-text-muted">My Listings</Text>
          <View className="flex-row flex-wrap gap-3">
            {myActiveListings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                actionLabel="Cancel"
                actionVariant="secondary"
                onAction={() => cancelListing.mutate(listing.id)}
                actionLoading={cancelListing.isPending && cancelListing.variables === listing.id}
                secondaryActionLabel={listing.listing_type === "offers" ? "View Offers" : undefined}
                onSecondaryAction={() =>
                  router.push({ pathname: "/trade/listing-offers", params: { listingId: listing.id } })
                }
              />
            ))}
          </View>
        </View>
      )}

      {myOfferListings.length > 0 && (
        <View className="gap-3">
          <Text className="font-display text-sm uppercase tracking-wide text-text-muted">My Offers</Text>
          <View className="flex-row flex-wrap gap-3">
            {myOfferListings.map((listing) => {
              const myOffer = myPendingOfferByListingId.get(listing.id)!;
              return (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  actionLabel="Cancel Offer"
                  actionVariant="secondary"
                  onAction={() => {
                    setActionError(null);
                    cancelOffer.mutate(myOffer.id, {
                      onError: (err) => setActionError(getErrorMessage(err)),
                    });
                  }}
                  actionLoading={cancelOffer.isPending && cancelOffer.variables === myOffer.id}
                  badgeOverride={{ label: "Offer Sent", color: COLORS.essence }}
                  secondaryActionLabel="View Offer"
                  onSecondaryAction={() =>
                    router.push({ pathname: "/trade/offer-detail", params: { offerId: myOffer.id } })
                  }
                />
              );
            })}
          </View>
        </View>
      )}

      <View className="gap-3">
        <Text className="font-display text-sm uppercase tracking-wide text-text-muted">Marketplace</Text>
        {listingsPending ? (
          <Text className="font-sans text-sm text-text-subtle">Loading…</Text>
        ) : browseListings.length === 0 ? (
          <EmptyState
            icon={{ family: "ionicons", name: "pricetags-outline" }}
            title="No listings yet"
            description="Be the first to list a Wobblin for sale."
          />
        ) : (
          <View className="flex-row flex-wrap gap-3">
            {browseListings.map((listing) =>
              listing.listing_type === "offers" ? (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  actionLabel="Make Offer"
                  onAction={() =>
                    router.push({ pathname: "/trade/make-offer", params: { listingId: listing.id } })
                  }
                />
              ) : (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  actionLabel="Buy"
                  onAction={() => {
                    setActionError(null);
                    buyListedWobblin.mutate(listing.id, {
                      onSuccess: () => {
                        setToast({
                          icon: { family: "ionicons", name: "pricetag" },
                          title: `${listing.wobblin.nickname ?? listing.wobblin.species.name} Purchased!`,
                          subtitle: "Added to your Collection.",
                        });
                      },
                      onError: (err) => {
                        const message = getErrorMessage(err);
                        if (message === "Not enough essence") {
                          setNotEnoughEssenceVisible(true);
                        } else {
                          setActionError(message);
                        }
                      },
                    });
                  }}
                  actionLoading={buyListedWobblin.isPending && buyListedWobblin.variables === listing.id}
                />
              ),
            )}
          </View>
        )}
        {actionError && <Text className="font-sans-medium text-sm text-danger">{actionError}</Text>}
      </View>

      <SlideUpModal
        visible={notEnoughEssenceVisible}
        onClose={() => setNotEnoughEssenceVisible(false)}
        title="Not enough essence"
        icon={{ family: "ionicons", name: "flash" }}
      />
    </View>
  );
}

/** Compact grid card for a marketplace listing — portrait, level, and price (essence or "open to offers") only. */
function ListingCard({
  listing,
  actionLabel,
  actionVariant = "primary",
  onAction,
  actionLoading = false,
  secondaryActionLabel,
  onSecondaryAction,
  badgeOverride,
}: {
  listing: MarketplaceListing;
  actionLabel: string;
  actionVariant?: "primary" | "secondary";
  onAction: () => void;
  actionLoading?: boolean;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  /** Overrides the default "Open to Offers" badge on an offers-type listing — e.g. to show "Offer Sent". */
  badgeOverride?: { label: string; color: string };
}) {
  const element = listing.wobblin.species.element.toLowerCase() as Element;
  const rarity = listing.wobblin.species.rarity.toLowerCase() as Rarity;
  const rarityColor = RARITY_COLORS[rarity];
  const elementColor = ELEMENT_COLORS[element];
  const art = SPECIES_ART[listing.wobblin.species.name];
  const isPrimary = actionVariant === "primary";

  return (
    <View
      className="gap-1.5 overflow-hidden rounded-2xl border p-2"
      style={{ width: "31%", borderColor: `${rarityColor}55`, backgroundColor: `${rarityColor}14` }}
    >
      <View className="aspect-square items-center justify-end">
        {art ? (
          <Image source={art} style={{ width: "100%", height: "78%" }} contentFit="contain" />
        ) : (
          <View
            className="h-12 w-12 items-center justify-center rounded-full border bg-background"
            style={{ borderColor: `${elementColor}66` }}
          >
            <Icon {...ELEMENT_ICON[element]} size={20} color={elementColor} />
          </View>
        )}
        <View
          className="absolute left-0 top-0 rounded-full px-2 py-0.5"
          style={{ backgroundColor: `${COLORS.background}cc` }}
        >
          <Text className="font-sans-bold text-[11px] text-text">Lv. {listing.wobblin.level}</Text>
        </View>
        <View
          className="absolute right-0 top-0 h-6 w-6 items-center justify-center rounded-full"
          style={{ backgroundColor: `${COLORS.background}cc` }}
        >
          <Icon {...ELEMENT_ICON[element]} size={12} color={elementColor} />
        </View>
      </View>

      <Text numberOfLines={1} className="text-center font-display-bold text-sm text-text">
        {listing.wobblin.nickname ?? listing.wobblin.species.name}
      </Text>

      {listing.listing_type === "offers" ? (
        <View className="items-center">
          <TraitBadge label={badgeOverride?.label ?? "Open to Offers"} color={badgeOverride?.color ?? COLORS.primary} />
        </View>
      ) : (
        <View
          className="flex-row items-center justify-center gap-1 rounded-full border py-1"
          style={{ borderColor: `${COLORS.essence}40`, backgroundColor: `${COLORS.essence}14` }}
        >
          <Icon family="ionicons" name="flash" size={12} color={COLORS.essence} />
          <Text className="font-sans-bold text-xs" style={{ color: COLORS.essence }}>
            {listing.price_essence}
          </Text>
        </View>
      )}

      <Pressable
        onPress={onAction}
        disabled={actionLoading}
        accessibilityRole="button"
        className="items-center rounded-lg py-2"
        style={{
          backgroundColor: isPrimary ? COLORS.primary : COLORS.surfaceRaised,
          opacity: actionLoading ? 0.6 : 1,
        }}
      >
        <View className="items-center justify-center" style={{ height: 16 }}>
          {actionLoading ? (
            <ActivityIndicator size="small" color={isPrimary ? "#ffffff" : COLORS.primary} />
          ) : (
            <Text className="font-sans-bold text-xs" style={{ color: isPrimary ? "#ffffff" : COLORS.text }}>
              {actionLabel}
            </Text>
          )}
        </View>
      </Pressable>

      {secondaryActionLabel && onSecondaryAction && (
        <Pressable
          onPress={onSecondaryAction}
          accessibilityRole="button"
          className="items-center rounded-lg py-2"
          style={{ backgroundColor: COLORS.surfaceRaised }}
        >
          <Text className="font-sans-bold text-xs text-text">{secondaryActionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}
