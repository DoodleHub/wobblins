import { Text, View } from "react-native";

import { COLORS } from "@/constants/theme";

type TraitBadgeProps = {
  label: string;
  color?: string;
  /** Short effect description, e.g. "20% less fire damage" — shown as a muted second line. */
  effect?: string;
};

/** A small tinted pill for an element, rarity, or trait. Color is data-driven, so it's applied via style rather than a Tailwind class. */
export function TraitBadge({ label, color = COLORS.textMuted, effect }: TraitBadgeProps) {
  return (
    <View
      className="items-start gap-0.5 rounded-full border px-2.5 py-1"
      style={{ borderColor: `${color}55`, backgroundColor: `${color}1f` }}
    >
      <Text className="font-sans-semibold text-xs capitalize" style={{ color }}>
        {label}
      </Text>
      {effect && <Text className="font-sans text-[10px] text-text-subtle">{effect}</Text>}
    </View>
  );
}
