import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { AchievementBadge } from "@/components/AchievementBadge";
import { Icon } from "@/components/Icon";
import { LoadingScreen } from "@/components/LoadingScreen";
import { RewardToast, type RewardToastData } from "@/components/RewardToast";
import type { AchievementMetric, AchievementTier } from "@/constants/achievements";
import { COLORS } from "@/constants/theme";
import { useClaimAchievementReward, usePlayerAchievements } from "@/hooks/useAchievements";
import { useSupabase } from "@/supabase/SupabaseProvider";
import { getErrorMessage } from "@/utils/errors";

export default function AchievementsScreen() {
  const router = useRouter();
  const { session } = useSupabase();
  const playerId = session?.user.id;

  const { data: achievements, isPending, error } = usePlayerAchievements(playerId);
  const claimAchievementReward = useClaimAchievementReward(playerId);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [toast, setToast] = useState<RewardToastData | null>(null);

  const unlockedCount = (achievements ?? []).filter((a) => a.unlocked).length;

  const onClaim = (achievementId: string, name: string) => {
    setClaimError(null);
    setClaimingId(achievementId);
    claimAchievementReward.mutate(achievementId, {
      onSuccess: (result) => {
        setToast({
          icon: { family: "ionicons", name: "flash" },
          title: `${name} Claimed!`,
          subtitle: `+${result.essence_granted} essence`,
        });
      },
      onError: (err) => setClaimError(getErrorMessage(err)),
      onSettled: () => setClaimingId(null),
    });
  };

  return (
    <View className="flex-1 bg-background">
      <RewardToast reward={toast} offsetTop={76} />
      <ScrollView className="flex-1" contentContainerClassName="w-full min-w-0 flex-grow gap-6 px-6 pb-8 pt-16">
        <View className="flex-row items-center justify-between">
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            className="h-10 w-10 items-center justify-center rounded-full border"
            style={{ borderColor: COLORS.border, backgroundColor: COLORS.surface }}
          >
            <Icon family="ionicons" name="chevron-back" size={20} color={COLORS.text} />
          </Pressable>
        </View>

        <View className="gap-1">
          <Text className="font-display-bold text-3xl text-text">Achievements</Text>
          <Text className="font-sans-medium text-sm text-text-muted">
            {unlockedCount}/{achievements?.length ?? 0} unlocked
          </Text>
        </View>

        {isPending ? (
          <LoadingScreen message="Loading achievements…" />
        ) : error ? (
          <Text className="font-sans-medium text-sm text-danger">{getErrorMessage(error)}</Text>
        ) : (
          <View className="flex-row flex-wrap justify-between gap-y-3">
            {(achievements ?? []).map((achievement) => (
              <View key={achievement.id} style={{ width: "31%" }}>
                <AchievementBadge
                  metric={achievement.metric as AchievementMetric}
                  tier={achievement.tier as AchievementTier}
                  name={achievement.name}
                  description={achievement.description}
                  target={achievement.target}
                  currentValue={achievement.current_value}
                  unlocked={achievement.unlocked}
                  rewardEssence={achievement.reward_essence}
                  claimed={achievement.claimed}
                  claiming={claimingId === achievement.id && claimAchievementReward.isPending}
                  onClaim={() => onClaim(achievement.id, achievement.name)}
                />
              </View>
            ))}
          </View>
        )}

        {claimError && <Text className="font-sans-medium text-sm text-danger">{claimError}</Text>}
      </ScrollView>
    </View>
  );
}
