import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, Share, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { Icon, type IconSpec } from "@/components/Icon";
import { LoadingScreen } from "@/components/LoadingScreen";
import { COLORS } from "@/constants/theme";
import { useGroup, useGroupMembers } from "@/hooks/useGroups";
import { useExpireTask, useGroupTasks } from "@/hooks/useTasks";
import { useSupabase } from "@/supabase/SupabaseProvider";
import type { GroupMember } from "@/supabase/groups";
import type { Task, TaskStatus } from "@/supabase/tasks";
import { formatTimeUntilExpiry, isTaskPastExpiry } from "@/utils/taskExpiry";
import { getErrorMessage } from "@/utils/errors";

const STATUS_COLOR: Record<TaskStatus, string> = {
  open: COLORS.primary,
  accepted: COLORS.secondary,
  submitted: COLORS.gold,
  approved: COLORS.success,
  rejected: COLORS.danger,
  cancelled: COLORS.textSubtle,
  expired: COLORS.textSubtle,
};

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useSupabase();
  const playerId = session?.user.id;

  const { data: group, isPending: groupPending, error: groupError } = useGroup(id);
  const { data: members, refetch: refetchMembers } = useGroupMembers(id);
  const { data: tasks, isPending: tasksPending, refetch: refetchTasks } = useGroupTasks(id);
  const expireTask = useExpireTask(id, playerId);
  // Captured once per mount for the countdown display — same rationale as the
  // egg-cadence "now" mirror on the Monster Detail screen: display-only, since
  // expire_task/accept_task re-validate the deadline server-side regardless.
  const [now] = useState(() => Date.now());

  // This screen can sit frozen underneath the create-task/task-detail stack routes — a
  // task created or reviewed there invalidates the cache, but the frozen screen doesn't
  // reliably repaint until it's focused again. Same fix as Collection's refetch-on-focus.
  // Also opportunistically flips any still-`open` task past its expiry, freeing its
  // reward lock without requiring someone to attempt (and fail) an accept first.
  useFocusEffect(
    useCallback(() => {
      refetchTasks().then(({ data }) => {
        const now = Date.now();
        data?.filter((t) => isTaskPastExpiry(t, now)).forEach((t) => expireTask.mutate(t.id));
      });
      refetchMembers();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refetchTasks, refetchMembers]),
  );

  if (groupPending) {
    return <LoadingScreen message="Loading group…" />;
  }

  if (groupError || !group) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-background px-8">
        <Text className="font-sans-medium text-sm text-danger">
          {groupError ? getErrorMessage(groupError) : "Group not found."}
        </Text>
        <Button label="Back" variant="secondary" onPress={() => router.back()} />
      </View>
    );
  }

  const onShareInvite = () => {
    Share.share({ message: `Join my Wobblins group "${group.name}" with code ${group.invite_code}` });
  };

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="w-full min-w-0 flex-grow gap-6 px-6 pb-8 pt-16"
    >
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
        <View className="flex-row items-center gap-1.5">
          <Text className="font-display-bold text-xl text-text">{group.name}</Text>
          {group.is_public && (
            <View className="rounded-full bg-secondary/15 px-2 py-0.5">
              <Text className="font-sans-semibold text-[10px] uppercase text-secondary">Public</Text>
            </View>
          )}
        </View>
        <View style={{ width: 40 }} />
      </View>

      <Pressable
        onPress={onShareInvite}
        accessibilityRole="button"
        className="flex-row items-center justify-between rounded-2xl border border-border bg-surface p-4"
      >
        <View className="gap-0.5">
          <Text className="font-display text-sm uppercase tracking-wide text-text-muted">Invite Code</Text>
          <Text className="font-display-bold text-2xl text-text">{group.invite_code}</Text>
        </View>
        <Icon family="ionicons" name="share-outline" size={20} color={COLORS.primaryDark} />
      </Pressable>

      <View className="gap-3">
        <Text className="font-display text-sm uppercase tracking-wide text-text-muted">
          Members ({members?.length ?? 0})
        </Text>
        <View className="gap-2">
          {members?.map((member) => <MemberRow key={member.id} member={member} />)}
        </View>
      </View>

      <View className="gap-3">
        <View className="flex-row items-center justify-between">
          <Text className="font-display text-sm uppercase tracking-wide text-text-muted">Tasks</Text>
          <Button label="Create Task" onPress={() => router.push(`/group/${group.id}/create-task`)} />
        </View>

        {tasksPending ? null : tasks && tasks.length > 0 ? (
          <View className="gap-2">
            {tasks.map((task) => (
              <TaskRow key={task.id} task={task} now={now} onPress={() => router.push(`/task/${task.id}`)} />
            ))}
          </View>
        ) : (
          <EmptyState
            icon={{ family: "ionicons", name: "clipboard-outline" }}
            title="No tasks yet"
            description="Create a task and offer one of your Wobblins as the reward."
          />
        )}
      </View>
    </ScrollView>
  );
}

function MemberRow({ member }: { member: GroupMember }) {
  return (
    <View className="flex-row items-center gap-3 rounded-xl border border-border bg-surface-raised p-3">
      <View
        className="h-9 w-9 items-center justify-center rounded-full"
        style={{ backgroundColor: COLORS.primaryLight }}
      >
        <Icon family="ionicons" name="person" size={16} color={COLORS.primaryDark} />
      </View>
      <Text className="flex-1 font-sans-semibold text-sm text-text">{member.player.username}</Text>
      {member.role === "owner" && (
        <View className="rounded-full bg-gold/15 px-2 py-0.5">
          <Text className="font-sans-semibold text-[10px] uppercase text-gold">Owner</Text>
        </View>
      )}
    </View>
  );
}

function TaskRow({ task, now, onPress }: { task: Task; now: number; onPress: () => void }) {
  const rewardName = task.reward.nickname ?? task.reward.species.name;
  const statusIcon: IconSpec = { family: "ionicons", name: "ellipse" };

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      className="gap-2 rounded-xl border border-border bg-surface p-3"
    >
      <View className="flex-row items-center justify-between">
        <Text className="flex-1 font-sans-semibold text-sm text-text" numberOfLines={1}>
          {task.title}
        </Text>
        <View
          className="flex-row items-center gap-1 rounded-full px-2 py-0.5"
          style={{ backgroundColor: `${STATUS_COLOR[task.status]}22` }}
        >
          <Icon {...statusIcon} size={8} color={STATUS_COLOR[task.status]} />
          <Text
            className="font-sans-semibold text-[10px] uppercase"
            style={{ color: STATUS_COLOR[task.status] }}
          >
            {task.status}
          </Text>
        </View>
      </View>
      <View className="flex-row items-center gap-1.5">
        <Icon family="material-community" name="egg-easter" size={13} color={COLORS.textSubtle} />
        <Text className="font-sans text-xs text-text-subtle">
          Reward: {rewardName} (Lv. {task.reward.level})
        </Text>
      </View>
      {task.status === "open" && task.expires_at && !isTaskPastExpiry(task, now) ? (
        <View className="flex-row items-center gap-1.5">
          <Icon family="ionicons" name="time-outline" size={13} color={COLORS.textSubtle} />
          <Text className="font-sans text-xs text-text-subtle">
            {formatTimeUntilExpiry(task.expires_at, now)}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}
