import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import type { ComponentProps } from "react";

/**
 * Data-driven icon reference — stored in constants (element/avatar/location maps)
 * instead of raw emoji, then rendered by `<Icon />` wherever a "monster image"
 * placeholder or UI glyph is needed. Two families cover every icon currently in use.
 */
export type IconSpec =
  | { family: "ionicons"; name: ComponentProps<typeof Ionicons>["name"] }
  | { family: "material-community"; name: ComponentProps<typeof MaterialCommunityIcons>["name"] };

type IconProps = IconSpec & { size?: number; color?: string };

export function Icon({ family, name, size = 24, color }: IconProps) {
  if (family === "material-community") {
    return <MaterialCommunityIcons name={name} size={size} color={color} />;
  }
  return <Ionicons name={name} size={size} color={color} />;
}
