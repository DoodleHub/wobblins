import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { DailyEssenceCard } from "@/components/DailyEssenceCard";
import { EmptyState } from "@/components/EmptyState";
import { Icon, type IconSpec } from "@/components/Icon";
import { LevelUpBanner } from "@/components/LevelUpBanner";
import { MonsterCard } from "@/components/MonsterCard";
import { RewardToast, type RewardToastData } from "@/components/RewardToast";
import { Skeleton } from "@/components/Skeleton";
import { XPBar } from "@/components/XPBar";
import { PLAYER_PORTRAIT } from "@/constants/avatars";
import { SPECIES_ART, SPECIES_ART_ASPECT } from "@/constants/speciesArt";
import { COLORS, ELEMENT_COLORS, ELEMENT_ICON, type Element, type Rarity } from "@/constants/theme";
import { usePlayerAchievements } from "@/hooks/useAchievements";
import { useMyEggs } from "@/hooks/useEggs";
import { useClaimDailyEssence, useClaimPassiveEssence, useEssenceConfig } from "@/hooks/useEssence";
import { usePlayer } from "@/hooks/usePlayer";
import { useScrollScreenContentStyle } from "@/hooks/useTabBarClearance";
import { useMyListings, usePendingOffersCount } from "@/hooks/useTrades";
import { useFeaturedWobblin, usePlayerWobblins } from "@/hooks/useWobblins";
import type { Player } from "@/supabase/players";
import { useSupabase } from "@/supabase/SupabaseProvider";
import type { FeaturedWobblin } from "@/supabase/wobblins";
import { getErrorMessage } from "@/utils/errors";

// See the aspect-ratio comment in FeaturedWobblinCard for why the portrait
// box isn't just a fixed square.
const FEATURED_PORTRAIT_MAX_WIDTH = 260;
const FEATURED_PORTRAIT_MAX_HEIGHT = 200;
const FEATURED_PORTRAIT_MIN_HEIGHT = 130;

