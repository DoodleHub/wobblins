import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Pressable, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/Button";
import { ElementFilterRow, ELEMENT_ORDER, type ElementFilterValue } from "@/components/ElementFilterRow";
import { EmptyState } from "@/components/EmptyState";
import { Icon } from "@/components/Icon";
import { MonsterHero } from "@/components/MonsterHero";
import { WobblinGridCard } from "@/components/WobblinGridCard";
import { SPECIES_ART } from "@/constants/speciesArt";
import { COLORS, type Element, type Rarity } from "@/constants/theme";
import { useScrollScreenContentStyle } from "@/hooks/useTabBarClearance";
import { useCancelWobblinOffer, useMarketplaceListings, useMyListings, useMyOffers, useProposeWobblinOffer } from "@/hooks/useTrades";
import { useAllSpecies, usePlayerWobblins } from "@/hooks/useWobblins";
import { useSupabase } from "@/supabase/SupabaseProvider";
import { getErrorMessage } from "@/utils/errors";

const SCREEN_PADDING = 24;
const CARD_GAP = 12;

/**
 * Pushed from an offers-type listing's "Make Offer" action, or from
 * `/trade/offer-detail`'s "Edit Offer" action (via an extra `offerId`
 * param): multi-select grid of the caller's own Wobblins to bundle into a
 * single offer for the listing's Wobblin. A buyer may only have one pending
 * offer per listing (enforced server-side in `propose_wobblin_offer`), so
 * "Make Offer" only ever appears when the caller has none yet — editing is
 * the only way to change an existing one. In edit mode the selection is
 * pre-seeded from the offer being replaced, and submitting cancels the old
 * offer first, then proposes the new bundle (the old one has to be gone
 * before the server will accept a replacement). Submitting jumps straight
 * back to the Trade tab either way — the seller reviews and
 * accepts/declines from their own "View Offers" screen.
 */
export default function MakeOfferScreen() {
  const router = useRouter();
  const { session } = useSupabase();
  const playerId = session?.user.id;
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const cardWidth = (width - SCREEN_PADDING * 2 - CARD_GAP * 2) / 3;
  const { listingId, offerId } = useLocalSearchParams<{ listingId: string; offerId?: string }>();
  const isEditing = !!offerId;

  const { data: listings } = useMarketplaceListings();
  const listing = listings?.find((l) => l.id === listingId);

  const { data: myWobblins, isPending } = usePlayerWobblins(playerId);
  const { data: myListings } = useMyListings(playerId);
  const { data: myOffers, isPending: myOffersPending } = useMyOffers(playerId);
  const editingOffer = isEditing ? myOffers?.find((o) => o.id === offerId) : undefined;
  const { data: allSpecies } = useAllSpecies();
  const proposeOffer = useProposeWobblinOffer(playerId);
  const cancelOffer = useCancelWobblinOffer(playerId);

  const [filter, setFilter] = useState<ElementFilterValue>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [footerHeight, setFooterHeight] = useState(0);

  const contentStyle = useScrollScreenContentStyle(CARD_GAP);

  // Seed the selection from the offer being replaced exactly once — a later
  // refetch (e.g. after the eventual cancel) shouldn't stomp on edits the
  // user has already made to the selection.
  const seededEditRef = useRef(false);
  useEffect(() => {
    if (isEditing && editingOffer && !seededEditRef.current) {
      setSelectedIds(new Set(editingOffer.offered_wobblins.map(({ player_wobblin }) => player_wobblin.id)));
      seededEditRef.current = true;
    }
  }, [isEditing, editingOffer]);

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

    const doPropose = () =>
      proposeOffer.mutate(
        { listingId, offeredWobblinIds: Array.from(selectedIds) },
        {
          onSuccess: () => router.dismissTo("/(tabs)/trade"),
          onError: (err) => setError(getErrorMessage(err)),
        },
      );

    if (isEditing && editingOffer) {
      // A buyer may only have one pending offer per listing, so the old one
      // must be gone before the server will accept the replacement — cancel
      // first, then propose. The selection is preserved in state, so if the
      // propose step fails the user can just resend without re-picking.
      cancelOffer.mutate(editingOffer.id, {
        onSuccess: doPropose,
        onError: (err) => setError(getErrorMessage(err)),
      });
    } else {
      doPropose();
    }
  };

  if (!listing) {
    return (
      <View className="flex-1 bg-background">
        <ScreenHeader title={isEditing ? "Edit Offer" : "Make an Offer"} />
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

  if (isEditing && !myOffersPending && !editingOffer) {
    return (
      <View className="flex-1 bg-background">
        <ScreenHeader title="Edit Offer" />
        <View className="flex-1 px-6">
          <EmptyState
            icon={{ family: "ionicons", name: "alert-circle-outline" }}
            title="Offer not found"
            description="This offer may have already been resolved or cancelled."
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
            <ScreenHeader title={isEditing ? "Edit Offer" : "Make an Offer"} />
            <Text className="font-sans text-sm text-text-subtle">
              {isEditing
                ? "Change your selection, then resend — this replaces your current offer for:"
                : "Offer one or more of your own Wobblins for:"}
            </Text>
            <MonsterHero
              name={listing.wobblin.nickname ?? listing.wobblin.species.name}
              speciesName={listing.wobblin.species.name}
              nicknamed={listing.wobblin.nickname != null}
              level={listing.wobblin.level}
              element={listing.wobblin.species.element.toLowerCase() as Element}
              rarity={listing.wobblin.species.rarity.toLowerCase() as Rarity}
              art={SPECIES_ART[listing.wobblin.species.name]}
            />
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
        className="absolute inset-x-0 bottom-0 border-t border-border bg-surface px-6 pt-4"
        style={{ paddingBottom: insets.bottom + 16 }}
      >
        <Button
          label={
            isEditing
              ? selectedIds.size > 1
                ? `Resend Offer (${selectedIds.size})`
                : "Resend Offer"
              : selectedIds.size > 1
                ? `Send Offer (${selectedIds.size})`
                : "Send Offer"
          }
          onPress={onSubmit}
          disabled={selectedIds.size === 0}
          loading={proposeOffer.isPending || cancelOffer.isPending}
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
