import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { Icon } from "@/components/Icon";
import { LoadingScreen } from "@/components/LoadingScreen";
import { TraitBadge } from "@/components/TraitBadge";
import { ELEMENT_EGG_ART } from "@/constants/speciesArt";
import { COLORS, ELEMENT_COLORS, mixColors, RARITY_COLORS, type Element, type Rarity } from "@/constants/theme";
import { useEgg, useHatchEgg } from "@/hooks/useEggs";
import { useSupabase } from "@/supabase/SupabaseProvider";
import { getErrorMessage } from "@/utils/errors";
import { hatchCountdownLabel, isEggReady } from "@/utils/eggs";

export default function EggDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useSupabase();
  const playerId = session?.user.id;

  const { data: egg, isPending, error, refetch } = useEgg(id);
  const hatchEgg = useHatchEgg(playerId);

  const [hatchError, setHatchError] = useState<string | null>(null);
  // Captured once per mount rather than read live — good enough for a display-only
  // readiness check, since the `hatch_egg` RPC re-validates `hatch_ready_at`
  // server-side regardless of what the client thinks "now" is.
  const [now] = useState(() => Date.now());

  // This screen is a pushed stack route that can sit frozen underneath another
  // pushed screen — refetch on focus rather than relying on a frozen cache to
  // repaint reliably, same pattern as the Wobblin detail screen.
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  if (isPending) {
    return <LoadingScreen message="Loading Egg…" />;
  }

  if (error || !egg) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-background px-8">
        <Text className="font-sans-medium text-sm text-danger">
          {error ? getErrorMessage(error) : "Egg not found."}
        </Text>
        <Button label="Back to Collection" variant="secondary" onPress={() => router.back()} />
      </View>
    );
  }

  const element = egg.species.element.toLowerCase() as Element;
  const rarity = egg.species.rarity.toLowerCase() as Rarity;
  const elementColor = ELEMENT_COLORS[element];
  const rarityColor = RARITY_COLORS[rarity];
  const heroTint = mixColors(COLORS.surface, elementColor, 0.2);

  const ready = isEggReady(egg.hatch_ready_at, now);
  const statusLabel = hatchCountdownLabel(egg.hatch_ready_at, now);
  const claimedOn = egg.collected_at
    ? new Date(egg.collected_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    : null;
  const sourceName = egg.source_wobblin ? (egg.source_wobblin.nickname ?? egg.source_wobblin.species.name) : null;

  const onHatch = () => {
    setHatchError(null);
    hatchEgg.mutate(egg.id, {
      onSuccess: (newWobblin) => router.replace(`/wobblin/${newWobblin.id}`),
      onError: (err) => setHatchError(getErrorMessage(err)),
    });
  };

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerClassName="w-full min-w-0 flex-grow gap-6 px-6 pb-8 pt-16"
      >
        <View className="flex-row items-center">
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            className="h-10 w-10 items-center justify-center rounded-full border"
            style={{ borderColor: COLORS.border, backgroundColor: COLORS.surface }}
          >
            <Icon family="ionicons" name="chevron-back" size={20} color={COLORS.text} />
          </Pressable>
        </View>

        <View
          className="items-center gap-4 overflow-hidden rounded-3xl border px-6 pb-6 pt-9"
          style={{ borderColor: `${rarityColor}4d` }}
        >
          <LinearGradient
            colors={[heroTint, COLORS.surface]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          <View style={{ width: 168, height: 168 }} className="items-center justify-center">
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                width: 168,
                height: 168,
                borderRadius: 84,
                backgroundColor: ready ? COLORS.gold : elementColor,
                opacity: ready ? 0.4 : 0.3,
                shadowColor: ready ? COLORS.gold : elementColor,
                shadowOpacity: 0.9,
                shadowRadius: 44,
                shadowOffset: { width: 0, height: 0 },
                elevation: 8,
              }}
            />
            <Image source={ELEMENT_EGG_ART[element]} style={{ width: "72%", height: "72%" }} contentFit="contain" />
          </View>

          <View className="items-center gap-1">
            <Text className="text-center font-display-bold text-2xl text-text">{egg.species.name} Egg</Text>
            <Text
              className="font-sans-semibold text-sm"
              style={{ color: ready ? COLORS.gold : COLORS.textMuted }}
            >
              {statusLabel}
            </Text>
          </View>

          <View className="flex-row flex-wrap items-center justify-center gap-2">
            <TraitBadge label={element} color={elementColor} />
            <TraitBadge label={rarity} color={rarityColor} />
            {claimedOn && (
              <View
                className="flex-row items-center gap-1 rounded-full border px-2.5 py-1"
                style={{ borderColor: `${COLORS.textSubtle}33`, backgroundColor: `${COLORS.textSubtle}14` }}
              >
                <Icon family="material-community" name="calendar-blank" size={11} color={COLORS.textSubtle} />
                <Text className="font-sans-semibold text-xs text-text-subtle">Claimed {claimedOn}</Text>
              </View>
            )}
          </View>
        </View>

        {egg.species.description && (
          <View className="gap-2 rounded-2xl border border-border bg-surface p-4">
            <View className="flex-row items-center gap-1.5">
              <Icon family="ionicons" name="help-circle-outline" size={13} color={COLORS.textMuted} />
              <Text className="font-display text-sm uppercase tracking-wide text-text-muted">Hatches Into</Text>
            </View>
            <Text className="font-sans-semibold text-sm text-text">{egg.species.name}</Text>
            <Text className="font-sans text-sm leading-5 text-text-muted">{egg.species.description}</Text>
          </View>
        )}

        {sourceName && egg.source_wobblin && (
          <Pressable
            onPress={() => router.push(`/wobblin/${egg.source_wobblin!.id}`)}
            accessibilityRole="button"
            className="flex-row items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4"
          >
            <View className="flex-1 gap-0.5">
              <Text className="font-display text-sm uppercase tracking-wide text-text-muted">Produced By</Text>
              <Text className="font-sans-semibold text-sm text-text">{sourceName}</Text>
            </View>
            <Icon family="ionicons" name="chevron-forward" size={18} color={COLORS.textSubtle} />
          </Pressable>
        )}

        <View
          className="gap-3 rounded-2xl border p-4"
          style={{ borderColor: `${COLORS.gold}40`, backgroundColor: `${COLORS.gold}0f` }}
        >
          <View className="flex-row items-center gap-1.5">
            <Icon family="material-community" name="egg-easter" size={16} color={COLORS.gold} />
            <Text className="font-display text-sm uppercase tracking-wide text-gold">Hatch</Text>
          </View>
          {ready ? (
            <Button label="Hatch Egg" onPress={onHatch} loading={hatchEgg.isPending} />
          ) : (
            <Text className="font-sans-medium text-sm text-text-muted">
              This egg needs its full countdown to finish before it can hatch.
            </Text>
          )}
          {hatchError && <Text className="font-sans-medium text-sm text-danger">{hatchError}</Text>}
        </View>
      </ScrollView>
    </View>
  );
}