export default function HomeScreen() {
  const router = useRouter();
  const { session } = useSupabase();
  const playerId = session?.user.id;

  const { data: player, isPending: playerPending, error: playerError, refetch: refetchPlayer } = usePlayer(playerId);
  const { data: featured, refetch: refetchFeatured } = useFeaturedWobblin(playerId);
  const claimDailyEssence = useClaimDailyEssence(playerId);
  const claimPassiveEssence = useClaimPassiveEssence(playerId);

  // Data for the "needs your attention" nudges. All of it is already fetched
  // elsewhere in the app (Collection, Profile, Trade) — reusing the same query
  // keys means this mostly rides on cache already warmed by those tabs rather
  // than adding new network cost.
  const { refetch: refetchWobblins } = usePlayerWobblins(playerId);
  const { data: eggs, refetch: refetchEggs } = useMyEggs(playerId);
  const { data: essenceConfig } = useEssenceConfig();
  const { data: myListings, refetch: refetchListings } = useMyListings(playerId);
  const { data: achievements, refetch: refetchAchievements } = usePlayerAchievements(playerId);

  const offersListingIds = useMemo(
    () => (myListings ?? []).filter((l) => l.listing_type === "offers" && l.status === "active").map((l) => l.id),
    [myListings],
  );
  const { data: pendingOffersCount, refetch: refetchPendingOffers } = usePendingOffersCount(
    playerId,
    offersListingIds,
  );

  const [essenceToast, setEssenceToast] = useState<RewardToastData | null>(null);

  // Home stays mounted underneath every pushed screen (evolve, set-featured),
  // so a mutation performed there can invalidate this screen's queries while it's frozen
  // and not repaint until it's focused again — refetch on focus rather than relying on
  // that. Same pattern as Collection. Passive essence is claimed silently here too, on
  // every focus, the same way `claim_egg`'s cadence is only ever checked when a screen
  // that cares about it is actually open.
  useFocusEffect(
    useCallback(() => {
      refetchPlayer();
      refetchFeatured();
      refetchWobblins();
      refetchEggs();
      refetchListings();
      refetchAchievements();
      refetchPendingOffers();
      claimPassiveEssence.mutate(undefined, {
        onSuccess: (result) => {
          if (result.granted > 0) {
            setEssenceToast({
              icon: { family: "ionicons", name: "flash" },
              title: `+${result.granted} Essence`,
              subtitle: "Collected while you were away.",
            });
          }
        },
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
      refetchPlayer,
      refetchFeatured,
      refetchWobblins,
      refetchEggs,
      refetchListings,
      refetchAchievements,
      refetchPendingOffers,
      claimPassiveEssence.mutate,
    ]),
  );

  const [levelUp, setLevelUp] = useState<number | null>(null);
  // Captured once per mount rather than read live — good enough for a display-only
  // nudge count, since `hatch_egg` re-validates `hatch_ready_at` server-side regardless
  // of what the client thinks "now" is.
  const [now] = useState(() => Date.now());

  const loading = playerPending;
  const error = playerError ? getErrorMessage(playerError) : null;
  const contentStyle = useScrollScreenContentStyle(24, 1);

  const readyEggCount = useMemo(
    () =>
      (eggs ?? []).filter(
        (egg) => egg.collected_at != null && !egg.hatched_at && new Date(egg.hatch_ready_at!).getTime() <= now,
      ).length,
    [eggs, now],
  );
  // Eggs still sitting in a producing Wobblin's slot, not yet claimed into the
  // Collection — a different, earlier nudge than readyEggCount above (which is
  // about eggs already claimed and past their hatch countdown).
  const unclaimedEggCount = useMemo(
    () => (eggs ?? []).filter((egg) => egg.collected_at == null && !egg.hatched_at).length,
    [eggs],
  );
  const unclaimedAchievementCount = useMemo(
    () => (achievements ?? []).filter((a) => a.unlocked && !a.claimed).length,
    [achievements],
  );
  const claimedDailyEssence = player?.last_daily_essence_claim_date === new Date().toISOString().slice(0, 10);

  return (
    <View className="flex-1 bg-background">
      <LevelUpBanner level={levelUp} />
      <RewardToast reward={essenceToast} offsetTop={76} />
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
            <PlayerHeader player={player} />

            <DailyEssenceCard
              claimed={claimedDailyEssence}
              claiming={claimDailyEssence.isPending}
              amount={essenceConfig?.daily_claim_amount}
              onPress={() =>
                claimDailyEssence.mutate(undefined, {
                  onSuccess: (result) =>
                    setEssenceToast({
                      icon: { family: "ionicons", name: "flash" },
                      title: `+${result.granted} Essence`,
                      subtitle: "Daily reward claimed.",
                    }),
                })
              }
            />
            <HomeNudges
              unclaimedAchievementCount={unclaimedAchievementCount}
              readyEggCount={readyEggCount}
              unclaimedEggCount={unclaimedEggCount}
              pendingOffersCount={pendingOffersCount ?? 0}
              onOpenAchievements={() => router.push("/achievements")}
              onOpenCollection={() => router.push("/(tabs)/collection")}
              onOpenTrade={() => router.push("/(tabs)/trade")}
            />

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

function PlayerHeader({ player }: { player: Player }) {
  return (
    <View className="rounded-2xl border border-border bg-surface p-4">
      <View className="flex-row items-center gap-3">
        <View>
          <Image
            source={PLAYER_PORTRAIT}
            style={{ width: 56, height: 56, borderRadius: 28 }}
            contentFit="cover"
          />
          <View className="absolute -bottom-1 -right-1 h-6 w-6 items-center justify-center rounded-full border border-border bg-surface-raised">
            <Icon family="ionicons" name="pencil" size={12} color={COLORS.textMuted} />
          </View>
        </View>
        <View className="flex-1 gap-0.5">
          <Text className="font-display-bold text-2xl text-text">{player.username}</Text>
          <Text className="font-sans-medium text-sm text-text-muted">Welcome back</Text>
        </View>
        <View
          className="flex-row items-center gap-1.5 rounded-full border px-3 py-2"
          style={{ borderColor: `${COLORS.essence}40`, backgroundColor: `${COLORS.essence}14` }}
        >
          <Icon family="ionicons" name="flash" size={15} color={COLORS.essence} />
          <Text className="font-sans-semibold text-sm" style={{ color: COLORS.essence }}>
            {player.essence_balance}
          </Text>
        </View>
      </View>
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
  const elementColor = ELEMENT_COLORS[element];
  const name = featured.nickname ?? featured.species.name;
  const art = SPECIES_ART[featured.species.name];

  // Source portraits aren't all drawn on the same canvas shape (see the
  // matching comment on the Wobblin detail hero), so a fixed square box
  // would letterbox wide portraits far more than square ones under
  // contentFit="contain". This is the only image in the card, so both
  // dimensions grow together — preserving the portrait's aspect ratio — up
  // to whichever bound (width or height) it hits first.
  const aspect = art ? (SPECIES_ART_ASPECT[featured.species.name] ?? 1) : 1;
  let portraitWidth = FEATURED_PORTRAIT_MAX_HEIGHT * aspect;
  let portraitHeight = FEATURED_PORTRAIT_MAX_HEIGHT;
  if (portraitWidth > FEATURED_PORTRAIT_MAX_WIDTH) {
    portraitWidth = FEATURED_PORTRAIT_MAX_WIDTH;
    portraitHeight = FEATURED_PORTRAIT_MAX_WIDTH / aspect;
  }
  if (portraitHeight < FEATURED_PORTRAIT_MIN_HEIGHT) {
    portraitHeight = FEATURED_PORTRAIT_MIN_HEIGHT;
    portraitWidth = FEATURED_PORTRAIT_MIN_HEIGHT * aspect;
  }

  return (
    <MonsterCard
      name={name}
      level={featured.level}
      element={element}
      rarity={rarity}
      eyebrow="Featured Wobblin"
      onPress={() => router.push(`/wobblin/${featured.id}`)}
    >
      <View className="items-center py-1">
        <View style={{ width: portraitWidth, height: portraitHeight }} className="items-center justify-center">
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              width: 118,
              height: 118,
              borderRadius: 59,
              backgroundColor: elementColor,
              opacity: 0.3,
              shadowColor: elementColor,
              shadowOpacity: 0.85,
              shadowRadius: 32,
              shadowOffset: { width: 0, height: 0 },
              elevation: 6,
            }}
          />
          {art ? (
            <Image source={art} style={{ width: "100%", height: "100%" }} contentFit="contain" />
          ) : (
            <View
              className="h-32 w-32 items-center justify-center rounded-full border-2 bg-background"
              style={{ borderColor: elementColor }}
            >
              <Icon {...ELEMENT_ICON[element]} size={48} color={elementColor} />
            </View>
          )}
        </View>
      </View>

      <XPBar
        level={featured.level}
        experience={featured.experience}
        onLevelUp={onLevelUp}
        showLevel={false}
        icon={{ family: "ionicons", name: "star" }}
      />
    </MonsterCard>
  );
}

function HomeNudges({
  unclaimedAchievementCount,
  readyEggCount,
  unclaimedEggCount,
  pendingOffersCount,
  onOpenAchievements,
  onOpenCollection,
  onOpenTrade,
}: {
  unclaimedAchievementCount: number;
  readyEggCount: number;
  unclaimedEggCount: number;
  pendingOffersCount: number;
  onOpenAchievements: () => void;
  onOpenCollection: () => void;
  onOpenTrade: () => void;
}) {
  if (
    unclaimedAchievementCount === 0 &&
    readyEggCount === 0 &&
    unclaimedEggCount === 0 &&
    pendingOffersCount === 0
  ) {
    return null;
  }

  return (
    <View className="gap-2">
      {unclaimedAchievementCount > 0 && (
        <NudgeRow
          icon={{ family: "ionicons", name: "trophy" }}
          iconColor={COLORS.gold}
          title={`${unclaimedAchievementCount} Reward${unclaimedAchievementCount === 1 ? "" : "s"} Ready`}
          subtitle="Claim essence from your unlocked achievements."
          onPress={onOpenAchievements}
        />
      )}
      {unclaimedEggCount > 0 && (
        <NudgeRow
          icon={{ family: "material-community", name: "egg-easter" }}
          iconColor={COLORS.gold}
          title={`${unclaimedEggCount} Egg${unclaimedEggCount === 1 ? "" : "s"} Waiting to Be Claimed`}
          subtitle="A Wobblin in your Collection has an egg in its slot."
          onPress={onOpenCollection}
        />
      )}
      {readyEggCount > 0 && (
        <NudgeRow
          icon={{ family: "material-community", name: "egg-easter" }}
          iconColor={COLORS.secondary}
          title={`${readyEggCount} Egg${readyEggCount === 1 ? "" : "s"} Ready to Hatch`}
          subtitle="Head to your Collection to hatch them."
          onPress={onOpenCollection}
        />
      )}
      {pendingOffersCount > 0 && (
        <NudgeRow
          icon={{ family: "ionicons", name: "swap-horizontal" }}
          iconColor={COLORS.essence}
          title={`${pendingOffersCount} Offer${pendingOffersCount === 1 ? "" : "s"} Waiting`}
          subtitle="Other players want to trade for your Wobblins."
          onPress={onOpenTrade}
        />
      )}
    </View>
  );
}

function NudgeRow({
  icon,
  iconColor,
  title,
  subtitle,
  onPress,
}: {
  icon: IconSpec;
  iconColor: string;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      className="flex-row items-center gap-3 rounded-2xl border border-border bg-surface p-3.5"
    >
      <View
        className="h-10 w-10 items-center justify-center rounded-full"
        style={{ backgroundColor: `${iconColor}1f` }}
      >
        <Icon {...icon} size={18} color={iconColor} />
      </View>
      <View className="flex-1 gap-0.5">
        <Text className="font-sans-semibold text-sm text-text">{title}</Text>
        <Text className="font-sans text-xs text-text-muted">{subtitle}</Text>
      </View>
      <Icon family="ionicons" name="chevron-forward" size={16} color={COLORS.textSubtle} />
    </Pressable>
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
