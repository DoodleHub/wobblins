import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { Icon } from "@/components/Icon";
import { MonsterHero } from "@/components/MonsterHero";
import { TraitBadge } from "@/components/TraitBadge";
import { WobblinPreviewRow } from "@/components/WobblinPreviewRow";
import { SPECIES_ART } from "@/constants/speciesArt";
import { COLORS, type Element, type Rarity } from "@/constants/theme";
import { useScrollScreenContentStyle } from "@/hooks/useTabBarClearance";
import { useCancelWobblinOffer, useMyOffers } from "@/hooks/useTrades";
import { useSupabase } from "@/supabase/SupabaseProvider";
import type { MyOffer } from "@/supabase/trades";
import { getErrorMessage } from "@/utils/errors";

const STATUS_LABEL: Record<MyOffer["status"], string> = {
  pending: "Pending",
  accepted: "Accepted",
  declined: "Declined",
  cancelled: "Cancelled",
};

const STATUS_COLOR: Record<MyOffer["status"], string> = {
  pending: COLORS.essence,
  accepted: COLORS.success,
  declined: COLORS.danger,
  cancelled: COLORS.textSubtle,
};

/**
 * Pushed from the Trade tab's "My Offers" section (shown once the caller
 * has a pending offer on a listing): the single offer's full detail — who
 * it's for, what was sent — with Edit/Cancel actions while it's still
 * pending.
 */
export default function OfferDetailScreen() {
  const router = useRouter();
  const { session } = useSupabase();
  const playerId = session?.user.id;
  const { offerId } = useLocalSearchParams<{ offerId: string }>();
  const contentStyle = useScrollScreenContentStyle(24, 1);

  const { data: offers, isPending } = useMyOffers(playerId);
  const offer = offers?.find((o) => o.id === offerId);
  const cancelOffer = useCancelWobblinOffer(playerId);

  const [error, setError] = useState<string | null>(null);

  const onCancel = () => {
    if (!offer) return;
    setError(null);
    cancelOffer.mutate(offer.id, {
      onSuccess: () => router.dismissTo("/(tabs)/trade"),
      onError: (err) => setError(getErrorMessage(err)),
    });
  };

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={contentStyle}>
      <View className="mb-2">
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

      {isPending ? (
        <Text className="font-sans text-sm text-text-subtle">Loading…</Text>
      ) : !offer ? (
        <EmptyState
          icon={{ family: "ionicons", name: "alert-circle-outline" }}
          title="Offer not found"
          description="This offer may have already been resolved or cancelled."
        />
      ) : (
        <View className="gap-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <Icon family="ionicons" name="person-circle-outline" size={18} color={COLORS.textMuted} />
              <Text className="font-sans-semibold text-sm text-text">
                {offer.listing.seller?.username ?? "Unknown player"}
              </Text>
            </View>
            <TraitBadge label={STATUS_LABEL[offer.status]} color={STATUS_COLOR[offer.status]} />
          </View>

          <Text className="font-sans text-sm text-text-subtle">You offered for:</Text>
          <MonsterHero
            name={offer.listing.wobblin.nickname ?? offer.listing.wobblin.species.name}
            speciesName={offer.listing.wobblin.species.name}
            nicknamed={offer.listing.wobblin.nickname != null}
            level={offer.listing.wobblin.level}
            element={offer.listing.wobblin.species.element.toLowerCase() as Element}
            rarity={offer.listing.wobblin.species.rarity.toLowerCase() as Rarity}
            art={SPECIES_ART[offer.listing.wobblin.species.name]}
          />

          <View className="gap-1.5">
            <Text className="font-display text-xs uppercase tracking-wide text-text-muted">
              You sent {offer.offered_wobblins.length > 1 ? "these Wobblins" : "this Wobblin"}
            </Text>
            <View className="gap-2">
              {offer.offered_wobblins.map(({ player_wobblin }) => (
                <WobblinPreviewRow key={player_wobblin.id} wobblin={player_wobblin} />
              ))}
            </View>
          </View>

          {offer.status === "pending" && (
            <View className="gap-3">
              <Button
                label="Edit Offer"
                onPress={() =>
                  router.push({
                    pathname: "/trade/make-offer",
                    params: { listingId: offer.listing_id, offerId: offer.id },
                  })
                }
              />
              <Button label="Cancel Offer" variant="secondary" onPress={onCancel} loading={cancelOffer.isPending} />
            </View>
          )}

          {error && <Text className="font-sans-medium text-sm text-danger">{error}</Text>}
        </View>
      )}
    </ScrollView>
  );
}
