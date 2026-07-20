/* eslint-disable react-hooks/refs -- Animated.Value held in useRef is the standard RN pattern; it's a mutable animation handle, not a component ref, and reading it during render is how Animated interpolation works. */
import { useEffect, useRef } from "react";
import { Animated, Text, View } from "react-native";

type LevelUpBannerProps = {
  /** The new level reached, or null/undefined when nothing to celebrate. Each change replays the animation. */
  level: number | null | undefined;
  label?: string;
};

/** A brief celebratory toast that pops in, holds, then fades — driven purely by `level` changing. */
export function LevelUpBanner({ level, label = "Level Up!" }: LevelUpBannerProps) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (level == null) return;

    anim.setValue(0);
    Animated.sequence([
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, friction: 5, tension: 60 }),
      Animated.delay(1400),
      Animated.timing(anim, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start();
  }, [level, anim]);

  if (level == null) return null;

  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] });

  return (
    <View
      pointerEvents="none"
      className="absolute inset-x-0 items-center"
      style={{ top: 8, zIndex: 50 }}
    >
      <Animated.View
        className="items-center gap-1 rounded-2xl border border-xp/40 bg-surface px-5 py-3 shadow-lg"
        style={{ opacity: anim, transform: [{ scale }] }}
      >
        <Text className="text-2xl">⭐</Text>
        <Text className="font-display-bold text-base text-xp">{label}</Text>
        <Text className="font-sans-semibold text-sm text-text">Level {level}</Text>
      </Animated.View>
    </View>
  );
}
