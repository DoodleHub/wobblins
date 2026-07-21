import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { HexBadge, HexIconBadge } from "@/components/HexBadge";
import { Icon, type IconSpec } from "@/components/Icon";
import { LoadingScreen } from "@/components/LoadingScreen";
import { PLAYER_PORTRAIT, PROFILE_BANNER } from "@/constants/avatars";
import { SPECIES_ART } from "@/constants/speciesArt";
import { COLORS, ELEMENT_COLORS, ELEMENT_ICON, mixColors, type Element } from "@/constants/theme";
import { useAchievements, usePlayerAchievements } from "@/hooks/useAchievements";
import { usePlayerBattles } from "@/hooks/useBattle";
import { usePlayer } from "@/hooks/usePlayer";
import { useScrollScreenContentStyle } from "@/hooks/useTabBarClearance";
import { usePlayerWobblins } from "@/hooks/useWobblins";
import type { Achievement } from "@/supabase/achievements";
import { signOut } from "@/supabase/auth";
import { useSupabase } from "@/supabase/SupabaseProvider";
import { getAchievementProgress, type AchievementStats } from "@/utils/achievements";
import { buildRecentActivity, formatRelativeTime, type ActivityItem } from "@/utils/activity";
import { getErrorMessage } from "@/utils/errors";
import { getXpProgress } from "@/utils/xp";

const ENERGY_MAX = 50;

export default function ProfileScreen() {
  const router = useRouter();
  const { session } = useSupabase();
  const playerId = session?.user.id;

  const { data: player, isPending, error } = usePlayer(playerId);
  const { data: wobblins } = usePlayerWobblins(playerId);
  const { data: battles } = usePlayerBattles(playerId);
  const { data: achievements } = useAchievements();
  const { data: playerAchievements } = usePlayerAchievements(playerId);

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

  const unlockedIds = new Set(playerAchievements?.map((pa) => pa.achievement_id));
  const wobblinsOwned = wobblins?.length ?? 0;
  const battlesWon = battles?.filter((b) => b.winner === "player").length ?? 0;
  const stats: AchievementStats = {
    wobblinsOwned,
    battlesWon,
    playerLevel: player.level,
    loginStreak: player.login_streak,
  };
  const activity = buildRecentActivity(wobblins, battles);

  const memberSince = new Date(player.created_at).toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={contentStyle}>
      <ProfileBanner username={player.username} memberSince={memberSince} level={player.level} experience={player.experience} />

      <View className="flex-row items-center rounded-2xl border border-border bg-surface p-4">
        <StatColumn
          icon={{ family: "material-community", name: "paw" }}
          value={String(wobblinsOwned)}
          label={"Wobblins\nCollected"}
        />
        <View className="h-10 w-px bg-border" />
        <StatColumn
          icon={{ family: "material-community", name: "gold" }}
          iconColor={COLORS.gold}
          value={player.gold.toLocaleString()}
          label={"Gold\nOwned"}
        />
        <View className="h-10 w-px bg-border" />
        <StatColumn
          icon={{ family: "ionicons", name: "flash" }}
          iconColor={COLORS.energy}
          value={`${player.energy}/${ENERGY_MAX}`}
          label={"Energy\nCapacity"}
        />
      </View>

      <View className="gap-3 rounded-2xl border border-border bg-surface p-4">
        <View className="flex-row items-center justify-between">
          <Text className="font-display text-sm uppercase tracking-wide text-text-muted">Achievements</Text>
          <Text className="font-sans-semibold text-sm text-primary-dark">View all</Text>
        </View>
        {achievements && achievements.length > 0 ? (
          <View className="flex-row flex-wrap gap-3">
            {achievements.map((achievement) => (
              <AchievementCard
                key={achievement.id}
                achievement={achievement}
                unlocked={unlockedIds.has(achievement.id)}
                stats={stats}
              />
            ))}
          </View>
        ) : (
          <Text className="font-sans text-sm text-text-subtle">Coming soon.</Text>
        )}
      </View>

      <View className="gap-3 rounded-2xl border border-border bg-surface p-4">
        <View className="flex-row items-center justify-between">
          <Text className="font-display text-sm uppercase tracking-wide text-text-muted">Recent Activity</Text>
          <Text className="font-sans-semibold text-sm text-primary-dark">View all</Text>
        </View>
        {activity.length > 0 ? (
          <View className="gap-2">
            {activity.map((item) => (
              <ActivityRow key={`${item.kind}-${item.id}`} item={item} />
            ))}
          </View>
        ) : (
          <Text className="font-sans text-sm text-text-subtle">
            No recent activity yet — go capture a Wobblin or fight a battle.
          </Text>
        )}
      </View>

      <Button label="Sign Out" variant="secondary" onPress={onSignOut} loading={signingOut} />
    </ScrollView>
  );
}

