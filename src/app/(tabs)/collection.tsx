import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";

import { COLORS, ELEMENT_CLASSNAMES, ELEMENT_EMOJI, type Element, RARITY_CLASSNAMES, type Rarity } from "@/constants/theme";
import { useSupabase } from "@/supabase/SupabaseProvider";
import { getPlayerWobblins, type PlayerWobblin } from "@/supabase/wobblins";

export default function CollectionScreen() {
  const { session } = useSupabase();
  const playerId = session?.user.id;

  const [wobblins, setWobblins] = useState<PlayerWobblin[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!playerId) return;

    getPlayerWobblins(playerId)
      .then(setWobblins)
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, [playerId]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6">
        <Text className="font-sans-medium text-sm text-danger">{error}</Text>
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
        <View className="items-center gap-2 py-24">
          <Text className="text-4xl">📚</Text>
          <Text className="font-display-bold text-lg text-text">No Wobblins yet</Text>
          <Text className="text-center font-sans text-sm text-text-muted">
            Explore to discover and capture your first Wobblin.
          </Text>
        </View>
      }
      renderItem={({ item }) => <WobblinCard wobblin={item} />}
    />
  );
}

function WobblinCard({ wobblin }: { wobblin: PlayerWobblin }) {
  const router = useRouter();

  const element = wobblin.species.element.toLowerCase() as Element;
  const rarity = wobblin.species.rarity.toLowerCase() as Rarity;
  const elementClasses = ELEMENT_CLASSNAMES[element];
  const rarityClasses = RARITY_CLASSNAMES[rarity];
  const emoji = ELEMENT_EMOJI[element];
  const name = wobblin.nickname ?? wobblin.species.name;

  return (
    <Pressable
      onPress={() => router.push(`/wobblin/${wobblin.id}`)}
      className="flex-row items-center gap-4 rounded-2xl border border-border bg-surface p-4"
    >
      <View
        className={`h-14 w-14 items-center justify-center rounded-full border bg-background ${elementClasses?.border ?? "border-border"}`}
      >
        <Text className="text-2xl">{emoji}</Text>
      </View>

      <View className="flex-1 gap-1">
        <Text className="font-display-bold text-lg text-text">{name}</Text>
        <Text className="font-sans-medium text-sm text-text-muted">Level {wobblin.level}</Text>
      </View>

      <View className="items-end gap-1.5">
        {elementClasses && (
          <View className={`rounded-full border bg-surface px-2.5 py-1 ${elementClasses.border}`}>
            <Text className={`font-sans-semibold text-xs capitalize ${elementClasses.text}`}>
              {wobblin.species.element}
            </Text>
          </View>
        )}
        {rarityClasses && (
          <View className={`rounded-full border bg-surface px-2.5 py-1 ${rarityClasses.border}`}>
            <Text className={`font-sans-semibold text-xs capitalize ${rarityClasses.text}`}>
              {wobblin.species.rarity}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}
