/** "Ready to hatch" once `hatchReadyAt` has passed, otherwise a friendly countdown to it. */
export function hatchCountdownLabel(hatchReadyAt: string | null, now: number): string {
  if (!hatchReadyAt) return "";
  const msLeft = new Date(hatchReadyAt).getTime() - now;
  if (msLeft <= 0) return "Ready to hatch";
  const hours = Math.ceil(msLeft / (60 * 60 * 1000));
  if (hours < 24) return `Ready in ${hours}h`;
  return `Ready in ${Math.ceil(hours / 24)}d`;
}

export function isEggReady(hatchReadyAt: string | null, now: number): boolean {
  return !!hatchReadyAt && now >= new Date(hatchReadyAt).getTime();
}
