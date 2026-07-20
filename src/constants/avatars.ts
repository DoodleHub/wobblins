export type AvatarId = "explorer" | "mage" | "knight";

export const AVATARS: { id: AvatarId; label: string; icon: string }[] = [
  { id: "explorer", label: "Explorer", icon: "🧭" },
  { id: "mage", label: "Mage", icon: "🧙" },
  { id: "knight", label: "Knight", icon: "🛡️" },
];

export const AVATAR_ICON: Record<AvatarId, string> = {
  explorer: "🧭",
  mage: "🧙",
  knight: "🛡️",
};
