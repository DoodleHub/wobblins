import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { Icon } from "@/components/Icon";
import { LevelUpBanner } from "@/components/LevelUpBanner";
import { MonsterCard } from "@/components/MonsterCard";
import { Skeleton } from "@/components/Skeleton";
import { XPBar } from "@/components/XPBar";
import { PLAYER_PORTRAIT } from "@/constants/avatars";
import { SPECIES_ART, SPECIES_ART_ASPECT } from "@/constants/speciesArt";
import { COLORS, ELEMENT_COLORS, ELEMENT_ICON, type Element, type Rarity } from "@/constants/theme";
import { usePlayer } from "@/hooks/usePlayer";
import { useScrollScreenContentStyle } from "@/hooks/useTabBarClearance";
import { useMyActiveTasks } from "@/hooks/useTasks";
import { useFeaturedWobblin } from "@/hooks/useWobblins";
import type { Player } from "@/supabase/players";
import { useSupabase } from "@/supabase/SupabaseProvider";
import type { Task } from "@/supabase/tasks";
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
  const { data: activeTasks, refetch: refetchActiveTasks } = useMyActiveTasks(playerId);

  // Home stays mounted underneath every pushed screen (task review, sacrifice, evolve,
  // set-featured), so a mutation performed there can invalidate this screen's queries
  // while it's frozen and not repaint until it's focused again — refetch on focus rather
  // than relying on that. Same pattern as Collection/Group detail.
  useFocusEffect(
    useCallback(() => {
      refetchPlayer();
      refetchFeatured();
      refetchActiveTasks();
    }, [refetchPlayer, refetchFeatured, refetchActiveTasks]),
  );

  const [levelUp, setLevelUp] = useState<number | null>(null);

  const loading = playerPending;
  const error = playerError ? getErrorMessage(playerError) : null;
  const contentStyle = useScrollScreenContentStyle(24, 1);

  return (
    <View className="flex-1 bg-background">
      <LevelUpBanner level={levelUp} />
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
            <ActiveTasksCard tasks={activeTasks ?? []} playerId={playerId} onOpen={(id) => router.push(`/task/${id}`)} />
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
    <View className="flex-row items-center gap-3 rounded-2xl border border-border bg-surface p-4">
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
      <View className="gap-0.5">
        <Text className="font-display-bold text-2xl text-text">{player.username}</Text>
        <Text className="font-sans-medium text-sm text-text-muted">Welcome back</Text>
      </View>
    </View>
  );
}

function ActiveTasksCard({
  tasks,
  playerId,
  onOpen,
}: {
  tasks: Task[];
  playerId: string | undefined;
  onOpen: (taskId: string) => void;
}) {
  if (tasks.length === 0) return null;

  return (
    <View className="gap-3 rounded-2xl border border-border bg-surface p-4">
      <View className="flex-row items-center gap-1.5">
        <Icon family="ionicons" name="clipboard" size={15} color={COLORS.primaryDark} />
        <Text className="font-display text-sm uppercase tracking-wide text-text-muted">Active Tasks</Text>
      </View>
      <View className="gap-2">
        {tasks.slice(0, 5).map((task) => (
          <ActiveTaskRow key={task.id} task={task} playerId={playerId} onPress={() => onOpen(task.id)} />
        ))}
      </View>
    </View>
  );
}

function ActiveTaskRow({
  task,
  playerId,
  onPress,
}: {
  task: Task;
  playerId: string | undefined;
  onPress: () => void;
}) {
  const isCreator = task.creator_id === playerId;
  let waitingOn = "Open — waiting for someone to accept";
  if (task.status === "accepted") {
    waitingOn = isCreator ? `Waiting on ${task.acceptor?.username ?? "acceptor"}` : "Waiting on you to submit";
  } else if (task.status === "submitted") {
    waitingOn = isCreator ? "Waiting on your review" : "Submitted — awaiting review";
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      className="flex-row items-center gap-3 rounded-xl border border-border bg-surface-raised p-3"
    >
      <View
        className="h-9 w-9 items-center justify-center rounded-full"
        style={{ backgroundColor: COLORS.primaryLight }}
      >
        <Icon family="ionicons" name="clipboard-outline" size={16} color={COLORS.primaryDark} />
      </View>
      <View className="flex-1 gap-0.5">
        <Text className="font-sans-semibold text-sm text-text" numberOfLines={1}>
          {task.title}
        </Text>
        <Text className="font-sans text-xs text-text-subtle" numberOfLines={1}>
          {waitingOn}
        </Text>
      </View>
      <Icon family="ionicons" name="chevron-forward" size={16} color={COLORS.textSubtle} />
    </Pressable>
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
