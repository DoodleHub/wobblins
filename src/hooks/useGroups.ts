import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createGroup, getGroup, getGroupMembers, getMyGroups, joinGroup } from "@/supabase/groups";

import { queryKeys } from "./queryKeys";

export function useMyGroups(playerId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.myGroups(playerId),
    queryFn: () => getMyGroups(playerId!),
    enabled: !!playerId,
  });
}

export function useGroup(groupId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.group(groupId),
    queryFn: () => getGroup(groupId!),
    enabled: !!groupId,
  });
}

export function useGroupMembers(groupId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.groupMembers(groupId),
    queryFn: () => getGroupMembers(groupId!),
    enabled: !!groupId,
  });
}

export function useCreateGroup(playerId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => createGroup(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.myGroups(playerId) });
    },
  });
}

export function useJoinGroup(playerId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (inviteCode: string) => joinGroup(inviteCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.myGroups(playerId) });
    },
  });
}
