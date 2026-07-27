import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { type ReactNode, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { Icon } from "@/components/Icon";
import { TextField } from "@/components/TextField";
import { WobblinPickerTray } from "@/components/WobblinPickerTray";
import { SPECIES_ART } from "@/constants/speciesArt";
import { COLORS, ELEMENT_COLORS, ELEMENT_ICON, RARITY_COLORS, type Element, type Rarity } from "@/constants/theme";
import { useScrollScreenContentStyle } from "@/hooks/useTabBarClearance";
import {
  useBuyListedWobblin,
  useCancelListing,
  useCancelTradeOffer,
  useIncomingTradeOffers,
  useListWobblinForSale,
  useMarketplaceListings,
  useMyListings,
  useOutgoingTradeOffers,
  useRespondToTradeOffer,
} from "@/hooks/useTrades";
import { usePlayerWobblins } from "@/hooks/useWobblins";
import { useSupabase } from "@/supabase/SupabaseProvider";
import type { MarketplaceListing, TradeOffer } from "@/supabase/trades";
import type { PlayerWobblin } from "@/supabase/wobblins";
import { getErrorMessage } from "@/utils/errors";

type Mode = "listings" | "offers";

export default function TradeScreen() {
  const router = useRouter();
  const { session } = useSupabase();
  const playerId = session?.user.id;
  const contentStyle = useScrollScreenContentStyle(24, 1);

  const [mode, setMode] = useState<Mode>("listings");

  return (
    <View className="flex-1 bg-background">
      <ScrollView className="flex-1" contentContainerStyle={contentStyle}>
        <View className="mb-4 gap-4">
          <Text className="font-display-bold text-3xl text-text">Trade</Text>
          <View className="flex-row rounded-full border border-border bg-surface p-1">
            <ModeTab label="Listings" active={mode === "listings"} onPress={() => setMode("listings")} />
            <ModeTab label="Offers" active={mode === "offers"} onPress={() => setMode("offers")} />
          </View>
        </View>

        {mode === "listings" ? (
          <ListingsView playerId={playerId} />
        ) : (
          <OffersView playerId={playerId} onPropose={() => router.push("/trade/compose")} />
        )}
      </ScrollView>
    </View>
  );
}

function ModeTab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      className="flex-1 items-center rounded-full py-2"
      style={{ backgroundColor: active ? COLORS.primary : "transparent" }}
    >
      <Text className="font-sans-semibold text-sm" style={{ color: active ? "#ffffff" : COLORS.textMuted }}>
        {label}
      </Text>
    </Pressable>
  );
}

