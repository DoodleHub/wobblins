import { Pressable, ScrollView, Text } from "react-native";

import { Icon, type IconSpec } from "@/components/Icon";
import { COLORS, ELEMENT_COLORS, ELEMENT_ICON, type Element } from "@/constants/theme";

export type ElementFilterValue = "all" | Element;

const ALL_ICON: IconSpec = { family: "ionicons", name: "grid" };

export const ELEMENT_FILTERS: { value: ElementFilterValue; label: string; icon: IconSpec }[] = [
  { value: "all", label: "All", icon: ALL_ICON },
  { value: "fire", label: "Fire", icon: ELEMENT_ICON.fire },
  { value: "water", label: "Water", icon: ELEMENT_ICON.water },
  { value: "grass", label: "Grass", icon: ELEMENT_ICON.grass },
  { value: "thunder", label: "Thunder", icon: ELEMENT_ICON.thunder },
  { value: "dark", label: "Dark", icon: ELEMENT_ICON.dark },
  { value: "ice", label: "Ice", icon: ELEMENT_ICON.ice },
  { value: "rock", label: "Rock", icon: ELEMENT_ICON.rock },
  { value: "wind", label: "Wind", icon: ELEMENT_ICON.wind },
  { value: "light", label: "Light", icon: ELEMENT_ICON.light },
  { value: "poison", label: "Poison", icon: ELEMENT_ICON.poison },
];

/** Canonical element display order, reused to sort lists by element/evolution group. */
export const ELEMENT_ORDER: Record<Element, number> = Object.fromEntries(
  ELEMENT_FILTERS.filter(
    (option): option is { value: Element; label: string; icon: IconSpec } => option.value !== "all",
  ).map((option, index) => [option.value, index]),
) as Record<Element, number>;

export function ElementFilterRow({
  value,
  onChange,
}: {
  value: ElementFilterValue;
  onChange: (value: ElementFilterValue) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {ELEMENT_FILTERS.map((option) => {
        const selected = option.value === value;
        const color = option.value === "all" ? COLORS.primary : ELEMENT_COLORS[option.value];

        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            className="flex-row items-center gap-1.5 rounded-full border px-3 py-1.5"
            style={{
              borderColor: selected ? color : COLORS.border,
              backgroundColor: selected ? color : COLORS.surface,
            }}
          >
            <Icon {...option.icon} size={13} color={selected ? "#ffffff" : color} />
            <Text
              className="font-sans-semibold text-xs capitalize"
              style={{ color: selected ? "#ffffff" : COLORS.textMuted }}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
