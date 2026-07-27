import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  acceptTask,
  cancelTask,
  createTask,
  getActiveTaskForRewardWobblin,
  getGroupTasks,
  getMyActiveTasks,
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

/** Publishing a task locks its reward Wobblin, so the creator's collection needs refreshing too. */
export function useCreateTask(groupId: string | undefined, playerId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      title,
      description,
      rewardWobblinId,
    }: {
      title: string;
      description: string;
      rewardWobblinId: string;
    }) => createTask(groupId!, title, description, rewardWobblinId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.groupTasks(groupId) });
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
    mutationFn: ({ taskId, note }: { taskId: string; note: string }) => submitTask(taskId, note),
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
