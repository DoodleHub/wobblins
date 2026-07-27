import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  acceptTask,
  cancelTask,
  createTask,
  expireTask,
  fileDispute,
  getActiveTaskForRewardWobblin,
  getGroupTasks,
  getMyActiveTasks,
  getSubmissionPhotoUrl,
  getTask,
  reviewTask,
  submitTask,
} from "@/supabase/tasks";

import { queryKeys } from "./queryKeys";

export function useGroupTasks(groupId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.groupTasks(groupId),
    queryFn: () => getGroupTasks(groupId!),
    enabled: !!groupId,
  });
}

export function useMyActiveTasks(playerId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.myActiveTasks(playerId),
    queryFn: () => getMyActiveTasks(playerId!),
    enabled: !!playerId,
  });
}

export function useTask(taskId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.task(taskId),
    queryFn: () => getTask(taskId!),
    enabled: !!taskId,
  });
}

/** Looks up the active task a Wobblin is currently locked to, for the "locked as a task reward" banner's tap-through. */
export function useTaskForRewardWobblin(wobblinId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.taskForRewardWobblin(wobblinId),
    queryFn: () => getActiveTaskForRewardWobblin(wobblinId!),
    enabled: !!wobblinId && enabled,
  });
}

/**
 * Signed URL for a submission's evidence photo — the `task-submissions`
 * bucket is private, so every view needs a freshly-signed URL rather than a
 * public one. `getSubmissionPhotoUrl` signs for 1 hour; refetched well
 * before that to avoid ever showing a broken image mid-session.
 */
export function useSubmissionPhotoUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.submissionPhotoUrl(path),
    queryFn: () => getSubmissionPhotoUrl(path!),
    enabled: !!path,
    staleTime: 45 * 60 * 1000,
  });
}

/** Publishing a task locks its reward Wobblin, so the creator's collection needs refreshing too. */
export function useCreateTask(groupId: string | undefined, playerId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      title,
      description,
      rewardWobblinId,
      expiresAt,
    }: {
      title: string;
      description: string;
      rewardWobblinId: string;
      expiresAt?: string | null;
    }) => createTask(groupId!, title, description, rewardWobblinId, expiresAt),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.groupTasks(groupId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.playerWobblins(playerId) });
    },
  });
}

/**
 * Opportunistically flips a stale `open` task to `expired`, freeing its reward
 * lock. Fired by the group task feed / task detail screens when they notice an
 * open task past its `expires_at` — a display-only trigger, since `expire_task`
 * re-validates the deadline server-side regardless of what prompted the call.
 */
export function useExpireTask(groupId: string | undefined, playerId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskId: string) => expireTask(taskId),
    onSuccess: (_result, taskId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.groupTasks(groupId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.task(taskId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.playerWobblins(playerId) });
    },
  });
}

export function useAcceptTask(groupId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskId: string) => acceptTask(taskId),
    onSuccess: (_result, taskId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.groupTasks(groupId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.task(taskId) });
    },
  });
}

export function useSubmitTask(groupId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      taskId,
      note,
      photoPath,
    }: {
      taskId: string;
      note: string;
      photoPath?: string | null;
    }) => submitTask(taskId, note, photoPath),
    onSuccess: (_result, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.groupTasks(groupId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.task(taskId) });
    },
  });
}

/** Approving a task transfers the reward Wobblin, so both collections need refreshing. */
export function useReviewTask(groupId: string | undefined, playerId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, approve, note }: { taskId: string; approve: boolean; note: string }) =>
      reviewTask(taskId, approve, note),
    onSuccess: (_result, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.groupTasks(groupId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.task(taskId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.playerWobblins(playerId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.featuredWobblin(playerId) });
    },
  });
}

/** Filing a dispute nudges the caller's own reputation counters, so their profile needs refreshing too. */
export function useFileDispute(groupId: string | undefined, playerId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, reason }: { taskId: string; reason: string }) => fileDispute(taskId, reason),
    onSuccess: (_result, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.groupTasks(groupId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.task(taskId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.player(playerId) });
    },
  });
}

export function useCancelTask(groupId: string | undefined, playerId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskId: string) => cancelTask(taskId),
    onSuccess: (_result, taskId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.groupTasks(groupId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.task(taskId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.playerWobblins(playerId) });
    },
  });
}
