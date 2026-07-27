import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
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
import {
  useMyTaskApplication,
  useRequestTask,
  useSelectApplicant,
  useTaskApplications,
  useWithdrawTaskApplication,
} from "@/hooks/useTaskApplications";
import {
  useAcceptTask,
  useCancelTask,
  useExpireTask,
  useFileDispute,
  useReviewTask,
  useSubmissionPhotoUrl,
  useSubmitTask,
  useTask,
} from "@/hooks/useTasks";
import { useSupabase } from "@/supabase/SupabaseProvider";
import { uploadSubmissionPhoto } from "@/supabase/tasks";
import type { RewardToastData } from "@/components/RewardToast";
import { formatTimeUntilExpiry, isTaskPastExpiry } from "@/utils/taskExpiry";
import { getErrorMessage } from "@/utils/errors";

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useSupabase();
  const playerId = session?.user.id;

  const { data: task, isPending, error, refetch: refetchTask } = useTask(id);
  const groupId = task?.group_id;
  const isGroupPublic = task?.group?.is_public ?? false;
  const isTaskCreator = task?.creator_id === playerId;

  const acceptTask = useAcceptTask(groupId);
  const submitTask = useSubmitTask(groupId);
  const reviewTask = useReviewTask(groupId, playerId);
  const cancelTask = useCancelTask(groupId, playerId);
  const expireTask = useExpireTask(groupId, playerId);
  const fileDispute = useFileDispute(groupId, playerId);
  const requestTask = useRequestTask(task?.id, playerId);
  const withdrawApplication = useWithdrawTaskApplication(task?.id, playerId);
  const selectApplicant = useSelectApplicant(task?.id, groupId);
  const taskApplications = useTaskApplications(
    task?.id,
    isGroupPublic && task?.status === "open" && isTaskCreator,
  );
  const myApplication = useMyTaskApplication(
    task?.id,
    playerId,
    isGroupPublic && task?.status === "open" && !isTaskCreator,
  );

  // Can sit frozen underneath nothing itself, but revisiting the same task after
  // navigating away and back (e.g. via group detail) can otherwise show a stale
  // snapshot from before it was frozen — same fix as the other list/detail screens.
  // Also opportunistically flips a still-`open` task past its expiry, freeing the
  // reward lock without requiring someone to attempt (and fail) an accept first.
  useFocusEffect(
    useCallback(() => {
      refetchTask().then(({ data }) => {
        if (data && isTaskPastExpiry(data, Date.now())) {
          expireTask.mutate(data.id);
        }
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refetchTask]),
  );

  const [submissionNote, setSubmissionNote] = useState("");
  const [submissionPhoto, setSubmissionPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [resolutionNote, setResolutionNote] = useState("");
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [toast, setToast] = useState<RewardToastData | null>(null);
  // Captured once per mount for the countdown display — same rationale as the
  // egg-cadence "now" mirror on the Monster Detail screen: display-only, since
  // expire_task/accept_task re-validate the deadline server-side regardless.
  const [now] = useState(() => Date.now());

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

  const isAcceptor = task.accepted_by === playerId;
  const pastExpiry = isTaskPastExpiry(task, now);
  const rewardElement = task.reward.species.element.toLowerCase() as Element;
  const rewardRarity = task.reward.species.rarity.toLowerCase() as Rarity;
  const rewardName = task.reward.nickname ?? task.reward.species.name;
  const rewardArt = SPECIES_ART[task.reward.species.name];

  const onAccept = () => {
    setActionError(null);
    acceptTask.mutate(task.id, { onError: (err) => setActionError(getErrorMessage(err)) });
  };

  const onRequest = () => {
    setActionError(null);
    requestTask.mutate(undefined, { onError: (err) => setActionError(getErrorMessage(err)) });
  };

  const onWithdraw = () => {
    setActionError(null);
    withdrawApplication.mutate(undefined, { onError: (err) => setActionError(getErrorMessage(err)) });
  };

  const onSelectApplicant = (applicantId: string) => {
    setActionError(null);
    selectApplicant.mutate(applicantId, { onError: (err) => setActionError(getErrorMessage(err)) });
  };

  const onPickPhoto = async () => {
    setActionError(null);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      setActionError("Photo library permission is required to attach evidence.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.6,
    });

    if (!result.canceled && result.assets[0]) {
      setSubmissionPhoto(result.assets[0]);
    }
  };

  const onSubmit = async () => {
    setActionError(null);
    try {
      let photoPath: string | undefined;
      if (submissionPhoto) {
        setUploadingPhoto(true);
        photoPath = await uploadSubmissionPhoto(
          task.id,
          submissionPhoto.uri,
          submissionPhoto.mimeType ?? "image/jpeg",
        );
      }
      submitTask.mutate(
        { taskId: task.id, note: submissionNote.trim(), photoPath },
        { onError: (err) => setActionError(getErrorMessage(err)) },
      );
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setUploadingPhoto(false);
    }
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

  const onFileDispute = () => {
    if (!disputeReason.trim()) return;
    setActionError(null);
    fileDispute.mutate(
      { taskId: task.id, reason: disputeReason.trim() },
      {
        onSuccess: () => setDisputeOpen(false),
        onError: (err) => setActionError(getErrorMessage(err)),
      },
    );
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
              Created by {task.creator.username} ({task.creator.tasks_approved_count} completed)
              {task.acceptor
                ? ` · Accepted by ${task.acceptor.username} (${task.acceptor.tasks_approved_count} completed)`
                : ""}
            </Text>
          </View>
          {task.status === "open" && task.expires_at && !pastExpiry ? (
            <View className="flex-row items-center gap-1.5">
              <Icon family="ionicons" name="time-outline" size={14} color={COLORS.textSubtle} />
              <Text className="font-sans text-xs text-text-subtle">
                {formatTimeUntilExpiry(task.expires_at, now)}
              </Text>
            </View>
          ) : null}
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

        {task.submission_photo_path ? <SubmissionPhoto path={task.submission_photo_path} /> : null}

        {task.resolution_note ? (
          <View className="gap-2 rounded-2xl border border-border bg-surface p-4">
            <Text className="font-display text-sm uppercase tracking-wide text-text-muted">Review Note</Text>
            <Text className="font-sans text-sm text-text-muted">{task.resolution_note}</Text>
          </View>
        ) : null}

        {task.dispute_note ? (
          <View className="gap-2 rounded-2xl border border-danger/30 bg-danger/10 p-4">
            <View className="flex-row items-center gap-1.5">
              <Icon family="ionicons" name="flag" size={14} color={COLORS.danger} />
              <Text className="font-display text-sm uppercase tracking-wide text-danger">Disputed</Text>
            </View>
            <Text className="font-sans text-sm text-text-muted">{task.dispute_note}</Text>
          </View>
        ) : task.status === "rejected" && isAcceptor ? (
          <View className="gap-3">
            {disputeOpen ? (
              <View className="gap-3 rounded-2xl border border-border bg-surface p-4">
                <TextField
                  label="Why do you disagree with this rejection?"
                  value={disputeReason}
                  onChangeText={setDisputeReason}
                  placeholder="Explain your side"
                  multiline
                  numberOfLines={3}
                  maxLength={280}
                />
                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Button label="Cancel" variant="secondary" onPress={() => setDisputeOpen(false)} />
                  </View>
                  <View className="flex-1">
                    <Button
                      label="Submit Dispute"
                      onPress={onFileDispute}
                      loading={fileDispute.isPending}
                      disabled={!disputeReason.trim()}
                    />
                  </View>
                </View>
              </View>
            ) : (
              <Button label="Dispute This Decision" variant="secondary" onPress={() => setDisputeOpen(true)} />
            )}
          </View>
        ) : null}

        {task.status === "open" && isTaskCreator && isGroupPublic && (
          <View className="gap-3">
            <Text className="font-display text-sm uppercase tracking-wide text-text-muted">Requests</Text>
            {taskApplications.data && taskApplications.data.length > 0 ? (
              <View className="gap-2">
                {taskApplications.data.map((application) => (
                  <View
                    key={application.id}
                    className="flex-row items-center justify-between rounded-xl border border-border bg-surface p-3"
                  >
                    <Text className="font-sans-semibold text-sm text-text">{application.applicant.username}</Text>
                    <Button
                      label="Select"
                      onPress={() => onSelectApplicant(application.applicant_id)}
                      loading={selectApplicant.isPending}
                    />
                  </View>
                ))}
              </View>
            ) : (
              <Text className="font-sans text-sm text-text-subtle">No requests yet.</Text>
            )}
          </View>
        )}

        {actionError && (
          <View className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3">
            <Text className="font-sans-medium text-sm text-danger">{actionError}</Text>
          </View>
        )}

        {task.status === "open" && !isTaskCreator && !pastExpiry && !isGroupPublic && (
          <Button label="Accept Task" onPress={onAccept} loading={acceptTask.isPending} />
        )}

        {task.status === "open" && !isTaskCreator && !pastExpiry && isGroupPublic && (
          <View className="gap-3">
            {myApplication.data ? (
              <View className="gap-3 rounded-2xl border border-border bg-surface p-4">
                <View className="flex-row items-center gap-1.5">
                  <Icon family="ionicons" name="hourglass-outline" size={16} color={COLORS.textMuted} />
                  <Text className="flex-1 font-sans-semibold text-sm text-text-muted">
                    Requested — waiting for the creator to pick someone
                  </Text>
                </View>
                <Button
                  label="Withdraw Request"
                  variant="secondary"
                  onPress={onWithdraw}
                  loading={withdrawApplication.isPending}
                />
              </View>
            ) : (
              <Button label="Request to Accept" onPress={onRequest} loading={requestTask.isPending} />
            )}
          </View>
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

            <View className="gap-2">
              <Text className="font-display text-sm uppercase tracking-wide text-text-muted">
                Evidence Photo (optional)
              </Text>
              {submissionPhoto ? (
                <View>
                  <Image
                    source={{ uri: submissionPhoto.uri }}
                    style={{ width: "100%", height: 180, borderRadius: 16 }}
                    contentFit="cover"
                  />
                  <Pressable
                    onPress={() => setSubmissionPhoto(null)}
                    accessibilityRole="button"
                    accessibilityLabel="Remove photo"
                    className="absolute right-2 top-2 h-8 w-8 items-center justify-center rounded-full"
                    style={{ backgroundColor: COLORS.background }}
                  >
                    <Icon family="ionicons" name="close" size={16} color={COLORS.text} />
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={onPickPhoto}
                  accessibilityRole="button"
                  className="flex-row items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-surface p-4"
                >
                  <Icon family="ionicons" name="camera-outline" size={18} color={COLORS.textMuted} />
                  <Text className="font-sans-semibold text-sm text-text-muted">Add Photo</Text>
                </Pressable>
              )}
            </View>

            <Button
              label="Submit for Review"
              onPress={onSubmit}
              loading={submitTask.isPending || uploadingPhoto}
            />
          </View>
        )}

        {task.status === "submitted" && isTaskCreator && (
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

        {isTaskCreator && (task.status === "open" || task.status === "accepted") && (
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

function SubmissionPhoto({ path }: { path: string }) {
  const { data: url } = useSubmissionPhotoUrl(path);

  if (!url) return null;

  return (
    <View className="gap-2 rounded-2xl border border-border bg-surface p-4">
      <Text className="font-display text-sm uppercase tracking-wide text-text-muted">Evidence Photo</Text>
      <Image source={{ uri: url }} style={{ width: "100%", height: 220, borderRadius: 16 }} contentFit="cover" />
    </View>
  );
}

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
