import { useLocalSearchParams, useRouter } from "expo-router";
import { Text, View } from "react-native";

import { Button } from "@/components/Button";
import { LoadingScreen } from "@/components/LoadingScreen";
import { StatBar } from "@/components/StatBar";
import { COLORS } from "@/constants/theme";
import { useTrainWobblin } from "@/hooks/useTraining";
import { useWobblin } from "@/hooks/useWobblins";
import { useSupabase } from "@/supabase/SupabaseProvider";
import type { TrainingOption } from "@/supabase/training";
import { getErrorMessage } from "@/utils/errors";

const TRAINING_OPTIONS: { option: TrainingOption; label: string; color: string }[] = [
  { option: "attack", label: "Train Attack", color: COLORS.primary },
  { option: "defense", label: "Train Defense", color: COLORS.secondary },
  { option: "speed", label: "Train Speed", color: COLORS.energy },
];

export default function TrainingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useSupabase();
  const playerId = session?.user.id;

  const { data: wobblin, isPending, error: loadError } = useWobblin(id);
  const trainMutation = useTrainWobblin(id, playerId);

  if (isPending) {
    return <LoadingScreen message="Loading Wobblin…" />;
  }

  if (loadError || !wobblin) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-background px-8">
        <Text className="font-sans-medium text-sm text-danger">
          {loadError ? getErrorMessage(loadError) : "Wobblin not found."}
        </Text>
        <Button label="Back" variant="secondary" onPress={() => router.back()} />
      </View>
    );
  }

  const name = wobblin.nickname ?? wobblin.species.name;
  const noPointsLeft = wobblin.training_points <= 0;
  const pending = trainMutation.isPending ? trainMutation.variables : null;

  return (
    <View className="w-full min-w-0 flex-1 gap-6 bg-background px-6 pb-8 pt-16">
      <View className="items-center gap-1">
        <Text className="font-display-bold text-2xl text-text">{name}</Text>
        <Text className="font-sans-medium text-sm text-text-muted">Level {wobblin.level} Training</Text>
      </View>

      <View className="gap-4 rounded-2xl border border-border bg-surface p-4">
        <Text className="font-display text-sm uppercase tracking-wide text-text-muted">Current Stats</Text>
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
      </View>

      <View className="items-center gap-1 rounded-2xl border border-border bg-surface p-4">
        <Text className="font-sans-medium text-xs text-text-subtle">Training Points Remaining</Text>
        <Text className="font-display-bold text-3xl text-text">{wobblin.training_points}</Text>
      </View>

      {trainMutation.error && (
        <View className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3">
          <Text className="font-sans-medium text-sm text-danger">{getErrorMessage(trainMutation.error)}</Text>
        </View>
      )}

      <View className="gap-3">
        {TRAINING_OPTIONS.map(({ option, label }) => (
          <Button
            key={option}
            label={label}
            variant="secondary"
            loading={pending === option}
            disabled={noPointsLeft || (pending !== null && pending !== option)}
            onPress={() => trainMutation.mutate(option)}
          />
        ))}
      </View>

      {noPointsLeft && (
        <Text className="text-center font-sans text-xs text-text-subtle">
          No training points left. Level up {name} to earn more.
        </Text>
      )}
    </View>
  );
}
