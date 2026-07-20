import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";

import { EmptyState } from "@/components/EmptyState";
import { MonsterCard } from "@/components/MonsterCard";
import { Skeleton } from "@/components/Skeleton";
import { COLORS, ELEMENT_COLORS, type Element, type Rarity } from "@/constants/theme";
import { usePlayerWobblins } from "@/hooks/useWobblins";
import { useSupabase } from "@/supabase/SupabaseProvider";
import type { PlayerWobblin } from "@/supabase/wobblins";
import { getErrorMessage } from "@/utils/errors";

type FilterValue = "all" | Element;

const FILTERS: { value: FilterValue; label: string }[] = [
  { value: "all", label: "All" },
  { value: "fire", label: "Fire" },
  { value: "ice", label: "Ice" },
  { value: "water", label: "Water" },
  { value: "nature", label: "Nature" },
  { value: "shadow", label: "Shadow" },
];

export default function CollectionScreen() {
  const { session } = useSupabase();
  const playerId = session?.user.id;

  const { data: wobblins, isPending, error } = usePlayerWobblins(playerId);
  const [filter, setFilter] = useState<FilterValue>("all");

  const filtered = useMemo(() => {
    if (!wobblins) return [];
    if (filter === "all") return wobblins;
    return wobblins.filter((w) => w.species.element.toLowerCase() === filter);
  }, [wobblins, filter]);

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
      contentContainerClassName="w-full min-w-0 gap-4 px-6 pb-8 pt-16"
      data={filtered}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <View className="mb-2 gap-4">
          <Text className="font-display-bold text-3xl text-text">My Wobblins</Text>
          {wobblins && wobblins.length > 0 && (
            <FilterRow value={filter} onChange={setFilter} />
          )}
        </View>
      }
      ListEmptyComponent={
        <EmptyState
          icon="📚"
          title={wobblins && wobblins.length > 0 ? "No Wobblins match" : "No Wobblins yet"}
          description={
            wobblins && wobblins.length > 0
              ? "Try a different filter."
              : "Explore to discover and capture your first Wobblin."
          }
        />
      }
      renderItem={({ item }) => <WobblinCard wobblin={item} />}
    />
  );
}

function FilterRow({
  value,
  onChange,
}: {
  value: FilterValue;
  onChange: (value: FilterValue) => void;
}) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {FILTERS.map((option) => {
        const selected = option.value === value;
        const color = option.value === "all" ? COLORS.primary : ELEMENT_COLORS[option.value];

        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            className="rounded-full border px-3 py-1.5"
            style={{
              borderColor: selected ? color : COLORS.border,
              backgroundColor: selected ? `${color}22` : COLORS.surface,
            }}
          >
            <Text
              className="font-sans-semibold text-xs capitalize"
              style={{ color: selected ? color : COLORS.textMuted }}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function WobblinCard({ wobblin }: { wobblin: PlayerWobblin }) {
  const router = useRouter();

  const element = wobblin.species.element.toLowerCase() as Element;
  const rarity = wobblin.species.rarity.toLowerCase() as Rarity;
  const name = wobblin.nickname ?? wobblin.species.name;

  return (
    <MonsterCard
      name={name}
      level={wobblin.level}
      element={element}
      rarity={rarity}
      onPress={() => router.push(`/wobblin/${wobblin.id}`)}
    />
  );
}

function CollectionSkeleton() {
  return (
    <View className="flex-1 gap-4 bg-background px-6 pb-8 pt-16">
      <Skeleton className="mb-2 h-9 w-48" />
      {[0, 1, 2, 3].map((i) => (
        <View key={i} className="flex-row items-center gap-4 rounded-2xl border border-border bg-surface p-4">
          <Skeleton className="h-14 w-14 rounded-full" />
          <View className="flex-1 gap-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </View>
          <Skeleton className="h-6 w-16 rounded-full" />
        </View>
      ))}
    </View>
  );
}
