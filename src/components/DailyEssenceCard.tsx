import { Pressable, Text, View } from "react-native";

import { Icon } from "@/components/Icon";
import { COLORS } from "@/constants/theme";

type DailyEssenceCardProps = {
  claimed: boolean;
  claiming: boolean;
  amount?: number;
  onPress: () => void;
};

/** Home-screen section for the once-per-day essence claim — a full row card, styled after the achievement/egg/offer nudge rows, rather than a header button. */
export function DailyEssenceCard({ claimed, claiming, amount, onPress }: DailyEssenceCardProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={claimed || claiming}
      accessibilityRole="button"
      accessibilityLabel={claimed ? "Daily essence already claimed" : "Claim daily essence"}
      className="flex-row items-center gap-3 rounded-2xl border p-3.5"
      style={{
        borderColor: claimed ? COLORS.border : `${COLORS.essence}40`,
        backgroundColor: claimed ? COLORS.surface : `${COLORS.essence}0f`,
        opacity: claimed || claiming ? 0.7 : 1,
      }}
    >
      <View className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: `${COLORS.essence}1f` }}>
        <Icon
          family="ionicons"
          name={claimed ? "checkmark-circle" : "gift-outline"}
          size={18}
          color={claimed ? COLORS.textMuted : COLORS.essence}
        />
      </View>
      <View className="flex-1 gap-0.5">
        <Text className="font-sans-semibold text-sm text-text">Daily Essence</Text>
        <Text className="font-sans text-xs text-text-muted">
          {claimed
            ? "Come back tomorrow for more."
            : amount != null
              ? `Claim your free ${amount} essence.`
              : "Claim your free daily essence."}
        </Text>
      </View>
      {claimed ? (
        <Text className="font-sans-semibold text-xs" style={{ color: COLORS.textMuted }}>
          Claimed
        </Text>
      ) : (
        <View className="flex-row items-center gap-1 rounded-full px-2.5 py-1" style={{ backgroundColor: `${COLORS.essence}22` }}>
          <Icon family="ionicons" name="flash" size={12} color={COLORS.essence} />
          <Text className="font-sans-bold text-xs" style={{ color: COLORS.essence }}>
            {amount != null ? `+${amount}` : "Claim"}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
