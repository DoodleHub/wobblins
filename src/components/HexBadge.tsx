import { Text, View } from "react-native";

import { COLORS } from "@/constants/theme";

type HexBadgeProps = {
  value: number | string;
  size?: number;
  color?: string;
};

/**
 * A flat-top, pointed-side hexagon badge (used for the player level pip).
 * Built from a rectangle plus two triangles via the border trick — no SVG
 * dependency needed for a shape this simple.
 */
export function HexBadge({ value, size = 48, color = COLORS.primary }: HexBadgeProps) {
  const point = size * 0.28;
  const rectWidth = size - point * 2;

  return (
    <View style={{ flexDirection: "row", width: size, height: size }}>
      <View
        style={{
          width: 0,
          height: 0,
          borderTopWidth: size / 2,
          borderBottomWidth: size / 2,
          borderTopColor: "transparent",
          borderBottomColor: "transparent",
          borderRightWidth: point,
          borderRightColor: color,
        }}
      />
      <View
        style={{ width: rectWidth, height: size, backgroundColor: color }}
        className="items-center justify-center"
      >
        <Text className="font-display-bold text-base text-white">{value}</Text>
      </View>
      <View
        style={{
          width: 0,
          height: 0,
          borderTopWidth: size / 2,
          borderBottomWidth: size / 2,
          borderTopColor: "transparent",
          borderBottomColor: "transparent",
          borderLeftWidth: point,
          borderLeftColor: color,
        }}
      />
    </View>
  );
}
