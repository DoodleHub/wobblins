import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { Icon } from "@/components/Icon";
import { LevelUpBanner } from "@/components/LevelUpBanner";
import { MonsterCard } from "@/components/MonsterCard";
import { RewardToast, type RewardToastData } from "@/components/RewardToast";
import { Skeleton } from "@/components/Skeleton";
import { XPBar } from "@/components/XPBar";
import { PLAYER_PORTRAIT } from "@/constants/avatars";
import { SPECIES_ART, SPECIES_ART_ASPECT } from "@/constants/speciesArt";
import { COLORS, ELEMENT_COLORS, ELEMENT_ICON, type Element, type Rarity } from "@/constants/theme";
import { useClaimDailyEssence, useClaimPassiveEssence } from "@/hooks/useEssence";
import { usePlayer } from "@/hooks/usePlayer";
import { useScrollScreenContentStyle } from "@/hooks/useTabBarClearance";
import { useFeaturedWobblin } from "@/hooks/useWobblins";
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
    }, [refetchPlayer, refetchFeatured, claimPassiveEssence.mutate]),
  );

  const [levelUp, setLevelUp] = useState<number | null>(null);

  const loading = playerPending;
  const error = playerError ? getErrorMessage(playerError) : null;
  const contentStyle = useScrollScreenContentStyle(24, 1);

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
            <PlayerHeader
              player={player}
              onClaimDaily={() =>
                claimDailyEssence.mutate(undefined, {
                  onSuccess: (result) =>
                    setEssenceToast({
                      icon: { family: "ionicons", name: "flash" },
                      title: `+${result.granted} Essence`,
                      subtitle: "Daily reward claimed.",
                    }),
                })
              }
              claimingDaily={claimDailyEssence.isPending}
              onOpenSummon={() => router.push("/summon")}
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

function PlayerHeader({
  player,
  onClaimDaily,
  claimingDaily,
  onOpenSummon,
}: {
  player: Player;
  onClaimDaily: () => void;
  claimingDaily: boolean;
  onOpenSummon: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const claimedToday = player.last_daily_essence_claim_date === today;

  return (
    <View className="gap-3 rounded-2xl border border-border bg-surface p-4">
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
      </View>

      <View className="flex-row items-center gap-3">
        <View
          className="flex-1 flex-row items-center gap-1.5 rounded-full border px-3 py-2"
          style={{ borderColor: `${COLORS.essence}40`, backgroundColor: `${COLORS.essence}14` }}
        >
          <Icon family="ionicons" name="flash" size={15} color={COLORS.essence} />
          <Text className="font-sans-semibold text-sm" style={{ color: COLORS.essence }}>
            {player.essence_balance} Essence
          </Text>
        </View>
        <Pressable
          onPress={onClaimDaily}
          disabled={claimedToday || claimingDaily}
          accessibilityRole="button"
          accessibilityLabel={claimedToday ? "Daily essence already claimed" : "Claim daily essence"}
          className="flex-row items-center gap-1.5 rounded-full border px-3.5 py-2"
          style={{
            borderColor: claimedToday ? COLORS.border : `${COLORS.essence}66`,
            backgroundColor: claimedToday ? COLORS.surfaceRaised : `${COLORS.essence}1f`,
            opacity: claimedToday ? 0.6 : 1,
          }}
        >
          <Icon
            family="ionicons"
            name={claimedToday ? "checkmark-circle" : "gift-outline"}
            size={15}
            color={claimedToday ? COLORS.textMuted : COLORS.essence}
          />
          <Text
            className="font-sans-semibold text-xs"
            style={{ color: claimedToday ? COLORS.textMuted : COLORS.essence }}
          >
            {claimedToday ? "Claimed" : "Daily"}
          </Text>
        </Pressable>
        <Pressable
          onPress={onOpenSummon}
          accessibilityRole="button"
          accessibilityLabel="Open summon"
          className="h-10 w-10 items-center justify-center rounded-full border"
          style={{ borderColor: COLORS.border, backgroundColor: COLORS.surface }}
        >
          <Icon family="ionicons" name="sparkles-outline" size={17} color={COLORS.textMuted} />
        </Pressable>
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
