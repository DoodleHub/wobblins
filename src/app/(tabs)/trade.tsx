import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { Icon } from "@/components/Icon";
import { TraitBadge } from "@/components/TraitBadge";
import { SPECIES_ART } from "@/constants/speciesArt";
import { COLORS, ELEMENT_COLORS, ELEMENT_ICON, RARITY_COLORS, type Element, type Rarity } from "@/constants/theme";
import { TAB_BAR_HEIGHT, useScrollScreenContentStyle } from "@/hooks/useTabBarClearance";
import { useBuyListedWobblin, useCancelListing, useMarketplaceListings, useMyListings } from "@/hooks/useTrades";
import { usePlayerWobblins } from "@/hooks/useWobblins";
import { useSupabase } from "@/supabase/SupabaseProvider";
import type { MarketplaceListing } from "@/supabase/trades";
import { getErrorMessage } from "@/utils/errors";

export default function TradeScreen() {
  const { session } = useSupabase();
  const playerId = session?.user.id;
  const router = useRouter();

  const { data: listings, isPending: listingsPending } = useMarketplaceListings();
  const { data: myListings } = useMyListings(playerId);
  const { data: myWobblins } = usePlayerWobblins(playerId);
  const buyListedWobblin = useBuyListedWobblin(playerId);
  const cancelListing = useCancelListing(playerId);

  const [actionError, setActionError] = useState<string | null>(null);
  const [footerHeight, setFooterHeight] = useState(0);

  const activeMyListingWobblinIds = new Set(
    (myListings ?? []).filter((l) => l.status === "active").map((l) => l.player_wobblin_id),
  );
  const sellable = (myWobblins ?? []).filter((w) => !activeMyListingWobblinIds.has(w.id));
  const othersListings = (listings ?? []).filter((l) => l.seller_id !== playerId);
  const myActiveListings = (myListings ?? []).filter((l) => l.status === "active");

  const contentStyle = useScrollScreenContentStyle(24, 1);

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ ...contentStyle, paddingBottom: contentStyle.paddingBottom + footerHeight }}
      >
        <ListingsView
          listings={othersListings}
          listingsPending={listingsPending}
          myActiveListings={myActiveListings}
          buyListedWobblin={buyListedWobblin}
          cancelListing={cancelListing}
          actionError={actionError}
          setActionError={setActionError}
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
  buyListedWobblin,
  cancelListing,
  actionError,
  setActionError,
}: {
  listings: MarketplaceListing[];
  listingsPending: boolean;
  myActiveListings: MarketplaceListing[];
  buyListedWobblin: ReturnType<typeof useBuyListedWobblin>;
  cancelListing: ReturnType<typeof useCancelListing>;
  actionError: string | null;
  setActionError: (error: string | null) => void;
}) {
  const router = useRouter();

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
                actionLoading={cancelListing.isPending}
                secondaryActionLabel={listing.listing_type === "offers" ? "View Offers" : undefined}
                onSecondaryAction={() =>
                  router.push({ pathname: "/trade/listing-offers", params: { listingId: listing.id } })
                }
              />
            ))}
          </View>
        </View>
      )}

      <View className="gap-3">
        <Text className="font-display text-sm uppercase tracking-wide text-text-muted">Marketplace</Text>
        {listingsPending ? (
          <Text className="font-sans text-sm text-text-subtle">Loading…</Text>
        ) : othersListings.length === 0 ? (
          <EmptyState
            icon={{ family: "ionicons", name: "pricetags-outline" }}
            title="No listings yet"
            description="Be the first to list a Wobblin for sale."
          />
        ) : (
          <View className="flex-row flex-wrap gap-3">
            {othersListings.map((listing) =>
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
                      onError: (err) => setActionError(getErrorMessage(err)),
                    });
                  }}
                  actionLoading={buyListedWobblin.isPending}
                />
              ),
            )}
          </View>
        )}
        {actionError && <Text className="font-sans-medium text-sm text-danger">{actionError}</Text>}
      </View>
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
}: {
  listing: MarketplaceListing;
  actionLabel: string;
  actionVariant?: "primary" | "secondary";
  onAction: () => void;
  actionLoading?: boolean;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
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
          <TraitBadge label="Open to Offers" color={COLORS.primary} />
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
        {actionLoading ? (
          <ActivityIndicator size="small" color={isPrimary ? "#ffffff" : COLORS.primary} />
        ) : (
          <Text className="font-sans-bold text-xs" style={{ color: isPrimary ? "#ffffff" : COLORS.text }}>
            {actionLabel}
          </Text>
        )}
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
