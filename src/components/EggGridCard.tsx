import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { Icon } from "@/components/Icon";
import { ELEMENT_EGG_ART } from "@/constants/speciesArt";
import { COLORS, ELEMENT_COLORS, RARITY_COLORS, type Element, type Rarity } from "@/constants/theme";
import type { Egg } from "@/supabase/eggs";

/**
 * The grid tile for a claimed-but-unhatched egg — mirrors WobblinGridCard's
 * footprint and rarity tint so eggs sit naturally in the same Collection
 * grid as real Wobblins. Tapping pushes the Egg Detail screen (same as
 * WobblinGridCard pushes the Wobblin Detail screen) — hatching happens
 * there, not from the grid.
 */
export function EggGridCard({
  egg,
  width,
  ready,
  countdownLabel,
  onPress,
}: {
  egg: Egg;
  width: number;
  ready: boolean;
  countdownLabel: string;
  /** Defaults to pushing the Egg detail screen; pass to override. */
  onPress?: () => void;
}) {
  const router = useRouter();

  const element = egg.species.element.toLowerCase() as Element;
  const rarity = egg.species.rarity.toLowerCase() as Rarity;
  const rarityColor = RARITY_COLORS[rarity];
  const elementColor = ELEMENT_COLORS[element];

  return (
    <Pressable
      onPress={onPress ?? (() => router.push(`/egg/${egg.id}`))}
      accessibilityRole="button"
      accessibilityLabel={`${egg.species.name} Egg`}
      className="gap-1 overflow-hidden rounded-2xl border p-2"
      style={{
        width,
        borderColor: ready ? COLORS.gold : `${rarityColor}55`,
        backgroundColor: ready ? `${COLORS.gold}14` : `${rarityColor}14`,
      }}
    >
      <View className="aspect-square items-center justify-center">
        <Image source={ELEMENT_EGG_ART[element]} style={{ width: "70%", height: "70%" }} contentFit="contain" />
        <View
          className="absolute right-0 top-0 h-6 w-6 items-center justify-center rounded-full"
          style={{ backgroundColor: `${COLORS.background}cc` }}
        >
          <Icon
            family="ionicons"
            name={ready ? "flame" : "time-outline"}
            size={12}
            color={ready ? COLORS.gold : elementColor}
          />
        </View>
      </View>

      <View className="items-center gap-0.5 px-0.5 pb-0.5">
        <Text numberOfLines={1} className="text-center font-display-bold text-sm text-text">
          {egg.species.name} Egg
        </Text>
        <Text
          numberOfLines={1}
          className="text-center font-sans-semibold text-[10px]"
          style={{ color: ready ? COLORS.gold : COLORS.textMuted }}
        >
          {countdownLabel}
        </Text>
      </View>
    </Pressable>
  );
}
