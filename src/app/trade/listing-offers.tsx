import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { Icon } from "@/components/Icon";
import { MonsterHero } from "@/components/MonsterHero";
import { WobblinPreviewRow } from "@/components/WobblinPreviewRow";
import { SPECIES_ART } from "@/constants/speciesArt";
import { COLORS, type Element, type Rarity } from "@/constants/theme";
import { useScrollScreenContentStyle } from "@/hooks/useTabBarClearance";
import { useMyListings, useOffersForListing, useRespondToWobblinOffer } from "@/hooks/useTrades";
import { useSupabase } from "@/supabase/SupabaseProvider";
import type { MarketplaceOffer } from "@/supabase/trades";
import { getErrorMessage } from "@/utils/errors";

/**
 * Pushed from an offers-type listing's "View Offers" action on the Trade
 * tab's "My Listings" section: every pending offer against one of the
 * caller's own listings, each showing the buyer and the Wobblin(s) they've
 * bundled, with Accept/Decline. Accepting resolves the listing and jumps
 * back to the Trade tab; declining just removes that one offer here.
 */
export default function ListingOffersScreen() {
  const router = useRouter();
  const { session } = useSupabase();
  const playerId = session?.user.id;
  const { listingId } = useLocalSearchParams<{ listingId: string }>();
  const contentStyle = useScrollScreenContentStyle(24, 1);

  const { data: myListings } = useMyListings(playerId);
  const listing = myListings?.find((l) => l.id === listingId);
  const { data: offers, isPending } = useOffersForListing(listingId);
  const respondToOffer = useRespondToWobblinOffer(playerId, listingId);

  const [respondingOfferId, setRespondingOfferId] = useState<string | null>(null);
  const [offerError, setOfferError] = useState<{ offerId: string; message: string } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const pendingOffers = (offers ?? []).filter((o) => o.status === "pending");

  const onRespond = (offer: MarketplaceOffer, accept: boolean) => {
    setRespondingOfferId(offer.id);
    setOfferError(null);
    setNotice(null);
    respondToOffer.mutate(
      { offerId: offer.id, accept },
      {
        onSuccess: (result) => {
          setRespondingOfferId(null);
          if (!accept) return;
          if (result.success) {
            router.dismissTo("/(tabs)/trade");
            return;
          }
          // Self-healed rather than an error — the listing resolved via a
          // different offer, or the buyer no longer owns what they offered.
          // The offer itself is already gone from the (refetched) pending
          // list, so surface why at the page level rather than on its card.
          setNotice(
            result.reason === "listing_no_longer_active"
              ? "That listing has already been resolved."
              : "That offer's Wobblin(s) are no longer owned by the buyer — it's been removed.",
          );
        },
        onError: (err) => {
          setRespondingOfferId(null);
          setOfferError({ offerId: offer.id, message: getErrorMessage(err) });
        },
      },
    );
  };

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={contentStyle}>
      <View className="mb-4 gap-4">
        <View className="flex-row items-center">
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            className="h-10 w-10 items-center justify-center rounded-full border"
            style={{ borderColor: COLORS.border, backgroundColor: COLORS.surface }}
          >
            <Icon family="ionicons" name="chevron-back" size={20} color={COLORS.text} />
          </Pressable>
        </View>
        <Text className="font-display-bold text-3xl text-text">Offers</Text>
      </View>

      {listing && (
        <MonsterHero
          name={listing.wobblin.nickname ?? listing.wobblin.species.name}
          speciesName={listing.wobblin.species.name}
          nicknamed={listing.wobblin.nickname != null}
          level={listing.wobblin.level}
          element={listing.wobblin.species.element.toLowerCase() as Element}
          rarity={listing.wobblin.species.rarity.toLowerCase() as Rarity}
          art={SPECIES_ART[listing.wobblin.species.name]}
        />
      )}

      {notice && (
        <View className="mt-4 rounded-xl border border-border bg-surface p-3">
          <Text className="font-sans-medium text-sm text-text-subtle">{notice}</Text>
        </View>
      )}

      <View className="mt-6 gap-3">
        {isPending ? (
          <Text className="font-sans text-sm text-text-subtle">Loading…</Text>
        ) : pendingOffers.length === 0 ? (
          <EmptyState
            icon={{ family: "ionicons", name: "mail-open-outline" }}
            title="No pending offers"
            description="Once another player offers a Wobblin, it'll show up here."
          />
        ) : (
          pendingOffers.map((offer) => (
            <View key={offer.id} className="gap-3 rounded-2xl border border-border bg-surface p-4">
              <View className="flex-row items-center gap-2">
                <Icon family="ionicons" name="person-circle-outline" size={18} color={COLORS.textMuted} />
                <Text className="font-sans-semibold text-sm text-text">
                  {offer.buyer?.username ?? "Unknown player"}
                </Text>
              </View>

              <View className="gap-2">
                {offer.offered_wobblins.map(({ player_wobblin }) => (
                  <WobblinPreviewRow key={player_wobblin.id} wobblin={player_wobblin} />
                ))}
              </View>

              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Button
                    label="Decline"
                    variant="secondary"
                    onPress={() => onRespond(offer, false)}
                    loading={respondingOfferId === offer.id && respondToOffer.isPending}
                  />
                </View>
                <View className="flex-1">
                  <Button
                    label="Accept"
                    onPress={() => onRespond(offer, true)}
                    loading={respondingOfferId === offer.id && respondToOffer.isPending}
                  />
                </View>
              </View>

              {offerError?.offerId === offer.id && (
                <Text className="font-sans-medium text-sm text-danger">{offerError.message}</Text>
              )}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}
