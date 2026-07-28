/* eslint-disable react-hooks/refs -- Animated.Value held in useRef is the standard RN pattern; it's a mutable animation handle, not a component ref, and reading it during render is how Animated interpolation works. */
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { DailyEssenceCard } from "@/components/DailyEssenceCard";
import { EmptyState } from "@/components/EmptyState";
import { Icon, type IconSpec } from "@/components/Icon";
import { LevelUpBanner } from "@/components/LevelUpBanner";
import { RewardToast, type RewardToastData } from "@/components/RewardToast";
import { Skeleton } from "@/components/Skeleton";
import { TraitBadge } from "@/components/TraitBadge";
import { XPBar } from "@/components/XPBar";
import { PLAYER_PORTRAIT } from "@/constants/avatars";
import { SPECIES_ART, SPECIES_ART_ASPECT } from "@/constants/speciesArt";
import {
  COLORS,
  ELEMENT_COLORS,
  ELEMENT_ICON,
  mixColors,
  RARITY_COLORS,
  type Element,
  type Rarity,
} from "@/constants/theme";
import { usePlayerAchievements } from "@/hooks/useAchievements";
import { useGenerateEggsForPlayer, useMyEggs } from "@/hooks/useEggs";
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
  const generateEggsForPlayer = useGenerateEggsForPlayer(playerId);

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
  // every focus, the same way stage-2 Wobblins silently produce eggs here too, on every
  // focus — no button, no player action, just a lazy/claim-on-read check.
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
      generateEggsForPlayer.mutate();
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
      generateEggsForPlayer.mutate,
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
  // Same rule as Collection's pendingEggCountBySource, narrowed to just the
  // featured Wobblin so the card itself can carry the same gold indicator
  // WobblinGridCard already shows in the grid, instead of only surfacing via
  // the nudge list above.
  const featuredPendingEggCount = useMemo(
    () =>
      (eggs ?? []).filter(
        (egg) => egg.source_wobblin_id === featured?.id && egg.collected_at == null && !egg.hatched_at,
      ).length,
    [eggs, featured?.id],
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

            <FeaturedWobblinCard
              featured={featured ?? null}
              pendingEggCount={featuredPendingEggCount}
              onLevelUp={setLevelUp}
            />

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
  pendingEggCount = 0,
  onLevelUp,
}: {
  featured: FeaturedWobblin | null;
  /** Unclaimed eggs sitting in the featured Wobblin's slots — mirrors WobblinGridCard's prop of the same name, same gold treatment. */
  pendingEggCount?: number;
  onLevelUp: (level: number) => void;
}) {
  const router = useRouter();

  const scale = useRef(new Animated.Value(1)).current;
  const entrance = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(entrance, { toValue: 1, duration: 320, useNativeDriver: true }).start();
  }, [entrance]);
  const onPressIn = () =>
    Animated.spring(scale, { toValue: 0.98, useNativeDriver: true, speed: 40, bounciness: 0 }).start();
  const onPressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 6 }).start();

  if (!featured) {
    return (
      <View className="rounded-3xl border border-border bg-surface">
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
  const rarityColor = RARITY_COLORS[rarity];
  const name = featured.nickname ?? featured.species.name;
  const nicknamed = featured.nickname != null;
  const art = SPECIES_ART[featured.species.name];
  const hasPendingEggs = pendingEggCount > 0;
  const cardTint = mixColors(COLORS.surface, hasPendingEggs ? COLORS.gold : elementColor, 0.16);

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
    <Pressable
      onPress={() => router.push(`/wobblin/${featured.id}`)}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      accessibilityRole="button"
      accessibilityLabel={
        hasPendingEggs
          ? `${name}, featured Wobblin, level ${featured.level}, ${pendingEggCount} egg${pendingEggCount > 1 ? "s" : ""} waiting to be claimed`
          : `${name}, featured Wobblin, level ${featured.level}`
      }
    >
      <Animated.View
        className="overflow-hidden rounded-3xl border"
        style={{
          borderColor: hasPendingEggs ? `${COLORS.gold}88` : `${rarityColor}55`,
          opacity: entrance,
          transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }, { scale }],
          shadowColor: hasPendingEggs ? COLORS.gold : elementColor,
          shadowOpacity: 0.25,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 8 },
          elevation: 5,
        }}
      >
        <LinearGradient
          colors={[cardTint, COLORS.surface]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        <View className="gap-4 p-4">
          <View className="flex-row items-center justify-between">
            <View
              className="flex-row items-center gap-1.5 self-start rounded-full px-3 py-1"
              style={{ backgroundColor: `${COLORS.gold}1f` }}
            >
              <Icon family="ionicons" name="star" size={11} color={COLORS.gold} />
              <Text
                className="font-display-bold text-[11px] uppercase tracking-wide"
                style={{ color: COLORS.gold }}
              >
                Featured
              </Text>
            </View>
            <Icon family="ionicons" name="chevron-forward" size={18} color={COLORS.textSubtle} />
          </View>

          <View className="items-center">
            <View style={{ width: portraitWidth, height: portraitHeight }} className="items-center justify-center">
              <View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  width: 130,
                  height: 130,
                  borderRadius: 65,
                  backgroundColor: elementColor,
                  opacity: 0.3,
                  shadowColor: elementColor,
                  shadowOpacity: 0.85,
                  shadowRadius: 36,
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

              <View
                className="absolute left-0 top-0 rounded-full px-2.5 py-1"
                style={{ backgroundColor: `${COLORS.background}cc` }}
              >
                <Text className="font-sans-bold text-xs text-text">Lv. {featured.level}</Text>
              </View>
              <View
                className="absolute right-0 top-0 h-7 w-7 items-center justify-center rounded-full"
                style={{ backgroundColor: `${COLORS.background}cc` }}
              >
                <Icon {...ELEMENT_ICON[element]} size={14} color={elementColor} />
              </View>
              {hasPendingEggs && (
                <View
                  className="absolute bottom-0 left-0 flex-row items-center gap-1 rounded-full px-2 py-1"
                  style={{ backgroundColor: `${COLORS.background}cc` }}
                >
                  <Icon family="material-community" name="egg-easter" size={13} color={COLORS.gold} />
                  {pendingEggCount > 1 && (
                    <Text className="font-sans-bold text-xs" style={{ color: COLORS.gold }}>
                      {pendingEggCount}
                    </Text>
                  )}
                </View>
              )}
            </View>

            <View className="mt-2 items-center gap-1">
              <Text className="font-display-bold text-xl text-text">{name}</Text>
              {nicknamed && (
                <Text className="font-sans-medium text-sm text-text-muted">{featured.species.name}</Text>
              )}
            </View>

            <View className="mt-2 flex-row items-center gap-2">
              <TraitBadge label={element} color={elementColor} />
              <TraitBadge label={rarity} color={rarityColor} />
            </View>
          </View>

          <XPBar
            level={featured.level}
            experience={featured.experience}
            onLevelUp={onLevelUp}
            showLevel={false}
            icon={{ family: "ionicons", name: "flash" }}
          />
        </View>
      </Animated.View>
    </Pressable>
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