function ListingsView({ playerId }: { playerId: string | undefined }) {
  const { data: listings, isPending: listingsPending } = useMarketplaceListings();
  const { data: myListings } = useMyListings(playerId);
  const { data: myWobblins } = usePlayerWobblins(playerId);
  const buyListedWobblin = useBuyListedWobblin(playerId);
  const cancelListing = useCancelListing(playerId);
  const listWobblinForSale = useListWobblinForSale(playerId);

  const [sellOpen, setSellOpen] = useState(false);
  const [trayOpen, setTrayOpen] = useState(false);
  const [selectedWobblinId, setSelectedWobblinId] = useState<string | null>(null);
  const [price, setPrice] = useState("");
  const [sellError, setSellError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const activeMyListingWobblinIds = new Set(
    (myListings ?? []).filter((l) => l.status === "active").map((l) => l.player_wobblin_id),
  );
  const sellable = (myWobblins ?? []).filter((w) => !activeMyListingWobblinIds.has(w.id));
  const othersListings = (listings ?? []).filter((l) => l.seller_id !== playerId);
  const myActiveListings = (myListings ?? []).filter((l) => l.status === "active");
  const selectedWobblin = sellable.find((w) => w.id === selectedWobblinId) ?? null;

  const closeSellPanel = () => {
    setSellOpen(false);
    setSelectedWobblinId(null);
    setPrice("");
    setSellError(null);
  };

  const onPickWobblin = (wobblin: PlayerWobblin) => {
    setSelectedWobblinId(wobblin.id);
    setSellOpen(true);
    setTrayOpen(false);
  };

  const onSubmitSale = () => {
    const amount = Math.floor(Number(price));
    if (!selectedWobblinId) {
      setSellError("Choose a Wobblin to sell.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setSellError("Enter an essence price.");
      return;
    }
    setSellError(null);
    listWobblinForSale.mutate(
      { playerWobblinId: selectedWobblinId, priceEssence: amount },
      {
        onSuccess: () => closeSellPanel(),
        onError: (err) => setSellError(getErrorMessage(err)),
      },
    );
  };

  return (
    <View className="gap-6">
      <View className="gap-3 rounded-2xl border border-border bg-surface p-4">
        <View className="flex-row items-center justify-between">
          <Text className="font-display text-sm uppercase tracking-wide text-text-muted">Sell a Wobblin</Text>
          {!sellOpen && (
            <Pressable onPress={() => setTrayOpen(true)} disabled={sellable.length === 0}>
              <Text
                className="font-sans-semibold text-xs"
                style={{ color: sellable.length === 0 ? COLORS.textSubtle : COLORS.primaryDark }}
              >
                Choose
              </Text>
            </Pressable>
          )}
        </View>

        {sellable.length === 0 ? (
          <Text className="font-sans text-sm text-text-subtle">No eligible Wobblins to list.</Text>
        ) : sellOpen && selectedWobblin ? (
          <View className="gap-3">
            <SelectedWobblinRow wobblin={selectedWobblin} onChange={() => setTrayOpen(true)} />
            <TextField
              label="Price (essence)"
              value={price}
              onChangeText={setPrice}
              keyboardType="number-pad"
              placeholder="0"
            />
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Button label="Cancel" variant="secondary" onPress={closeSellPanel} />
              </View>
              <View className="flex-1">
                <Button label="List for Sale" onPress={onSubmitSale} loading={listWobblinForSale.isPending} />
              </View>
            </View>
            {sellError && <Text className="font-sans-medium text-sm text-danger">{sellError}</Text>}
          </View>
        ) : null}
      </View>

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
            {othersListings.map((listing) => (
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
            ))}
          </View>
        )}
        {actionError && <Text className="font-sans-medium text-sm text-danger">{actionError}</Text>}
      </View>

      <WobblinPickerTray
        visible={trayOpen}
        title="Choose a Wobblin to Sell"
        wobblins={sellable}
        onSelect={onPickWobblin}
        onClose={() => setTrayOpen(false)}
        emptyLabel="No eligible Wobblins to list."
      />
    </View>
  );
}

function SelectedWobblinRow({ wobblin, onChange }: { wobblin: PlayerWobblin; onChange: () => void }) {
  const element = wobblin.species.element.toLowerCase() as Element;
  const name = wobblin.nickname ?? wobblin.species.name;
  const art = SPECIES_ART[wobblin.species.name];

  return (
    <View
      className="flex-row items-center gap-3 rounded-xl border p-3"
      style={{ borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight }}
    >
      <View
        className="h-10 w-10 items-center justify-center rounded-full border bg-background"
        style={{ borderColor: `${ELEMENT_COLORS[element]}66` }}
      >
        {art ? (
          <Image source={art} style={{ width: "82%", height: "82%" }} contentFit="contain" />
        ) : (
          <Icon {...ELEMENT_ICON[element]} size={16} color={ELEMENT_COLORS[element]} />
        )}
      </View>
      <View className="flex-1 gap-0.5">
        <Text className="font-sans-semibold text-sm text-text">{name}</Text>
        <Text className="font-sans text-xs text-text-subtle">Lv. {wobblin.level}</Text>
      </View>
      <Pressable onPress={onChange} accessibilityRole="button">
        <Text className="font-sans-semibold text-xs text-primary-dark">Change</Text>
      </Pressable>
    </View>
  );
}

/** Compact grid card for a marketplace listing — portrait, level, and essence price only, nothing else. */
function ListingCard({
  listing,
  actionLabel,
  actionVariant = "primary",
  onAction,
  actionLoading = false,
}: {
  listing: MarketplaceListing;
  actionLabel: string;
  actionVariant?: "primary" | "secondary";
  onAction: () => void;
  actionLoading?: boolean;
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

      <View
        className="flex-row items-center justify-center gap-1 rounded-full border py-1"
        style={{ borderColor: `${COLORS.essence}40`, backgroundColor: `${COLORS.essence}14` }}
      >
        <Icon family="ionicons" name="flash" size={12} color={COLORS.essence} />
        <Text className="font-sans-bold text-xs" style={{ color: COLORS.essence }}>
          {listing.price_essence}
        </Text>
      </View>

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
    </View>
  );
}

