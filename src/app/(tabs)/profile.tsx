import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { AchievementBadge } from "@/components/AchievementBadge";
import { Button } from "@/components/Button";
import { Icon, type IconSpec } from "@/components/Icon";
import { LoadingScreen } from "@/components/LoadingScreen";
import { RewardToast, type RewardToastData } from "@/components/RewardToast";
import { Skeleton } from "@/components/Skeleton";
import type { AchievementMetric, AchievementTier } from "@/constants/achievements";
import { PLAYER_PORTRAIT, PROFILE_BANNER } from "@/constants/avatars";
import { COLORS } from "@/constants/theme";
import { useClaimAchievementReward, usePlayerAchievements } from "@/hooks/useAchievements";
import { usePlayer } from "@/hooks/usePlayer";
import { useScrollScreenContentStyle } from "@/hooks/useTabBarClearance";
import { usePlayerWobblins } from "@/hooks/useWobblins";
import { signOut } from "@/supabase/auth";
import { useSupabase } from "@/supabase/SupabaseProvider";
import { getErrorMessage } from "@/utils/errors";

export default function ProfileScreen() {
  const router = useRouter();
  const { session } = useSupabase();
  const playerId = session?.user.id;

  const { data: player, isPending, error } = usePlayer(playerId);
  const { data: wobblins } = usePlayerWobblins(playerId);
  const speciesDiscovered = new Set((wobblins ?? []).map((w) => w.species_id)).size;

  const { data: achievements, isPending: achievementsPending } = usePlayerAchievements(playerId);
  const claimAchievementReward = useClaimAchievementReward(playerId);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [toast, setToast] = useState<RewardToastData | null>(null);
  const unlockedCount = (achievements ?? []).filter((a) => a.unlocked).length;
  const previewAchievements = (achievements ?? []).slice(0, 6);

  const onClaim = (achievementId: string, name: string) => {
    setClaimingId(achievementId);
    claimAchievementReward.mutate(achievementId, {
      onSuccess: (result) => {
        setToast({
          icon: { family: "ionicons", name: "flash" },
          title: `${name} Claimed!`,
          subtitle: `+${result.essence_granted} essence`,
        });
      },
      onSettled: () => setClaimingId(null),
    });
  };

  const [signingOut, setSigningOut] = useState(false);
  const contentStyle = useScrollScreenContentStyle(24, 1);

  const onSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      router.replace("/login");
    } finally {
      setSigningOut(false);
    }
  };

  if (isPending) {
    return <LoadingScreen message="Loading profile…" />;
  }

  if (error || !player) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-background px-8">
        <Text className="font-sans-medium text-sm text-danger">
          {error ? getErrorMessage(error) : "Profile not found."}
        </Text>
      </View>
    );
  }

  const memberSince = new Date(player.created_at).toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });

  return (
    <View className="flex-1 bg-background">
      <RewardToast reward={toast} offsetTop={76} />
      <ScrollView className="flex-1" contentContainerStyle={contentStyle}>
        <ProfileBanner username={player.username} memberSince={memberSince} />

        <View className="flex-row items-center rounded-2xl border border-border bg-surface p-4">
          <StatColumn
            icon={{ family: "material-community", name: "paw" }}
            value={String(wobblins?.length ?? 0)}
            label={"Wobblins\nCollected"}
          />
          <View className="h-10 w-px bg-border" />
          <StatColumn
            icon={{ family: "ionicons", name: "flash" }}
            value={String(player.essence_balance)}
            label={"Essence\nBalance"}
          />
          <View className="h-10 w-px bg-border" />
          <StatColumn
            icon={{ family: "ionicons", name: "sparkles" }}
            value={String(speciesDiscovered)}
            label={"Species\nDiscovered"}
          />
        </View>

        <View className="gap-3">
          <View className="flex-row items-center justify-between">
            <Text className="font-display-bold text-lg text-text">Achievements</Text>
            <View className="flex-row items-center gap-3">
              <Text className="font-sans-medium text-sm text-text-muted">
                {unlockedCount}/{achievements?.length ?? 0}
              </Text>
              <Pressable
                onPress={() => router.push("/achievements")}
                accessibilityRole="button"
                className="flex-row items-center gap-0.5"
              >
                <Text className="font-sans-semibold text-sm text-primary-dark">View All</Text>
                <Icon family="ionicons" name="chevron-forward" size={14} color={COLORS.primaryDark} />
              </Pressable>
            </View>
          </View>

          {achievementsPending ? (
            <View className="flex-row flex-wrap justify-between gap-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-28" style={{ width: "31%" }} />
              ))}
            </View>
          ) : (
            <View className="flex-row flex-wrap justify-between gap-y-3">
              {previewAchievements.map((achievement) => (
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
        </View>

        <Button label="Sign Out" variant="secondary" onPress={onSignOut} loading={signingOut} />
      </ScrollView>
    </View>
  );
}

function ProfileBanner({ username, memberSince }: { username: string; memberSince: string }) {
  return (
    <View className="overflow-hidden rounded-2xl border border-border">
      <Image source={PROFILE_BANNER} style={StyleSheet.absoluteFill} contentFit="cover" />
      <LinearGradient
        colors={[COLORS.surface, `${COLORS.surface}cc`, "transparent"]}
        locations={[0, 0.45, 1]}
        start={{ x: 0, y: 0.3 }}
        end={{ x: 1, y: 0.3 }}
        style={StyleSheet.absoluteFill}
      />
      <View className="gap-4 p-4">
        <View className="flex-row items-start justify-between">
          <View className="flex-row items-center gap-3">
            <View>
              <Image
                source={PLAYER_PORTRAIT}
                style={{ width: 72, height: 72, borderRadius: 36 }}
                contentFit="cover"
              />
              <View className="absolute -bottom-1 -right-1 h-6 w-6 items-center justify-center rounded-full border border-border bg-surface-raised">
                <Icon family="ionicons" name="pencil" size={12} color={COLORS.textMuted} />
              </View>
            </View>
            <View className="gap-0.5">
              <Text className="font-display-bold text-2xl text-text">{username}</Text>
              <Text className="font-sans-medium text-sm text-text-muted">Joined {memberSince}</Text>
            </View>
          </View>
          <View className="h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface-raised">
            <Icon family="ionicons" name="settings-sharp" size={17} color={COLORS.textMuted} />
          </View>
        </View>
      </View>
    </View>
  );
}

function StatColumn({ icon, value, label }: { icon: IconSpec; value: string; label: string }) {
  return (
    <View className="flex-1 items-center gap-1">
      <Icon {...icon} size={24} color={COLORS.textMuted} />
      <Text className="font-display-bold text-xl text-text">{value}</Text>
      <Text className="text-center font-sans-medium text-xs text-text-subtle">{label}</Text>
    </View>
  );
}
