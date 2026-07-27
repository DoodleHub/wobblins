import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { MonsterCard } from "@/components/MonsterCard";
import { TextField } from "@/components/TextField";
import { SPECIES_ART } from "@/constants/speciesArt";
import { COLORS, type Element, type Rarity } from "@/constants/theme";
import { useCreateTask } from "@/hooks/useTasks";
import { usePlayerWobblins } from "@/hooks/useWobblins";
import { useSupabase } from "@/supabase/SupabaseProvider";
import type { PlayerWobblin } from "@/supabase/wobblins";
import { DEFAULT_TASK_EXPIRY_HOURS, TASK_EXPIRY_PRESETS } from "@/utils/taskExpiry";
import { getErrorMessage } from "@/utils/errors";

export default function CreateTaskScreen() {
  const { id: groupId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useSupabase();
  const playerId = session?.user.id;

  const { data: wobblins, isPending: wobblinsPending } = usePlayerWobblins(playerId);
  const createTask = useCreateTask(groupId, playerId);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [rewardId, setRewardId] = useState<string | null>(null);
  const [expiryHours, setExpiryHours] = useState<number | null>(DEFAULT_TASK_EXPIRY_HOURS);
  const [error, setError] = useState<string | null>(null);

  const eligibleWobblins = useMemo(
    () =>
      (wobblins ?? [])
        .filter((w) => w.locked_reason == null)
        .sort(
          (a, b) =>
            a.species.evolution_chain_id.localeCompare(b.species.evolution_chain_id) ||
            a.species.stage - b.species.stage,
        ),
    [wobblins],
  );

  const canSubmit = title.trim().length > 0 && rewardId !== null && !createTask.isPending;

  const onSubmit = () => {
    if (!canSubmit || !rewardId) return;
    setError(null);
    const expiresAt =
      expiryHours === null ? null : new Date(Date.now() + expiryHours * 60 * 60 * 1000).toISOString();
    createTask.mutate(
      { title: title.trim(), description: description.trim(), rewardWobblinId: rewardId, expiresAt },
      {
        onSuccess: () => router.back(),
        onError: (err) => setError(getErrorMessage(err)),
      },
    );
  };

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerClassName="w-full min-w-0 flex-grow gap-6 px-6 pb-6 pt-16"
      >
        <View className="gap-1">
          <Text className="font-display-bold text-3xl text-text">New Task</Text>
          <Text className="font-sans text-base text-text-muted">
            Offer one of your Wobblins as the reward for completing this task
          </Text>
        </View>

        <View className="gap-4">
          <TextField label="Title" value={title} onChangeText={setTitle} placeholder="e.g. Do the dishes" maxLength={80} />
          <TextField
            label="Description"
            value={description}
            onChangeText={setDescription}
            placeholder="Any details the group should know"
            multiline
            numberOfLines={3}
            maxLength={280}
          />
        </View>

        <View className="gap-3">
          <Text className="font-display text-sm uppercase tracking-wide text-text-muted">Expires</Text>
          <View className="flex-row flex-wrap gap-2">
            {TASK_EXPIRY_PRESETS.map((preset) => {
              const selected = preset.hours === expiryHours;
              return (
                <Pressable
                  key={preset.label}
                  onPress={() => setExpiryHours(preset.hours)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  className="rounded-full border px-3 py-1.5"
                  style={{
                    borderColor: selected ? COLORS.primary : COLORS.border,
                    backgroundColor: selected ? COLORS.primary : COLORS.surface,
                  }}
                >
                  <Text
                    className="font-sans-semibold text-xs"
                    style={{ color: selected ? "#ffffff" : COLORS.textMuted }}
                  >
                    {preset.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View className="gap-3">
          <Text className="font-display text-sm uppercase tracking-wide text-text-muted">Reward Wobblin</Text>

          {!wobblinsPending && eligibleWobblins.length === 0 ? (
            <EmptyState
              icon={{ family: "material-community", name: "egg-easter" }}
              title="No Wobblins available"
              description="Every Wobblin you own is already locked to another task."
            />
          ) : (
            <View className="gap-3">
              {eligibleWobblins.map((wobblin) => (
                <RewardOption
                  key={wobblin.id}
                  wobblin={wobblin}
                  selected={wobblin.id === rewardId}
                  onPress={() => setRewardId(wobblin.id)}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Fixed footer so publishing never requires scrolling past a long Wobblin list. */}
      <View
        className="gap-3 border-t border-border bg-background px-6 pt-4"
        style={{ paddingBottom: insets.bottom + 16 }}
      >
        {error && (
          <View className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3">
            <Text className="font-sans-medium text-sm text-danger">{error}</Text>
          </View>
        )}
        <Button label="Publish Task" onPress={onSubmit} loading={createTask.isPending} disabled={!canSubmit} />
      </View>
    </View>
  );
}

function RewardOption({
  wobblin,
  selected,
  onPress,
}: {
  wobblin: PlayerWobblin;
  selected: boolean;
  onPress: () => void;
}) {
  const element = wobblin.species.element.toLowerCase() as Element;
  const rarity = wobblin.species.rarity.toLowerCase() as Rarity;
  const name = wobblin.nickname ?? wobblin.species.name;
  const art = SPECIES_ART[wobblin.species.name];

  return (
    <MonsterCard
      name={name}
      level={wobblin.level}
      element={element}
      rarity={rarity}
      art={art}
      selected={selected}
      onPress={onPress}
    />
  );
}
