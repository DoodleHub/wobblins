import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Icon } from "@/components/Icon";
import { TraitBadge } from "@/components/TraitBadge";
import { SPECIES_ART_ASPECT } from "@/constants/speciesArt";
import { COLORS, ELEMENT_COLORS, ELEMENT_ICON, mixColors, RARITY_COLORS, type Element, type Rarity } from "@/constants/theme";

// See the aspect-ratio comment inline below for why the portrait box isn't
// just a fixed square. This is the only image in the hero, so both
// dimensions are free to grow together (preserving aspect ratio) up to this
// bounding box — whichever dimension the image's aspect ratio hits first
// determines the final size, the same way a browser sizes a responsive
// `object-fit: contain` image against a max-width/max-height box.
const HERO_PORTRAIT_MAX_WIDTH = 300;
const HERO_PORTRAIT_MAX_HEIGHT = 260;
const HERO_PORTRAIT_MIN_HEIGHT = 168;

/**
 * The large glowing hero card used on the Wobblin Detail screen — portrait
 * with an element-tinted glow, name + "Lv. N" pill, an optional nicknamed
 * subtitle, and element/rarity badges. Reused anywhere else a single
 * Wobblin needs the same showcase treatment (e.g. the trade flow's
 * list/offer/respond screens), which is why the Detail screen's own extras
 * (an acquired-date chip, the XP bar) are optional props/children rather
 * than baked in.
 */
export function MonsterHero({
  name,
  speciesName,
  nicknamed,
  element,
  rarity,
  art,
  level,
  caughtOn,
  children,
}: {
  name: string;
  speciesName: string;
  nicknamed: boolean;
  element: Element;
  rarity: Rarity;
  art?: number;
  level: number;
  /** Extra chip shown alongside the element/rarity badges — e.g. the Detail screen's "acquired on" date. Omitted for a plain showcase. */
  caughtOn?: string;
  children?: ReactNode;
}) {
  const elementColor = ELEMENT_COLORS[element];
  const rarityColor = RARITY_COLORS[rarity];
  const heroTint = mixColors(COLORS.surface, elementColor, 0.2);

  // Source portraits aren't all drawn on the same canvas shape (gen-2 art
  // in particular skews wider than gen-1's near-square crops), so a fixed
  // box would letterbox wide portraits far more than square ones under
  // contentFit="contain", making them read as smaller even though every
  // portrait is cropped equally tight to its subject. This is the only
  // image in the hero, so instead of pinning height and only letting
  // width flex (which under-sizes anything below the box's own aspect
  // ratio), both dimensions grow together — preserving the portrait's
  // aspect ratio — up to whichever bound (width or height) it hits first,
  // the same way a browser sizes `object-fit: contain` against a
  // max-width/max-height box.
  const aspect = art ? (SPECIES_ART_ASPECT[speciesName] ?? 1) : 1;
  let portraitWidth = HERO_PORTRAIT_MAX_HEIGHT * aspect;
  let portraitHeight = HERO_PORTRAIT_MAX_HEIGHT;
  if (portraitWidth > HERO_PORTRAIT_MAX_WIDTH) {
    portraitWidth = HERO_PORTRAIT_MAX_WIDTH;
    portraitHeight = HERO_PORTRAIT_MAX_WIDTH / aspect;
  }
  if (portraitHeight < HERO_PORTRAIT_MIN_HEIGHT) {
    portraitHeight = HERO_PORTRAIT_MIN_HEIGHT;
    portraitWidth = HERO_PORTRAIT_MIN_HEIGHT * aspect;
  }

  return (
    <View
      className="items-center gap-4 overflow-hidden rounded-3xl border px-6 pb-6 pt-9"
      style={{ borderColor: `${rarityColor}4d` }}
    >
      <LinearGradient
        colors={[heroTint, COLORS.surface]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={{ width: portraitWidth, height: portraitHeight }} className="items-center justify-center">
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            width: 168,
            height: 168,
            borderRadius: 84,
            backgroundColor: elementColor,
            opacity: 0.35,
            shadowColor: elementColor,
            shadowOpacity: 0.9,
            shadowRadius: 44,
            shadowOffset: { width: 0, height: 0 },
            elevation: 8,
          }}
        />
        {art ? (
          <Image source={art} style={{ width: "100%", height: "100%" }} contentFit="contain" />
        ) : (
          <View
            className="items-center justify-center rounded-full border-2 bg-background"
            style={{ width: 168, height: 168, borderColor: rarityColor }}
          >
            <Icon {...ELEMENT_ICON[element]} size={64} color={elementColor} />
          </View>
        )}
      </View>

      <View className="items-center gap-1">
        <View className="flex-row items-center gap-2">
          <Text className="text-center font-display-bold text-2xl text-text">{name}</Text>
          <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: `${COLORS.xp}26` }}>
            <Text className="font-display-bold text-xs" style={{ color: COLORS.xp }}>
              Lv. {level}
            </Text>
          </View>
        </View>
        {nicknamed && <Text className="font-sans-medium text-sm text-text-muted">{speciesName}</Text>}
      </View>

      <View className="flex-row flex-wrap items-center justify-center gap-2">
        <TraitBadge label={element} color={elementColor} />
        <TraitBadge label={rarity} color={rarityColor} />
        {caughtOn && (
          <View
            className="flex-row items-center gap-1 rounded-full border px-2.5 py-1"
            style={{ borderColor: `${COLORS.textSubtle}33`, backgroundColor: `${COLORS.textSubtle}14` }}
          >
            <Icon family="material-community" name="calendar-blank" size={11} color={COLORS.textSubtle} />
            <Text className="font-sans-semibold text-xs text-text-subtle">{caughtOn}</Text>
          </View>
        )}
      </View>

      {children}
    </View>
  );
}
