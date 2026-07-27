import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { Icon } from "@/components/Icon";
import { LoadingScreen } from "@/components/LoadingScreen";
import { MonsterCard } from "@/components/MonsterCard";
import { RewardToast } from "@/components/RewardToast";
import { TextField } from "@/components/TextField";
import { SPECIES_ART } from "@/constants/speciesArt";
import { COLORS, type Element, type Rarity } from "@/constants/theme";
import { useAcceptTask, useCancelTask, useReviewTask, useSubmitTask, useTask } from "@/hooks/useTasks";
import { useSupabase } from "@/supabase/SupabaseProvider";
import type { RewardToastData } from "@/components/RewardToast";
import { getErrorMessage } from "@/utils/errors";

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useSupabase();
  const playerId = session?.user.id;

  const { data: task, isPending, error, refetch: refetchTask } = useTask(id);
  const groupId = task?.group_id;

  // Can sit frozen underneath nothing itself, but revisiting the same task after
  // navigating away and back (e.g. via group detail) can otherwise show a stale
  // snapshot from before it was frozen — same fix as the other list/detail screens.
  useFocusEffect(
    useCallback(() => {
      refetchTask();
    }, [refetchTask]),
  );

  const acceptTask = useAcceptTask(groupId);
  const submitTask = useSubmitTask(groupId);
  const reviewTask = useReviewTask(groupId, playerId);
  const cancelTask = useCancelTask(groupId, playerId);

  const [submissionNote, setSubmissionNote] = useState("");
  const [resolutionNote, setResolutionNote] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [toast, setToast] = useState<RewardToastData | null>(null);

  if (isPending) {
    return <LoadingScreen message="Loading task…" />;
  }

  if (error || !task) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-background px-8">
        <Text className="font-sans-medium text-sm text-danger">
          {error ? getErrorMessage(error) : "Task not found."}
        </Text>
        <Button label="Back" variant="secondary" onPress={() => router.back()} />
      </View>
    );
  }

  const isCreator = task.creator_id === playerId;
  const isAcceptor = task.accepted_by === playerId;
  const rewardElement = task.reward.species.element.toLowerCase() as Element;
  const rewardRarity = task.reward.species.rarity.toLowerCase() as Rarity;
  const rewardName = task.reward.nickname ?? task.reward.species.name;
  const rewardArt = SPECIES_ART[task.reward.species.name];

  const onAccept = () => {
    setActionError(null);
    acceptTask.mutate(task.id, { onError: (err) => setActionError(getErrorMessage(err)) });
  };

  const onSubmit = () => {
    setActionError(null);
    submitTask.mutate(
      { taskId: task.id, note: submissionNote.trim() },
      { onError: (err) => setActionError(getErrorMessage(err)) },
    );
  };

  const onReview = (approve: boolean) => {
    setActionError(null);
    reviewTask.mutate(
      { taskId: task.id, approve, note: resolutionNote.trim() },
      {
        onSuccess: () => {
          if (approve) {
            setToast({
              icon: { family: "ionicons", name: "gift" },
              title: "Task Approved!",
              subtitle: `${task.acceptor?.username ?? "They"} received ${rewardName}`,
            });
          }
        },
        onError: (err) => setActionError(getErrorMessage(err)),
      },
    );
  };

  const onCancel = () => {
    setActionError(null);
    cancelTask.mutate(task.id, { onError: (err) => setActionError(getErrorMessage(err)) });
  };

  return (
    <View className="flex-1 bg-background">
      <RewardToast reward={toast} />
      <ScrollView
        className="flex-1"
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
          <StatusPill status={task.status} />
          <View style={{ width: 40 }} />
        </View>

        <View className="gap-2 rounded-2xl border border-border bg-surface p-4">
          <Text className="font-display-bold text-2xl text-text">{task.title}</Text>
          {task.description ? (
            <Text className="font-sans text-sm leading-5 text-text-muted">{task.description}</Text>
          ) : null}
          <View className="mt-2 flex-row items-center gap-1.5">
            <Icon family="ionicons" name="person-circle-outline" size={14} color={COLORS.textSubtle} />
            <Text className="font-sans text-xs text-text-subtle">
              Created by {task.creator.username}
              {task.acceptor ? ` · Accepted by ${task.acceptor.username}` : ""}
            </Text>
          </View>
        </View>

        <View className="gap-2">
          <Text className="font-display text-sm uppercase tracking-wide text-text-muted">Reward</Text>
          <MonsterCard
            name={rewardName}
            level={task.reward.level}
            element={rewardElement}
            rarity={rewardRarity}
            art={rewardArt}
            onPress={() => router.push(`/wobblin/${task.reward.id}`)}
          />
        </View>

        {task.submission_note ? (
          <View className="gap-2 rounded-2xl border border-border bg-surface p-4">
            <Text className="font-display text-sm uppercase tracking-wide text-text-muted">Submission Note</Text>
            <Text className="font-sans text-sm text-text-muted">{task.submission_note}</Text>
          </View>
        ) : null}

        {task.resolution_note ? (
          <View className="gap-2 rounded-2xl border border-border bg-surface p-4">
            <Text className="font-display text-sm uppercase tracking-wide text-text-muted">Review Note</Text>
            <Text className="font-sans text-sm text-text-muted">{task.resolution_note}</Text>
          </View>
        ) : null}

        {actionError && (
          <View className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3">
            <Text className="font-sans-medium text-sm text-danger">{actionError}</Text>
          </View>
        )}

        {task.status === "open" && !isCreator && (
          <Button label="Accept Task" onPress={onAccept} loading={acceptTask.isPending} />
        )}

        {task.status === "accepted" && isAcceptor && (
          <View className="gap-3">
            <TextField
              label="Submission Note (optional)"
              value={submissionNote}
              onChangeText={setSubmissionNote}
              placeholder="Describe what you did"
              multiline
              numberOfLines={3}
              maxLength={280}
            />
            <Button label="Submit for Review" onPress={onSubmit} loading={submitTask.isPending} />
          </View>
        )}

        {task.status === "submitted" && isCreator && (
          <View className="gap-3">
            <TextField
              label="Review Note (optional)"
              value={resolutionNote}
              onChangeText={setResolutionNote}
              placeholder="Any feedback for the submitter"
              multiline
              numberOfLines={3}
              maxLength={280}
            />
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Button
                  label="Reject"
                  variant="secondary"
                  onPress={() => onReview(false)}
                  loading={reviewTask.isPending}
                />
              </View>
              <View className="flex-1">
                <Button label="Approve" onPress={() => onReview(true)} loading={reviewTask.isPending} />
              </View>
            </View>
          </View>
        )}

        {isCreator && (task.status === "open" || task.status === "accepted") && (
          <Button label="Cancel Task" variant="secondary" onPress={onCancel} loading={cancelTask.isPending} />
        )}
      </ScrollView>
    </View>
  );
}

const STATUS_LABEL: Record<string, string> = {
  open: "Open",
  accepted: "In Progress",
  submitted: "Awaiting Review",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
  expired: "Expired",
};

const STATUS_COLOR: Record<string, string> = {
  open: COLORS.primary,
  accepted: COLORS.secondary,
  submitted: COLORS.gold,
  approved: COLORS.success,
  rejected: COLORS.danger,
  cancelled: COLORS.textSubtle,
  expired: COLORS.textSubtle,
};

function StatusPill({ status }: { status: string }) {
  const color = STATUS_COLOR[status] ?? COLORS.textSubtle;
  return (
    <View className="rounded-full px-3 py-1" style={{ backgroundColor: `${color}22` }}>
      <Text className="font-sans-semibold text-xs uppercase" style={{ color }}>
        {STATUS_LABEL[status] ?? status}
      </Text>
    </View>
  );
}
