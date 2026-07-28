import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, Text, TextInput, useWindowDimensions, View } from "react-native";

import { ElementFilterRow, ELEMENT_ORDER, type ElementFilterValue } from "@/components/ElementFilterRow";
import { EggGridCard } from "@/components/EggGridCard";
import { EmptyState } from "@/components/EmptyState";
import { Icon, type IconSpec } from "@/components/Icon";
import { Skeleton } from "@/components/Skeleton";
import { WobblinGridCard } from "@/components/WobblinGridCard";
import { COLORS, type Element } from "@/constants/theme";
import { useMyEggs } from "@/hooks/useEggs";
import { useScrollScreenContentStyle } from "@/hooks/useTabBarClearance";
import { useAllSpecies, usePlayerWobblins } from "@/hooks/useWobblins";
import type { Egg } from "@/supabase/eggs";
import { useSupabase } from "@/supabase/SupabaseProvider";
import type { PlayerWobblin, WobblinSpecies } from "@/supabase/wobblins";
import { getErrorMessage } from "@/utils/errors";
import { hatchCountdownLabel, isEggReady } from "@/utils/eggs";

const SEARCH_ICON: IconSpec = { family: "ionicons", name: "search" };
const FILTER_ICON: IconSpec = { family: "ionicons", name: "options" };

const SCREEN_PADDING = 24;
const CARD_GAP = 12;

type CollectionItem =
  | { kind: "wobblin"; id: string; wobblin: PlayerWobblin }
  | { kind: "egg"; id: string; egg: Egg };

function itemSpecies(item: CollectionItem): WobblinSpecies {
  return item.kind === "wobblin" ? item.wobblin.species : item.egg.species;
}

function itemName(item: CollectionItem): string {
  return item.kind === "wobblin" ? (item.wobblin.nickname ?? item.wobblin.species.name) : `${item.egg.species.name} Egg`;
}

