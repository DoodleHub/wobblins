/* eslint-disable react-hooks/refs -- Animated.Value held in useRef is the standard RN pattern; it's a mutable animation handle, not a component ref, and reading it during render is how Animated interpolation works. */
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { EvolutionBanner } from "@/components/EvolutionBanner";
import { Icon, type IconSpec } from "@/components/Icon";
import { LevelUpBanner } from "@/components/LevelUpBanner";
import { LoadingScreen } from "@/components/LoadingScreen";
import { StatBar } from "@/components/StatBar";
import { TraitBadge } from "@/components/TraitBadge";
import { XPBar } from "@/components/XPBar";
import { SPECIES_ART } from "@/constants/speciesArt";
import { COLORS, ELEMENT_COLORS, ELEMENT_ICON, mixColors, RARITY_COLORS, type Element, type Rarity } from "@/constants/theme";
import { useSetActiveWobblin } from "@/hooks/usePlayer";
import { useTrainWobblin } from "@/hooks/useTraining";
import { useAllSpecies, useEvolveWobblin, useFeaturedWobblin, useWobblin } from "@/hooks/useWobblins";
import type { TrainingOption } from "@/supabase/training";
import { useSupabase } from "@/supabase/SupabaseProvider";
import { getErrorMessage } from "@/utils/errors";

export default function MonsterDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useSupabase();
  const playerId = session?.user.id;

  const { data: wobblin, isPending, error } = useWobblin(id);
  const { data: featured } = useFeaturedWobblin(playerId);
  const { data: allSpecies } = useAllSpecies();
  const setActiveWobblin = useSetActiveWobblin(playerId);
  const evolveWobblin = useEvolveWobblin(playerId);
  const trainWobblin = useTrainWobblin(id, playerId);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const [evolvedTo, setEvolvedTo] = useState<string | null>(null);
  const [evolveError, setEvolveError] = useState<string | null>(null);
  const [trainPulse, setTrainPulse] = useState<{ option: TrainingOption; key: number } | null>(null);

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
  const caughtOn = new Date(wobblin.created_at).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const canEvolve = wobblin.species.evolves_into_id != null;
  const evolutionLevel = wobblin.species.evolution_level;
  const readyToEvolve = canEvolve && evolutionLevel != null && wobblin.level >= evolutionLevel;
  const nextSpecies = canEvolve ? allSpecies?.find((s) => s.id === wobblin.species.evolves_into_id) : undefined;

  const onEvolve = () => {
    setEvolveError(null);
    evolveWobblin.mutate(wobblin.id, {
      onSuccess: (result) => setEvolvedTo(result.to_species_name),
      onError: (err) => setEvolveError(getErrorMessage(err)),
    });
  };

  const pendingTrainOption = trainWobblin.isPending ? (trainWobblin.variables as TrainingOption) : null;

  const onTrain = (option: TrainingOption) => {
    trainWobblin.mutate(option, {
      onSuccess: () => setTrainPulse({ option, key: Date.now() }),
    });
  };

  return (
    <View className="flex-1 bg-background">
      <LevelUpBanner level={levelUp} label={`${name} leveled up!`} />
      <EvolutionBanner speciesName={evolvedTo} onDismiss={() => setEvolvedTo(null)} />
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
          elementColor={elementColor}
          rarityColor={rarityColor}
          art={art}
        />

        <View className="flex-row items-center rounded-2xl border border-border bg-surface p-4">
          <QuickFact
            icon={{ family: "material-community", name: "hexagon-slice-6" }}
            iconColor={rarityColor}
            value={String(wobblin.level)}
            label="Level"
          />
          <View className="h-10 w-px bg-border" />
          <QuickFact
            icon={{ family: "material-community", name: "star-four-points" }}
            iconColor={COLORS.secondary}
            value={String(wobblin.training_points)}
            label={"Training\nPoints"}
          />
          <View className="h-10 w-px bg-border" />
          <QuickFact
            icon={{ family: "material-community", name: "calendar-blank" }}
            value={caughtOn}
            label="Caught"
          />
        </View>

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

        <View className="gap-4 rounded-2xl border border-border bg-surface p-4">
          <View className="flex-row items-center justify-between">
            <Text className="font-display text-sm uppercase tracking-wide text-text-muted">Stats</Text>
            {wobblin.training_points > 0 ? (
              <View className="flex-row items-center gap-1 rounded-full bg-secondary/15 px-2.5 py-1">
                <Icon family="material-community" name="star-four-points" size={12} color={COLORS.secondary} />
                <Text className="font-sans-semibold text-xs text-secondary">
                  {wobblin.training_points} to spend
                </Text>
              </View>
            ) : (
              <Text className="font-sans text-xs text-text-subtle">No points left</Text>
            )}
          </View>

          <View className="flex-row items-center gap-3">
            <View className="flex-1">
              <StatBar
                label="HP"
                value={wobblin.hp}
                max={wobblin.species.base_hp}
                color={COLORS.hp}
                icon={{ family: "ionicons", name: "heart" }}
              />
            </View>
            <View style={{ width: 32, height: 32 }} />
          </View>
          <TrainableStatRow
            label="Attack"
            value={wobblin.attack}
            max={wobblin.species.base_attack}
            color={COLORS.primary}
            icon={{ family: "material-community", name: "sword" }}
            option="attack"
            trainingPoints={wobblin.training_points}
            pendingOption={pendingTrainOption}
            onTrain={onTrain}
            pulseKey={trainPulse?.option === "attack" ? trainPulse.key : undefined}
          />
          <TrainableStatRow
            label="Defense"
            value={wobblin.defense}
            max={wobblin.species.base_defense}
            color={COLORS.secondary}
            icon={{ family: "material-community", name: "shield-outline" }}
            option="defense"
            trainingPoints={wobblin.training_points}
            pendingOption={pendingTrainOption}
            onTrain={onTrain}
            pulseKey={trainPulse?.option === "defense" ? trainPulse.key : undefined}
          />
          <TrainableStatRow
            label="Speed"
            value={wobblin.speed}
            max={wobblin.species.base_speed}
            color={COLORS.energy}
            icon={{ family: "ionicons", name: "flash" }}
            option="speed"
            trainingPoints={wobblin.training_points}
            pendingOption={pendingTrainOption}
            onTrain={onTrain}
            pulseKey={trainPulse?.option === "speed" ? trainPulse.key : undefined}
          />

          {trainWobblin.error && (
            <Text className="font-sans-medium text-sm text-danger">{getErrorMessage(trainWobblin.error)}</Text>
          )}

          <View className="pt-1">
            <XPBar
              level={wobblin.level}
              experience={wobblin.experience}
              onLevelUp={setLevelUp}
              icon={{ family: "ionicons", name: "star" }}
            />
          </View>
        </View>

        <Button label="Battle" onPress={() => router.push({ pathname: "/battle", params: { id: wobblin.id } })} />
      </ScrollView>
    </View>
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
}: {
  name: string;
  speciesName: string;
  nicknamed: boolean;
  element: Element;
  rarity: Rarity;
  elementColor: string;
  rarityColor: string;
  art?: number;
}) {
  const entrance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    entrance.setValue(0);
    Animated.spring(entrance, { toValue: 1, useNativeDriver: true, friction: 6, tension: 50 }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speciesName]);

  const heroTint = mixColors(COLORS.surface, elementColor, 0.2);
  const scale = entrance.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] });

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

      <Animated.View style={{ width: 240, height: 224, transform: [{ scale }] }} className="items-center justify-center">
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
      </Animated.View>

      <View className="items-center gap-1">
        <Text className="text-center font-display-bold text-2xl text-text">{name}</Text>
        {nicknamed && (
          <Text className="font-sans-medium text-sm text-text-muted">{speciesName}</Text>
        )}
      </View>

      <View className="flex-row gap-2">
        <TraitBadge label={element} color={elementColor} />
        <TraitBadge label={rarity} color={rarityColor} />
      </View>
    </View>
  );
}

