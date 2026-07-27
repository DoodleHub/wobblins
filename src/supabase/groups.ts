import { supabase } from "./client";
import type { Tables } from "./database.types";

export type Group = Tables<"groups">;

export type GroupMember = Tables<"group_members"> & {
  player: Pick<Tables<"players">, "id" | "username" | "avatar">;
};

/**
 * Creates a private group and adds the caller as its owner, atomically, via
 * the `create_group` RPC — a plain client-side insert into `groups` followed
 * by a separate insert into `group_members` couldn't guarantee both succeed
 * or neither does.
 */
export async function createGroup(name: string) {
  const { data, error } = await supabase.rpc("create_group", { p_name: name });

  if (error) throw error;
  return data as Group;
}

/** Joins a group by its shareable invite code via the `join_group` RPC. */
export async function joinGroup(inviteCode: string) {
  const { data, error } = await supabase.rpc("join_group", { p_invite_code: inviteCode });

  if (error) throw error;
  return data as Group;
}

/** Every group the player belongs to, most recently joined first. */
export async function getMyGroups(playerId: string) {
  const { data, error } = await supabase
    .from("group_members")
    .select("*, group:groups(*)")
    .eq("player_id", playerId)
    .order("joined_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => row.group).filter((group): group is Group => group != null);
}

export async function getGroup(groupId: string) {
  const { data, error } = await supabase.from("groups").select("*").eq("id", groupId).maybeSingle();

  if (error) throw error;
  return data as Group | null;
}

/** Every member of a group, joined with their profile, oldest (owner) first. */
export async function getGroupMembers(groupId: string) {
  const { data, error } = await supabase
    .from("group_members")
    .select("*, player:players(id, username, avatar)")
    .eq("group_id", groupId)
    .order("joined_at", { ascending: true });

  if (error) throw error;
  return data as GroupMember[];
}
