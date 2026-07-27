import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { Icon } from "@/components/Icon";
import { SPECIES_ART } from "@/constants/speciesArt";
import { COLORS, ELEMENT_COLORS, ELEMENT_ICON, RARITY_COLORS, type Element, type Rarity } from "@/constants/theme";
import type { PlayerWobblin } from "@/supabase/wobblins";

/** The rarity-tinted grid tile used for the Collection grid — portrait, Lv./element badges, and name only. Reused anywhere else a player picks one of their own Wobblins out of a grid (e.g. the trade "choose a Wobblin to sell" screen, or the multi-select offer composer). */
export function WobblinGridCard({
  wobblin,
  width,
  onPress,
  selected,
}: {
  wobblin: PlayerWobblin;
  width: number;
  /** Defaults to pushing the Wobblin detail screen; pass to override (e.g. a picker screen selecting instead of navigating). */
  onPress?: () => void;
  /** When provided (even `false`), renders a selection ring + checkmark badge instead of the plain rarity tint — for multi-select pickers. */
  selected?: boolean;
}) {
  const router = useRouter();

  const element = wobblin.species.element.toLowerCase() as Element;
  const rarity = wobblin.species.rarity.toLowerCase() as Rarity;
  const name = wobblin.nickname ?? wobblin.species.name;
  const elementColor = ELEMENT_COLORS[element];
  const rarityColor = RARITY_COLORS[rarity];
  const art = SPECIES_ART[wobblin.species.name];

  return (
    <Pressable
      onPress={onPress ?? (() => router.push(`/wobblin/${wobblin.id}`))}
      accessibilityRole={selected === undefined ? "button" : "checkbox"}
      accessibilityLabel={name}
      accessibilityState={selected === undefined ? undefined : { checked: selected }}
      className="gap-1 overflow-hidden rounded-2xl border p-2"
      style={{
        width,
        borderColor: selected ? COLORS.primary : `${rarityColor}55`,
        backgroundColor: selected ? COLORS.primaryLight : `${rarityColor}14`,
      }}
    >
      <View className="aspect-square items-center justify-end">
        {art ? (
          <Image source={art} style={{ width: "100%", height: "78%" }} contentFit="contain" />
        ) : (
          <View
            className="h-14 w-14 items-center justify-center rounded-full border bg-background"
            style={{ borderColor: `${elementColor}66` }}
          >
            <Icon {...ELEMENT_ICON[element]} size={24} color={elementColor} />
          </View>
        )}
        <View
          className="absolute left-0 top-0 rounded-full px-2 py-0.5"
          style={{ backgroundColor: `${COLORS.background}cc` }}
        >
          <Text className="font-sans-bold text-[11px] text-text">Lv. {wobblin.level}</Text>
        </View>
        {selected === undefined ? (
          <View
            className="absolute right-0 top-0 h-6 w-6 items-center justify-center rounded-full"
            style={{ backgroundColor: `${COLORS.background}cc` }}
          >
            <Icon {...ELEMENT_ICON[element]} size={12} color={elementColor} />
          </View>
        ) : (
          <View
            className="absolute right-0 top-0 h-6 w-6 items-center justify-center rounded-full border"
            style={{
              borderColor: selected ? COLORS.primary : COLORS.border,
              backgroundColor: selected ? COLORS.primary : `${COLORS.background}cc`,
            }}
          >
            {selected && <Icon family="ionicons" name="checkmark" size={14} color="#ffffff" />}
          </View>
        )}
      </View>

      <View className="px-0.5 pb-0.5">
        <Text numberOfLines={1} className="text-center font-display-bold text-sm text-text">
          {name}
        </Text>
      </View>
    </Pressable>
  );
}