export default function CollectionScreen() {
  const { session } = useSupabase();
  const playerId = session?.user.id;
  const { width } = useWindowDimensions();
  const cardWidth = (width - SCREEN_PADDING * 2 - CARD_GAP * 2) / 3;

  const { data: wobblins, isPending, error, refetch: refetchWobblins } = usePlayerWobblins(playerId);
  const { data: allSpecies, isPending: isSpeciesPending } = useAllSpecies();
  const { data: eggs, refetch: refetchEggs } = useMyEggs(playerId);

  // Tab screens (and any screen underneath a pushed stack route) can be frozen by the
  // navigator while unfocused — a cache update that lands while this screen is frozen
  // (e.g. an evolution performed on the Wobblin detail screen) doesn't reliably repaint
  // once the freeze lifts. Refetching on focus is the standard, deterministic fix rather
  // than relying on the frozen screen to pick up an already-updated cache on its own.
  useFocusEffect(
    useCallback(() => {
      refetchWobblins();
      refetchEggs();
    }, [refetchWobblins, refetchEggs]),
  );

  // Captured once per mount rather than read live — good enough for a display-only
  // countdown, since the `hatch_egg` RPC re-validates `hatch_ready_at` server-side
  // regardless of what the client thinks "now" is.
  const [now] = useState(() => Date.now());

  // Only eggs the player has claimed out of their source Wobblin's slot show up here as
  // a Collection tile — eggs still sitting in a slot are surfaced on the Wobblin detail
  // screen instead, and already-hatched eggs are history, not inventory.
  const claimedEggs = useMemo(() => (eggs ?? []).filter((egg) => egg.collected_at != null && !egg.hatched_at), [eggs]);

  // Unclaimed eggs still sitting in a slot don't get their own tile here (see above), but
  // the Wobblin that produced them should still nudge the player to go claim them rather
  // than requiring them to open every stage-2 Wobblin to check.
  const pendingEggCountBySource = useMemo(() => {
    const map = new Map<string, number>();
    for (const egg of eggs ?? []) {
      if (egg.collected_at == null && egg.hatched_at == null && egg.source_wobblin_id) {
        map.set(egg.source_wobblin_id, (map.get(egg.source_wobblin_id) ?? 0) + 1);
      }
    }
    return map;
  }, [eggs]);

  const [filter, setFilter] = useState<ElementFilterValue>("all");
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const contentStyle = useScrollScreenContentStyle(CARD_GAP);

  const items: CollectionItem[] = useMemo(
    () => [
      ...(wobblins ?? []).map((wobblin): CollectionItem => ({ kind: "wobblin", id: wobblin.id, wobblin })),
      ...claimedEggs.map((egg): CollectionItem => ({ kind: "egg", id: egg.id, egg })),
    ],
    [wobblins, claimedEggs],
  );

  // Maps each evolution_chain_id to its stage-0 species name, so chains sort
  // in a stable, human-readable order (alphabetical by base species) rather
  // than by the raw (meaningless) UUID.
  const chainBaseName = useMemo(() => {
    const map = new Map<string, string>();
    for (const species of allSpecies ?? []) {
      if (species.stage === 0) map.set(species.evolution_chain_id, species.name);
    }
    return map;
  }, [allSpecies]);

  const filtered = useMemo(() => {
    let result = items;
    if (filter !== "all") result = result.filter((item) => itemSpecies(item).element.toLowerCase() === filter);
    if (search.trim()) {
      const query = search.trim().toLowerCase();
      result = result.filter((item) => itemName(item).toLowerCase().includes(query));
    }
    return [...result].sort((a, b) => {
      const speciesA = itemSpecies(a);
      const speciesB = itemSpecies(b);
      const elementDiff =
        ELEMENT_ORDER[speciesA.element.toLowerCase() as Element] - ELEMENT_ORDER[speciesB.element.toLowerCase() as Element];
      if (elementDiff !== 0) return elementDiff;
      const chainDiff = (chainBaseName.get(speciesA.evolution_chain_id) ?? "").localeCompare(
        chainBaseName.get(speciesB.evolution_chain_id) ?? "",
      );
      if (chainDiff !== 0) return chainDiff;
      return speciesA.stage - speciesB.stage;
    });
  }, [items, filter, search, chainBaseName]);

  if (isPending || isSpeciesPending) {
    return <CollectionSkeleton />;
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6">
        <Text className="font-sans-medium text-sm text-danger">{getErrorMessage(error)}</Text>
      </View>
    );
  }

  return (
    <FlatList
      className="flex-1 bg-background"
      contentContainerStyle={contentStyle}
      columnWrapperStyle={{ gap: CARD_GAP }}
      data={filtered}
      numColumns={3}
      keyExtractor={(item) => `${item.kind}-${item.id}`}
      ListHeaderComponent={
        <View className="mb-4 gap-4">
          <View className="flex-row items-center justify-between">
            <Text className="font-display-bold text-3xl text-text">My Wobblins</Text>
            <View className="flex-row gap-2">
              <HeaderIconButton icon={SEARCH_ICON} active={searchOpen} onPress={() => setSearchOpen((v) => !v)} />
              <HeaderIconButton icon={FILTER_ICON} />
            </View>
          </View>
          {searchOpen && <SearchField value={search} onChange={setSearch} />}
          {items.length > 0 && <ElementFilterRow value={filter} onChange={setFilter} />}
        </View>
      }
      ListEmptyComponent={
        <EmptyState
          icon={{ family: "ionicons", name: "book" }}
          title={items.length > 0 ? "No Wobblins match" : "No Wobblins yet"}
          description={
            items.length > 0
              ? "Try a different filter."
              : "Hatch eggs, summon a new one, or trade with other players to grow your collection."
          }
        />
      }
      renderItem={({ item }) =>
        item.kind === "wobblin" ? (
          <WobblinGridCard
            wobblin={item.wobblin}
            width={cardWidth}
            pendingEggCount={pendingEggCountBySource.get(item.wobblin.id) ?? 0}
          />
        ) : (
          <EggGridCard
            egg={item.egg}
            width={cardWidth}
            ready={isEggReady(item.egg.hatch_ready_at, now)}
            countdownLabel={hatchCountdownLabel(item.egg.hatch_ready_at, now)}
          />
        )
      }
    />
  );
}

function HeaderIconButton({
  icon,
  active = false,
  onPress,
}: {
  icon: IconSpec;
  active?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      className="h-10 w-10 items-center justify-center rounded-full border"
      style={{
        borderColor: active ? COLORS.primary : COLORS.border,
        backgroundColor: active ? COLORS.primaryLight : COLORS.surface,
      }}
    >
      <Icon {...icon} size={18} color={active ? COLORS.primaryDark : COLORS.textMuted} />
    </Pressable>
  );
}

function SearchField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <View
      className="flex-row items-center gap-2 rounded-full border px-4 py-2.5"
      style={{ borderColor: COLORS.border, backgroundColor: COLORS.surface }}
    >
      <Icon {...SEARCH_ICON} size={16} color={COLORS.textSubtle} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="Search your Wobblins"
        placeholderTextColor={COLORS.textSubtle}
        autoFocus
        className="flex-1 font-sans text-sm text-text"
      />
    </View>
  );
}

function CollectionSkeleton() {
  const contentStyle = useScrollScreenContentStyle(16);
  return (
    <View className="flex-1 bg-background" style={contentStyle}>
      <Skeleton className="mb-2 h-9 w-48" />
      <View className="flex-row flex-wrap gap-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-32 flex-1 rounded-2xl" />
        ))}
      </View>
      <View className="flex-row flex-wrap gap-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-32 flex-1 rounded-2xl" />
        ))}
      </View>
    </View>
  );
}
