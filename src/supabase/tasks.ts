import { supabase } from "./client";
import type { Tables } from "./database.types";
import type { PlayerWobblin } from "./wobblins";

export type TaskStatus = Tables<"tasks">["status"];

export type Task = Tables<"tasks"> & {
  reward: PlayerWobblin;
  creator: Pick<Tables<"players">, "id" | "username" | "avatar">;
  acceptor: Pick<Tables<"players">, "id" | "username" | "avatar"> | null;
};

const TASK_SELECT =
  "*, reward:player_wobblins!tasks_reward_wobblin_id_fkey(*, species:wobblin_species(*)), creator:players!tasks_creator_id_fkey(id, username, avatar), acceptor:players!tasks_accepted_by_fkey(id, username, avatar)";

/** Every task in a group, most recently created first. */
export async function getGroupTasks(groupId: string) {
  const { data, error } = await supabase
    .from("tasks")
    .select(TASK_SELECT)
    .eq("group_id", groupId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as unknown as Task[];
}

/**
 * Tasks the player either created or accepted that haven't reached a final
 * state yet, across every group they belong to — powers the Home screen's
 * "Active Tasks" summary.
 */
export async function getMyActiveTasks(playerId: string) {
  const { data, error } = await supabase
    .from("tasks")
    .select(TASK_SELECT)
    .or(`creator_id.eq.${playerId},accepted_by.eq.${playerId}`)
    .in("status", ["open", "accepted", "submitted"])
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as unknown as Task[];
}

export async function getTask(taskId: string) {
  const { data, error } = await supabase.from("tasks").select(TASK_SELECT).eq("id", taskId).maybeSingle();

  if (error) throw error;
  return data as unknown as Task | null;
}

/**
 * The still-active (not yet resolved) task that a Wobblin is locked to, if any —
 * powers the "locked as a task reward" banner's tap-through on the Monster Detail
 * screen. A reward Wobblin can only be attached to one active task at a time
 * (enforced by a partial unique index), so this is always at most one row.
 */
export async function getActiveTaskForRewardWobblin(rewardWobblinId: string) {
  const { data, error } = await supabase
    .from("tasks")
    .select("id")
    .eq("reward_wobblin_id", rewardWobblinId)
    .in("status", ["open", "accepted", "submitted"])
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Creates a task with an owned, unlocked Wobblin as its reward via the
 * `create_task` RPC — it locks the reward Wobblin and inserts the task in
 * one transaction, so a tampered client can't publish a task without a
 * valid, exclusively-held reward.
 */
export async function createTask(
  groupId: string,
  title: string,
  description: string,
  rewardWobblinId: string,
) {
  const { data, error } = await supabase.rpc("create_task", {
    p_group_id: groupId,
    p_title: title,
    p_description: description,
    p_reward_wobblin_id: rewardWobblinId,
  });

  if (error) throw error;
  return data as Tables<"tasks">;
}

export async function acceptTask(taskId: string) {
  const { data, error } = await supabase.rpc("accept_task", { p_task_id: taskId });

  if (error) throw error;
  return data as Tables<"tasks">;
}

export async function submitTask(taskId: string, submissionNote: string) {
  const { data, error } = await supabase.rpc("submit_task", {
    p_task_id: taskId,
    p_submission_note: submissionNote,
  });

  if (error) throw error;
  return data as Tables<"tasks">;
}

/**
 * Approves or rejects a submitted task via the `review_task` RPC. On
 * approval the reward Wobblin's ownership transfers server-side — the
 * client never performs the transfer itself.
 */
export async function reviewTask(taskId: string, approve: boolean, resolutionNote: string) {
  const { data, error } = await supabase.rpc("review_task", {
    p_task_id: taskId,
    p_approve: approve,
    p_resolution_note: resolutionNote,
  });

  if (error) throw error;
  return data as Tables<"tasks">;
}

export async function cancelTask(taskId: string) {
  const { data, error } = await supabase.rpc("cancel_task", { p_task_id: taskId });

  if (error) throw error;
  return data as Tables<"tasks">;
}
