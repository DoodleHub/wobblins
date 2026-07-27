import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, Pressable, Text, useWindowDimensions, View } from "react-native";

import { ElementFilterRow, ELEMENT_ORDER, type ElementFilterValue } from "@/components/ElementFilterRow";
import { EmptyState } from "@/components/EmptyState";
import { Icon } from "@/components/Icon";
import { WobblinGridCard } from "@/components/WobblinGridCard";
import { COLORS, type Element } from "@/constants/theme";
import { useScrollScreenContentStyle } from "@/hooks/useTabBarClearance";
import { useMyListings } from "@/hooks/useTrades";
import { useAllSpecies, usePlayerWobblins } from "@/hooks/useWobblins";
import { useSupabase } from "@/supabase/SupabaseProvider";
import type { PlayerWobblin } from "@/supabase/wobblins";

const SCREEN_PADDING = 24;
const CARD_GAP = 12;

/**
 * Pushed route for picking which of the player's own Wobblins to list for
 * trade — a full grid screen (matching the Collection grid) rather than the
 * old bottom-sheet tray, so a large collection is easier to scan. Selecting
 * a tile pushes `/trade/list-wobblin`, where the player chooses essence vs.
 * offers and submits.
 */
export default function ChooseWobblinToSellScreen() {
  const router = useRouter();
  const { session } = useSupabase();
  const playerId = session?.user.id;
  const { width } = useWindowDimensions();
  const cardWidth = (width - SCREEN_PADDING * 2 - CARD_GAP * 2) / 3;
  const contentStyle = useScrollScreenContentStyle(CARD_GAP);

  const { data: myWobblins, isPending } = usePlayerWobblins(playerId);
  const { data: myListings } = useMyListings(playerId);
  const { data: allSpecies } = useAllSpecies();
  const [filter, setFilter] = useState<ElementFilterValue>("all");

  // Maps each evolution_chain_id to its stage-0 species name, so chains sort
  // in a stable, human-readable order rather than by the raw (meaningless)
  // UUID — same approach as the Collection screen's `chainBaseName`.
  const chainBaseName = useMemo(() => {
    const map = new Map<string, string>();
    for (const species of allSpecies ?? []) {
      if (species.stage === 0) map.set(species.evolution_chain_id, species.name);
    }
    return map;
  }, [allSpecies]);

  const sellable = useMemo(() => {
    const activeListingWobblinIds = new Set(
      (myListings ?? []).filter((l) => l.status === "active").map((l) => l.player_wobblin_id),
    );
    let eligible = (myWobblins ?? []).filter((w) => !activeListingWobblinIds.has(w.id));
    if (filter !== "all") eligible = eligible.filter((w) => w.species.element.toLowerCase() === filter);
    return [...eligible].sort((a, b) => {
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

  const onPick = (wobblin: PlayerWobblin) => {
    router.push({ pathname: "/trade/list-wobblin", params: { wobblinId: wobblin.id } });
  };

  return (
    <FlatList
      className="flex-1 bg-background"
      contentContainerStyle={contentStyle}
      columnWrapperStyle={{ gap: CARD_GAP }}
      data={sellable}
      numColumns={3}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
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
          <Text className="font-display-bold text-3xl text-text">Choose a Wobblin</Text>
          {myWobblins && myWobblins.length > 0 && <ElementFilterRow value={filter} onChange={setFilter} />}
        </View>
      }
      ListEmptyComponent={
        !isPending ? (
          <EmptyState
            icon={{ family: "ionicons", name: "pricetags-outline" }}
            title="Nothing to sell"
            description={
              myWobblins && myWobblins.length > 0
                ? "Try a different filter."
                : "No eligible Wobblins to list right now."
            }
          />
        ) : null
      }
      renderItem={({ item }) => <WobblinGridCard wobblin={item} width={cardWidth} onPress={() => onPick(item)} />}
    />
  );
}
