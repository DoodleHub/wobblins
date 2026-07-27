import { Image } from "expo-image";
import { Text, View } from "react-native";

import { Icon } from "@/components/Icon";
import { SPECIES_ART } from "@/constants/speciesArt";
import { COLORS, ELEMENT_COLORS, ELEMENT_ICON, type Element } from "@/constants/theme";
import type { PlayerWobblin } from "@/supabase/wobblins";

/** Compact read-only row (portrait + name + level) confirming which Wobblin a trade screen is acting on — reused by the list/offer/respond flow's header context. */
export function WobblinPreviewRow({ wobblin }: { wobblin: PlayerWobblin }) {
  const element = wobblin.species.element.toLowerCase() as Element;
  const name = wobblin.nickname ?? wobblin.species.name;
  const art = SPECIES_ART[wobblin.species.name];

  return (
    <View
      className="flex-row items-center gap-3 rounded-xl border p-3"
      style={{ borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight }}
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
        <Text className="font-sans text-xs text-text-subtle">Lv. {wobblin.level}</Text>
      </View>
    </View>
  );
}
