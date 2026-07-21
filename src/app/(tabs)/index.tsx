import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { HexBadge } from "@/components/HexBadge";
import { Icon, type IconSpec } from "@/components/Icon";
import { LevelUpBanner } from "@/components/LevelUpBanner";
import { MonsterCard } from "@/components/MonsterCard";
import { RewardToast } from "@/components/RewardToast";
import { Skeleton } from "@/components/Skeleton";
import { StatBar } from "@/components/StatBar";
import { XPBar } from "@/components/XPBar";
import { PLAYER_PORTRAIT } from "@/constants/avatars";
import { SPECIES_ART } from "@/constants/speciesArt";
import { COLORS, ELEMENT_ICON, type Element, type Rarity } from "@/constants/theme";
import { useClaimDailyReward } from "@/hooks/useDailyReward";
import { usePlayer } from "@/hooks/usePlayer";
import { useScrollScreenContentStyle } from "@/hooks/useTabBarClearance";
import { useFeaturedWobblin } from "@/hooks/useWobblins";
import type { Player } from "@/supabase/players";
import { useSupabase } from "@/supabase/SupabaseProvider";
import type { FeaturedWobblin } from "@/supabase/wobblins";
import { getErrorMessage } from "@/utils/errors";
import { dailyRewardToReward } from "@/utils/rewardToast";

const ENERGY_MAX = 50;

