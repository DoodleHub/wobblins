import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { EmptyState } from "@/components/EmptyState";
import { Icon } from "@/components/Icon";
import { LoadingScreen } from "@/components/LoadingScreen";
import { RewardToast, type RewardToastData } from "@/components/RewardToast";
import { SPECIES_ART } from "@/constants/speciesArt";
import { COLORS, ELEMENT_COLORS, ELEMENT_ICON, RARITY_COLORS, type Element, type Rarity } from "@/constants/theme";
import { usePlayer } from "@/hooks/usePlayer";
import { usePurchaseShopListing, useWeeklyShop } from "@/hooks/useShop";
import { useSupabase } from "@/supabase/SupabaseProvider";
import type { ShopListing } from "@/supabase/shop";
import { getErrorMessage } from "@/utils/errors";

export default function ShopScreen() {
  const router = useRouter();
  const { session } = useSupabase();
  const playerId = session?.user.id;

  const { data: player } = usePlayer(playerId);
  const { data: shop, isPending, error } = useWeeklyShop();
  const purchaseShopListing = usePurchaseShopListing(playerId);

  const [toast, setToast] = useState<RewardToastData | null>(null);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);

  const onBuy = (listing: ShopListing) => {
    setPurchaseError(null);
    setPurchasingId(listing.listing_id);
    purchaseShopListing.mutate(listing.listing_id, {
      onSuccess: () => {
        setToast({
          icon: { family: "ionicons", name: "storefront" },
          title: `${listing.species.name} Purchased!`,
          subtitle: "Added to your Collection.",
        });
      },
      onError: (err) => setPurchaseError(getErrorMessage(err)),
      onSettled: () => setPurchasingId(null),
    });
  };

  return (
    <View className="flex-1 bg-background">
      <RewardToast reward={toast} offsetTop={76} />
      <ScrollView className="flex-1" contentContainerClassName="w-full min-w-0 flex-grow gap-6 px-6 pb-8 pt-16">
        <View className="flex-row items-center justify-between">
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            className="h-10 w-10 items-center justify-center rounded-full border"
            style={{ borderColor: COLORS.border, backgroundColor: COLORS.surface }}
          >
            <Icon family="ionicons" name="chevron-back" size={20} color={COLORS.text} />
          </Pressable>
          <View
            className="flex-row items-center gap-1.5 rounded-full border px-3 py-2"
            style={{ borderColor: `${COLORS.essence}40`, backgroundColor: `${COLORS.essence}14` }}
          >
            <Icon family="ionicons" name="flash" size={14} color={COLORS.essence} />
            <Text className="font-sans-semibold text-sm" style={{ color: COLORS.essence }}>
              {player?.essence_balance ?? 0}
            </Text>
          </View>
        </View>

        <View className="gap-1">
          <Text className="font-display-bold text-3xl text-text">Shop</Text>
          <Text className="font-sans-medium text-sm text-text-muted">
            A fresh set of Stage 0 Wobblins, restocked every week.
          </Text>
        </View>

        {isPending ? (
          <LoadingScreen message="Loading shop…" />
        ) : error ? (
          <Text className="font-sans-medium text-sm text-danger">{getErrorMessage(error)}</Text>
        ) : !shop || shop.listings.length === 0 ? (
          <EmptyState
            icon={{ family: "ionicons", name: "storefront-outline" }}
            title="Shop is empty"
            description="Check back next week for a fresh rotation."
          />
        ) : (
          <View className="flex-row flex-wrap gap-3">
            {shop.listings.map((listing) => (
              <ShopListingCard
                key={listing.listing_id}
                listing={listing}
                onBuy={() => onBuy(listing)}
                buying={purchasingId === listing.listing_id && purchaseShopListing.isPending}
                canAfford={(player?.essence_balance ?? 0) >= listing.price_essence}
              />
            ))}
          </View>
        )}

        {purchaseError && <Text className="font-sans-medium text-sm text-danger">{purchaseError}</Text>}
      </ScrollView>
    </View>
  );
}

function ShopListingCard({
  listing,
  onBuy,
  buying,
  canAfford,
}: {
  listing: ShopListing;
  onBuy: () => void;
  buying: boolean;
  canAfford: boolean;
}) {
  const element = listing.species.element.toLowerCase() as Element;
  const rarity = listing.species.rarity.toLowerCase() as Rarity;
  const elementColor = ELEMENT_COLORS[element];
  const rarityColor = RARITY_COLORS[rarity];
  const art = SPECIES_ART[listing.species.name];
  const disabled = listing.purchased || buying || !canAfford;

  return (
    <View
      className="gap-2 overflow-hidden rounded-2xl border p-3"
      style={{ width: "47%", borderColor: `${rarityColor}55`, backgroundColor: `${rarityColor}14` }}
    >
      <View className="aspect-square items-center justify-center" style={{ opacity: listing.purchased ? 0.4 : 1 }}>
        {art ? (
          <Image source={art} style={{ width: "100%", height: "100%" }} contentFit="contain" />
        ) : (
          <View
            className="h-16 w-16 items-center justify-center rounded-full border bg-background"
            style={{ borderColor: `${elementColor}66` }}
          >
            <Icon {...ELEMENT_ICON[element]} size={28} color={elementColor} />
          </View>
        )}
      </View>
      <Text numberOfLines={1} className="font-display-bold text-sm text-text">
        {listing.species.name}
      </Text>
      <View className="flex-row items-center gap-1">
        <Icon family="ionicons" name="flash" size={12} color={COLORS.essence} />
        <Text className="font-sans-semibold text-xs" style={{ color: COLORS.essence }}>
          {listing.price_essence}
        </Text>
      </View>
      <Pressable
        onPress={onBuy}
        disabled={disabled}
        accessibilityRole="button"
        className="items-center rounded-lg py-2"
        style={{
          backgroundColor: listing.purchased ? COLORS.surfaceRaised : COLORS.primary,
          opacity: disabled && !listing.purchased ? 0.5 : 1,
        }}
      >
        <Text
          className="font-sans-bold text-xs"
          style={{ color: listing.purchased ? COLORS.textMuted : "#ffffff" }}
        >
          {listing.purchased ? "Sold" : buying ? "Buying…" : !canAfford ? "Not Enough" : "Buy"}
        </Text>
      </Pressable>
    </View>
  );
}
