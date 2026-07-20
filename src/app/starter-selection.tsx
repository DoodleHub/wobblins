import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { ELEMENT_CLASSNAMES, type Element, RARITY_CLASSNAMES, type Rarity } from "@/constants/theme";
import { useCreateStarterWobblin, useStarterSpecies } from "@/hooks/useWobblins";
import { useSupabase } from "@/supabase/SupabaseProvider";
import type { WobblinSpecies } from "@/supabase/wobblins";
import { getErrorMessage } from "@/utils/errors";

export default function StarterSelectionScreen() {
  const router = useRouter();
  const { session } = useSupabase();
  const playerId = session?.user.id;

  const { data: species, isPending: speciesPending, error: speciesError } = useStarterSpecies();
  const createStarter = useCreateStarterWobblin(playerId);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selected = species?.find((option) => option.id === selectedId) ?? null;
  const canSubmit = selected !== null && !createStarter.isPending;

  const onSubmit = () => {
    if (!canSubmit || !selected) return;

    if (!playerId) {
      setError("Your session expired. Please log in again.");
      return;
    }

    setError(null);
    createStarter.mutate(selected, {
      onSuccess: () => router.replace("/"),
      onError: (err) => setError(getErrorMessage(err)),
    });
  };

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="w-full min-w-0 flex-grow gap-8 px-6 py-16"
    >
      <View className="gap-1">
        <Text className="font-display-bold text-3xl text-text">Choose Your Wobblin</Text>
        <Text className="font-sans text-base text-text-muted">
          This companion will join you at the start of your journey
        </Text>
      </View>

      {speciesPending ? (
        <View className="items-center py-12">
          <ActivityIndicator color="#4f46e5" />
        </View>
      ) : (
        <View className="gap-4">
          {species?.map((option) => (
            <StarterCard
              key={option.id}
              species={option}
              selected={option.id === selectedId}
              onPress={() => setSelectedId(option.id)}
            />
          ))}
        </View>
      )}

      {(error || speciesError) && (
        <View className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3">
          <Text className="font-sans-medium text-sm text-danger">
            {error ?? getErrorMessage(speciesError)}
          </Text>
        </View>
      )}

      <Button label="Confirm" onPress={onSubmit} loading={createStarter.isPending} disabled={!canSubmit} />
    </ScrollView>
  );
}

function StarterCard({
  species,
  selected,
  onPress,
}: {
  species: WobblinSpecies;
  selected: boolean;
  onPress: () => void;
}) {
  const element = species.element.toLowerCase() as Element;
  const rarity = species.rarity.toLowerCase() as Rarity;
  const elementClasses = ELEMENT_CLASSNAMES[element];
  const rarityClasses = RARITY_CLASSNAMES[rarity];

  return (
    <Pressable
      onPress={onPress}
      className={`gap-3 rounded-2xl border p-4 ${
        selected ? "border-primary bg-primary-light" : "border-border bg-surface"
      }`}
    >
      <View className="flex-row items-center justify-between">
        <Text className="font-display-bold text-xl text-text">{species.name}</Text>
        {rarityClasses && (
          <View className={`rounded-full border bg-surface px-2.5 py-1 ${rarityClasses.border}`}>
            <Text className={`font-sans-semibold text-xs capitalize ${rarityClasses.text}`}>
              {species.rarity}
            </Text>
          </View>
        )}
      </View>

      {elementClasses && (
        <View className={`self-start rounded-full border bg-surface px-2.5 py-1 ${elementClasses.border}`}>
          <Text className={`font-sans-semibold text-xs capitalize ${elementClasses.text}`}>
            {species.element}
          </Text>
        </View>
      )}

      <View className="flex-row flex-wrap gap-4">
        <Stat label="HP" value={species.base_hp} className="text-hp" />
        <Stat label="Attack" value={species.base_attack} />
        <Stat label="Defense" value={species.base_defense} />
        <Stat label="Speed" value={species.base_speed} />
      </View>
    </Pressable>
  );
}

function Stat({
  label,
  value,
  className = "text-text",
}: {
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <View className="gap-0.5">
      <Text className="font-sans text-xs text-text-subtle">{label}</Text>
      <Text className={`font-sans-bold text-base ${className}`}>{value}</Text>
    </View>
  );
}
