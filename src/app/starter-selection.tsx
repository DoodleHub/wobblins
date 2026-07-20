import { useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { LoadingScreen } from "@/components/LoadingScreen";
import { MonsterCard } from "@/components/MonsterCard";
import type { Element, Rarity } from "@/constants/theme";
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

  if (speciesPending) {
    return <LoadingScreen message="Loading starters…" />;
  }

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

      {species && species.length === 0 ? (
        <EmptyState
          icon="🥚"
          title="No starters available"
          description="Check back soon — the world is still hatching."
        />
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

  return (
    <MonsterCard name={species.name} element={element} rarity={rarity} layout="center" selected={selected} onPress={onPress}>
      <View className="flex-row flex-wrap justify-center gap-4">
        <Stat label="HP" value={species.base_hp} className="text-hp" />
        <Stat label="Attack" value={species.base_attack} />
        <Stat label="Defense" value={species.base_defense} />
        <Stat label="Speed" value={species.base_speed} />
      </View>
    </MonsterCard>
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
    <View className="items-center gap-0.5">
      <Text className="font-sans text-xs text-text-subtle">{label}</Text>
      <Text className={`font-sans-bold text-base ${className}`}>{value}</Text>
    </View>
  );
}
