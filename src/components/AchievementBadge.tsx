import { Pressable, Text, View } from "react-native";

import { Icon } from "@/components/Icon";
import { ACHIEVEMENT_METRIC_ICON, type AchievementMetric, type AchievementTier } from "@/constants/achievements";
import { COLORS } from "@/constants/theme";

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

/** A single achievement tile — same muted styling whether in progress or completed, with a gold fill bar + "current/target" readout, and a Claim button once unlocked and not yet claimed. */
export function AchievementBadge({
  metric,
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
  const color = COLORS.textSubtle;
  const progress = Math.min(currentValue, target);
  const percent = target > 0 ? (progress / target) * 100 : 0;
  const claimable = unlocked && !claimed;

  return (
    <View
      className="items-center gap-2 rounded-2xl border p-3"
      style={{ borderColor: COLORS.border, backgroundColor: COLORS.surface }}
    >
      <View
        className="h-12 w-12 items-center justify-center rounded-full border"
        style={{ borderColor: `${color}66`, backgroundColor: "transparent" }}
      >
        <Icon {...ACHIEVEMENT_METRIC_ICON[metric]} size={22} color={color} />
      </View>
      <Text className="text-center font-display-bold text-xs text-text" numberOfLines={1}>
        {name}
      </Text>
      <Text
        className="text-center font-sans text-[10px] text-text-subtle"
        numberOfLines={2}
        style={{ lineHeight: 14, height: 28 }}
      >
        {description}
      </Text>
      <View className="h-1.5 w-full overflow-hidden rounded-full bg-border">
        <View className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: COLORS.gold }} />
      </View>
      <View className="flex-row items-center gap-1">
        <Icon family="ionicons" name="flash" size={10} color={COLORS.essence} />
        <Text className="font-sans-semibold text-[10px]" style={{ color: COLORS.essence }}>
          {rewardEssence}
        </Text>
      </View>
      <View
        className="w-full items-center rounded-lg border"
        style={{ borderColor: claimable ? COLORS.border : "transparent" }}
      >
        {claimable ? (
          <Pressable
            onPress={onClaim}
            disabled={claiming}
            accessibilityRole="button"
            className="w-full items-center py-1.5"
            style={{ opacity: claiming ? 0.6 : 1 }}
          >
            <Text className="font-sans-bold text-[10px] text-text">
              {claiming ? "Claiming…" : "Claim"}
            </Text>
          </Pressable>
        ) : (
          <Text className="py-1.5 font-sans-semibold text-[10px]" style={{ color }}>
            {claimed ? "Claimed" : `${progress}/${target}`}
          </Text>
        )}
      </View>
    </View>
  );
}
