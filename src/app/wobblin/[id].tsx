import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { EssenceSlider } from "@/components/EssenceSlider";
import { EvolutionBanner } from "@/components/EvolutionBanner";
import { Icon } from "@/components/Icon";
import { LevelUpBanner } from "@/components/LevelUpBanner";
import { LoadingScreen } from "@/components/LoadingScreen";
import { MonsterHero } from "@/components/MonsterHero";
import { RewardToast, type RewardToastData } from "@/components/RewardToast";
import { XPBar } from "@/components/XPBar";
import { SPECIES_ART } from "@/constants/speciesArt";
import { COLORS, ELEMENT_COLORS, type Element, type Rarity } from "@/constants/theme";
import { useClaimEgg } from "@/hooks/useEggs";
import { useEssenceConfig, useSpendEssenceForXp } from "@/hooks/useEssence";
import { usePlayer, useSetActiveWobblin } from "@/hooks/usePlayer";
import { useAllSpecies, useEvolveWobblin, useFeaturedWobblin, useWobblin } from "@/hooks/useWobblins";
import { useSupabase } from "@/supabase/SupabaseProvider";
import { getErrorMessage } from "@/utils/errors";

const EGG_CADENCE_MS = (hours: number) => hours * 60 * 60 * 1000;

export default function MonsterDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useSupabase();
  const playerId = session?.user.id;

  const { data: wobblin, isPending, error } = useWobblin(id);
  const { data: featured } = useFeaturedWobblin(playerId);
  const { data: allSpecies } = useAllSpecies();
  const { data: player } = usePlayer(playerId);
  const setActiveWobblin = useSetActiveWobblin(playerId);
  const evolveWobblin = useEvolveWobblin(playerId);
  const claimEgg = useClaimEgg(playerId);
  const spendEssenceForXp = useSpendEssenceForXp(playerId);
  const { data: essenceConfig } = useEssenceConfig();

  const [levelUp, setLevelUp] = useState<number | null>(null);
  const [evolvedTo, setEvolvedTo] = useState<string | null>(null);
  const [evolveError, setEvolveError] = useState<string | null>(null);
  const [eggError, setEggError] = useState<string | null>(null);
  const [feedAmount, setFeedAmount] = useState(0);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [toast, setToast] = useState<RewardToastData | null>(null);
  // Captured once per mount rather than read live — good enough for a display-only
  // readiness check, since the `claim_egg` RPC re-validates the cadence server-side
  // regardless of what the client thinks "now" is.
  const [now] = useState(() => Date.now());

  // Seeds the slider at a sensible starting point (half the player's balance)
  // the first time it becomes known, so there's always a non-zero amount
  // ready to feed without the player having to touch the control at all.
  const hasSeededFeedAmount = useRef(false);
  useEffect(() => {
    if (hasSeededFeedAmount.current || player == null) return;
    hasSeededFeedAmount.current = true;
    setFeedAmount(Math.round((player.essence_balance ?? 0) / 2));
  }, [player]);

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
  const elementColor = ELEMENT_COLORS[element];
  const name = wobblin.nickname ?? wobblin.species.name;
  const art = SPECIES_ART[wobblin.species.name];
  const isFeatured = featured?.id === wobblin.id;
  const isOwner = wobblin.player_id === playerId;
  const caughtOn = new Date(wobblin.acquired_at).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const canEvolve = wobblin.species.evolves_into_id != null;
  const evolutionLevel = wobblin.species.evolution_level;
  const readyToEvolve = canEvolve && evolutionLevel != null && wobblin.level >= evolutionLevel;
  const nextSpecies = canEvolve ? allSpecies?.find((s) => s.id === wobblin.species.evolves_into_id) : undefined;

  const isFinalStage = wobblin.species.stage === 2;
  const cadenceHours = wobblin.species.egg_cadence_hours ?? 0;
  const eggCheckpoint = wobblin.last_egg_claimed_at ?? wobblin.created_at;
  const nextEggAt = new Date(eggCheckpoint).getTime() + EGG_CADENCE_MS(cadenceHours);
  const eggReady = isFinalStage && now >= nextEggAt;

  const onEvolve = () => {
    setEvolveError(null);
    evolveWobblin.mutate(wobblin.id, {
      onSuccess: (result) => setEvolvedTo(result.to_species_name),
      onError: (err) => setEvolveError(getErrorMessage(err)),
    });
  };

  const onFeedXp = () => {
    const amount = Math.floor(feedAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setFeedError("Drag the slider to choose some essence to spend.");
      return;
    }

    setFeedError(null);
    spendEssenceForXp.mutate(
      { playerWobblinId: wobblin.id, essenceAmount: amount },
      {
        onSuccess: (result) => {
          const remainingBalance = (player?.essence_balance ?? amount) - amount;
          setFeedAmount(Math.round(Math.max(remainingBalance, 0) / 2));
          if (result.leveled_up) setLevelUp(result.wobblin.level);
        },
        onError: (err) => setFeedError(getErrorMessage(err)),
      },
    );
  };

  const onClaimEgg = () => {
    setEggError(null);
    claimEgg.mutate(wobblin.id, {
      onSuccess: () => {
        setToast({
          icon: { family: "material-community", name: "egg-easter" },
          title: "Egg Claimed!",
          subtitle: "Hatch it from your Collection.",
        });
      },
      onError: (err) => setEggError(getErrorMessage(err)),
    });
  };

  return (
    <View className="flex-1 bg-background">
      <LevelUpBanner level={levelUp} label={`${name} leveled up!`} />
      <EvolutionBanner speciesName={evolvedTo} onDismiss={() => setEvolvedTo(null)} />
      <RewardToast reward={toast} offsetTop={76} />
      <ScrollView
        className="flex-1"
        contentContainerClassName="w-full min-w-0 flex-grow gap-6 px-6 pb-8 pt-16"
      >
        <View className="flex-row items-center justify-between">
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            className="h-10 w-10 items-center justify-center rounded-full border"
            style={{ borderColor: COLORS.border, backgroundColor: COLORS.surface }}
          >
            <Icon family="ionicons" name="chevron-back" size={20} color={COLORS.text} />
          </Pressable>

          <Pressable
            onPress={() => setActiveWobblin.mutate(wobblin.id)}
            disabled={isFeatured || setActiveWobblin.isPending}
            accessibilityRole="button"
            accessibilityLabel={isFeatured ? "Featured Wobblin" : "Set as featured Wobblin"}
            className="flex-row items-center gap-1.5 rounded-full border px-3.5 py-2"
            style={{
              borderColor: isFeatured ? `${COLORS.gold}66` : COLORS.border,
              backgroundColor: isFeatured ? `${COLORS.gold}1a` : COLORS.surface,
            }}
          >
            <Icon
              family="ionicons"
              name={isFeatured ? "star" : "star-outline"}
              size={15}
              color={isFeatured ? COLORS.gold : COLORS.textMuted}
            />
            <Text
              className="font-sans-semibold text-xs"
              style={{ color: isFeatured ? COLORS.gold : COLORS.textMuted }}
            >
              {isFeatured ? "Featured" : "Set Featured"}
            </Text>
          </Pressable>
        </View>

        <MonsterHero
          name={name}
          speciesName={wobblin.species.name}
          nicknamed={wobblin.nickname != null}
          element={element}
          rarity={rarity}
          art={art}
          level={wobblin.level}
          caughtOn={caughtOn}
        >
          <View className="w-full pt-1">
            <XPBar
              level={wobblin.level}
              experience={wobblin.experience}
              onLevelUp={setLevelUp}
              showLevel={false}
              icon={{ family: "ionicons", name: "star" }}
            />
          </View>
        </MonsterHero>

        {isOwner && (
          <View
            className="gap-3 rounded-2xl border p-4"
            style={{ borderColor: `${COLORS.essence}40`, backgroundColor: `${COLORS.essence}0f` }}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-1.5">
                <Icon family="ionicons" name="flash" size={16} color={COLORS.essence} />
                <Text className="font-display text-sm uppercase tracking-wide" style={{ color: COLORS.essence }}>
                  Feed XP
                </Text>
              </View>
              <Text className="font-sans-semibold text-xs text-text-muted">
                {player?.essence_balance ?? 0} essence
              </Text>
            </View>
            <Text className="font-sans text-xs text-text-subtle">
              Spend essence to grant {name} XP directly, no duplicate needed.
            </Text>

            <View className="flex-row items-baseline justify-between">
              <View className="flex-row items-baseline gap-1.5">
                <Text className="font-display-bold text-3xl" style={{ color: COLORS.essence }}>
                  {feedAmount}
                </Text>
                <Text className="font-sans-semibold text-xs text-text-muted">essence</Text>
              </View>
              <View className="flex-row items-baseline gap-1">
                <Icon family="ionicons" name="arrow-forward" size={12} color={COLORS.xp} />
                <Text className="font-sans-bold text-sm" style={{ color: COLORS.xp }}>
                  +{Math.floor(feedAmount * (essenceConfig?.xp_per_essence ?? 1))} XP
                </Text>
              </View>
            </View>

            <EssenceSlider max={player?.essence_balance ?? 0} value={feedAmount} onChange={setFeedAmount} />

            <Button
              label={(player?.essence_balance ?? 0) <= 0 ? "No Essence Available" : "Feed"}
              onPress={onFeedXp}
              loading={spendEssenceForXp.isPending}
              disabled={feedAmount <= 0 || (player?.essence_balance ?? 0) <= 0}
            />
            {feedError && <Text className="font-sans-medium text-sm text-danger">{feedError}</Text>}
          </View>
        )}

        {wobblin.species.description && (
          <View className="gap-2 rounded-2xl border border-border bg-surface p-4">
            <View className="flex-row items-center gap-1.5">
              <Icon family="ionicons" name="book-outline" size={13} color={COLORS.textMuted} />
              <Text className="font-display text-sm uppercase tracking-wide text-text-muted">About</Text>
            </View>
            <Text className="font-sans text-sm leading-5 text-text-muted">{wobblin.species.description}</Text>
          </View>
        )}

        {canEvolve && (
          <View
            className="gap-3 rounded-2xl border p-4"
            style={{ borderColor: `${COLORS.secondary}40`, backgroundColor: `${COLORS.secondary}0f` }}
          >
            <View className="flex-row items-center justify-between">
              <Text className="font-display text-sm uppercase tracking-wide text-secondary-dark">Evolution</Text>
              {readyToEvolve && (
                <View className="flex-row items-center gap-1 rounded-full bg-secondary/20 px-2 py-0.5">
                  <Icon family="ionicons" name="sparkles" size={11} color={COLORS.secondary} />
                  <Text className="font-sans-semibold text-[10px] uppercase text-secondary">Ready</Text>
                </View>
              )}
            </View>

            {nextSpecies && (
              <View className="flex-row items-center gap-3">
                <View
                  className="h-14 w-14 items-center justify-center rounded-full border bg-background"
                  style={{ borderColor: `${elementColor}55` }}
                >
                  {art && (
                    <Image
                      source={art}
                      style={{ width: "78%", height: "78%", opacity: 0.5 }}
                      contentFit="contain"
                    />
                  )}
                </View>
                <Icon family="ionicons" name="chevron-forward" size={18} color={COLORS.textSubtle} />
                <View
                  className="h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 bg-background"
                  style={{ borderColor: readyToEvolve ? COLORS.secondary : `${COLORS.border}` }}
                >
                  {SPECIES_ART[nextSpecies.name] ? (
                    <Image
                      source={SPECIES_ART[nextSpecies.name]}
                      style={{ width: "78%", height: "78%" }}
                      contentFit="contain"
                    />
                  ) : (
                    <Icon family="ionicons" name="help" size={26} color={COLORS.textSubtle} />
                  )}
                </View>
                <View className="flex-1 gap-0.5">
                  <Text className="font-display-bold text-base text-text">{nextSpecies.name}</Text>
                  <Text className="font-sans-medium text-xs text-text-muted">
                    {readyToEvolve ? "Ready to evolve now" : `Unlocks at level ${evolutionLevel}`}
                  </Text>
                </View>
              </View>
            )}

            {readyToEvolve ? (
              <Button label="Evolve" onPress={onEvolve} loading={evolveWobblin.isPending} />
            ) : (
              <Text className="font-sans text-sm text-text-muted">
                {name} is currently level {wobblin.level}.
              </Text>
            )}
            {evolveError && (
              <Text className="font-sans-medium text-sm text-danger">{evolveError}</Text>
            )}
          </View>
        )}

        {isFinalStage && (
          <View
            className="gap-3 rounded-2xl border p-4"
            style={{ borderColor: `${COLORS.gold}40`, backgroundColor: `${COLORS.gold}0f` }}
          >
            <View className="flex-row items-center gap-1.5">
              <Icon family="material-community" name="egg-easter" size={16} color={COLORS.gold} />
              <Text className="font-display text-sm uppercase tracking-wide text-gold">
                {wobblin.species.name} Eggs
              </Text>
            </View>
            <Text className="font-sans text-xs text-text-subtle">
              Fully evolved Wobblins periodically produce an egg for the base species of their chain.
            </Text>
            {eggReady ? (
              <Button label="Claim Egg" onPress={onClaimEgg} loading={claimEgg.isPending} />
            ) : (
              <Text className="font-sans-medium text-sm text-text-muted">
                Next egg ready {new Date(nextEggAt).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </Text>
            )}
            {eggError && <Text className="font-sans-medium text-sm text-danger">{eggError}</Text>}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

