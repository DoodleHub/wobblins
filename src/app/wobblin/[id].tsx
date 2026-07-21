import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { EvolutionBanner } from "@/components/EvolutionBanner";
import { LevelUpBanner } from "@/components/LevelUpBanner";
import { LoadingScreen } from "@/components/LoadingScreen";
import { MonsterCard } from "@/components/MonsterCard";
import { StatBar } from "@/components/StatBar";
import { XPBar } from "@/components/XPBar";
import { SPECIES_ART } from "@/constants/speciesArt";
import { COLORS, type Element, type Rarity } from "@/constants/theme";
import { useSetActiveWobblin } from "@/hooks/usePlayer";
import { useEvolveWobblin, useFeaturedWobblin, useWobblin } from "@/hooks/useWobblins";
import { useSupabase } from "@/supabase/SupabaseProvider";
import { getErrorMessage } from "@/utils/errors";

export default function MonsterDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useSupabase();
  const playerId = session?.user.id;

  const { data: wobblin, isPending, error } = useWobblin(id);
  const { data: featured } = useFeaturedWobblin(playerId);
  const setActiveWobblin = useSetActiveWobblin(playerId);
  const evolveWobblin = useEvolveWobblin(playerId);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const [evolvedTo, setEvolvedTo] = useState<string | null>(null);
  const [evolveError, setEvolveError] = useState<string | null>(null);

  if (isPending) {
    return <LoadingScreen message="Loading Wobblin…" />;
  }

  if (error || !wobblin) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-background px-8">
        <Text className="font-sans-medium text-sm text-danger">
          {error ? getErrorMessage(error) : "Wobblin not found."}
        </Text>
        <Button label="Back to Collection" variant="secondary" onPress={() => router.back()} />
      </View>
    );
  }

  const element = wobblin.species.element.toLowerCase() as Element;
  const rarity = wobblin.species.rarity.toLowerCase() as Rarity;
  const name = wobblin.nickname ?? wobblin.species.name;
  const isFeatured = featured?.id === wobblin.id;

  const canEvolve = wobblin.species.evolves_into_id != null;
  const evolutionLevel = wobblin.species.evolution_level;
  const readyToEvolve = canEvolve && evolutionLevel != null && wobblin.level >= evolutionLevel;

  const onEvolve = () => {
    setEvolveError(null);
    evolveWobblin.mutate(wobblin.id, {
      onSuccess: (result) => setEvolvedTo(result.to_species_name),
      onError: (err) => setEvolveError(getErrorMessage(err)),
    });
  };

  return (
    <View className="flex-1 bg-background">
      <LevelUpBanner level={levelUp} label={`${name} leveled up!`} />
      <EvolutionBanner speciesName={evolvedTo} onDismiss={() => setEvolvedTo(null)} />
      <ScrollView
        className="flex-1"
        contentContainerClassName="w-full min-w-0 flex-grow gap-6 px-6 pb-8 pt-16"
      >
        <View className="gap-2">
          <MonsterCard
            name={name}
            level={wobblin.level}
            element={element}
            rarity={rarity}
            art={SPECIES_ART[wobblin.species.name]}
            layout="center"
            eyebrow={isFeatured ? "Featured Wobblin" : undefined}
          />
          <Text className="text-center font-sans-medium text-sm text-text-muted">{wobblin.species.name}</Text>
          {!isFeatured && (
            <Button
              label="Set as Featured"
              variant="secondary"
              loading={setActiveWobblin.isPending}
              onPress={() => setActiveWobblin.mutate(wobblin.id)}
            />
          )}
        </View>

        {canEvolve && (
          <View className="gap-2 rounded-2xl border border-primary/30 bg-primary-light p-4">
            <Text className="font-display text-sm uppercase tracking-wide text-primary-dark">Evolution</Text>
            {readyToEvolve ? (
              <>
                <Text className="font-sans text-sm text-text-muted">
                  {name} is ready to evolve!
                </Text>
                <Button label="Evolve" onPress={onEvolve} loading={evolveWobblin.isPending} />
              </>
            ) : (
              <Text className="font-sans text-sm text-text-muted">
                Reaches its next evolution at level {evolutionLevel} (currently level {wobblin.level}).
              </Text>
            )}
            {evolveError && (
              <Text className="font-sans-medium text-sm text-danger">{evolveError}</Text>
            )}
          </View>
        )}

        <View className="gap-4 rounded-2xl border border-border bg-surface p-4">
          <Text className="font-display text-sm uppercase tracking-wide text-text-muted">Stats</Text>
          <StatBar label="HP" value={wobblin.hp} max={wobblin.species.base_hp} color={COLORS.hp} />
          <StatBar
            label="Attack"
            value={wobblin.attack}
            max={wobblin.species.base_attack}
            color={COLORS.primary}
          />
          <StatBar
            label="Defense"
            value={wobblin.defense}
            max={wobblin.species.base_defense}
            color={COLORS.secondary}
          />
          <StatBar label="Speed" value={wobblin.speed} max={wobblin.species.base_speed} color={COLORS.energy} />
          <View className="pt-1">
            <XPBar level={wobblin.level} experience={wobblin.experience} onLevelUp={setLevelUp} />
          </View>
        </View>

        <View className="gap-3">
          <Button label="Train" onPress={() => router.push({ pathname: "/train", params: { id: wobblin.id } })} />
          <Button
            label="Battle"
            variant="secondary"
            onPress={() => router.push({ pathname: "/battle", params: { id: wobblin.id } })}
          />
        </View>
      </ScrollView>
    </View>
  );
}
