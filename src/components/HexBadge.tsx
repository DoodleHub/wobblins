import type { ReactNode } from "react";
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
  // Rounded to whole pixels: a fractional point/rectWidth leaves flexbox to round
  // each child's layout independently, which can leave a 1px gap at one of the two
  // triangle/rect boundaries — visible as a hairline seam through the fill color.
  const point = Math.round(size * 0.28);
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

type HexIconBadgeProps = {
  size?: number;
  color: string;
  glow?: boolean;
  children: ReactNode;
};

/**
 * Same flat-top hexagon construction as `HexBadge`, generalized to hold an
 * icon instead of a numeric value — used for achievement badges.
 *
 * The glow is a separate plain circle with its own shadow, absolutely
 * positioned behind the hex, rather than a `shadow*` prop on the hex's own
 * container — a soft round halo behind the badge reads fine without needing
 * to match the hex's outline exactly.
 */
export function HexIconBadge({ size = 64, color, glow = false, children }: HexIconBadgeProps) {
  // Rounded to whole pixels: a fractional point/rectWidth leaves flexbox to round
  // each child's layout independently, which can leave a 1px gap at one of the two
  // triangle/rect boundaries — visible as a hairline seam through the fill color.
  const point = Math.round(size * 0.28);
  const rectWidth = size - point * 2;

  return (
    <View style={{ width: size, height: size }}>
      {glow && (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: size * 0.1,
            left: size * 0.1,
            width: size * 0.8,
            height: size * 0.8,
            borderRadius: (size * 0.8) / 2,
            backgroundColor: color,
            shadowColor: color,
            shadowOpacity: 0.9,
            shadowRadius: size * 0.22,
            shadowOffset: { width: 0, height: 0 },
            elevation: 6,
          }}
        />
      )}
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
          {children}
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
    </View>
  );
}
