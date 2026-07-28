import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, Pressable, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/Button";
import { ElementFilterRow, ELEMENT_ORDER, type ElementFilterValue } from "@/components/ElementFilterRow";
import { EmptyState } from "@/components/EmptyState";
import { Icon } from "@/components/Icon";
import { LoadingScreen } from "@/components/LoadingScreen";
import { MonsterHero } from "@/components/MonsterHero";
import { WobblinGridCard } from "@/components/WobblinGridCard";
import { SPECIES_ART } from "@/constants/speciesArt";
import { COLORS, type Element, type Rarity } from "@/constants/theme";
import { useScrollScreenContentStyle } from "@/hooks/useTabBarClearance";
import { useAllSpecies, usePlayerWobblins, useSacrificeWobblin, useWobblin } from "@/hooks/useWobblins";
import type { PlayerWobblin } from "@/supabase/wobblins";
import { useSupabase } from "@/supabase/SupabaseProvider";
import { getErrorMessage } from "@/utils/errors";

const SCREEN_PADDING = 24;
const CARD_GAP = 12;

/** XP a given Wobblin is worth as sacrifice fodder — mirrors the `sacrifice_wobblin` RPC's server-side formula. */
function xpValue(w: PlayerWobblin) {
  return w.level * 100 * (w.species.stage + 1);
}

/**
 * Pushed from the Wobblin detail screen's "Sacrifice" panel (`?targetId=`):
 * a full grid of every other Wobblin the player owns, picked from freely
 * (any species/chain, not just duplicates of the target) — a dedicated grid
 * screen rather than an inline embedded list, so a large collection doesn't
 * turn the detail screen into a long scroll. Sorted the same way the
 * Collection tab sorts its grid (element, then evolution chain, then stage)
 * so a Wobblin's position here matches where the player already expects to
 * find it, with an element filter to narrow further. Multi-select, sequential
 * `sacrifice_wobblin` calls (no batch RPC), then pops back — the detail
 * screen's XPBar animates the level-up on its own once the refetch lands.
 */
export default function SacrificeWobblinScreen() {
  const router = useRouter();
  const { session } = useSupabase();
  const playerId = session?.user.id;
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const cardWidth = (width - SCREEN_PADDING * 2 - CARD_GAP * 2) / 3;
  const contentStyle = useScrollScreenContentStyle(CARD_GAP);
  const { targetId } = useLocalSearchParams<{ targetId: string }>();

  const { data: target, isPending: targetPending } = useWobblin(targetId);
  const { data: myWobblins, isPending } = usePlayerWobblins(playerId);
  const { data: allSpecies } = useAllSpecies();
  const sacrificeWobblin = useSacrificeWobblin(playerId);

  const [filter, setFilter] = useState<ElementFilterValue>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [footerHeight, setFooterHeight] = useState(0);

  // Maps each evolution_chain_id to its stage-0 species name, so chains sort
  // in a stable, human-readable order — same approach as the Collection
  // screen's `chainBaseName`.
  const chainBaseName = useMemo(() => {
    const map = new Map<string, string>();
    for (const species of allSpecies ?? []) {
      if (species.stage === 0) map.set(species.evolution_chain_id, species.name);
    }
    return map;
  }, [allSpecies]);

  const eligible = useMemo(() => {
    // Locked (listed on the marketplace) Wobblins can't be fed to another —
    // the `sacrifice_wobblin` RPC rejects them, so filter them out up front.
    let items = (myWobblins ?? []).filter((w) => w.id !== targetId && w.locked_reason == null);
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
  }, [myWobblins, targetId, filter, chainBaseName]);

  const selectedXpTotal = eligible
    .filter((w) => selectedIds.has(w.id))
    .reduce((sum, w) => sum + xpValue(w), 0);

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onSubmit = async () => {
    if (selectedIds.size === 0 || !targetId) return;
    setError(null);

    for (const consumedId of selectedIds) {
      try {
        await sacrificeWobblin.mutateAsync({ targetWobblinId: targetId, consumedWobblinId: consumedId });
      } catch (err) {
        setError(getErrorMessage(err));
        // Earlier ids in this batch already succeeded server-side — clear the
        // selection rather than leaving it pointing at now-deleted Wobblins.
        setSelectedIds(new Set());
        return;
      }
    }

    router.back();
  };

  if (targetPending) {
    return <LoadingScreen message="Loading Wobblin…" />;
  }

  if (!target) {
    return (
      <View className="flex-1 bg-background">
        <ScreenHeader />
        <View className="flex-1 px-6">
          <EmptyState
            icon={{ family: "ionicons", name: "alert-circle-outline" }}
            title="Wobblin not found"
            description="This Wobblin may no longer exist."
          />
        </View>
      </View>
    );
  }

  if (target.locked_reason != null) {
    return (
      <View className="flex-1 bg-background">
        <ScreenHeader />
        <View className="flex-1 px-6">
          <EmptyState
            icon={{ family: "ionicons", name: "lock-closed-outline" }}
            title="Wobblin is locked"
            description="This Wobblin is listed on the marketplace and can't be fed right now."
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
            <ScreenHeader />
            <Text className="font-sans text-sm text-text-subtle">
              Feed one or more Wobblins to power up — each is consumed permanently:
            </Text>
            <MonsterHero
              name={target.nickname ?? target.species.name}
              speciesName={target.species.name}
              nicknamed={target.nickname != null}
              level={target.level}
              element={target.species.element.toLowerCase() as Element}
              rarity={target.species.rarity.toLowerCase() as Rarity}
              art={SPECIES_ART[target.species.name]}
            />
            <Text className="font-display text-sm uppercase tracking-wide text-text-muted">Your Wobblins</Text>
            {myWobblins && myWobblins.length > 0 && <ElementFilterRow value={filter} onChange={setFilter} />}
          </View>
        }
        ListEmptyComponent={
          !isPending ? (
            <EmptyState
              icon={{ family: "ionicons", name: "flame-outline" }}
              title="Nothing to feed"
              description={
                myWobblins && myWobblins.length > 1 ? "Try a different filter." : "You don't have any other Wobblins yet."
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
            selectedIds.size > 0
              ? `Feed ${selectedIds.size} Wobblin${selectedIds.size > 1 ? "s" : ""} (+${selectedXpTotal} XP)`
              : "Select Wobblins to Feed"
          }
          onPress={onSubmit}
          disabled={selectedIds.size === 0 || sacrificeWobblin.isPending}
          loading={sacrificeWobblin.isPending}
        />
        {error && <Text className="mt-2 font-sans-medium text-sm text-danger">{error}</Text>}
      </View>
    </View>
  );
}

function ScreenHeader() {
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
      <Text className="font-display-bold text-3xl text-text">Sacrifice</Text>
    </View>
  );
}
