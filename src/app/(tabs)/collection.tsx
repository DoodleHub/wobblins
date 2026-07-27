import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, useWindowDimensions, View } from "react-native";

import { ElementFilterRow, ELEMENT_ORDER, type ElementFilterValue } from "@/components/ElementFilterRow";
import { EmptyState } from "@/components/EmptyState";
import { Icon, type IconSpec } from "@/components/Icon";
import { Skeleton } from "@/components/Skeleton";
import { WobblinGridCard } from "@/components/WobblinGridCard";
import { COLORS, ELEMENT_COLORS, ELEMENT_ICON, type Element } from "@/constants/theme";
import { useFeedEggEssence, useHatchEgg, useMyEggs } from "@/hooks/useEggs";
import { useEssenceConfig } from "@/hooks/useEssence";
import { useScrollScreenContentStyle } from "@/hooks/useTabBarClearance";
import { useAllSpecies, usePlayerWobblins } from "@/hooks/useWobblins";
import type { Egg } from "@/supabase/eggs";
import { useSupabase } from "@/supabase/SupabaseProvider";
import { getErrorMessage } from "@/utils/errors";

const SEARCH_ICON: IconSpec = { family: "ionicons", name: "search" };
const FILTER_ICON: IconSpec = { family: "ionicons", name: "options" };

const SCREEN_PADDING = 24;
const CARD_GAP = 12;

