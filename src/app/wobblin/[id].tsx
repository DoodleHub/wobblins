import { Image } from "expo-image";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { EvolutionBanner } from "@/components/EvolutionBanner";
import { Icon } from "@/components/Icon";
import { LevelUpBanner } from "@/components/LevelUpBanner";
import { LoadingScreen } from "@/components/LoadingScreen";
import { MonsterHero } from "@/components/MonsterHero";
import { RewardToast, type RewardToastData } from "@/components/RewardToast";
import { XPBar } from "@/components/XPBar";
import { ELEMENT_EGG_ART, SPECIES_ART } from "@/constants/speciesArt";
import { COLORS, ELEMENT_COLORS, type Element, type Rarity } from "@/constants/theme";
import { useClaimEgg, useGenerateEgg, useMyEggs } from "@/hooks/useEggs";
import { useEssenceConfig, useSpendEssenceForXp, useWobblinLevelXpRequirements } from "@/hooks/useEssence";
import { usePlayer, useSetActiveWobblin } from "@/hooks/usePlayer";
import { useAllSpecies, useEvolveWobblin, useFeaturedWobblin, useWobblin } from "@/hooks/useWobblins";
import type { Egg } from "@/supabase/eggs";
import { useSupabase } from "@/supabase/SupabaseProvider";
import { getErrorMessage } from "@/utils/errors";
import { getLevelUpQuote } from "@/utils/xp";

const EGG_CADENCE_MS = (hours: number) => hours * 60 * 60 * 1000;
const LEVEL_UP_STEPS = [1, 3, 5, 10] as const;

