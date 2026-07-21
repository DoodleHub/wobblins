/* eslint-disable react-hooks/refs -- Animated.Value held in useRef is the standard RN pattern; it's a mutable animation handle, not a component ref, and reading it during render is how Animated interpolation works. */
import { Image } from "expo-image";
import { useEffect, useRef, type ReactNode } from "react";
import { Animated, Pressable, Text, View } from "react-native";

import { Icon } from "@/components/Icon";
import { TraitBadge } from "@/components/TraitBadge";
import { COLORS, ELEMENT_COLORS, ELEMENT_ICON, RARITY_COLORS, type Element, type Rarity } from "@/constants/theme";

type MonsterCardProps = {
  name: string;
  /** Omitted for species previews (e.g. starter selection) that have no owned instance yet. */
  level?: number;
  element: Element;
  rarity?: Rarity;
  /** Illustrated portrait from `SPECIES_ART`, shown instead of the element icon when available. */
  art?: number;
  /** "row" for compact list items, "center" for a larger hero presentation. */
  layout?: "row" | "center";
  selected?: boolean;
  eyebrow?: string;
  onPress?: () => void;
  children?: ReactNode;
};

/** A reusable monster identity card — avatar, name, level, element/rarity badges — used across Collection, Home, Starter Selection, and the Detail screen. */
export function MonsterCard({
  name,
  level,
  element,
  rarity,
  art,
  layout = "row",
  selected = false,
  eyebrow,
  onPress,
  children,
}: MonsterCardProps) {
  const isCenter = layout === "center";
  const elementColor = ELEMENT_COLORS[element];
  const glowColor = selected ? COLORS.primary : rarity ? RARITY_COLORS[rarity] : elementColor;

  const scale = useRef(new Animated.Value(1)).current;
  const entrance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(entrance, { toValue: 1, duration: 280, useNativeDriver: true }).start();
  }, [entrance]);

  const onPressIn = () =>
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 40, bounciness: 0 }).start();
  const onPressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 6 }).start();

  const avatar = (
    <View
      className={`items-center justify-center rounded-full border bg-background ${isCenter ? "h-20 w-20" : "h-14 w-14"}`}
      style={{ borderColor: `${elementColor}66` }}
    >
      {art ? (
        <Image source={art} style={{ width: "78%", height: "78%" }} contentFit="contain" />
      ) : (
        <Icon {...ELEMENT_ICON[element]} size={isCenter ? 32 : 22} color={elementColor} />
      )}
    </View>
  );

  const badges = (
    <View className={`gap-1.5 ${isCenter ? "flex-row justify-center" : "items-end"}`}>
      <TraitBadge label={element} color={elementColor} />
      {rarity && <TraitBadge label={rarity} color={RARITY_COLORS[rarity]} />}
    </View>
  );

  const identity = isCenter ? (
    <View className="items-center gap-3">
      {avatar}
      <View className="items-center gap-1">
        <Text className="font-display-bold text-xl text-text">{name}</Text>
        {level != null && <Text className="font-sans-medium text-sm text-text-muted">Level {level}</Text>}
      </View>
      {badges}
    </View>
  ) : (
    <View className="flex-row items-center gap-4">
      {avatar}
      <View className="flex-1 gap-1">
        <Text className="font-display-bold text-lg text-text">{name}</Text>
        {level != null && <Text className="font-sans-medium text-sm text-text-muted">Level {level}</Text>}
      </View>
      {badges}
    </View>
  );

  const card = (
    <Animated.View
      className={`gap-4 rounded-2xl border p-4 ${selected ? "bg-primary-light" : "bg-surface"}`}
      style={{
        borderColor: selected ? COLORS.primary : COLORS.border,
        opacity: entrance,
        transform: [
          { translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) },
          { scale },
        ],
        shadowColor: glowColor,
        shadowOpacity: selected ? 0.45 : 0.18,
        shadowRadius: selected ? 14 : 8,
        shadowOffset: { width: 0, height: 0 },
        elevation: selected ? 6 : 3,
      }}
    >
      {eyebrow && <Text className="font-display text-sm uppercase tracking-wide text-text-muted">{eyebrow}</Text>}
      {identity}
      {children}
    </Animated.View>
  );

  if (!onPress) return card;

  return (
    <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} accessibilityRole="button">
      {card}
    </Pressable>
  );
}
