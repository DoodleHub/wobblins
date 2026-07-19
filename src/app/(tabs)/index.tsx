import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { StatBar } from "@/components/StatBar";
import { COLORS, ELEMENT_CLASSNAMES, ELEMENT_EMOJI, type Element } from "@/constants/theme";
import type { Player } from "@/supabase/players";
import { getPlayer } from "@/supabase/players";
import { useSupabase } from "@/supabase/SupabaseProvider";
import { getFeaturedWobblin, type FeaturedWobblin } from "@/supabase/wobblins";

const ENERGY_MAX = 50;

export default function HomeScreen() {
  const { session } = useSupabase();
  const playerId = session?.user.id;

  const [player, setPlayer] = useState<Player | null>(null);
  const [featured, setFeatured] = useState<FeaturedWobblin | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!playerId) return;

    Promise.all([getPlayer(playerId), getFeaturedWobblin(playerId)])
      .then(([playerRow, featuredWobblin]) => {
        setPlayer(playerRow);
        setFeatured(featuredWobblin);
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, [playerId]);

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="w-full min-w-0 flex-grow gap-6 px-6 pb-8 pt-16"
    >
      {loading || !player ? (
        <View className="flex-1 items-center justify-center py-24">
          {error ? (
            <Text className="font-sans-medium text-sm text-danger">{error}</Text>
          ) : (
            <ActivityIndicator color={COLORS.primary} />
          )}
        </View>
      ) : (
        <>
          <PlayerHeader player={player} />
          <FeaturedWobblinCard featured={featured} />
          {error && (
            <View className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3">
              <Text className="font-sans-medium text-sm text-danger">{error}</Text>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

function PlayerHeader({ player }: { player: Player }) {
  return (
    <View className="gap-4 rounded-2xl border border-border bg-surface p-4">
      <View className="flex-row items-center justify-between">
        <View className="gap-0.5">
          <Text className="font-display-bold text-2xl text-text">{player.username}</Text>
          <Text className="font-sans-medium text-sm text-text-muted">Level {player.level}</Text>
        </View>
        <View className="h-12 w-12 items-center justify-center rounded-full bg-primary-light">
          <Text className="font-display-bold text-lg text-primary-dark">{player.level}</Text>
        </View>
      </View>

      <View className="flex-row gap-6">
        <Stat icon="🪙" label="Gold" value={player.gold.toLocaleString()} className="text-gold" />
        <Stat icon="⚡" label="Energy" value={`${player.energy}/${ENERGY_MAX}`} className="text-energy" />
      </View>
    </View>
  );
}

function FeaturedWobblinCard({ featured }: { featured: FeaturedWobblin | null }) {
  const router = useRouter();

  if (!featured) {
    return (
      <View className="items-center gap-3 rounded-2xl border border-border bg-surface p-6">
        <Text className="text-4xl">🥚</Text>
        <Text className="font-display-bold text-lg text-text">No Wobblin yet</Text>
        <Text className="text-center font-sans text-sm text-text-muted">
          Choose your starter to begin your journey.
        </Text>
        <Button label="Choose Starter" onPress={() => router.push("/starter-selection")} />
      </View>
    );
  }

  const element = featured.species.element.toLowerCase() as Element;
  const elementClasses = ELEMENT_CLASSNAMES[element];
  const emoji = ELEMENT_EMOJI[element];
  const name = featured.nickname ?? featured.species.name;

  return (
    <View className="gap-4 rounded-2xl border border-border bg-surface p-4">
      <Text className="font-display text-sm uppercase tracking-wide text-text-muted">
        Active Wobblin
      </Text>

      <View className="flex-row items-center gap-4">
        <View
          className={`h-20 w-20 items-center justify-center rounded-full border bg-background ${elementClasses?.border ?? "border-border"}`}
        >
          <Text className="text-4xl">{emoji}</Text>
        </View>

        <View className="flex-1 gap-1">
          <Text className="font-display-bold text-xl text-text">{name}</Text>
          <Text className="font-sans-medium text-sm text-text-muted">Level {featured.level}</Text>
          {elementClasses && (
            <View className={`self-start rounded-full border bg-surface px-2.5 py-1 ${elementClasses.border}`}>
              <Text className={`font-sans-semibold text-xs capitalize ${elementClasses.text}`}>
                {featured.species.element}
              </Text>
            </View>
          )}
        </View>
      </View>

      <StatBar label="HP" value={featured.hp} max={featured.hp} color={COLORS.hp} />

      <View className="flex-row flex-wrap gap-4">
        <Stat label="Attack" value={String(featured.attack)} className="text-text" />
        <Stat label="Defense" value={String(featured.defense)} className="text-text" />
        <Stat label="Speed" value={String(featured.speed)} className="text-text" />
      </View>
    </View>
  );
}

function Stat({
  icon,
  label,
  value,
  className,
}: {
  icon?: string;
  label: string;
  value: string;
  className: string;
}) {
  return (
    <View className="flex-row items-center gap-2">
      {icon && <Text className="text-lg">{icon}</Text>}
      <View className="gap-0.5">
        <Text className="font-sans text-xs text-text-subtle">{label}</Text>
        <Text className={`font-sans-bold text-base ${className}`}>{value}</Text>
      </View>
    </View>
  );
}
