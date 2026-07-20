/* eslint-disable react-hooks/refs -- Animated.Value held in useRef is the standard RN pattern; it's a mutable animation handle, not a component ref, and reading it during render is how Animated interpolation works. */
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { Icon } from "@/components/Icon";
import { RewardToast } from "@/components/RewardToast";
import { TraitBadge } from "@/components/TraitBadge";
import { ELEMENT_COLORS, ELEMENT_ICON, RARITY_COLORS, type Element, type Rarity } from "@/constants/theme";
import { useCaptureWobblin } from "@/hooks/useWobblins";
import { useSupabase } from "@/supabase/SupabaseProvider";
import { getErrorMessage } from "@/utils/errors";
import { achievementsToReward } from "@/utils/rewardToast";

type CaptureOutcome = "success" | "failure";

export default function EncounterScreen() {
  const router = useRouter();
  const { session } = useSupabase();
  const playerId = session?.user.id;

  const params = useLocalSearchParams<{
    name: string;
    element: Element;
    rarity: Rarity;
    base_hp: string;
    base_attack: string;
    base_defense: string;
    base_speed: string;
  }>();

  const captureMutation = useCaptureWobblin(playerId);
  const [outcome, setOutcome] = useState<CaptureOutcome | null>(null);
  const [error, setError] = useState<string | null>(null);

  const achievementReward = useMemo(
    () => achievementsToReward(captureMutation.checkAchievements.data?.unlocked ?? []),
    [captureMutation.checkAchievements.data],
  );

  const elementColor = ELEMENT_COLORS[params.element];
  const rarityColor = RARITY_COLORS[params.rarity];

  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!captureMutation.isPending) {
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 350, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 350, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [captureMutation.isPending, pulse]);

  const onCapture = () => {
    if (!playerId) {
      setError("Your session expired. Please log in again.");
      return;
    }

    setError(null);
    captureMutation.mutate(params.name, {
      onSuccess: (result) => setOutcome(result.success ? "success" : "failure"),
      onError: (err) => setError(getErrorMessage(err)),
    });
  };

  return (
    <View className="flex-1 items-center justify-center gap-6 bg-background px-8">
      <RewardToast reward={achievementReward} />
      <Text className="font-display text-sm uppercase tracking-wide text-text-muted">
        A wild Wobblin appeared!
      </Text>

      <Animated.View
        className="h-28 w-28 items-center justify-center rounded-full border bg-surface"
        style={{ borderColor: `${elementColor}66`, transform: [{ scale: pulse }] }}
      >
        <Icon {...ELEMENT_ICON[params.element]} size={52} color={elementColor} />
      </Animated.View>

      <Text className="font-display-bold text-3xl text-text">{params.name}</Text>

      <View className="flex-row gap-2">
        <TraitBadge label={params.element} color={elementColor} />
        <TraitBadge label={params.rarity} color={rarityColor} />
      </View>

      <View className="flex-row flex-wrap justify-center gap-6">
        <Stat label="HP" value={Number(params.base_hp)} className="text-hp" />
        <Stat label="Attack" value={Number(params.base_attack)} />
        <Stat label="Defense" value={Number(params.base_defense)} />
        <Stat label="Speed" value={Number(params.base_speed)} />
      </View>

      {outcome === "success" && (
        <View className="w-full rounded-xl border border-success/30 bg-success/10 px-4 py-3">
          <Text className="text-center font-sans-medium text-sm text-success">
            Gotcha! {params.name} was added to your collection.
          </Text>
        </View>
      )}

      {outcome === "failure" && (
        <View className="w-full rounded-xl border border-warning/30 bg-warning/10 px-4 py-3">
          <Text className="text-center font-sans-medium text-sm text-warning">
            {params.name} broke free! Try again or move on.
          </Text>
        </View>
      )}

      {error && (
        <View className="w-full rounded-xl border border-danger/30 bg-danger/10 px-4 py-3">
          <Text className="text-center font-sans-medium text-sm text-danger">{error}</Text>
        </View>
      )}

      {outcome === "success" ? (
        <Button label="Continue Exploring" onPress={() => router.back()} />
      ) : (
        <View className="w-full gap-3">
          <Button label="Capture" onPress={onCapture} loading={captureMutation.isPending} />
          <Button
            label="Run"
            variant="secondary"
            onPress={() => router.back()}
            disabled={captureMutation.isPending}
          />
        </View>
      )}
    </View>
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
