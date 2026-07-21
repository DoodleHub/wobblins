import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Icon } from "@/components/Icon";
import {
  LOCATIONS,
  rollEncounter,
  type ExploreLocation,
} from "@/constants/locations";
import { COLORS, ELEMENT_COLORS } from "@/constants/theme";
import { usePlayer, useSpendEnergy } from "@/hooks/usePlayer";
import type { Player } from "@/supabase/players";
import { useSupabase } from "@/supabase/SupabaseProvider";
import { getErrorMessage } from "@/utils/errors";

const ENERGY_MAX = 50;
const REGEN_INTERVAL_SECONDS = 300;

/** Guarantees title/description legibility over bright spots in card background art, on top of the gradient scrim. */
const CARD_TEXT_SHADOW = {
  textShadowColor: "rgba(0,0,0,0.85)",
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 4,
} as const;

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
      setError(
        `Not enough energy for ${location.name}. Wait for it to regenerate.`,
      );
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
      contentContainerClassName="w-full min-w-0 flex-grow gap-6 px-6 pb-32 pt-16"
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 gap-1 pr-4">
          <Text className="font-display-bold text-3xl text-text">Explore</Text>
          <Text className="font-sans text-base text-text-muted">
            Spend energy to discover wild Wobblins.
          </Text>
        </View>
        {player && <EnergyStatus player={player} />}
      </View>

      {playerPending ? (
        <View className="items-center py-12">
          <ActivityIndicator color={COLORS.primary} />
        </View>
      ) : (
        <View className="gap-5">
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

function EnergyStatus({ player }: { player: Player }) {
  const refillLabel = useEnergyRefillLabel(player);

  return (
    <View className="items-end gap-1.5">
      <View className="flex-row items-center gap-1.5 rounded-full border border-energy/40 bg-energy/10 px-3.5 py-2">
        <Icon family="ionicons" name="flash" size={16} color={COLORS.energy} />
        <Text className="font-display-bold text-base text-energy">
          {player.energy}/{ENERGY_MAX}
        </Text>
      </View>
      {refillLabel && (
        <Text className="font-sans text-xs text-text-muted">
          Refills in{" "}
          <Text className="font-sans-bold text-energy">{refillLabel}</Text>
        </Text>
      )}
    </View>
  );
}

/** Client-side countdown for display only — actual regen stays compute-on-read server-side (see AGENTS.md). */
function useEnergyRefillLabel(player: Player): string | null {
  const capped = player.energy >= ENERGY_MAX;
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    if (capped) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [capped]);

  if (capped || now === null) return null;

  const updatedAt = new Date(player.energy_updated_at).getTime();
  const elapsedSeconds = Math.max(0, (now - updatedAt) / 1000);
  const secondsIntoTick = elapsedSeconds % REGEN_INTERVAL_SECONDS;
  const secondsRemaining = Math.ceil(REGEN_INTERVAL_SECONDS - secondsIntoTick);
  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
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
  const accent = ELEMENT_COLORS[location.accent];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !canAfford}
      accessibilityRole="button"
      accessibilityLabel={`${location.name}, costs ${location.energyCost} energy`}
      accessibilityHint={
        canAfford ? "Explore this location" : "Not enough energy"
      }
      accessibilityState={{ disabled: disabled || !canAfford, busy: loading }}
      className={`h-36 overflow-hidden rounded-3xl border-1 ${!canAfford ? "opacity-50" : ""}`}
      style={{ borderColor: accent }}
    >
      {({ pressed }) => (
        <View
          className="flex-1"
          style={{ transform: [{ scale: pressed ? 0.98 : 1 }] }}
        >
          <LinearGradient
            colors={[`${accent}33`, COLORS.background]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          <View className="flex-1 justify-between p-4">
            <View className="flex-row items-center gap-3.5">
              <View
                className="h-14 w-14 items-center justify-center rounded-full border-1"
                style={{
                  borderColor: accent,
                  backgroundColor: `${COLORS.background}99`,
                }}
              >
                <Icon {...location.icon} size={26} color={accent} />
              </View>

              <View className="flex-1 gap-1">
                <Text
                  className="font-display-bold text-lg text-text"
                  style={CARD_TEXT_SHADOW}
                >
                  {location.name}
                </Text>
                <Text
                  className="font-sans text-sm text-text"
                  style={CARD_TEXT_SHADOW}
                  numberOfLines={2}
                >
                  {location.description}
                </Text>
              </View>
            </View>

            <View className="flex-row items-center justify-between">
              <View
                className="flex-row items-center gap-1.5 self-start rounded-full border px-3 py-1.5"
                style={{
                  borderColor: accent,
                  backgroundColor: `${COLORS.background}99`,
                }}
              >
                <Icon
                  family="ionicons"
                  name="flash"
                  size={12}
                  color={COLORS.energy}
                />
                <Text className="font-sans-semibold text-xs text-energy">
                  {location.energyCost} energy
                </Text>
              </View>

              {loading ? (
                <ActivityIndicator color={COLORS.primary} />
              ) : (
                <View className="flex-row items-center gap-1">
                  <Text className="font-sans-bold text-sm text-primary">
                    Explore
                  </Text>
                  <Icon
                    family="ionicons"
                    name="arrow-forward"
                    size={14}
                    color={COLORS.primary}
                  />
                </View>
              )}
            </View>
          </View>
        </View>
      )}
    </Pressable>
  );
}
