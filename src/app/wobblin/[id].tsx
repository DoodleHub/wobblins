import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { StatBar } from "@/components/StatBar";
import { COLORS, ELEMENT_CLASSNAMES, ELEMENT_EMOJI, type Element, RARITY_CLASSNAMES, type Rarity } from "@/constants/theme";
import { useWobblin } from "@/hooks/useWobblins";
import { getErrorMessage } from "@/utils/errors";

export default function MonsterDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data: wobblin, isPending, error } = useWobblin(id);

  if (isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
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
  const elementClasses = ELEMENT_CLASSNAMES[element];
  const rarityClasses = RARITY_CLASSNAMES[rarity];
  const emoji = ELEMENT_EMOJI[element];
  const name = wobblin.nickname ?? wobblin.species.name;

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="w-full min-w-0 flex-grow gap-6 px-6 pb-8 pt-16"
    >
      <View className="items-center gap-3">
        <View
          className={`h-24 w-24 items-center justify-center rounded-full border bg-surface ${elementClasses?.border ?? "border-border"}`}
        >
          <Text className="text-5xl">{emoji}</Text>
        </View>
        <View className="items-center gap-1">
          <Text className="font-display-bold text-2xl text-text">{name}</Text>
          <Text className="font-sans-medium text-sm text-text-muted">
            Level {wobblin.level} · {wobblin.species.name}
          </Text>
        </View>
        <View className="flex-row gap-2">
          {elementClasses && (
            <View className={`rounded-full border bg-surface px-2.5 py-1 ${elementClasses.border}`}>
              <Text className={`font-sans-semibold text-xs capitalize ${elementClasses.text}`}>
                {wobblin.species.element}
              </Text>
            </View>
          )}
          {rarityClasses && (
            <View className={`rounded-full border bg-surface px-2.5 py-1 ${rarityClasses.border}`}>
              <Text className={`font-sans-semibold text-xs capitalize ${rarityClasses.text}`}>
                {wobblin.species.rarity}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View className="gap-4 rounded-2xl border border-border bg-surface p-4">
        <Text className="font-display text-sm uppercase tracking-wide text-text-muted">Stats</Text>
        <StatBar label="HP" value={wobblin.hp} max={wobblin.species.base_hp} color={COLORS.hp} />
        <StatBar
          label="Attack"
          value={wobblin.attack}
          max={wobblin.species.base_attack}
          color={COLORS.primary}
        />
        <StatBar
          label="Defense"
          value={wobblin.defense}
          max={wobblin.species.base_defense}
          color={COLORS.secondary}
        />
        <StatBar label="Speed" value={wobblin.speed} max={wobblin.species.base_speed} color={COLORS.energy} />
        <View className="flex-row items-center justify-between pt-1">
          <Text className="font-sans-medium text-xs text-text-subtle">Experience</Text>
          <Text className="font-sans-semibold text-xs text-text">{wobblin.experience.toLocaleString()} XP</Text>
        </View>
      </View>

      <View className="gap-3">
        <Button label="Train" onPress={() => router.push({ pathname: "/train", params: { id: wobblin.id } })} />
        <Button
          label="Battle"
          variant="secondary"
          onPress={() => router.push({ pathname: "/battle", params: { id: wobblin.id } })}
        />
      </View>
    </ScrollView>
  );
}
