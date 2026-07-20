import { useRouter } from "expo-router";
import { FlatList, Text, View } from "react-native";

import { EmptyState } from "@/components/EmptyState";
import { MonsterCard } from "@/components/MonsterCard";
import { Skeleton } from "@/components/Skeleton";
import type { Element, Rarity } from "@/constants/theme";
import { usePlayerWobblins } from "@/hooks/useWobblins";
import { useSupabase } from "@/supabase/SupabaseProvider";
import type { PlayerWobblin } from "@/supabase/wobblins";
import { getErrorMessage } from "@/utils/errors";

export default function CollectionScreen() {
  const { session } = useSupabase();
  const playerId = session?.user.id;

  const { data: wobblins, isPending, error } = usePlayerWobblins(playerId);

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
      data={wobblins ?? []}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <Text className="mb-2 font-display-bold text-3xl text-text">My Wobblins</Text>
      }
      ListEmptyComponent={
        <EmptyState
          icon="📚"
          title="No Wobblins yet"
          description="Explore to discover and capture your first Wobblin."
        />
      }
      renderItem={({ item }) => <WobblinCard wobblin={item} />}
    />
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
