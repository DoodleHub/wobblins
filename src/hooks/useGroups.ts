import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createGroup,
  getGroup,
  getGroupMembers,
  getMyGroups,
  joinGroup,
  joinPublicGroup,
  listPublicGroups,
} from "@/supabase/groups";

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
    mutationFn: ({ name, isPublic }: { name: string; isPublic?: boolean }) => createGroup(name, isPublic),
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

/** Groups open to discovery, for the Groups tab's "Discover" browse list. */
export function usePublicGroups(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.publicGroups(),
    queryFn: () => listPublicGroups(),
    enabled,
  });
}

export function useJoinPublicGroup(playerId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (groupId: string) => joinPublicGroup(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.myGroups(playerId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.publicGroups() });
    },
  });
}
