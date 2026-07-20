/* eslint-disable react-hooks/refs -- Animated.Value held in useRef is the standard RN pattern; it's a mutable animation handle, not a component ref, and reading it during render is how Animated interpolation works. */
import { useEffect, useRef } from "react";
import { Animated, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { COLORS } from "@/constants/theme";

import { Icon, type IconSpec } from "./Icon";

export type RewardToastData = {
  icon: IconSpec;
  title: string;
  subtitle?: string;
  goldAwarded?: number;
};

/**
 * A brief celebratory toast for achievement unlocks and the daily login
 * reward — same pop-in/hold/fade animation as `LevelUpBanner`, generalized
 * to an icon/title/subtitle/gold shape so both flows share one component
 * instead of near-duplicate banners.
 */
/**
 * `offsetTop` is extra space *below the safe area* — use it to stack this
 * under another absolute-positioned toast (e.g. `LevelUpBanner`) instead of
 * overlapping it. The safe-area inset itself is always added on top, so this
 * never collides with the status bar/notch regardless of the screen's own padding.
 */
export function RewardToast({
  reward,
  offsetTop = 8,
}: {
  reward: RewardToastData | null;
  offsetTop?: number;
}) {
  const insets = useSafeAreaInsets();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!reward) return;

    anim.setValue(0);
    Animated.sequence([
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, friction: 5, tension: 60 }),
      Animated.delay(1800),
      Animated.timing(anim, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start();
  }, [reward, anim]);

  if (!reward) return null;

  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] });

  return (
    <View
      pointerEvents="none"
      className="absolute inset-x-0 items-center"
      style={{ top: insets.top + offsetTop, zIndex: 50 }}
    >
      <Animated.View
        className="flex-row items-center gap-3 rounded-2xl border border-gold/40 bg-surface px-5 py-3 shadow-lg"
        style={{ opacity: anim, transform: [{ scale }] }}
      >
        <Icon {...reward.icon} size={26} color={COLORS.gold} />
        <View className="gap-0.5">
          <Text className="font-display-bold text-base text-text">{reward.title}</Text>
          {reward.subtitle && (
            <Text className="font-sans-medium text-xs text-text-muted">{reward.subtitle}</Text>
          )}
        </View>
        {!!reward.goldAwarded && (
          <Text className="font-sans-bold text-sm text-gold">+{reward.goldAwarded}g</Text>
        )}
      </Animated.View>
    </View>
  );
}
