import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, Pressable, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/Button";
import { ElementFilterRow, ELEMENT_ORDER, type ElementFilterValue } from "@/components/ElementFilterRow";
import { EmptyState } from "@/components/EmptyState";
import { Icon } from "@/components/Icon";
import { WobblinGridCard } from "@/components/WobblinGridCard";
import { WobblinPreviewRow } from "@/components/WobblinPreviewRow";
import { COLORS, type Element } from "@/constants/theme";
import { useScrollScreenContentStyle } from "@/hooks/useTabBarClearance";
import { useMarketplaceListings, useMyListings, useProposeWobblinOffer } from "@/hooks/useTrades";
import { useAllSpecies, usePlayerWobblins } from "@/hooks/useWobblins";
import { useSupabase } from "@/supabase/SupabaseProvider";
import { getErrorMessage } from "@/utils/errors";

const SCREEN_PADDING = 24;
const CARD_GAP = 12;

/**
 * Pushed from an offers-type listing's "Make Offer" action: multi-select
 * grid of the caller's own Wobblins to bundle into a single offer for the
 * listing's Wobblin. Submitting jumps straight back to the Trade tab — the
 * seller reviews and accepts/declines from their own "View Offers" screen.
 */
export default function MakeOfferScreen() {
  const router = useRouter();
  const { session } = useSupabase();
  const playerId = session?.user.id;
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const cardWidth = (width - SCREEN_PADDING * 2 - CARD_GAP * 2) / 3;
  const { listingId } = useLocalSearchParams<{ listingId: string }>();

  const { data: listings } = useMarketplaceListings();
  const listing = listings?.find((l) => l.id === listingId);

  const { data: myWobblins, isPending } = usePlayerWobblins(playerId);
  const { data: myListings } = useMyListings(playerId);
  const { data: allSpecies } = useAllSpecies();
  const proposeOffer = useProposeWobblinOffer(playerId);

  const [filter, setFilter] = useState<ElementFilterValue>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [footerHeight, setFooterHeight] = useState(0);

  const contentStyle = useScrollScreenContentStyle(CARD_GAP);

  const chainBaseName = useMemo(() => {
    const map = new Map<string, string>();
    for (const species of allSpecies ?? []) {
      if (species.stage === 0) map.set(species.evolution_chain_id, species.name);
    }
    return map;
  }, [allSpecies]);

  const eligible = useMemo(() => {
    const activeListingWobblinIds = new Set(
      (myListings ?? []).filter((l) => l.status === "active").map((l) => l.player_wobblin_id),
    );
    let items = (myWobblins ?? []).filter((w) => !activeListingWobblinIds.has(w.id));
    if (filter !== "all") items = items.filter((w) => w.species.element.toLowerCase() === filter);
    return [...items].sort((a, b) => {
      const elementDiff =
        ELEMENT_ORDER[a.species.element.toLowerCase() as Element] -
        ELEMENT_ORDER[b.species.element.toLowerCase() as Element];
      if (elementDiff !== 0) return elementDiff;
      const chainDiff = (chainBaseName.get(a.species.evolution_chain_id) ?? "").localeCompare(
        chainBaseName.get(b.species.evolution_chain_id) ?? "",
      );
      if (chainDiff !== 0) return chainDiff;
      return a.species.stage - b.species.stage;
    });
  }, [myWobblins, myListings, chainBaseName, filter]);

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onSubmit = () => {
    if (selectedIds.size === 0 || !listingId) return;
    setError(null);
    proposeOffer.mutate(
      { listingId, offeredWobblinIds: Array.from(selectedIds) },
      {
        onSuccess: () => router.dismissTo("/(tabs)/trade"),
        onError: (err) => setError(getErrorMessage(err)),
      },
    );
  };

  if (!listing) {
    return (
      <View className="flex-1 bg-background">
        <ScreenHeader title="Make an Offer" />
        <View className="flex-1 px-6">
          <EmptyState
            icon={{ family: "ionicons", name: "alert-circle-outline" }}
            title="Listing not found"
            description="This listing may have been cancelled or already resolved."
          />
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <FlatList
        className="flex-1 bg-background"
        contentContainerStyle={{ ...contentStyle, paddingBottom: contentStyle.paddingBottom + footerHeight }}
        columnWrapperStyle={{ gap: CARD_GAP }}
        data={eligible}
        numColumns={3}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View className="mb-4 gap-4">
            <ScreenHeader title="Make an Offer" />
            <Text className="font-sans text-sm text-text-subtle">
              Offer one or more of your own Wobblins for:
            </Text>
            <WobblinPreviewRow wobblin={listing.wobblin} />
            <Text className="font-display text-sm uppercase tracking-wide text-text-muted">Your Wobblins</Text>
            {myWobblins && myWobblins.length > 0 && <ElementFilterRow value={filter} onChange={setFilter} />}
          </View>
        }
        ListEmptyComponent={
          !isPending ? (
            <EmptyState
              icon={{ family: "ionicons", name: "pricetags-outline" }}
              title="Nothing to offer"
              description={
                myWobblins && myWobblins.length > 0 ? "Try a different filter." : "You don't own any Wobblins yet."
              }
            />
          ) : null
        }
        renderItem={({ item }) => (
          <WobblinGridCard
            wobblin={item}
            width={cardWidth}
            selected={selectedIds.has(item.id)}
            onPress={() => toggleSelected(item.id)}
          />
        )}
      />

      <View
        onLayout={(e) => setFooterHeight(e.nativeEvent.layout.height)}
        className="absolute left-0 right-0 border-t border-border bg-surface px-6 pt-4"
        style={{ bottom: insets.bottom, paddingBottom: insets.bottom + 16 }}
      >
        <Button
          label={selectedIds.size > 1 ? `Send Offer (${selectedIds.size})` : "Send Offer"}
          onPress={onSubmit}
          disabled={selectedIds.size === 0}
          loading={proposeOffer.isPending}
        />
        {error && <Text className="mt-2 font-sans-medium text-sm text-danger">{error}</Text>}
      </View>
    </View>
  );
}

function ScreenHeader({ title }: { title: string }) {
  const router = useRouter();
  return (
    <View className="gap-4">
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
      <Text className="font-display-bold text-3xl text-text">{title}</Text>
    </View>
  );
}
