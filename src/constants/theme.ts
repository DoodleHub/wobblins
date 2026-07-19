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
 * whenever the value isn't data-driven.
 */

export type Element = "fire" | "ice" | "water" | "nature" | "shadow";

export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export const COLORS = {
  background: "#f4f5fa",
  surface: "#ffffff",
  surfaceRaised: "#ffffff",
  border: "#e1e3ef",

  text: "#12131c",
  textMuted: "#585b72",
  textSubtle: "#8a8da3",

  primary: "#4f46e5",
  primaryDark: "#4338ca",
  primaryLight: "#e0e7ff",
  secondary: "#84cc16",
  secondaryDark: "#4d7c0f",

  success: "#16a34a",
  warning: "#d97706",
  danger: "#dc2626",

  gold: "#b45309",
  energy: "#0284c7",
  hp: "#dc2626",
  xp: "#7c3aed",
} as const;

export const ELEMENT_COLORS: Record<Element, string> = {
  fire: "#ea580c",
  ice: "#0891b2",
  water: "#1d4ed8",
  nature: "#15803d",
  shadow: "#6b21a8",
};

/** Tailwind class names for element accents, keyed for dynamic lookup. */
export const ELEMENT_CLASSNAMES: Record<
  Element,
  { bg: string; text: string; border: string }
> = {
  fire: {
    bg: "bg-element-fire",
    text: "text-element-fire",
    border: "border-element-fire",
  },
  ice: {
    bg: "bg-element-ice",
    text: "text-element-ice",
    border: "border-element-ice",
  },
  water: {
    bg: "bg-element-water",
    text: "text-element-water",
    border: "border-element-water",
  },
  nature: {
    bg: "bg-element-nature",
    text: "text-element-nature",
    border: "border-element-nature",
  },
  shadow: {
    bg: "bg-element-shadow",
    text: "text-element-shadow",
    border: "border-element-shadow",
  },
};

/** Placeholder emoji art for each element, used where a monster image would go. */
export const ELEMENT_EMOJI: Record<Element, string> = {
  fire: "🔥",
  ice: "❄️",
  water: "🌊",
  nature: "🌿",
  shadow: "🌑",
};

export const RARITY_COLORS: Record<Rarity, string> = {
  common: "#6b7280",
  uncommon: "#16a34a",
  rare: "#2563eb",
  epic: "#9333ea",
  legendary: "#c2410c",
};

/** Tailwind class names for rarity accents, keyed for dynamic lookup. */
export const RARITY_CLASSNAMES: Record<
  Rarity,
  { bg: string; text: string; border: string }
> = {
  common: {
    bg: "bg-rarity-common",
    text: "text-rarity-common",
    border: "border-rarity-common",
  },
  uncommon: {
    bg: "bg-rarity-uncommon",
    text: "text-rarity-uncommon",
    border: "border-rarity-uncommon",
  },
  rare: {
    bg: "bg-rarity-rare",
    text: "text-rarity-rare",
    border: "border-rarity-rare",
  },
  epic: {
    bg: "bg-rarity-epic",
    text: "text-rarity-epic",
    border: "border-rarity-epic",
  },
  legendary: {
    bg: "bg-rarity-legendary",
    text: "text-rarity-legendary",
    border: "border-rarity-legendary",
  },
};

/** Font family class names, matching the weights loaded in `_layout.tsx`. */
export const FONTS = {
  display: "font-display",
  displayBold: "font-display-bold",
  sans: "font-sans",
  sansMedium: "font-sans-medium",
  sansSemibold: "font-sans-semibold",
  sansBold: "font-sans-bold",
} as const;
