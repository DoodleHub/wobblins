/* eslint-disable react-hooks/refs -- Animated.Value held in useRef is the standard RN pattern; it's a mutable animation handle, not a component ref, and reading it during render is how Animated interpolation works. */
import { useEffect, useRef } from "react";
import { Animated, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components/Icon";
import { COLORS } from "@/constants/theme";

type EvolutionBannerProps = {
  /** The species just evolved into, or null when nothing to celebrate. Each change replays the animation. */
  speciesName: string | null;
  onDismiss?: () => void;
};

/** A brief celebratory toast for a successful evolution — pops in, holds, then fades. Modeled on `LevelUpBanner`. */
export function EvolutionBanner({ speciesName, onDismiss }: EvolutionBannerProps) {
  const insets = useSafeAreaInsets();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (speciesName == null) return;

    anim.setValue(0);
    Animated.sequence([
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, friction: 5, tension: 60 }),
      Animated.delay(1800),
      Animated.timing(anim, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) onDismiss?.();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speciesName, anim]);

  if (speciesName == null) return null;

  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] });

  return (
    <View
      pointerEvents="none"
      className="absolute inset-x-0 items-center"
      style={{ top: insets.top + 8, zIndex: 50 }}
    >
      <Animated.View
        className="items-center gap-1 rounded-2xl border border-secondary/40 bg-surface px-5 py-3 shadow-lg"
        style={{ opacity: anim, transform: [{ scale }] }}
      >
        <Icon family="ionicons" name="sparkles" size={26} color={COLORS.secondary} />
        <Text className="font-display-bold text-base text-secondary">Evolution!</Text>
        <Text className="font-sans-semibold text-sm text-text">Evolved into {speciesName}!</Text>
      </Animated.View>
    </View>
  );
}
