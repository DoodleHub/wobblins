import { Pressable, Text, View } from "react-native";

import { Icon } from "@/components/Icon";
import {
  ACHIEVEMENT_METRIC_ICON,
  ACHIEVEMENT_TIER_COLORS,
  type AchievementMetric,
  type AchievementTier,
} from "@/constants/achievements";
import { COLORS, mixColors } from "@/constants/theme";

type AchievementBadgeProps = {
  metric: AchievementMetric;
  tier: AchievementTier;
  name: string;
  description: string;
  target: number;
  currentValue: number;
  unlocked: boolean;
  rewardEssence: number;
  claimed: boolean;
  onClaim?: () => void;
  claiming?: boolean;
};

/** A single achievement tile — tinted by tier once unlocked, dimmed with a fill bar + "current/target" readout while in progress, with a Claim button once unlocked and not yet claimed. */
export function AchievementBadge({
  metric,
  tier,
  name,
  description,
  target,
  currentValue,
  unlocked,
  rewardEssence,
  claimed,
  onClaim,
  claiming = false,
}: AchievementBadgeProps) {
  const tierColor = ACHIEVEMENT_TIER_COLORS[tier];
  const color = unlocked ? tierColor : COLORS.textSubtle;
  const progress = Math.min(currentValue, target);
  const percent = target > 0 ? (progress / target) * 100 : 0;
  const claimable = unlocked && !claimed;

  return (
    <View
      className="items-center gap-2 rounded-2xl border p-3"
      style={{
        borderColor: unlocked ? `${tierColor}55` : COLORS.border,
        backgroundColor: unlocked ? mixColors(COLORS.surface, tierColor, 0.12) : COLORS.surface,
      }}
    >
      <View
        className="h-12 w-12 items-center justify-center rounded-full border"
        style={{
          borderColor: `${color}66`,
          backgroundColor: unlocked ? `${tierColor}22` : "transparent",
        }}
      >
        <Icon {...ACHIEVEMENT_METRIC_ICON[metric]} size={22} color={color} />
      </View>
      <Text className="text-center font-display-bold text-xs text-text" numberOfLines={1}>
        {name}
      </Text>
      <Text className="text-center font-sans text-[10px] text-text-subtle" numberOfLines={2}>
        {description}
      </Text>
      <View className="h-1.5 w-full overflow-hidden rounded-full bg-border">
        <View className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: tierColor }} />
      </View>
      <View className="flex-row items-center gap-1">
        <Icon family="ionicons" name="flash" size={10} color={COLORS.essence} />
        <Text className="font-sans-semibold text-[10px]" style={{ color: COLORS.essence }}>
          {rewardEssence}
        </Text>
      </View>
      {claimable ? (
        <Pressable
          onPress={onClaim}
          disabled={claiming}
          accessibilityRole="button"
          className="w-full items-center rounded-lg py-1.5"
          style={{ backgroundColor: tierColor, opacity: claiming ? 0.6 : 1 }}
        >
          <Text className="font-sans-bold text-[10px] text-white">
            {claiming ? "Claiming…" : "Claim"}
          </Text>
        </Pressable>
      ) : (
        <Text className="font-sans-semibold text-[10px]" style={{ color }}>
          {claimed ? "Claimed" : `${progress}/${target}`}
        </Text>
      )}
    </View>
  );
}
