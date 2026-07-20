import type { IconSpec } from "@/components/Icon";

export type AvatarId = "explorer" | "mage" | "knight";

export const AVATAR_ICON: Record<AvatarId, IconSpec> = {
  explorer: { family: "ionicons", name: "compass" },
  mage: { family: "material-community", name: "wizard-hat" },
  knight: { family: "ionicons", name: "shield" },
};

export const AVATARS: { id: AvatarId; label: string; icon: IconSpec }[] = [
  { id: "explorer", label: "Explorer", icon: AVATAR_ICON.explorer },
  { id: "mage", label: "Mage", icon: AVATAR_ICON.mage },
  { id: "knight", label: "Knight", icon: AVATAR_ICON.knight },
];
