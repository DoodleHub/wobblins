import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getMyTaskApplication,
  listTaskApplications,
  requestTask,
  selectApplicant,
  withdrawTaskApplication,
} from "@/supabase/taskApplications";

import { queryKeys } from "./queryKeys";

/** Applicant list for a public-group task's open request pool — the creator's picker. */
export function useTaskApplications(taskId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.taskApplications(taskId),
    queryFn: () => listTaskApplications(taskId!),
    enabled: !!taskId && enabled,
  });
}

/** Whether the caller has already requested a given task, for switching between "Request" and "Requested". */
export function useMyTaskApplication(
  taskId: string | undefined,
  playerId: string | undefined,
  enabled: boolean,
) {
  return useQuery({
    queryKey: queryKeys.myTaskApplication(taskId, playerId),
    queryFn: () => getMyTaskApplication(taskId!, playerId!),
    enabled: !!taskId && !!playerId && enabled,
  });
}

export function useRequestTask(taskId: string | undefined, playerId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => requestTask(taskId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.taskApplications(taskId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.myTaskApplication(taskId, playerId) });
    },
  });
}

export function useWithdrawTaskApplication(taskId: string | undefined, playerId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => withdrawTaskApplication(taskId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.taskApplications(taskId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.myTaskApplication(taskId, playerId) });
    },
  });
}

/** Picking an applicant resolves the task, so the group's task feed needs refreshing too. */
export function useSelectApplicant(taskId: string | undefined, groupId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (applicantId: string) => selectApplicant(taskId!, applicantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.task(taskId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.taskApplications(taskId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.groupTasks(groupId) });
    },
  });
}