function OffersView({ playerId, onPropose }: { playerId: string | undefined; onPropose: () => void }) {
  const { data: incoming } = useIncomingTradeOffers(playerId);
  const { data: outgoing } = useOutgoingTradeOffers(playerId);
  const respondToTradeOffer = useRespondToTradeOffer(playerId);
  const cancelTradeOffer = useCancelTradeOffer(playerId);
  const [error, setError] = useState<string | null>(null);

  const pendingIncoming = (incoming ?? []).filter((o) => o.status === "pending");
  const pendingOutgoing = (outgoing ?? []).filter((o) => o.status === "pending");

  const onRespond = (offerId: string, accept: boolean) => {
    setError(null);
    respondToTradeOffer.mutate(
      { offerId, accept },
      {
        onSuccess: (result) => {
          if (!result.success) setError("This trade is no longer valid — one of the Wobblins already moved.");
        },
        onError: (err) => setError(getErrorMessage(err)),
      },
    );
  };

  return (
    <View className="gap-6">
      <Button label="Propose a Trade" onPress={onPropose} />

      <View className="gap-3">
        <Text className="font-display text-sm uppercase tracking-wide text-text-muted">Incoming</Text>
        {pendingIncoming.length === 0 ? (
          <Text className="font-sans text-sm text-text-subtle">No incoming offers.</Text>
        ) : (
          pendingIncoming.map((offer) => (
            <OfferRow
              key={offer.id}
              offer={offer}
              perspective="incoming"
              actions={
                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Button
                      label="Decline"
                      variant="secondary"
                      onPress={() => onRespond(offer.id, false)}
                      loading={respondToTradeOffer.isPending}
                    />
                  </View>
                  <View className="flex-1">
                    <Button
                      label="Accept"
                      onPress={() => onRespond(offer.id, true)}
                      loading={respondToTradeOffer.isPending}
                    />
                  </View>
                </View>
              }
            />
          ))
        )}
      </View>

      <View className="gap-3">
        <Text className="font-display text-sm uppercase tracking-wide text-text-muted">Outgoing</Text>
        {pendingOutgoing.length === 0 ? (
          <Text className="font-sans text-sm text-text-subtle">No outgoing offers.</Text>
        ) : (
          pendingOutgoing.map((offer) => (
            <OfferRow
              key={offer.id}
              offer={offer}
              perspective="outgoing"
              actions={
                <Button
                  label="Withdraw"
                  variant="secondary"
                  onPress={() => cancelTradeOffer.mutate(offer.id)}
                  loading={cancelTradeOffer.isPending}
                />
              }
            />
          ))
        )}
      </View>

      {error && <Text className="font-sans-medium text-sm text-danger">{error}</Text>}
    </View>
  );
}

function OfferRow({
  offer,
  perspective,
  actions,
}: {
  offer: TradeOffer;
  perspective: "incoming" | "outgoing";
  actions: ReactNode;
}) {
  const mine = perspective === "incoming" ? offer.requested_wobblin : offer.offered_wobblin;
  const theirs = perspective === "incoming" ? offer.offered_wobblin : offer.requested_wobblin;
  const counterparty = perspective === "incoming" ? offer.proposer : offer.recipient;

  return (
    <View className="gap-3 rounded-2xl border border-border bg-surface p-4">
      <Text className="font-sans-medium text-xs text-text-subtle">
        {perspective === "incoming" ? `${counterparty.username} offers:` : `You offered ${counterparty.username}:`}
      </Text>
      <View className="flex-row items-center gap-3">
        <OfferWobblinChip wobblin={theirs} label={perspective === "incoming" ? "Their Wobblin" : "Your Wobblin"} />
        <Icon family="ionicons" name="swap-horizontal" size={18} color={COLORS.textSubtle} />
        <OfferWobblinChip wobblin={mine} label={perspective === "incoming" ? "Your Wobblin" : "Their Wobblin"} />
      </View>
      {actions}
    </View>
  );
}

function OfferWobblinChip({ wobblin, label }: { wobblin: PlayerWobblin; label: string }) {
  const element = wobblin.species.element.toLowerCase() as Element;
  const art = SPECIES_ART[wobblin.species.name];
  const name = wobblin.nickname ?? wobblin.species.name;

  return (
    <View className="flex-1 items-center gap-1">
      <View
        className="h-12 w-12 items-center justify-center rounded-full border bg-background"
        style={{ borderColor: `${ELEMENT_COLORS[element]}66` }}
      >
        {art ? (
          <Image source={art} style={{ width: "78%", height: "78%" }} contentFit="contain" />
        ) : (
          <Icon {...ELEMENT_ICON[element]} size={20} color={ELEMENT_COLORS[element]} />
        )}
      </View>
      <Text numberOfLines={1} className="font-sans-semibold text-xs text-text">
        {name}
      </Text>
      <Text className="font-sans text-[10px] text-text-subtle">{label}</Text>
    </View>
  );
}
