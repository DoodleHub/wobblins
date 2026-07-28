import type { IconSpec } from "@/components/Icon";

export type AchievementMetric =
  | "wobblins_owned"
  | "species_discovered"
  | "max_level"
  | "evolutions_count"
  | "eggs_hatched_count"
  | "trades_completed_count"
  | "marketplace_sales_count"
  | "summons_count"
  | "essence_earned_lifetime";

export type AchievementTier = "bronze" | "silver" | "gold";

/**
 * Icon per achievement metric, keyed by data rather than stored as raw emoji in the
 * `achievement_definitions` table — same "data-driven icon reference" pattern as
 * `ELEMENT_ICON` in theme.ts.
 */
export const ACHIEVEMENT_METRIC_ICON: Record<AchievementMetric, IconSpec> = {
  wobblins_owned: { family: "material-community", name: "paw" },
  species_discovered: { family: "ionicons", name: "sparkles" },
  max_level: { family: "ionicons", name: "trending-up" },
  evolutions_count: { family: "material-community", name: "arrow-up-bold-circle" },
  eggs_hatched_count: { family: "material-community", name: "egg" },
  trades_completed_count: { family: "ionicons", name: "swap-horizontal" },
  marketplace_sales_count: { family: "ionicons", name: "storefront" },
  summons_count: { family: "ionicons", name: "sparkles" },
  essence_earned_lifetime: { family: "ionicons", name: "flash" },
};
