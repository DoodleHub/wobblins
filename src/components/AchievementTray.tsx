/* eslint-disable react-hooks/refs -- Animated.Value held in useRef is the standard RN pattern; it's a mutable animation handle, not a component ref, and reading it during render is how Animated interpolation works. */
import { useEffect, useRef, useState } from "react";
import { Animated, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HexIconBadge } from "@/components/HexBadge";
import { Icon, type IconSpec } from "@/components/Icon";
import { COLORS, mixColors } from "@/constants/theme";
import type { Achievement } from "@/supabase/achievements";

const BACKDROP_OPACITY = 0.6;
const HIDDEN_TRANSLATE_Y = 400;

type AchievementTrayProps = {
  achievement: Achievement | null;
  unlocked: boolean;
  current: number;
  target: number;
  percent: number;
  onClose: () => void;
};

/**
 * Full-detail view for a tapped achievement card, since the grid tiles are
 * too small to show a whole description without truncating it.
 *
 * Backdrop fade and panel slide are animated independently rather than via
 * Modal's `animationType="slide"` — that animates the whole Modal content
 * together, so the dimmed backdrop visibly slides up with the panel instead
 * of just appearing behind it, which reads as a UI glitch.
 */
export function AchievementTray({ achievement, unlocked, current, target, percent, onClose }: AchievementTrayProps) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [displayed, setDisplayed] = useState<Achievement | null>(null);
  const translateY = useRef(new Animated.Value(HIDDEN_TRANSLATE_Y)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  if (achievement && achievement.id !== displayed?.id) {
    setDisplayed(achievement);
  }
  if (achievement && !open) {
    setOpen(true);
  }

  useEffect(() => {
    if (achievement) {
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: BACKDROP_OPACITY, duration: 200, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, speed: 20, bounciness: 4 }),
      ]).start();
    } else if (open) {
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: HIDDEN_TRANSLATE_Y, duration: 180, useNativeDriver: true }),
      ]).start(({ finished }) => finished && setOpen(false));
    }
  }, [achievement, open, translateY, backdropOpacity]);

  if (!open || !displayed) {
    return null;
  }

  const icon = { family: displayed.icon_family, name: displayed.icon_name } as IconSpec;
  const fillColor = unlocked ? COLORS.gold : COLORS.primary;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: "#000", opacity: backdropOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View
        className="absolute bottom-0 left-0 right-0 rounded-t-3xl border border-b-0 border-border bg-surface p-5"
        style={{ paddingBottom: insets.bottom + 20, transform: [{ translateY }] }}
      >
        <View className="mb-4 h-1 w-10 self-center rounded-full bg-border" />

        <View className="items-center gap-3">
          <View className="relative">
            <HexIconBadge
              size={64}
              color={unlocked ? mixColors(COLORS.surfaceRaised, COLORS.gold, 0.35) : COLORS.surfaceRaised}
              glow={unlocked}
            >
              <Icon {...icon} size={28} color={unlocked ? COLORS.gold : COLORS.textSubtle} />
            </HexIconBadge>
            {!unlocked && (
              <View className="absolute -bottom-1 -right-1 rounded-full bg-surface p-1">
                <Icon family="ionicons" name="lock-closed" size={13} color={COLORS.textSubtle} />
              </View>
            )}
          </View>

          <Text className="text-center font-display-bold text-lg text-text">{displayed.name}</Text>
          <Text className="text-center font-sans text-sm leading-5 text-text-muted">{displayed.description}</Text>
        </View>

        <View className="mt-5 gap-1.5">
          <View className="flex-row items-center justify-between">
            <Text className="font-sans-semibold text-xs text-text-subtle">{unlocked ? "Unlocked" : "Progress"}</Text>
            <Text className="font-sans-semibold text-xs text-text-subtle">
              {Math.min(current, target)} / {target}
            </Text>
          </View>
          <View className="h-1.5 w-full overflow-hidden rounded-full bg-border">
            <View className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: fillColor }} />
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
}