export default function HomeScreen() {
  const { session } = useSupabase();
  const playerId = session?.user.id;

  // No focus-based refetching needed: mutations elsewhere (spend energy,
  // battle rewards) invalidate these same query keys, and since the tab
  // navigator keeps this screen mounted, React Query refetches it in the
  // background the moment that happens — even while another tab is active.
  const { data: player, isPending: playerPending, error: playerError } = usePlayer(playerId);
  const { data: featured } = useFeaturedWobblin(playerId);

  const [levelUp, setLevelUp] = useState<number | null>(null);

  // Claim the daily login bonus once per app session. `claim_daily_reward` is
  // idempotent per calendar day, so this is safe even if the effect somehow
  // re-ran — the ref just avoids firing the RPC on every re-render.
  const claimDailyReward = useClaimDailyReward(playerId);
  const claimedRef = useRef(false);

  useEffect(() => {
    if (!playerId || claimedRef.current) return;
    claimedRef.current = true;
    claimDailyReward.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId]);

  const dailyReward = useMemo(
    () => (claimDailyReward.data ? dailyRewardToReward(claimDailyReward.data) : null),
    [claimDailyReward.data],
  );

  const loading = playerPending;
  const error = playerError ? getErrorMessage(playerError) : null;
  const contentStyle = useScrollScreenContentStyle(24, 1);

  return (
    <View className="flex-1 bg-background">
      <LevelUpBanner level={levelUp} />
      <RewardToast reward={dailyReward} offsetTop={76} />
      <ScrollView className="flex-1" contentContainerStyle={contentStyle}>
        {loading || !player ? (
          error ? (
            <View className="flex-1 items-center justify-center py-24">
              <Text className="font-sans-medium text-sm text-danger">{error}</Text>
            </View>
          ) : (
            <HomeSkeleton />
          )
        ) : (
          <>
            <PlayerHeader player={player} onLevelUp={setLevelUp} />
            <FeaturedWobblinCard featured={featured ?? null} onLevelUp={setLevelUp} />
            {error && (
              <View className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3">
                <Text className="font-sans-medium text-sm text-danger">{error}</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function PlayerHeader({ player, onLevelUp }: { player: Player; onLevelUp: (level: number) => void }) {
  return (
    <View className="gap-4 rounded-2xl border border-border bg-surface p-4">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          <View>
            <Image
              source={PLAYER_PORTRAIT}
              style={{ width: 64, height: 64, borderRadius: 32 }}
              contentFit="cover"
            />
            <View className="absolute -bottom-1 -right-1 h-6 w-6 items-center justify-center rounded-full border border-border bg-surface-raised">
              <Icon family="ionicons" name="pencil" size={12} color={COLORS.textMuted} />
            </View>
          </View>
          <View className="gap-0.5">
            <Text className="font-display-bold text-2xl text-text">{player.username}</Text>
            <Text className="font-sans-medium text-sm text-primary-dark">Level {player.level}</Text>
          </View>
        </View>
        <HexBadge value={player.level} />
      </View>

      <View className="h-px bg-border" />

      <View className="flex-row items-center gap-4">
        <Stat
          icon={{ family: "material-community", name: "gold" }}
          iconColor={COLORS.gold}
          label="Gold"
          value={player.gold.toLocaleString()}
          className="text-gold"
        />
        <View className="h-8 w-px bg-border" />
        <Stat
          icon={{ family: "ionicons", name: "flash" }}
          iconColor={COLORS.energy}
          label="Energy"
          value={`${player.energy}/${ENERGY_MAX}`}
          className="text-energy"
        />
      </View>

      <View className="h-px bg-border" />

      <XPBar level={player.level} experience={player.experience} onLevelUp={onLevelUp} />
    </View>
  );
}

function FeaturedWobblinCard({
  featured,
  onLevelUp,
}: {
  featured: FeaturedWobblin | null;
  onLevelUp: (level: number) => void;
}) {
  const router = useRouter();

  if (!featured) {
    return (
      <View className="rounded-2xl border border-border bg-surface">
        <EmptyState
          icon={{ family: "material-community", name: "egg-easter" }}
          title="No Wobblin yet"
          description="Choose your starter to begin your journey."
          action={<Button label="Choose Starter" onPress={() => router.push("/starter-selection")} />}
        />
      </View>
    );
  }

  const element = featured.species.element.toLowerCase() as Element;
  const rarity = featured.species.rarity.toLowerCase() as Rarity;
  const name = featured.nickname ?? featured.species.name;
  const art = SPECIES_ART[featured.species.name];

  return (
    <MonsterCard
      name={name}
      level={featured.level}
      element={element}
      rarity={rarity}
      eyebrow="Active Wobblin"
      onPress={() => router.push(`/wobblin/${featured.id}`)}
    >
      <View className="flex-row items-center gap-4">
        <View className="flex-1 gap-3">
          <StatBar
            label="HP"
            value={featured.hp}
            max={featured.hp}
            color={COLORS.hp}
            icon={{ family: "ionicons", name: "heart" }}
            valuePosition="below"
          />
          <XPBar
            level={featured.level}
            experience={featured.experience}
            onLevelUp={onLevelUp}
            showLevel={false}
            icon={{ family: "ionicons", name: "star" }}
            valuePosition="below"
          />
        </View>
        {art ? (
          <Image source={art} style={{ width: 140, height: 170 }} contentFit="contain" />
        ) : (
          <View
            className="h-32 w-32 items-center justify-center rounded-full border bg-background"
            style={{ borderColor: `${COLORS.textSubtle}33` }}
          >
            <Icon {...ELEMENT_ICON[element]} size={48} color={COLORS.textSubtle} />
          </View>
        )}
      </View>

      <View className="h-px bg-border" />

      <View className="flex-row">
        <StatColumn icon={{ family: "material-community", name: "sword" }} label="Attack" value={featured.attack} />
        <View className="w-px bg-border" />
        <StatColumn icon={{ family: "ionicons", name: "shield-outline" }} label="Defense" value={featured.defense} />
        <View className="w-px bg-border" />
        <StatColumn icon={{ family: "material-community", name: "feather" }} label="Speed" value={featured.speed} />
      </View>
    </MonsterCard>
  );
}

function StatColumn({ icon, label, value }: { icon: IconSpec; label: string; value: number }) {
  return (
    <View className="flex-1 items-center gap-1">
      <View className="flex-row items-center gap-1.5">
        <Icon {...icon} size={16} color={COLORS.textMuted} />
        <Text className="font-sans-medium text-sm text-text-muted">{label}</Text>
      </View>
      <Text className="font-display-bold text-xl text-text">{value}</Text>
    </View>
  );
}

function Stat({
  icon,
  iconColor,
  label,
  value,
  className,
}: {
  icon?: IconSpec;
  iconColor?: string;
  label: string;
  value: string;
  className: string;
}) {
  return (
    <View className="flex-row items-center gap-2">
      {icon && <Icon {...icon} size={18} color={iconColor} />}
      <View className="gap-0.5">
        <Text className="font-sans text-xs text-text-subtle">{label}</Text>
        <Text className={`font-sans-bold text-base ${className}`}>{value}</Text>
      </View>
    </View>
  );
}

function HomeSkeleton() {
  return (
    <>
      <View className="gap-4 rounded-2xl border border-border bg-surface p-4">
        <View className="flex-row items-center justify-between">
          <View className="gap-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-3 w-16" />
          </View>
          <Skeleton className="h-12 w-12 rounded-full" />
        </View>
        <Skeleton className="h-2 w-full rounded-full" />
      </View>
      <View className="gap-4 rounded-2xl border border-border bg-surface p-4">
        <View className="flex-row items-center gap-4">
          <Skeleton className="h-20 w-20 rounded-full" />
          <View className="flex-1 gap-2">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-3 w-16" />
          </View>
        </View>
        <Skeleton className="h-2 w-full rounded-full" />
      </View>
    </>
  );
}