function TrainableStatRow({
  label,
  value,
  max,
  color,
  icon,
  option,
  trainingPoints,
  pendingOption,
  onTrain,
  pulseKey,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  icon: IconSpec;
  option: TrainingOption;
  trainingPoints: number;
  pendingOption: TrainingOption | null;
  onTrain: (option: TrainingOption) => void;
  pulseKey: number | undefined;
}) {
  const isPending = pendingOption === option;
  const disabled = trainingPoints <= 0 || (pendingOption !== null && !isPending);

  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (pulseKey == null) return;
    pulse.setValue(0);
    Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 150, useNativeDriver: true }),
      Animated.delay(350),
      Animated.timing(pulse, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pulseKey]);

  const pulseTranslate = pulse.interpolate({ inputRange: [0, 1], outputRange: [4, -18] });

  return (
    <View className="flex-row items-center gap-3">
      <View className="flex-1">
        <StatBar label={label} value={value} max={max} color={color} icon={icon} />
      </View>
      <View className="items-center justify-center" style={{ width: 32, height: 32 }}>
        <Animated.Text
          pointerEvents="none"
          className="absolute font-display-bold text-xs"
          style={{ color, opacity: pulse, transform: [{ translateY: pulseTranslate }] }}
        >
          +1
        </Animated.Text>
        <Pressable
          onPress={() => onTrain(option)}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={`Train ${label}`}
          className="h-8 w-8 items-center justify-center rounded-full border"
          style={{
            borderColor: disabled ? COLORS.border : `${color}66`,
            backgroundColor: disabled ? COLORS.surface : `${color}1f`,
            opacity: disabled && !isPending ? 0.5 : 1,
          }}
        >
          {isPending ? (
            <ActivityIndicator size="small" color={color} />
          ) : (
            <Icon family="ionicons" name="add" size={16} color={disabled ? COLORS.textSubtle : color} />
          )}
        </Pressable>
      </View>
    </View>
  );
}

function QuickFact({
  icon,
  iconColor,
  value,
  label,
}: {
  icon: IconSpec;
  iconColor?: string;
  value: string;
  label: string;
}) {
  return (
    <View className="flex-1 items-center gap-1">
      <Icon {...icon} size={20} color={iconColor ?? COLORS.textMuted} />
      <Text className="font-display-bold text-base text-text">{value}</Text>
      <Text className="text-center font-sans-medium text-[11px] text-text-subtle">{label}</Text>
    </View>
  );
}
