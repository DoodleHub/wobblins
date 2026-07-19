import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { ELEMENT_CLASSNAMES, type Element, RARITY_CLASSNAMES, type Rarity } from "@/constants/theme";
import { useSupabase } from "@/supabase/SupabaseProvider";
import { createStarterWobblin, getStarterSpecies, type WobblinSpecies } from "@/supabase/wobblins";

export default function StarterSelectionScreen() {
  const router = useRouter();
  const { session } = useSupabase();
  const [species, setSpecies] = useState<WobblinSpecies[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getStarterSpecies()
      .then(setSpecies)
      .catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, []);

  const selected = species?.find((option) => option.id === selectedId) ?? null;
  const canSubmit = selected !== null && !loading;

  const onSubmit = async () => {
    if (!canSubmit) return;
    const playerId = session?.user.id;
    if (!playerId) {
      setError("Your session expired. Please log in again.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: insertError } = await createStarterWobblin(playerId, selected);
      if (insertError) {
        setError(insertError.message);
        return;
      }

      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
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

      {species === null && !error ? (
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

      {error && (
        <View className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3">
          <Text className="font-sans-medium text-sm text-danger">{error}</Text>
        </View>
      )}

      <Button label="Confirm" onPress={onSubmit} loading={loading} disabled={!canSubmit} />
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
