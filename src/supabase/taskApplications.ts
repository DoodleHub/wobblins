import { supabase } from "./client";
import type { Tables } from "./database.types";

export type TaskApplication = Tables<"task_applications"> & {
  applicant: Pick<Tables<"players">, "id" | "username" | "avatar">;
};

/** Every pending request to accept a public-group task, oldest first — powers the creator's applicant list. */
export async function listTaskApplications(taskId: string) {
  const { data, error } = await supabase
    .from("task_applications")
    .select("*, applicant:players(id, username, avatar)")
    .eq("task_id", taskId)
    .order("applied_at", { ascending: true });

  if (error) throw error;
  return data as unknown as TaskApplication[];
}

/** The caller's own request for a task, if any — lets the UI show "Requested" instead of the request button. */
export async function getMyTaskApplication(taskId: string, playerId: string) {
  const { data, error } = await supabase
    .from("task_applications")
    .select("*")
    .eq("task_id", taskId)
    .eq("applicant_id", playerId)
    .maybeSingle();

  if (error) throw error;
  return data as Tables<"task_applications"> | null;
}

/**
 * Requests to accept a public-group task via the `request_task` RPC — the
 * counterpart to `acceptTask` used when the task's group is discoverable, so
 * the creator can pick among multiple strangers instead of first-come-first-served.
 */
export async function requestTask(taskId: string) {
  const { data, error } = await supabase.rpc("request_task", { p_task_id: taskId });

  if (error) throw error;
  return data as Tables<"task_applications">;
}

/** Withdraws the caller's own pending request via the `withdraw_task_application` RPC. */
export async function withdrawTaskApplication(taskId: string) {
  const { error } = await supabase.rpc("withdraw_task_application", { p_task_id: taskId });

  if (error) throw error;
}

/**
 * Creator-only: picks one applicant to accept the task via the
 * `select_applicant` RPC — moves the task straight to `accepted`, same
 * end-state as a direct `accept_task` for a private group.
 */
export async function selectApplicant(taskId: string, applicantId: string) {
  const { data, error } = await supabase.rpc("select_applicant", {
    p_task_id: taskId,
    p_applicant_id: applicantId,
  });

  if (error) throw error;
  return data as Tables<"tasks">;
}