export default function MonsterDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useSupabase();
  const playerId = session?.user.id;

  const { data: wobblin, isPending, error, refetch: refetchWobblin } = useWobblin(id);
  const { data: featured, refetch: refetchFeatured } = useFeaturedWobblin(playerId);
  const { data: allSpecies } = useAllSpecies();
  const { data: player, refetch: refetchPlayer } = usePlayer(playerId);
  const setActiveWobblin = useSetActiveWobblin(playerId);
  const evolveWobblin = useEvolveWobblin(playerId);
  const generateEgg = useGenerateEgg(playerId);
  const claimEgg = useClaimEgg(playerId);
  const { data: eggs, refetch: refetchEggs } = useMyEggs(playerId);
  const spendEssenceForXp = useSpendEssenceForXp(playerId);
  const { data: essenceConfig } = useEssenceConfig();
  const { data: xpRequirementsData } = useWobblinLevelXpRequirements();

  // This screen is a pushed stack route that can sit frozen underneath other
  // pushed screens (e.g. hatching/claiming eggs from the Collection tab, or
  // another mutation performed elsewhere) — a cache update that lands while
  // frozen doesn't reliably repaint once you return here. Refetch on focus
  // rather than relying on the frozen screen to pick up an already-updated
  // cache on its own, same pattern as Home/Collection.
  useFocusEffect(
    useCallback(() => {
      refetchWobblin();
      refetchFeatured();
      refetchPlayer();
      refetchEggs();
    }, [refetchWobblin, refetchFeatured, refetchPlayer, refetchEggs]),
  );

  const [levelUp, setLevelUp] = useState<number | null>(null);
  const [evolvedTo, setEvolvedTo] = useState<string | null>(null);
  const [evolveError, setEvolveError] = useState<string | null>(null);
  const [eggError, setEggError] = useState<string | null>(null);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [pendingLevelStep, setPendingLevelStep] = useState<number | null>(null);
  const [toast, setToast] = useState<RewardToastData | null>(null);
  // Captured once per mount rather than read live — good enough for a display-only
  // readiness check, since the `claim_egg` RPC re-validates the cadence server-side
  // regardless of what the client thinks "now" is.
  const [now] = useState(() => Date.now());

  const xpRequirements = useMemo(() => {
    const map: Record<number, number> = {};
    for (const row of xpRequirementsData ?? []) {
      map[row.level] = row.xp_required;
    }
    return map;
  }, [xpRequirementsData]);

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
  const maxEggSlots = essenceConfig?.max_egg_slots ?? 2;
  const pendingEggs = (eggs ?? []).filter(
    (egg) => egg.source_wobblin_id === wobblin.id && egg.collected_at == null && egg.hatched_at == null,
  );
  const slotsFull = pendingEggs.length >= maxEggSlots;
  const eggReady = isFinalStage && now >= nextEggAt && !slotsFull;

  const essenceBalance = player?.essence_balance ?? 0;
  const levelUpQuotes = LEVEL_UP_STEPS.map((levels) =>
    getLevelUpQuote(wobblin.level, wobblin.experience, levels, xpRequirements, essenceConfig?.xp_per_essence ?? 1),
  );

  const onEvolve = () => {
    setEvolveError(null);
    evolveWobblin.mutate(wobblin.id, {
      onSuccess: (result) => setEvolvedTo(result.to_species_name),
      onError: (err) => setEvolveError(getErrorMessage(err)),
    });
  };

  const onFeedXp = (levels: number, essenceCost: number) => {
    setFeedError(null);
    setPendingLevelStep(levels);
    spendEssenceForXp.mutate(
      { playerWobblinId: wobblin.id, essenceAmount: essenceCost },
      {
        onSuccess: (result) => {
          if (result.leveled_up) setLevelUp(result.wobblin.level);
        },
        onError: (err) => setFeedError(getErrorMessage(err)),
        onSettled: () => setPendingLevelStep(null),
      },
    );
  };

  const onGenerateEgg = () => {
    setEggError(null);
    generateEgg.mutate(wobblin.id, {
      onSuccess: () => {
        setToast({
          icon: { family: "material-community", name: "egg-easter" },
          title: "Egg Produced!",
          subtitle: "Claim it below to start its hatch countdown.",
        });
      },
      onError: (err) => setEggError(getErrorMessage(err)),
    });
  };

  const onClaimPendingEgg = (eggId: string) => {
    setEggError(null);
    claimEgg.mutate(eggId, {
      onSuccess: () => {
        setToast({
          icon: { family: "material-community", name: "egg-easter" },
          title: "Egg Claimed!",
          subtitle: "It'll be ready to hatch from your Collection in a day.",
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

        {isOwner && (
          <View
            className="gap-4 rounded-2xl border p-4"
            style={{ borderColor: `${COLORS.essence}40`, backgroundColor: `${COLORS.essence}0f` }}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-1.5">
                <Icon family="ionicons" name="flash" size={16} color={COLORS.essence} />
                <Text className="font-display text-sm uppercase tracking-wide" style={{ color: COLORS.essence }}>
                  Essence Surge
                </Text>
              </View>
              <Text className="font-sans-semibold text-xs text-text-muted">{essenceBalance} essence</Text>
            </View>
            <Text className="font-sans text-xs text-text-subtle">
              Spend essence for an instant level boost.
            </Text>

            <View className="flex-row flex-wrap gap-2.5">
              {levelUpQuotes.map((quote) => {
                const affordable = quote.reachable && quote.essenceCost <= essenceBalance;
                const isThisPending = pendingLevelStep === quote.levels && spendEssenceForXp.isPending;
                const disabled = !affordable || spendEssenceForXp.isPending;

                return (
                  <Pressable
                    key={quote.levels}
                    onPress={() => onFeedXp(quote.levels, quote.essenceCost)}
                    disabled={disabled}
                    accessibilityRole="button"
                    accessibilityLabel={
                      quote.reachable
                        ? `Spend ${quote.essenceCost} essence for ${quote.levels} level${quote.levels > 1 ? "s" : ""}`
                        : `${name} is at the level cap`
                    }
                    accessibilityState={{ disabled }}
                    className="items-center gap-1.5 rounded-xl border py-3"
                    style={{
                      width: "48%",
                      borderColor: affordable ? `${COLORS.essence}55` : COLORS.border,
                      backgroundColor: affordable ? `${COLORS.essence}14` : COLORS.surface,
                      opacity: disabled && !isThisPending ? 0.45 : 1,
                    }}
                  >
                    {isThisPending ? (
                      <ActivityIndicator color={COLORS.essence} />
                    ) : (
                      <>
                        <View className="flex-row items-baseline gap-1">
                          <Text
                            className="font-display-bold text-2xl"
                            style={{ color: affordable ? COLORS.xp : COLORS.textMuted }}
                          >
                            +{quote.levels}
                          </Text>
                          <Text className="font-sans-bold text-[10px] uppercase tracking-wide text-text-muted">
                            Lvl
                          </Text>
                        </View>
                        {quote.reachable ? (
                          <View className="flex-row items-center gap-1">
                            <Icon
                              family="ionicons"
                              name="flash"
                              size={11}
                              color={affordable ? COLORS.essence : COLORS.textSubtle}
                            />
                            <Text
                              className="font-sans-bold text-xs"
                              style={{ color: affordable ? COLORS.essence : COLORS.textSubtle }}
                            >
                              {quote.essenceCost}
                            </Text>
                          </View>
                        ) : (
                          <Text className="font-sans-bold text-[10px] uppercase tracking-wide text-text-subtle">
                            Max Level
                          </Text>
                        )}
                      </>
                    )}
                  </Pressable>
                );
              })}
            </View>

            {essenceBalance <= 0 && (
              <Text className="font-sans text-xs text-text-subtle">
                Claim essence from Home to power up a surge.
              </Text>
            )}
            {feedError && <Text className="font-sans-medium text-sm text-danger">{feedError}</Text>}
          </View>
        )}

        {isFinalStage && (
          <View
            className="gap-3 rounded-2xl border p-4"
            style={{ borderColor: `${COLORS.gold}40`, backgroundColor: `${COLORS.gold}0f` }}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-1.5">
                <Icon family="material-community" name="egg-easter" size={16} color={COLORS.gold} />
                <Text className="font-display text-sm uppercase tracking-wide text-gold">
                  {wobblin.species.name} Eggs
                </Text>
              </View>
              <Text className="font-sans-semibold text-xs text-text-muted">
                {pendingEggs.length}/{maxEggSlots} slots
              </Text>
            </View>
            <Text className="font-sans text-xs text-text-subtle">
              Fully evolved Wobblins periodically produce an egg for the base species of their chain. Claim an egg to
              start its day-long hatch countdown in your Collection.
            </Text>

            <View className="flex-row gap-3">
              {Array.from({ length: maxEggSlots }).map((_, i) => {
                const egg = pendingEggs[i];
                return (
                  <EggSlot
                    key={egg?.id ?? `empty-${i}`}
                    element={element}
                    egg={egg}
                    onClaim={egg ? () => onClaimPendingEgg(egg.id) : undefined}
                    claiming={!!egg && claimEgg.isPending && claimEgg.variables === egg.id}
                  />
                );
              })}
            </View>

            {slotsFull ? (
              <Text className="font-sans-medium text-sm text-text-muted">
                Egg slots are full — claim an egg above to make room for the next one.
              </Text>
            ) : eggReady ? (
              <Button label="Produce Egg" onPress={onGenerateEgg} loading={generateEgg.isPending} />
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

/**
 * One egg slot on the Wobblin detail screen — always renders the source
 * Wobblin's element egg art, but blacked out when nothing has been produced
 * into that slot yet. A filled slot is tappable to claim it into the
 * Collection; an empty one is inert.
 */
function EggSlot({
  element,
  egg,
  onClaim,
  claiming,
}: {
  element: Element;
  egg: Egg | undefined;
  onClaim: (() => void) | undefined;
  claiming: boolean;
}) {
  const elementColor = ELEMENT_COLORS[element];
  const filled = !!egg;

  const art = (
    <View
      className="h-16 w-16 items-center justify-center overflow-hidden rounded-full border bg-background"
      style={{ borderColor: filled ? `${elementColor}66` : COLORS.border }}
    >
      <Image source={ELEMENT_EGG_ART[element]} style={{ width: "78%", height: "78%" }} contentFit="contain" />
      {!filled && (
        <View pointerEvents="none" className="absolute inset-0" style={{ backgroundColor: "#000000", opacity: 0.72 }} />
      )}
      {claiming && (
        <View
          pointerEvents="none"
          className="absolute inset-0 items-center justify-center"
          style={{ backgroundColor: `${COLORS.background}99` }}
        >
          <ActivityIndicator size="small" color={COLORS.gold} />
        </View>
      )}
    </View>
  );

  return (
    <View className="items-center gap-1">
      {filled ? (
        <Pressable onPress={onClaim} disabled={claiming} accessibilityRole="button" accessibilityLabel="Claim egg">
          {art}
        </Pressable>
      ) : (
        art
      )}
      <Text
        className="font-sans-bold text-[10px] uppercase tracking-wide"
        style={{ color: filled ? COLORS.gold : COLORS.textSubtle }}
      >
        {filled ? "Claim" : "Empty"}
      </Text>
    </View>
  );
}

