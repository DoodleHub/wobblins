import { useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { EvolutionBanner } from "@/components/EvolutionBanner";
import { Icon } from "@/components/Icon";
import { LevelUpBanner } from "@/components/LevelUpBanner";
import { LoadingScreen } from "@/components/LoadingScreen";
import { RewardToast, type RewardToastData } from "@/components/RewardToast";
import { TraitBadge } from "@/components/TraitBadge";
import { XPBar } from "@/components/XPBar";
import { SPECIES_ART } from "@/constants/speciesArt";
import { COLORS, ELEMENT_COLORS, ELEMENT_ICON, mixColors, RARITY_COLORS, type Element, type Rarity } from "@/constants/theme";
import { useClaimEgg } from "@/hooks/useEggs";
import { useSetActiveWobblin } from "@/hooks/usePlayer";
import { queryKeys } from "@/hooks/queryKeys";
import { useTaskForRewardWobblin } from "@/hooks/useTasks";
import {
  useAllSpecies,
  useEvolveWobblin,
  useFeaturedWobblin,
  usePlayerWobblins,
  useSacrificeWobblin,
  useWobblin,
} from "@/hooks/useWobblins";
import { useSupabase } from "@/supabase/SupabaseProvider";
import type { PlayerWobblin } from "@/supabase/wobblins";
import { getErrorMessage } from "@/utils/errors";

const EGG_CADENCE_MS = (hours: number) => hours * 60 * 60 * 1000;

export default function MonsterDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const { session } = useSupabase();
  const playerId = session?.user.id;
  const queryClient = useQueryClient();

  const { data: wobblin, isPending, error } = useWobblin(id);
  const { data: featured } = useFeaturedWobblin(playerId);
  const { data: allSpecies } = useAllSpecies();
  const { data: allWobblins } = usePlayerWobblins(playerId);
  const { data: rewardTask } = useTaskForRewardWobblin(
    id,
    wobblin?.locked_reason != null && wobblin.player_id === playerId,
  );
  const setActiveWobblin = useSetActiveWobblin(playerId);
  const evolveWobblin = useEvolveWobblin(playerId);
  const sacrificeWobblin = useSacrificeWobblin(playerId);
  const claimEgg = useClaimEgg(playerId);

  const [levelUp, setLevelUp] = useState<number | null>(null);
  const [evolvedTo, setEvolvedTo] = useState<string | null>(null);
  const [evolveError, setEvolveError] = useState<string | null>(null);
  const [sacrificeOpen, setSacrificeOpen] = useState(false);
  const [selectedDuplicateIds, setSelectedDuplicateIds] = useState<Set<string>>(new Set());
  const [sacrificing, setSacrificing] = useState(false);
  const [sacrificeError, setSacrificeError] = useState<string | null>(null);
  const [eggError, setEggError] = useState<string | null>(null);
  const [toast, setToast] = useState<RewardToastData | null>(null);
  // Captured once per mount rather than read live — good enough for a display-only
  // readiness check, since the `claim_egg` RPC re-validates the cadence server-side
  // regardless of what the client thinks "now" is.
  const [now] = useState(() => Date.now());

  const duplicates = useMemo(() => {
    if (!wobblin || !allWobblins) return [];
    return allWobblins
      .filter(
        (w) =>
          w.id !== wobblin.id &&
          w.locked_reason == null &&
          w.species.evolution_chain_id === wobblin.species.evolution_chain_id,
      )
      .sort((a, b) => a.species.stage - b.species.stage || a.level - b.level);
  }, [wobblin, allWobblins]);

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
  const rarityColor = RARITY_COLORS[rarity];
  const name = wobblin.nickname ?? wobblin.species.name;
  const art = SPECIES_ART[wobblin.species.name];
  const isFeatured = featured?.id === wobblin.id;
  const isOwner = wobblin.player_id === playerId;
  const isLocked = wobblin.locked_reason != null;
  const caughtOn = new Date(wobblin.acquired_at).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const canEvolve = wobblin.species.evolves_into_id != null;
  const evolutionLevel = wobblin.species.evolution_level;
  const readyToEvolve = canEvolve && evolutionLevel != null && wobblin.level >= evolutionLevel && !isLocked;
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

  const toggleDuplicateSelected = (id: string) => {
    setSelectedDuplicateIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const closeSacrificePicker = () => {
    setSacrificeOpen(false);
    setSelectedDuplicateIds(new Set());
    setSacrificeError(null);
  };

  /** Sacrifices are consumed one RPC call at a time (server has no batch variant), in sequence. */
  const onSacrificeSelected = async () => {
    if (selectedDuplicateIds.size === 0) return;
    setSacrificeError(null);
    setSacrificing(true);

    let finalLevel = wobblin.level;
    let anyLeveledUp = false;

    try {
      for (const consumedId of selectedDuplicateIds) {
        const result = await sacrificeWobblin.mutateAsync({ targetId: wobblin.id, consumedId });
        finalLevel = result.wobblin.level;
        anyLeveledUp = anyLeveledUp || result.leveled_up;
      }
      closeSacrificePicker();
      if (anyLeveledUp) setLevelUp(finalLevel);
    } catch (err) {
      setSacrificeError(getErrorMessage(err));
    } finally {
      // Each sacrifice's own onSuccess invalidates playerWobblins, but firing several
      // in quick succession can race: a still-in-flight refetch from an earlier
      // sacrifice gets reused (deduped) for a later invalidation instead of triggering
      // a fresh request, so the list can settle on a snapshot that's missing only
      // some of the just-consumed Wobblins. One more invalidation after the whole
      // batch has actually finished guarantees the final refetch reflects every
      // sacrifice, not just however many completed before the dedup kicked in.
      await queryClient.invalidateQueries({ queryKey: queryKeys.playerWobblins(playerId) });
      setSacrificing(false);
    }
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

  /**
   * Avoids a task ⇄ Wobblin ping-pong: if the screen right below this one in the
   * stack is already that same task's detail screen (i.e. the user came from
   * `/task/[id]` by tapping the reward monster), just go back to it instead of
   * pushing a second copy on top.
   */
  const onPressLockedBanner = () => {
    if (!rewardTask) return;

    const state = navigation.getState();
    const previousRoute = state?.routes[state.index - 1];
    const previousParams = previousRoute?.params as { id?: string } | undefined;

    if (previousRoute?.name === "task/[id]" && previousParams?.id === rewardTask.id) {
      router.back();
    } else {
      router.push(`/task/${rewardTask.id}`);
    }
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
            disabled={isFeatured || isLocked || setActiveWobblin.isPending}
            accessibilityRole="button"
            accessibilityLabel={
              isFeatured ? "Featured Wobblin" : isLocked ? "Locked as a task reward" : "Set as featured Wobblin"
            }
            className="flex-row items-center gap-1.5 rounded-full border px-3.5 py-2"
            style={{
              borderColor: isFeatured ? `${COLORS.gold}66` : COLORS.border,
              backgroundColor: isFeatured ? `${COLORS.gold}1a` : COLORS.surface,
              opacity: isLocked && !isFeatured ? 0.5 : 1,
            }}
          >
            <Icon
              family="ionicons"
              name={isFeatured ? "star" : isLocked ? "lock-closed" : "star-outline"}
              size={15}
              color={isFeatured ? COLORS.gold : COLORS.textMuted}
            />
            <Text
              className="font-sans-semibold text-xs"
              style={{ color: isFeatured ? COLORS.gold : COLORS.textMuted }}
            >
              {isFeatured ? "Featured" : isLocked ? "Locked" : "Set Featured"}
            </Text>
          </Pressable>
        </View>

        <MonsterHero
          name={name}
          speciesName={wobblin.species.name}
          nicknamed={wobblin.nickname != null}
          element={element}
          rarity={rarity}
          elementColor={elementColor}
          rarityColor={rarityColor}
          art={art}
          level={wobblin.level}
          experience={wobblin.experience}
          onLevelUp={setLevelUp}
          caughtOn={caughtOn}
        />

        {isLocked && isOwner && (
          <Pressable
            onPress={rewardTask ? onPressLockedBanner : undefined}
            accessibilityRole={rewardTask ? "button" : undefined}
            className="flex-row items-center gap-2 rounded-xl border border-gold/40 bg-gold/10 px-4 py-3"
          >
            <Icon family="ionicons" name="lock-closed" size={16} color={COLORS.gold} />
            <Text className="flex-1 font-sans-medium text-sm text-gold">
              Locked as a task reward — it can&apos;t evolve, be sacrificed, or be offered elsewhere until the task resolves.
            </Text>
            {rewardTask && <Icon family="ionicons" name="chevron-forward" size={16} color={COLORS.gold} />}
          </Pressable>
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

        <View className="gap-3 rounded-2xl border border-border bg-surface p-4">
          <View className="flex-row items-center justify-between">
            <Text className="font-display text-sm uppercase tracking-wide text-text-muted">
              Sacrifice Duplicates
            </Text>
            {!sacrificeOpen && (
              <Pressable onPress={() => setSacrificeOpen(true)} disabled={isLocked || duplicates.length === 0}>
                <Text
                  className="font-sans-semibold text-xs"
                  style={{ color: isLocked || duplicates.length === 0 ? COLORS.textSubtle : COLORS.primaryDark }}
                >
                  Choose
                </Text>
              </Pressable>
            )}
          </View>
          <Text className="font-sans text-xs text-text-subtle">
            Consume one or more Wobblins from the same evolution chain to grant {name} XP. Consumed Wobblins are
            permanently removed.
          </Text>

          {duplicates.length === 0 ? (
            <Text className="font-sans text-sm text-text-subtle">No eligible duplicates in your collection.</Text>
          ) : sacrificeOpen ? (
            <View className="gap-2">
              {duplicates.map((duplicate) => (
                <DuplicateRow
                  key={duplicate.id}
                  duplicate={duplicate}
                  selected={selectedDuplicateIds.has(duplicate.id)}
                  disabled={sacrificing}
                  onPress={() => toggleDuplicateSelected(duplicate.id)}
                />
              ))}
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Button label="Cancel" variant="secondary" onPress={closeSacrificePicker} disabled={sacrificing} />
                </View>
                <View className="flex-1">
                  <Button
                    label={selectedDuplicateIds.size > 1 ? `Sacrifice ${selectedDuplicateIds.size}` : "Sacrifice"}
                    onPress={onSacrificeSelected}
                    loading={sacrificing}
                    disabled={selectedDuplicateIds.size === 0}
                  />
                </View>
              </View>
            </View>
          ) : null}

          {sacrificeError && <Text className="font-sans-medium text-sm text-danger">{sacrificeError}</Text>}
        </View>

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

function DuplicateRow({
  duplicate,
  selected,
  disabled,
  onPress,
}: {
  duplicate: PlayerWobblin;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const element = duplicate.species.element.toLowerCase() as Element;
  const name = duplicate.nickname ?? duplicate.species.name;
  const art = SPECIES_ART[duplicate.species.name];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected, disabled }}
      className="flex-row items-center gap-3 rounded-xl border p-3"
      style={{
        opacity: disabled && !selected ? 0.6 : 1,
        borderColor: selected ? COLORS.danger : COLORS.border,
        backgroundColor: selected ? `${COLORS.danger}14` : COLORS.surfaceRaised,
      }}
    >
      <View
        className="h-10 w-10 items-center justify-center rounded-full border bg-background"
        style={{ borderColor: `${ELEMENT_COLORS[element]}66` }}
      >
        {art ? (
          <Image source={art} style={{ width: "82%", height: "82%" }} contentFit="contain" />
        ) : (
          <Icon {...ELEMENT_ICON[element]} size={16} color={ELEMENT_COLORS[element]} />
        )}
      </View>
      <View className="flex-1 gap-0.5">
        <Text className="font-sans-semibold text-sm text-text">{name}</Text>
        <Text className="font-sans text-xs text-text-subtle">Lv. {duplicate.level}</Text>
      </View>
      <View
        className="h-6 w-6 items-center justify-center rounded-full border-2"
        style={{
          borderColor: selected ? COLORS.danger : COLORS.border,
          backgroundColor: selected ? COLORS.danger : "transparent",
        }}
      >
        {selected && <Icon family="ionicons" name="checkmark" size={14} color="#ffffff" />}
      </View>
    </Pressable>
  );
}

function MonsterHero({
  name,
  speciesName,
  nicknamed,
  element,
  rarity,
  elementColor,
  rarityColor,
  art,
  level,
  experience,
  onLevelUp,
  caughtOn,
}: {
  name: string;
  speciesName: string;
  nicknamed: boolean;
  element: Element;
  rarity: Rarity;
  elementColor: string;
  rarityColor: string;
  art?: number;
  level: number;
  experience: number;
  onLevelUp: (level: number) => void;
  caughtOn: string;
}) {
  const heroTint = mixColors(COLORS.surface, elementColor, 0.2);

  return (
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

      <View style={{ width: 240, height: 224 }} className="items-center justify-center">
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            width: 168,
            height: 168,
            borderRadius: 84,
            backgroundColor: elementColor,
            opacity: 0.35,
            shadowColor: elementColor,
            shadowOpacity: 0.9,
            shadowRadius: 44,
            shadowOffset: { width: 0, height: 0 },
            elevation: 8,
          }}
        />
        {art ? (
          <Image source={art} style={{ width: "100%", height: "100%" }} contentFit="contain" />
        ) : (
          <View
            className="items-center justify-center rounded-full border-2 bg-background"
            style={{ width: 168, height: 168, borderColor: rarityColor }}
          >
            <Icon {...ELEMENT_ICON[element]} size={64} color={elementColor} />
          </View>
        )}
      </View>

      <View className="items-center gap-1">
        <View className="flex-row items-center gap-2">
          <Text className="text-center font-display-bold text-2xl text-text">{name}</Text>
          <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: `${COLORS.xp}26` }}>
            <Text className="font-display-bold text-xs" style={{ color: COLORS.xp }}>
              Lv. {level}
            </Text>
          </View>
        </View>
        {nicknamed && (
          <Text className="font-sans-medium text-sm text-text-muted">{speciesName}</Text>
        )}
      </View>

      <View className="flex-row flex-wrap items-center justify-center gap-2">
        <TraitBadge label={element} color={elementColor} />
        <TraitBadge label={rarity} color={rarityColor} />
        <View
          className="flex-row items-center gap-1 rounded-full border px-2.5 py-1"
          style={{ borderColor: `${COLORS.textSubtle}33`, backgroundColor: `${COLORS.textSubtle}14` }}
        >
          <Icon family="material-community" name="calendar-blank" size={11} color={COLORS.textSubtle} />
          <Text className="font-sans-semibold text-xs text-text-subtle">{caughtOn}</Text>
        </View>
      </View>

      <View className="w-full pt-1">
        <XPBar
          level={level}
          experience={experience}
          onLevelUp={onLevelUp}
          showLevel={false}
          icon={{ family: "ionicons", name: "star" }}
        />
      </View>
    </View>
  );
}

