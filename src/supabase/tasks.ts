import { supabase } from "./client";
import type { Tables } from "./database.types";
import type { PlayerWobblin } from "./wobblins";

export type TaskStatus = Tables<"tasks">["status"];

type TaskParticipant = Pick<
  Tables<"players">,
  "id" | "username" | "avatar" | "tasks_approved_count" | "tasks_rejected_count"
>;

export type Task = Tables<"tasks"> & {
  reward: PlayerWobblin;
  creator: TaskParticipant;
  acceptor: TaskParticipant | null;
  group: Pick<Tables<"groups">, "is_public">;
};

const TASK_SELECT =
  "*, reward:player_wobblins!tasks_reward_wobblin_id_fkey(*, species:wobblin_species(*)), creator:players!tasks_creator_id_fkey(id, username, avatar, tasks_approved_count, tasks_rejected_count), acceptor:players!tasks_accepted_by_fkey(id, username, avatar, tasks_approved_count, tasks_rejected_count), group:groups(is_public)";

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
 *
 * `expiresAt` is an ISO timestamp for when an unaccepted task lapses, `null`
 * for no expiry, or `undefined` to fall back to the RPC's default (7 days) —
 * matches how the picker on the create-task screen distinguishes those three.
 */
export async function createTask(
  groupId: string,
  title: string,
  description: string,
  rewardWobblinId: string,
  expiresAt?: string | null,
) {
  const { data, error } = await supabase.rpc("create_task", {
    p_group_id: groupId,
    p_title: title,
    p_description: description,
    p_reward_wobblin_id: rewardWobblinId,
    // The generated RPC arg type doesn't model "nullable optional" (Postgres accepts an
    // explicit null here to mean "no expiry" even though the generator only sees `string | undefined`).
    ...(expiresAt !== undefined ? { p_expires_at: expiresAt as string | undefined } : {}),
  });

  if (error) throw error;
  return data as Tables<"tasks">;
}

export async function acceptTask(taskId: string) {
  const { data, error } = await supabase.rpc("accept_task", { p_task_id: taskId });

  if (error) throw error;
  return data as Tables<"tasks">;
}

/**
 * Flips a stale, still-`open` task to `expired` and frees its reward lock via
 * the `expire_task` RPC, re-validating `expires_at` server-side. Called
 * opportunistically by the client (task feed/detail on load) so an expired
 * task's status catches up without anyone needing to attempt — and fail — an
 * accept first; `accept_task` also self-expires as a fallback if this is missed.
 */
export async function expireTask(taskId: string) {
  const { data, error } = await supabase.rpc("expire_task", { p_task_id: taskId });

  if (error) throw error;
  return data as Tables<"tasks">;
}

const SUBMISSION_BUCKET = "task-submissions";

/**
 * Uploads a task-submission evidence photo to the private `task-submissions`
 * bucket and returns its storage path (`{task_id}/{filename}`) — storage RLS
 * only allows the task's current accepter to upload here while it's
 * `accepted`, mirroring `submit_task`'s own ownership/status check.
 */
export async function uploadSubmissionPhoto(taskId: string, localUri: string, mimeType: string) {
  const response = await fetch(localUri);
  const arrayBuffer = await response.arrayBuffer();
  const extension = mimeType.split("/")[1] ?? "jpg";
  const path = `${taskId}/${Date.now()}.${extension}`;

  const { error } = await supabase.storage
    .from(SUBMISSION_BUCKET)
    .upload(path, arrayBuffer, { contentType: mimeType });

  if (error) throw error;
  return path;
}

/** Signed URL (1 hour) for displaying a submission's evidence photo — the bucket is private. */
export async function getSubmissionPhotoUrl(path: string) {
  const { data, error } = await supabase.storage.from(SUBMISSION_BUCKET).createSignedUrl(path, 60 * 60);

  if (error) throw error;
  return data.signedUrl;
}

export async function submitTask(taskId: string, submissionNote: string, submissionPhotoPath?: string | null) {
  const { data, error } = await supabase.rpc("submit_task", {
    p_task_id: taskId,
    p_submission_note: submissionNote,
    // Same generated-type caveat as create_task's p_expires_at — the RPC accepts an
    // explicit null (no photo attached) even though the generator only sees `string | undefined`.
    ...(submissionPhotoPath !== undefined
      ? { p_submission_photo_path: submissionPhotoPath as string | undefined }
      : {}),
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

/**
 * Files a one-time counter-explanation on a rejected task via the
 * `file_dispute` RPC. Informational only — the task's status stays
 * `rejected`; the creator's original decision is still final, matching the
 * existing model where ownership only ever moves on approval.
 */
export async function fileDispute(taskId: string, reason: string) {
  const { data, error } = await supabase.rpc("file_dispute", { p_task_id: taskId, p_reason: reason });

  if (error) throw error;
  return data as Tables<"tasks">;
}

export async function cancelTask(taskId: string) {
  const { data, error } = await supabase.rpc("cancel_task", { p_task_id: taskId });

  if (error) throw error;
  return data as Tables<"tasks">;
}
