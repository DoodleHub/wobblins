import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";

import { Icon } from "@/components/Icon";
import { LOCATIONS, rollEncounter, type ExploreLocation } from "@/constants/locations";
import { COLORS } from "@/constants/theme";
import { usePlayer, useSpendEnergy } from "@/hooks/usePlayer";
import { useSupabase } from "@/supabase/SupabaseProvider";
import { getErrorMessage } from "@/utils/errors";

export default function ExploreScreen() {
  const router = useRouter();
  const { session } = useSupabase();
  const playerId = session?.user.id;

  const { data: player, isPending: playerPending } = usePlayer(playerId);
  const spendEnergy = useSpendEnergy(playerId);

  const [error, setError] = useState<string | null>(null);
  const [exploringId, setExploringId] = useState<string | null>(null);

  const onExplore = async (location: ExploreLocation) => {
    if (!player) return;

    if (player.energy < location.energyCost) {
      setError(`Not enough energy for ${location.name}. Wait for it to regenerate.`);
      return;
    }

    setError(null);
    setExploringId(location.id);

    try {
      await spendEnergy.mutateAsync(location.id);

      const species = rollEncounter(location);
      router.push({
        pathname: "/encounter",
        params: {
          name: species.name,
          element: species.element,
          rarity: species.rarity,
          base_hp: String(species.base_hp),
          base_attack: String(species.base_attack),
          base_defense: String(species.base_defense),
          base_speed: String(species.base_speed),
        },
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setExploringId(null);
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="w-full min-w-0 flex-grow gap-6 px-6 pb-8 pt-16"
    >
      <View className="gap-1">
        <Text className="font-display-bold text-3xl text-text">Explore</Text>
        <Text className="font-sans text-base text-text-muted">
          Spend energy to discover wild Wobblins.
        </Text>
      </View>

      {playerPending ? (
        <View className="items-center py-12">
          <ActivityIndicator color={COLORS.primary} />
        </View>
      ) : (
        <View className="gap-4">
          {LOCATIONS.map((location) => (
            <LocationCard
              key={location.id}
              location={location}
              energy={player?.energy ?? 0}
              loading={exploringId === location.id}
              disabled={exploringId !== null}
              onPress={() => onExplore(location)}
            />
          ))}
        </View>
      )}

      {error && (
        <View className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3">
          <Text className="font-sans-medium text-sm text-danger">{error}</Text>
        </View>
      )}
    </ScrollView>
  );
}

function LocationCard({
  location,
  energy,
  loading,
  disabled,
  onPress,
}: {
  location: ExploreLocation;
  energy: number;
  loading: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const canAfford = energy >= location.energyCost;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !canAfford}
      accessibilityRole="button"
      accessibilityLabel={`${location.name}, costs ${location.energyCost} energy`}
      accessibilityHint={canAfford ? "Explore this location" : "Not enough energy"}
      accessibilityState={{ disabled: disabled || !canAfford, busy: loading }}
      className={`gap-3 rounded-2xl border border-border bg-surface p-4 ${
        !canAfford ? "opacity-50" : ""
      }`}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}
    >
      <View className="flex-row items-center gap-4">
        <View className="h-14 w-14 items-center justify-center rounded-full border border-border bg-background">
          <Icon {...location.icon} size={26} color={COLORS.textMuted} />
        </View>

        <View className="flex-1 gap-1">
          <Text className="font-display-bold text-lg text-text">{location.name}</Text>
          <Text className="font-sans text-sm text-text-muted">{location.description}</Text>
        </View>
      </View>

      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-1.5 self-start rounded-full border border-energy/30 bg-surface px-2.5 py-1">
          <Icon family="ionicons" name="flash" size={12} color={COLORS.energy} />
          <Text className="font-sans-semibold text-xs text-energy">{location.energyCost} energy</Text>
        </View>

        {loading ? (
          <ActivityIndicator color={COLORS.primary} />
        ) : (
          <Text className="font-sans-bold text-sm text-primary">Explore</Text>
        )}
      </View>
    </Pressable>
  );
}
