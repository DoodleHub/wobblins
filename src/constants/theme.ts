/**
 * Design system tokens for Monster Realms.
 *
 * The source of truth for colors and fonts is the `@theme` block in
 * `global.css` — these are plain-JS mirrors of the same values, for the
 * places NativeWind className strings can't reach:
 *   - dynamic lookups keyed by data (e.g. `monster.element`), since
 *     Tailwind class names must be static strings
 *   - native APIs that take raw colors (StatusBar, SVG fill, icon props)
 *
 * Prefer the `bg-*` / `text-*` / `border-*` utility classes directly
 * whenever the value isn't data-driven. Element and rarity colors are
 * intentionally hex-only (no Tailwind class map) — they're always applied
 * via inline `style`, since `TraitBadge` and `MonsterCard` tint dynamically
 * from data rather than a fixed set of class names.
 */

import type { IconSpec } from "@/components/Icon";

export type Element = "fire" | "water" | "grass" | "thunder" | "dark" | "ice" | "rock" | "wind" | "light" | "poison";

export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export const COLORS = {
  background: "#0c0d16",
  surface: "#171a28",
  surfaceRaised: "#1f2236",
  border: "#2c2f45",

  text: "#f5f5fa",
  textMuted: "#a4a7c1",
  textSubtle: "#6b6e8a",

  primary: "#6366f1",
  primaryDark: "#a5b4fc",
  primaryLight: "#23264a",
  secondary: "#a3e635",
  secondaryDark: "#4d7c0f",

  success: "#4ade80",
  warning: "#f59e0b",
  danger: "#f87171",

  gold: "#fbbf24",
  energy: "#38bdf8",
  hp: "#f87171",
  xp: "#c084fc",
} as const;

export const ELEMENT_COLORS: Record<Element, string> = {
  fire: "#fb923c",
  water: "#60a5fa",
  grass: "#4ade80",
  thunder: "#facc15",
  dark: "#8b5cf6",
  ice: "#22d3ee",
  rock: "#a8a29e",
  wind: "#2dd4bf",
  light: "#fde68a",
  poison: "#d946ef",
};

/** Placeholder icon for each element, used where a monster image would go. */
export const ELEMENT_ICON: Record<Element, IconSpec> = {
  fire: { family: "ionicons", name: "flame" },
  water: { family: "ionicons", name: "water" },
  grass: { family: "ionicons", name: "leaf" },
  thunder: { family: "ionicons", name: "flash" },
  dark: { family: "ionicons", name: "moon" },
  ice: { family: "ionicons", name: "snow" },
  rock: { family: "material-community", name: "terrain" },
  wind: { family: "material-community", name: "weather-windy" },
  light: { family: "ionicons", name: "sunny" },
  poison: { family: "ionicons", name: "skull" },
};

export const RARITY_COLORS: Record<Rarity, string> = {
  common: "#9ca3af",
  uncommon: "#4ade80",
  rare: "#38bdf8",
  epic: "#c084fc",
  legendary: "#f59e0b",
};

/**
 * Blends two opaque hex colors into a third opaque hex color. Used instead of
 * an alpha (`${color}33`) tint anywhere a solid fill has to visually match
 * across adjacent shapes built from different primitives (e.g. `HexIconBadge`'s
 * border-triangle + background-rect construction) — translucent borders and
 * translucent background fills don't composite identically in RN, which shows
 * up as a visible seam between the two even when given the same rgba value.
 */
export function mixColors(base: string, tint: string, ratio: number): string {
  const b = parseInt(base.slice(1), 16);
  const t = parseInt(tint.slice(1), 16);
  const mix = (shift: number) => {
    const bc = (b >> shift) & 255;
    const tc = (t >> shift) & 255;
    return Math.round(bc + (tc - bc) * ratio);
  };
  const channel = (n: number) => n.toString(16).padStart(2, "0");
  return `#${channel(mix(16))}${channel(mix(8))}${channel(mix(0))}`;
}

/** Font family class names, matching the weights loaded in `_layout.tsx`. */
export const FONTS = {
  display: "font-display",
  displayBold: "font-display-bold",
  sans: "font-sans",
  sansMedium: "font-sans-medium",
  sansSemibold: "font-sans-semibold",
  sansBold: "font-sans-bold",
} as const;
