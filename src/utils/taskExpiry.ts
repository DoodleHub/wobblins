import type { Task } from "@/supabase/tasks";

/** Preset durations offered on the create-task screen; `hours: null` means no expiry. */
export const TASK_EXPIRY_PRESETS: { label: string; hours: number | null }[] = [
  { label: "1 Day", hours: 24 },
  { label: "3 Days", hours: 72 },
  { label: "7 Days", hours: 168 },
  { label: "14 Days", hours: 336 },
  { label: "No Expiry", hours: null },
];

/** Matches the `create_task` RPC's own default so the picker's initial selection is accurate. */
export const DEFAULT_TASK_EXPIRY_HOURS = 168;

/**
 * Display-only mirror of the expiry check the `expire_task`/`accept_task`
 * RPCs re-derive server-side — an open task past `expires_at` reads as
 * expired here even before the DB row's status has caught up.
 */
export function isTaskPastExpiry(task: Pick<Task, "status" | "expires_at">, now: number): boolean {
  return task.status === "open" && task.expires_at != null && now >= new Date(task.expires_at).getTime();
}

/** e.g. "Expires in 3d", "Expires in 4h", "Expires in 12m" — falls back to "Expires soon" under a minute. */
export function formatTimeUntilExpiry(expiresAt: string, now: number): string {
  const msLeft = new Date(expiresAt).getTime() - now;
  if (msLeft <= 0) return "Expired";

  const minutes = Math.floor(msLeft / (60 * 1000));
  const hours = Math.floor(msLeft / (60 * 60 * 1000));
  const days = Math.floor(msLeft / (24 * 60 * 60 * 1000));

  if (days > 0) return `Expires in ${days}d`;
  if (hours > 0) return `Expires in ${hours}h`;
  if (minutes > 0) return `Expires in ${minutes}m`;
  return "Expires soon";
}