function ProfileBanner({
  username,
  memberSince,
  level,
  experience,
}: {
  username: string;
  memberSince: string;
  level: number;
  experience: number;
}) {
  const progress = getXpProgress(experience, level);

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

        <View className="gap-2">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <HexBadge value={level} size={36} />
              <Text className="font-sans-semibold text-sm text-primary-dark">Level {level}</Text>
            </View>
            <Text className="font-sans-semibold text-sm text-text">
              {progress.xpIntoLevel} / {progress.xpForLevel} XP
            </Text>
          </View>
          <View className="h-2 w-full overflow-hidden rounded-full bg-border">
            <View className="h-full rounded-full bg-primary" style={{ width: `${progress.percent}%` }} />
          </View>
        </View>
      </View>
    </View>
  );
}

function StatColumn({
  icon,
  iconColor,
  value,
  label,
}: {
  icon: IconSpec;
  iconColor?: string;
  value: string;
  label: string;
}) {
  return (
    <View className="flex-1 items-center gap-1">
      <Icon {...icon} size={24} color={iconColor ?? COLORS.textMuted} />
      <Text className="font-display-bold text-xl text-text">{value}</Text>
      <Text className="text-center font-sans-medium text-xs text-text-subtle">{label}</Text>
    </View>
  );
}

function AchievementCard({
  achievement,
  unlocked,
  stats,
}: {
  achievement: Achievement;
  unlocked: boolean;
  stats: AchievementStats;
}) {
  const icon = { family: achievement.icon_family, name: achievement.icon_name } as IconSpec;
  const progress = getAchievementProgress(achievement, stats, unlocked);
  const fillColor = unlocked ? COLORS.gold : COLORS.primary;

  return (
    <View
      className="w-[22%] items-center justify-between gap-1.5 rounded-xl border p-2 pb-3"
      style={{
        borderColor: unlocked ? `${COLORS.gold}66` : COLORS.border,
        backgroundColor: unlocked ? `${COLORS.gold}14` : "transparent",
      }}
    >
      <View className="items-center gap-1.5">
        <View className="relative">
          <HexIconBadge
            size={52}
            color={unlocked ? mixColors(COLORS.surfaceRaised, COLORS.gold, 0.35) : COLORS.surfaceRaised}
            glow={unlocked}
          >
            <Icon {...icon} size={22} color={unlocked ? COLORS.gold : COLORS.textSubtle} />
          </HexIconBadge>
          {!unlocked && (
            <View className="absolute -bottom-1 -right-1 rounded-full bg-surface p-0.5">
              <Icon family="ionicons" name="lock-closed" size={11} color={COLORS.textSubtle} />
            </View>
          )}
        </View>
        <Text
          className="text-center font-sans-semibold text-xs"
          style={{ color: unlocked ? COLORS.text : COLORS.textSubtle }}
          numberOfLines={2}
        >
          {achievement.name}
        </Text>
      </View>
      <View className="w-full items-center gap-1.5">
        <Text
          className="text-center font-sans text-[10px] text-text-subtle"
          style={{ minHeight: 28 }}
          numberOfLines={2}
        >
          {achievement.description}
        </Text>
        <View className="h-1 w-full overflow-hidden rounded-full bg-border">
          <View className="h-full rounded-full" style={{ width: `${progress.percent}%`, backgroundColor: fillColor }} />
        </View>
      </View>
    </View>
  );
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const element = item.element.toLowerCase() as Element;
  const elementColor = ELEMENT_COLORS[element];
  const art = SPECIES_ART[item.kind === "capture" ? item.speciesName : item.enemyName];

  const message =
    item.kind === "capture" ? (
      <Text className="flex-1 font-sans text-sm text-text-muted" numberOfLines={1}>
        You captured <Text className="font-sans-semibold text-text">{item.wobblinName}</Text>
      </Text>
    ) : (
      <Text className="flex-1 font-sans text-sm text-text-muted" numberOfLines={1}>
        You {item.won ? "won" : "lost"} vs. <Text className="font-sans-semibold text-text">{item.enemyName}</Text>
      </Text>
    );

  return (
    <View className="flex-row items-center gap-3 rounded-xl border border-border bg-surface-raised p-2.5">
      <View
        className="relative h-12 w-12 items-center justify-center overflow-hidden rounded-lg border bg-background"
        style={{ borderColor: `${elementColor}55` }}
      >
        {art ? (
          <Image source={art} style={{ width: "100%", height: "100%" }} contentFit="cover" />
        ) : (
          <Icon {...ELEMENT_ICON[element]} size={22} color={elementColor} />
        )}
        <View
          className="absolute -bottom-1 -right-1 h-5 w-5 items-center justify-center rounded-full border bg-surface"
          style={{ borderColor: elementColor }}
        >
          <Icon {...ELEMENT_ICON[element]} size={10} color={elementColor} />
        </View>
      </View>
      {message}
      <Text className="font-sans text-xs text-text-subtle">{formatRelativeTime(item.createdAt)}</Text>
    </View>
  );
}
