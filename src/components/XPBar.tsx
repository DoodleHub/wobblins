/* eslint-disable react-hooks/refs -- Animated.Value held in useRef is the standard RN pattern; it's a mutable animation handle, not a component ref, and reading it during render is how Animated interpolation works. */
import { useEffect, useRef } from "react";
import { Animated, Text, View } from "react-native";

import { COLORS } from "@/constants/theme";
import { getXpProgress } from "@/utils/xp";

type XPBarProps = {
  level: number;
  experience: number;
  color?: string;
  /** Fires once per level increase, after the fill animation starts. */
  onLevelUp?: (newLevel: number) => void;
  /** Hides the "Level N" label, for contexts that already show it nearby. */
  showLevel?: boolean;
};

/**
 * XP progress bar scoped to the current level. When `level` increases
 * between renders (e.g. a battle reward pushes XP past the threshold), it
 * fills to 100%, snaps back to empty, and refills to the new progress —
 * a "level up" beat — instead of just jumping straight to the new percent.
 */
export function XPBar({ level, experience, color = COLORS.xp, onLevelUp, showLevel = true }: XPBarProps) {
  const progress = getXpProgress(experience, level);

  const widthAnim = useRef(new Animated.Value(progress.percent)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const prevLevel = useRef(level);
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      prevLevel.current = level;
      widthAnim.setValue(progress.percent);
      return;
    }

    if (level > prevLevel.current) {
      onLevelUp?.(level);
      Animated.sequence([
        Animated.timing(widthAnim, { toValue: 100, duration: 300, useNativeDriver: false }),
        Animated.timing(widthAnim, { toValue: 0, duration: 0, useNativeDriver: false }),
        Animated.timing(widthAnim, { toValue: progress.percent, duration: 500, useNativeDriver: false }),
      ]).start();
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 200, useNativeDriver: false }),
        Animated.timing(glowAnim, { toValue: 0, duration: 700, useNativeDriver: false }),
      ]).start();
    } else {
      Animated.timing(widthAnim, { toValue: progress.percent, duration: 500, useNativeDriver: false }).start();
    }

    prevLevel.current = level;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, experience]);

  const width = widthAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
    extrapolate: "clamp",
  });
  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.7] });

  return (
    <View className="gap-1">
      <View className="flex-row items-center justify-between">
        {showLevel ? (
          <Text className="font-sans-medium text-xs text-text-muted">Level {level}</Text>
        ) : (
          <Text className="font-sans-medium text-xs text-text-muted">XP</Text>
        )}
        <Text className="font-sans-semibold text-xs text-text">
          {progress.xpIntoLevel}/{progress.xpForLevel}
        </Text>
      </View>
      <View className="h-2 w-full overflow-hidden rounded-full bg-border">
        <Animated.View className="h-full rounded-full" style={{ width, backgroundColor: color }} />
        <Animated.View
          pointerEvents="none"
          className="absolute inset-0 rounded-full bg-white"
          style={{ opacity: glowOpacity }}
        />
      </View>
    </View>
  );
}
