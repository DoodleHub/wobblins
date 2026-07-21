import type { BattleRecord } from "@/supabase/battles";
import type { PlayerWobblin } from "@/supabase/wobblins";

export type ActivityItem =
  | { kind: "capture"; id: string; createdAt: string; wobblinName: string; speciesName: string; element: string }
  | { kind: "battle"; id: string; createdAt: string; won: boolean; enemyName: string; element: string };

/**
 * Merges captures and battle results into one feed for the Profile screen's
 * Recent Activity card, newest first. Both sources are read directly from
 * their tables (no synthetic "gold received" entries) since there's no
 * historical log for one-off rewards like the daily bonus, only their
 * current totals.
 */
export function buildRecentActivity(
  wobblins: PlayerWobblin[] | undefined,
  battles: BattleRecord[] | undefined,
  limit = 3,
): ActivityItem[] {
  const captures: ActivityItem[] = (wobblins ?? []).map((wobblin) => ({
    kind: "capture",
    id: wobblin.id,
    createdAt: wobblin.created_at,
    wobblinName: wobblin.nickname ?? wobblin.species.name,
    speciesName: wobblin.species.name,
    element: wobblin.species.element,
  }));

  const battleItems: ActivityItem[] = (battles ?? [])
    .filter((battle) => battle.enemy_species)
    .map((battle) => ({
      kind: "battle",
      id: battle.id,
      createdAt: battle.created_at,
      won: battle.winner === "player",
      enemyName: battle.enemy_species!.name,
      element: battle.enemy_species!.element,
    }));

  return [...captures, ...battleItems]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

/** Coarse "2h ago" / "3d ago" style relative timestamp for activity rows. */
export function formatRelativeTime(isoDate: string): string {
  const minutes = Math.floor((Date.now() - new Date(isoDate).getTime()) / 60_000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
