import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

import { Button } from "@/components/Button";
import {
  ELEMENT_CLASSNAMES,
  ELEMENT_EMOJI,
  RARITY_CLASSNAMES,
  type Element,
  type Rarity,
} from "@/constants/theme";
import { useSupabase } from "@/supabase/SupabaseProvider";
import { captureWobblin } from "@/supabase/wobblins";

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

  const [capturing, setCapturing] = useState(false);
  const [outcome, setOutcome] = useState<CaptureOutcome | null>(null);
  const [error, setError] = useState<string | null>(null);

  const elementClasses = ELEMENT_CLASSNAMES[params.element];
  const rarityClasses = RARITY_CLASSNAMES[params.rarity];
  const emoji = ELEMENT_EMOJI[params.element];

  const onCapture = async () => {
    if (!playerId) {
      setError("Your session expired. Please log in again.");
      return;
    }

    setCapturing(true);
    setError(null);

    try {
      const result = await captureWobblin(params.name);
      setOutcome(result.success ? "success" : "failure");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCapturing(false);
    }
  };

  return (
    <View className="flex-1 items-center justify-center gap-6 bg-background px-8">
      <Text className="font-display text-sm uppercase tracking-wide text-text-muted">
        A wild Wobblin appeared!
      </Text>

      <View
        className={`h-28 w-28 items-center justify-center rounded-full border bg-surface ${elementClasses.border}`}
      >
        <Text className="text-6xl">{emoji}</Text>
      </View>

      <Text className="font-display-bold text-3xl text-text">{params.name}</Text>

      <View className="flex-row gap-2">
        <Badge label={params.element} border={elementClasses.border} text={elementClasses.text} />
        <Badge label={params.rarity} border={rarityClasses.border} text={rarityClasses.text} />
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
          <Button label="Capture" onPress={onCapture} loading={capturing} />
          <Button label="Run" variant="secondary" onPress={() => router.back()} disabled={capturing} />
        </View>
      )}
    </View>
  );
}

function Badge({ label, border, text }: { label: string; border: string; text: string }) {
  return (
    <View className={`rounded-full border bg-surface px-2.5 py-1 ${border}`}>
      <Text className={`font-sans-semibold text-xs capitalize ${text}`}>{label}</Text>
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