export default function CollectionScreen() {
  const { session } = useSupabase();
  const playerId = session?.user.id;
  const { width } = useWindowDimensions();
  const cardWidth = (width - SCREEN_PADDING * 2 - CARD_GAP * 2) / 3;

  const { data: wobblins, isPending, error, refetch: refetchWobblins } = usePlayerWobblins(playerId);
  const { data: allSpecies } = useAllSpecies();
  const { data: eggs, refetch: refetchEggs } = useMyEggs(playerId);
  const hatchEgg = useHatchEgg(playerId);
  const feedEggEssence = useFeedEggEssence(playerId);
  const { data: essenceConfig } = useEssenceConfig();

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
  const unhatchedEggs = useMemo(() => (eggs ?? []).filter((egg) => !egg.hatched_at), [eggs]);
  const [filter, setFilter] = useState<ElementFilterValue>("all");
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const contentStyle = useScrollScreenContentStyle(CARD_GAP);

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
    if (!wobblins) return [];
    let result = wobblins;
    if (filter !== "all") result = result.filter((w) => w.species.element.toLowerCase() === filter);
    if (search.trim()) {
      const query = search.trim().toLowerCase();
      result = result.filter((w) => (w.nickname ?? w.species.name).toLowerCase().includes(query));
    }
    return [...result].sort((a, b) => {
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
  }, [wobblins, filter, search, chainBaseName]);

  const speciesDiscovered = useMemo(() => {
    if (!wobblins) return 0;
    return new Set(wobblins.map((w) => w.species_id)).size;
  }, [wobblins]);

  if (isPending) {
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
      keyExtractor={(item) => item.id}
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
          {unhatchedEggs.length > 0 && (
            <EggsStrip
              eggs={unhatchedEggs}
              hatchXpRequired={essenceConfig?.egg_hatch_xp_required ?? 0}
              onHatch={(eggId) => hatchEgg.mutate(eggId)}
              hatching={hatchEgg.isPending}
              onFeed={(eggId, essenceAmount) => feedEggEssence.mutate({ eggId, essenceAmount })}
              feeding={feedEggEssence.isPending}
            />
          )}
          {wobblins && wobblins.length > 0 && <ElementFilterRow value={filter} onChange={setFilter} />}
        </View>
      }
      ListEmptyComponent={
        <EmptyState
          icon={{ family: "ionicons", name: "book" }}
          title={wobblins && wobblins.length > 0 ? "No Wobblins match" : "No Wobblins yet"}
          description={
            wobblins && wobblins.length > 0
              ? "Try a different filter."
              : "Hatch eggs, visit the Shop, or trade with other players to grow your collection."
          }
        />
      }
      ListFooterComponent={
        wobblins && wobblins.length > 0 ? (
          <CollectionStats
            collected={wobblins.length}
            discovered={speciesDiscovered}
            totalSpecies={allSpecies?.length ?? speciesDiscovered}
          />
        ) : null
      }
      renderItem={({ item }) => <WobblinGridCard wobblin={item} width={cardWidth} />}
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

function EggsStrip({
  eggs,
  hatchXpRequired,
  onHatch,
  hatching,
  onFeed,
  feeding,
}: {
  eggs: Egg[];
  hatchXpRequired: number;
  onHatch: (eggId: string) => void;
  hatching: boolean;
  onFeed: (eggId: string, essenceAmount: number) => void;
  feeding: boolean;
}) {
  return (
    <View className="gap-2 rounded-2xl border border-secondary/40 bg-secondary/10 p-3">
      <View className="flex-row items-center gap-1.5">
        <Icon family="material-community" name="egg-easter" size={15} color={COLORS.secondary} />
        <Text className="font-display text-sm uppercase tracking-wide text-secondary-dark">Eggs</Text>
      </View>
      <View className="gap-2">
        {eggs.map((egg) => (
          <EggRow
            key={egg.id}
            egg={egg}
            hatchXpRequired={hatchXpRequired}
            onHatch={() => onHatch(egg.id)}
            hatching={hatching}
            onFeed={(amount) => onFeed(egg.id, amount)}
            feeding={feeding}
          />
        ))}
      </View>
    </View>
  );
}

function EggRow({
  egg,
  hatchXpRequired,
  onHatch,
  hatching,
  onFeed,
  feeding,
}: {
  egg: Egg;
  hatchXpRequired: number;
  onHatch: () => void;
  hatching: boolean;
  onFeed: (essenceAmount: number) => void;
  feeding: boolean;
}) {
  const [amount, setAmount] = useState("");
  const element = egg.species.element.toLowerCase() as Element;
  const ready = hatchXpRequired > 0 && egg.xp >= hatchXpRequired;
  const percent = hatchXpRequired > 0 ? Math.min(100, (egg.xp / hatchXpRequired) * 100) : 0;

  const handleFeed = () => {
    const value = Math.floor(Number(amount));
    if (!Number.isFinite(value) || value <= 0) return;
    onFeed(value);
    setAmount("");
  };

  return (
    <View className="gap-2 rounded-xl border border-border bg-surface p-2.5">
      <View className="flex-row items-center gap-3">
        <View
          className="h-10 w-10 items-center justify-center rounded-full border bg-background"
          style={{ borderColor: `${ELEMENT_COLORS[element]}66` }}
        >
          <Icon {...ELEMENT_ICON[element]} size={18} color={ELEMENT_COLORS[element]} />
        </View>
        <View className="flex-1 gap-1">
          <Text className="font-sans-semibold text-sm text-text">{egg.species.name} Egg</Text>
          <View className="h-1.5 w-full overflow-hidden rounded-full bg-border">
            <View
              className="h-full rounded-full"
              style={{ width: `${percent}%`, backgroundColor: COLORS.essence }}
            />
          </View>
        </View>
        {ready ? (
          <Pressable
            onPress={onHatch}
            disabled={hatching}
            accessibilityRole="button"
            className="rounded-full bg-secondary px-3 py-1.5"
            style={{ opacity: hatching ? 0.6 : 1 }}
          >
            {hatching ? (
              <ActivityIndicator size="small" color="#0c0d16" />
            ) : (
              <Text className="font-sans-bold text-xs text-background">Hatch</Text>
            )}
          </Pressable>
        ) : (
          <Text className="font-sans-medium text-[11px] text-text-subtle">
            {egg.xp}/{hatchXpRequired}
          </Text>
        )}
      </View>
      {!ready && (
        <View className="flex-row items-center gap-2">
          <TextInput
            value={amount}
            onChangeText={setAmount}
            placeholder="Essence"
            placeholderTextColor={COLORS.textSubtle}
            keyboardType="number-pad"
            className="flex-1 rounded-lg border border-border bg-surface-raised px-3 py-1.5 font-sans text-xs text-text"
          />
          <Pressable
            onPress={handleFeed}
            disabled={feeding}
            accessibilityRole="button"
            className="rounded-lg border px-3 py-1.5"
            style={{
              borderColor: `${COLORS.essence}66`,
              backgroundColor: `${COLORS.essence}1f`,
              opacity: feeding ? 0.6 : 1,
            }}
          >
            <Text className="font-sans-semibold text-xs" style={{ color: COLORS.essence }}>
              Feed
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function CollectionStats({
  collected,
  discovered,
  totalSpecies,
}: {
  collected: number;
  discovered: number;
  totalSpecies: number;
}) {
  return (
    <View className="mt-2 flex-row items-center rounded-2xl border border-border bg-surface p-4">
      <StatTile
        icon={{ family: "material-community", name: "paw" }}
        value={String(collected)}
        label="Wobblins Collected"
      />
      <View className="mx-4 h-10 w-px bg-border" />
      <StatTile
        icon={{ family: "ionicons", name: "sparkles" }}
        value={`${discovered}/${totalSpecies}`}
        label="Species Discovered"
      />
    </View>
  );
}

function StatTile({ icon, value, label }: { icon: IconSpec; value: string; label: string }) {
  return (
    <View className="flex-1 flex-row items-center gap-3">
      <View
        className="h-11 w-11 items-center justify-center rounded-full"
        style={{ backgroundColor: COLORS.primaryLight }}
      >
        <Icon {...icon} size={20} color={COLORS.primaryDark} />
      </View>
      <View className="gap-0.5">
        <Text className="font-display-bold text-lg text-text">{value}</Text>
        <Text className="font-sans text-xs text-text-muted">{label}</Text>
      </View>
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
