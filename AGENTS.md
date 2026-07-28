# Wobblins - React Native + Supabase Monster Collection & Trading Game

## Project Overview

Wobblins is a mobile-first game built with:

- React Native + Expo (SDK 57, Expo Router for file-based navigation)
- TypeScript
- NativeWind (Tailwind CSS v4 for React Native)
- TanStack React Query for server state
- Supabase (Postgres, Auth, Row Level Security, RPC functions)

The vertical slice that exists today:

Player creates an account (email/password) →
completes character creation →
chooses a starter Wobblin →
claims a daily essence reward and earns passive essence from their featured Wobblin →
spends essence to grant a Wobblin XP directly, or sacrifices a duplicate Wobblin from the same evolution chain for XP →
evolves it through Stage 0 → 1 → 2 once it reaches the required level →
a Stage 2 Wobblin periodically produces an egg for its chain's Stage 0 species →
feeds essence into the egg until its progress bar fills, then hatches it into a brand new Stage 0 Wobblin →
summons additional Stage 0 Wobblins (random species) by spending essence →
lists Wobblins for sale on a global marketplace, either for a fixed essence price or open to other players' Wobblin offers.

This document describes what is **actually built**, not an aspirational spec. When adding features, match the patterns described here before introducing new ones. This app has gone through two revamps, one feature removal, and two feature reintroductions/replacements since:

1. **2026-07-26** — the original solo-player "explore/capture/train/battle" monster collection RPG (exploration, energy, wild capture, training, battling, achievements, gold, daily rewards) was removed in favor of a group-and-task-driven monster economy (private groups, task rewards, duplicate-sacrifice leveling, evolution, eggs).
2. **2026-07-27** — the group/task economy itself was removed in favor of a solo idle/essence economy plus a global player-to-player marketplace and direct trading. Groups, tasks, task applications, and task-reward locking (`locked_reason`) no longer exist in any form.
3. **2026-07-27 (later same day)** — direct Wobblin-for-Wobblin trade offers (`trade_offers` and its three RPCs, the Trade tab's Offers mode, `/trade/compose`) were removed. The fixed-price marketplace from the prior revamp was, for the rest of that day, the **only** way Wobblins changed hands between players.
4. **2026-07-27 (later still)** — Wobblin-for-Wobblin trading was reintroduced, reshaped as a listing property rather than a direct 1-for-1 proposal: a seller's `marketplace_listings` row is now either `listing_type = 'essence'` (the original fixed-price flow) or `'offers'` (no price — any other player can propose a bundle of one or more of their own Wobblins via a new `marketplace_offers`/`marketplace_offer_wobblins` pair of tables, and the seller accepts or declines). See "Marketplace" below for the full mechanic.
5. **2026-07-28** — the weekly-rotating shop (`shop_price_by_rarity`/`shop_rotations`/`shop_listings`, `get_weekly_shop`/`purchase_shop_listing`, `/shop`) was removed and replaced by **Summon**: a single `summon_wobblin()` RPC that spends a flat essence cost (`essence_config.summon_cost_essence`) for one random Stage 0 Wobblin, no rotation/browsing involved. See "Summon" below. The shop-purchase achievement tier was repurposed in place rather than deleted — `players.total_shop_purchases_count` is now `total_summons_count`, and the `shop_purchases_count` achievement metric is now `summons_count` (same targets/rewards, reworded names: "First Summon"/"Frequent Summoner"/"Summon Master").

See "Removed systems" below before assuming any prior-revamp system still exists.

---

# Product Philosophy

The central experience is now: **level up and evolve your own Wobblins by spending essence — earned passively from your featured Wobblin and via a daily claim, or by sacrificing duplicates — then use fully evolved Wobblins to hatch new ones, summon more at random, or trade directly with other players.**

Essence is the primary progression currency: it grants XP directly, fills an egg's hatch-progress bar, and buys a random Stage 0 Wobblin via Summon. Duplicate-sacrifice leveling still exists alongside it as a free (essence-less) alternative. The marketplace and direct-trade system are now the *only* way Wobblins move between players — with groups/tasks gone, ownership only ever changes hands through a purchase or an accepted trade offer. The database and game systems matter more than visuals — the MVP should not require expensive artwork or animation.

**Uniqueness between two players' same-species Wobblins comes only from level, evolution stage, and nickname.** There is no per-instance stats system at all — `player_wobblins` has no `hp`/`attack`/`defense`/`speed` columns (removed; see "Removed systems"). `wobblin_species.base_hp`/`base_attack`/`base_defense`/`base_speed` are still there as flavor/reference data (shown on the starter-selection picker to help compare species archetypes) but nothing per-owned-Wobblin ever diverges from them, so don't build a feature that assumes an individual Wobblin can have stats different from its species.

---

# Technical Stack (as built)

- **Expo Router**, not React Navigation directly. Routes are files under `src/app/`. `(tabs)` is a route group for the bottom tab navigator. `wobblin/[id]`, `trade/choose-wobblin`, and `summon` are stack routes pushed on top of the tabs (not inside `(tabs)/`), so the tab bar isn't visible on them and they need their own back button.
- **NativeWind v4** (`className` props backed by Tailwind). Theme tokens live in two places that must stay in sync:
  - `global.css` — the `@theme` block, source of truth, used via `bg-*`/`text-*`/`border-*` class names.
  - `src/constants/theme.ts` — plain-JS mirror of the same values, used only where className strings can't reach (dynamic lookups keyed by data like `element`/`rarity`, and native APIs like `StatusBar` or SVG fill that need a raw hex string).
- **TanStack React Query** for all server state. `QueryClient` is created once in `src/app/_layout.tsx`. Do not introduce Zustand or another global state library — server state belongs in Supabase/React Query; there is currently no client-only global state need.
- **Supabase JS client** (`src/supabase/client.ts`), wrapped by `SupabaseProvider` (`src/supabase/SupabaseProvider.tsx`) which exposes `{ session, isLoading }` via `useSupabase()`.
- Fonts: Manrope (body) + Space Grotesk (display), loaded via `@expo-google-fonts/*` in `_layout.tsx`.
- **React Query cache invalidation is not enough on its own for screens the user navigates back to** — Expo Router/React Navigation can freeze an unfocused screen, so a cache update that lands while a screen isn't focused (e.g. sacrificing a duplicate while the Wobblin detail screen is on top of the Collection tab) doesn't reliably repaint once you return to it. `(tabs)/collection.tsx` and `(tabs)/index.tsx` use `useFocusEffect` (from `expo-router`) to explicitly refetch on focus rather than relying on the frozen screen to pick up an already-updated cache on its own — follow this pattern for any other list screen that can be mutated from a pushed detail screen. Home also silently calls `claim_passive_essence` on every focus this same way, mirroring how `claim_egg`'s cadence is only ever checked when a screen that cares about it is actually open.

## Code organization (actual)

```
src/
  app/            # Expo Router routes (screens) — file path = URL path
    (tabs)/       # Bottom tab group: index, collection, trade, profile
    wobblin/[id]  # Monster detail, pushed stack route
    trade/choose-wobblin, list-wobblin, make-offer, listing-offers # Trade flow, all pushed stack routes
    summon.tsx    # Essence-for-random-Wobblin summon, pushed stack route (linked from Home)
  components/     # Shared presentational components
  constants/      # theme.ts (design tokens), avatars.ts, speciesArt.ts
  hooks/          # React Query hooks, one file per domain, + queryKeys.ts
  supabase/       # Thin service functions wrapping supabase-js calls/RPCs
  utils/          # xp.ts (leveling curve), errors.ts
```

The `screens/`, `navigation/`, and `services/` folders from earlier planning docs do not exist — Expo Router's `app/` replaces both `screens/` and `navigation/`, and `supabase/` plays the role of `services/`.

### Hook / service pattern

Each domain has a `src/supabase/<domain>.ts` file of plain async functions (calling `supabase.from(...)` or `supabase.rpc(...)`) and a matching `src/hooks/use<Domain>.ts` file of React Query hooks that call those functions. `src/hooks/queryKeys.ts` is the single query-key factory — always add new keys there so mutations can invalidate the right queries. Follow this pattern for new features rather than calling `supabase` directly from a screen. Current domains: `players`, `wobblins`, `eggs`, `essence`, `summon`, `trades`.

## Reusable components (actual)

`Button`, `MonsterCard`, `XPBar`, `TraitBadge` (used for element/rarity pills), `TextField`, `LevelUpBanner`, `EvolutionBanner`, `RewardToast` (generic icon/title/subtitle toast — now used for essence/summon/trade toasts too, not just eggs), `EmptyState`, `LoadingScreen`, `Skeleton`, `ComingSoonScreen`. Reuse these instead of building new ad hoc cards/badges/loaders — the Summon and Trade screens deliberately introduced **no** new primitive components, reusing `MonsterCard`, `Button`, `TextField`, and `EmptyState` throughout. `AchievementTray`, `HexBadge`/`HexIconBadge`, and `StatBar` were deleted along with the achievements/player-level/per-instance-stats systems they supported — don't reintroduce them without a reason to re-add those systems. `MonsterCard`'s level label reads "Lv. N" (not "Level N") — match that phrasing in any new UI that shows a Wobblin's level as a standalone label (full sentences like "Unlocks at level 15" are fine as prose).

---

# Supabase Setup (already provisioned)

There is **no local `supabase/migrations` folder** in this repo — the schema lives only in the remote project and is inspected/changed through the Supabase MCP tools (`list_tables`, `list_migrations`, `apply_migration`, `execute_sql`, `get_advisors`, `generate_typescript_types`, etc.). Before touching the schema:

1. Run `list_tables` / `list_migrations` to see current state — don't assume this doc is still current, it will drift.
2. Make schema changes with `apply_migration` (never hand-edit `src/supabase/database.types.ts` — regenerate it with `generate_typescript_types` after any schema change).
3. Check `get_advisors` after migrations for RLS/security lint issues.

Row Level Security is enabled on every table (`players`, `wobblin_species`, `player_wobblins`, `eggs`, `essence_config`, `essence_generation_rates`, `wobblin_level_xp_requirements`, `marketplace_listings`, `marketplace_offers`, `marketplace_offer_wobblins`, `achievement_definitions`, `player_achievement_claims`). Keep it that way for any new table. `player_public_profiles` is a **view**, not a table, and deliberately sits outside normal RLS — see its own section under "Database Schema" and the note under "Security" below before assuming it follows the same rules.

## Core game-logic pattern: server computes truth, client replays

Every mechanic that affects monster ownership, stats, essence balance, or randomness/timing is a **Postgres RPC function**, called via `supabase.rpc(...)`, not computed client-side:

- `claim_daily_essence()` — once-per-UTC-calendar-day check against `players.last_daily_essence_claim_date`; credits `essence_config.daily_claim_amount`.
- `claim_passive_essence()` — reads the caller's featured Wobblin (`players.active_wobblin_id`, re-filtered by `player_id` the same way `getFeaturedWobblin` does), computes `hourly_rate = essence_generation_rates.base_rate_per_hour + per_level_rate * level` for that Wobblin's species stage, and credits elapsed-time-based essence capped at `essence_config.passive_accrual_cap_hours`. Lazy/claim-on-read, same shape as `claim_egg`'s cadence check — no cron job; called silently by the Home screen on every focus.
- `spend_essence_for_xp(p_player_wobblin_id, p_essence_amount)` — debits essence, grants `p_essence_amount * essence_config.xp_per_essence` XP via `add_wobblin_xp`.
- `feed_egg_essence(p_egg_id, p_essence_amount)` — debits essence (capped at whatever's left to fill the bar — no charging for overflow) into `eggs.xp`.
- `summon_wobblin()` — debits a flat `essence_config.summon_cost_essence`, picks one random Stage 0 `wobblin_species` row (uniform across all Stage 0 species, not weighted by rarity), and inserts a fresh level-1/0-XP `player_wobblins` row. Increments `players.total_summons_count` (the achievement counter formerly named `total_shop_purchases_count`).
- `list_wobblin_for_sale(p_player_wobblin_id, p_price_essence)` / `cancel_listing(p_listing_id)` / `buy_listed_wobblin(p_listing_id)` — fixed-price (`listing_type = 'essence'`) marketplace. A partial unique index (`marketplace_listings_active_wobblin_idx`) enforces one active listing per Wobblin, regardless of `listing_type`. `buy_listed_wobblin` is atomic first-buyer-wins and transfers ownership the way `review_task` used to (bumps `acquired_at`); it also rejects `listing_type = 'offers'` listings outright. `cancel_listing` additionally cascades to cancel any still-pending `marketplace_offers` on that listing.
- `list_wobblin_for_offers(p_player_wobblin_id)` — creates a `listing_type = 'offers'` listing (no price) that other players can propose Wobblin bundles against instead of buying outright.
- `propose_wobblin_offer(p_listing_id, p_offered_wobblin_ids uuid[])` — any other player bundles one or more of their own owned Wobblins (ownership re-validated server-side) into a `marketplace_offers` row + `marketplace_offer_wobblins` junction rows, status `'pending'`. Multiple simultaneous pending offers on the same listing (even from the same buyer) are allowed by design — correctness comes from re-validating ownership at accept-time, not from a uniqueness constraint (same principle the old, since-removed `trade_offers` system used).
- `respond_to_wobblin_offer(p_offer_id, p_accept)` — seller-only. Decline just marks the offer `'declined'`. Accept re-locks the listing and re-validates every offered Wobblin is still owned by the buyer; if either check fails it self-heals the offer to `'cancelled'` and returns `{success: false, reason: ...}` instead of raising (an expected race, not a client error). On a valid accept: swaps ownership both directions (seller's listed Wobblin → buyer, every offered Wobblin → seller, all with `acquired_at = now()`), marks the listing `'sold'`, and cascades to cancel (a) any other pending offer anywhere that bundled one of the just-moved Wobblins and (b) any other active listing for one of them — both cascades scoped globally, not just to this listing, since a buyer can shop the same Wobblin into multiple bundles/listings before one resolves. Also increments `players.total_trades_completed_count` for both parties (an achievements-system counter that existed unused in the schema before this RPC — see the achievements feature for how it's consumed).
- `cancel_wobblin_offer(p_offer_id)` — buyer-only, cancels their own still-pending offer. Not wired to any screen yet (see "Current Status").
- `sacrifice_wobblin(p_target_wobblin_id, p_consumed_wobblin_id)` — validates both Wobblins are owned by the caller, not the same row, and share the same `evolution_chain_id`; grants the target XP (via `add_wobblin_xp`) and permanently deletes the consumed row. (The old `locked_reason` check inside it is gone — there's no lock concept left at all.)
- `evolve_wobblin(p_player_wobblin_id)` — validates ownership, that the species has a next stage, and the Wobblin's level meets `evolution_level`; repoints `species_id` to the next stage (no stats to carry over — see the Product Philosophy note above). Same note: no more `locked_reason` check.
- `claim_egg(p_player_wobblin_id)` — validates ownership and that the species is Stage 2, and that `now() - coalesce(last_egg_claimed_at, created_at) >= egg_cadence_hours`; inserts an `eggs` row for the chain's Stage 0 species and updates the checkpoint.
- `hatch_egg(p_egg_id)` — validates ownership, that the egg hasn't hatched yet, **and now also that `eggs.xp >= essence_config.egg_hatch_xp_required`** (new gate, added alongside `feed_egg_essence`); inserts a new `player_wobblins` row for the egg's species.
- `add_wobblin_xp(p_player_wobblin_id, p_xp)` — internal-only leveling-curve helper (see incident note below), reachable only from `sacrifice_wobblin` and `spend_essence_for_xp`. **Its internals changed in the 2026-07-27 revamp**: `player_wobblins.experience` is now **level-relative** (resets to 0 on every level-up) instead of lifetime-cumulative, and the function loops against the new `wobblin_level_xp_requirements(level, xp_required)` table instead of a closed-form quadratic formula. `src/utils/xp.ts` (`getXpProgress`) mirrors this as a direct table lookup rather than a derived cumulative range — `XPBar` fetches the requirements table itself via `useWobblinLevelXpRequirements()`, so no prop threading was needed at any call site.
- `handle_new_user()` — trigger on `auth.users` insert that creates the placeholder `players` row.

**When adding a new mechanic that touches ownership, stats, essence, or randomness/timing, add a new Postgres RPC rather than computing it in the client.** This is the load-bearing security pattern in this codebase (a tampered client can't forge ownership transfers or currency grants) — don't break it for convenience.

**Incident note (grants):** every new RPC above was initially created with only `revoke execute ... from public;` before granting back to `authenticated` — this turned out to be insufficient. This Supabase project has default privileges configured so that **new functions auto-grant `EXECUTE` to `anon` and `authenticated` at creation time**, independent of the `PUBLIC` pseudo-role grant. `revoke ... from public` alone left `anon` still able to call every one of these RPCs unauthenticated. Fixed by explicitly revoking from `public, anon, authenticated` before re-granting to `authenticated` only. **Any new RPC in this project must revoke from all three (`public, anon, authenticated`), not just `public`** — verify with `select has_function_privilege('anon', 'public.<fn>(<argtypes>)', 'execute')`, don't assume a bare `revoke ... from public` is sufficient the way it would be in a vanilla Postgres install. This is a project-specific gotcha, distinct from (but easy to conflate with) the older `regen_player_energy`-style incident below. Every RPC added in the 2026-07-27 revamp (essence, shop, marketplace, trade) followed this discipline — verified via a batch `has_function_privilege` check before shipping. `summon_wobblin` (added 2026-07-28, replacing the shop) followed the same discipline.

**Incident note (ownership checks, historical — the functions involved no longer exist but the lesson still applies):** the old solo-game RPC `regen_player_energy` was initially created taking a raw `p_player_id` argument with no ownership check, letting any signed-in user regen another player's energy for free. **Any internal helper function (one meant to be called only from other RPCs, not directly by clients) must have its EXECUTE grant revoked from `anon`/`authenticated`** — `get_advisors(type: "security")` will not necessarily catch a missing ownership check on its own, and RLS does not protect function *arguments*, only table rows. `add_wobblin_xp` (see above) follows this pattern today: it's revoked from `anon`/`authenticated` and only reachable via `sacrifice_wobblin`/`spend_essence_for_xp`.

---

# Database Schema (actual, introspected from Supabase)

## players

```
id (uuid, = auth.users.id)
username (text, unique)
avatar (text, nullable — 'explorer' | 'mage' | 'knight')
active_wobblin_id (uuid, nullable, FK -> player_wobblins.id, on delete set null)
onboarding_completed (bool, default false)
essence_balance (bigint, default 0, check >= 0)
essence_last_passive_claim_at (timestamptz, nullable)
last_daily_essence_claim_date (date, nullable)
created_at
```

A trigger on `auth.users` insert creates this row automatically with a placeholder username; `onboarding_completed` (not row existence) is what gates character creation. `avatar` is set at character creation and is otherwise cosmetic (Profile screen). `active_wobblin_id` is the player's chosen featured Wobblin — see `getFeaturedWobblin`/`setActiveWobblin` in `src/supabase/wobblins.ts` / `src/supabase/players.ts`, and it's also what `claim_passive_essence` reads to find which Wobblin generates essence. **No `level`, `experience`, or `gold` columns** — the player's own account still has no progression of its own, only their Wobblins do; `essence_balance` is a spendable currency, not a level. **No task-reputation columns anymore** — `tasks_approved_count`/`tasks_rejected_count`/`disputes_filed_count`/`disputes_received_count` existed briefly during the task-economy era and were dropped in the 2026-07-27 revamp along with tasks themselves.

## wobblin_species

Static species/evolution-chain definitions: `id, name (unique), element, rarity, description, base_hp, base_attack, base_defense, base_speed, stage, evolves_into_id, evolution_level, evolution_chain_id, egg_cadence_hours`. **120 rows** (40 evolution chains × 3 stages) across the 10 elements — grown from an original 30-row/10-chain seed via a later "second generation" species migration. **Confirmed via direct query: only 3 rarity tiers are actually seeded — `common`, `rare`, `legendary` (40 rows each)** — `theme.ts`'s `RARITY_COLORS`/`Rarity` type also define `uncommon`/`epic`, but no species currently use them; don't assume a 5-tier rarity system is live just because the theme constants define one.

- `stage` is `0` (base), `1` (first evolution), or `2` (final evolution). Renumbered from an earlier `1`/`2`/`3` scheme to match the spec's terminology exactly — if you see stray references to stage `1` meaning "base," they're stale.
- `evolves_into_id` points to the next stage's species row, `null` on stage-2 (final) rows.
- `evolution_level` is the `player_wobblins.level` required to evolve into `evolves_into_id`, `null` when `evolves_into_id` is `null`.
- `evolution_chain_id` groups all 3 stages of a line — elegantly, it's simply the `id` of that line's own stage-0 row (no separate lookup table needed). `sacrifice_wobblin` requires both Wobblins to share this value; `claim_egg` uses it directly as the new egg's `species_id`.
- `egg_cadence_hours` is set only on stage-2 rows (varies by rarity at seed time — common lines shorter, legendary longer) and drives `claim_egg`'s eligibility check.

## player_wobblins

Owned Wobblins: `id, player_id, species_id, nickname, level, experience, created_at, acquired_at, last_egg_claimed_at`. **No `locked_reason` column anymore** — the task-reward locking concept was removed entirely in the 2026-07-27 revamp (dropped along with `tasks`, since that was its only source). A Wobblin can now always evolve, be sacrificed, be listed for sale, or be offered in a trade, regardless of any other pending activity involving it.

- `experience` is **level-relative**, not lifetime-cumulative — it resets to 0 on every level-up. The XP required to go from the current `level` to the next is looked up from `wobblin_level_xp_requirements`, not derived from a formula. This changed in the 2026-07-27 revamp; existing rows were backfilled to the new semantics so every XP bar rendered pixel-identical immediately after.
- `last_egg_claimed_at` is only meaningful when the species is stage 2; `claim_egg` reads `coalesce(last_egg_claimed_at, created_at)` as the cadence checkpoint.
- `acquired_at` is when the **current** owner came to own this row — distinct from `created_at` (when the row was first created). They match at creation (starter pick, egg hatch, summon) but diverge on a marketplace purchase: `buy_listed_wobblin` sets `acquired_at = now()` without touching `created_at` — the same pattern `review_task` used to follow. Anything ordering/displaying "how long has this player had this Wobblin" must use `acquired_at`, not `created_at`.
- **No `hp`/`attack`/`defense`/`speed` columns** — removed along with the per-instance stats concept (see the Product Philosophy note above). **No `training_points` column** — the only ways to change a Wobblin's level are `sacrifice_wobblin` and `spend_essence_for_xp`.

The Home screen's "featured Wobblin" is `players.active_wobblin_id` if set (via the "Set as Featured" button on the Monster Detail screen — never disabled by a lock anymore, since locking doesn't exist), falling back to the player's first-acquired (`acquired_at asc`, limit 1) Wobblin — i.e. the starter — if they haven't chosen one. `active_wobblin_id` is set with a plain table update (RLS-gated, not an RPC) since it's just an ownership pointer, not a value needing server-side derivation; `getFeaturedWobblin` re-filters by `player_id` when reading it back so a spoofed id can't surface another player's Wobblin.

## essence_config

Singleton tuning-config row (`id boolean primary key default true check (id)` trick — exactly one row): `daily_claim_amount` (default 50), `xp_per_essence` (default 1), `egg_hatch_xp_required` (default 500), `passive_accrual_cap_hours` (default 72), `summon_cost_essence` (default 150, added 2026-07-28 alongside `summon_wobblin`). SELECT-only for `authenticated`, no client-facing write policy — every value it drives is read inside an RPC, never decided by the client.

## essence_generation_rates

`stage int primary key check (stage in (0,1,2)), base_rate_per_hour numeric, per_level_rate numeric`. Seeded `(0, 1, 0.1), (1, 3, 0.25), (2, 8, 0.5)` — hourly essence = `base_rate_per_hour + per_level_rate * player_wobblins.level`, read by `claim_passive_essence` for whichever Wobblin is the caller's `active_wobblin_id`. Placeholder-tunable, not carefully balanced (same caveat as `sacrifice_wobblin`'s XP formula always had).

## wobblin_level_xp_requirements

`level int primary key, xp_required int`. Seeded `xp_required = 100 * level` for levels 1–99 (reproduces the pre-revamp quadratic curve exactly at every level); a level with no row is a soft level cap (currently ~100) where `add_wobblin_xp` stops leveling up and just lets `experience` accumulate. Read by both `add_wobblin_xp` server-side and `XPBar` client-side (via `useWobblinLevelXpRequirements()`) — keep both in sync if the curve is retuned.

## marketplace_listings

`id, seller_id FK, player_wobblin_id FK, price_essence, status ('active'|'sold'|'cancelled'), created_at, sold_to FK nullable, sold_at nullable, cancelled_at nullable`. A partial unique index (`marketplace_listings_active_wobblin_idx`) enforces one **active** listing per Wobblin at a time — direct structural analog of the old `tasks_active_reward_wobblin_idx`. SELECT policy: `status = 'active' OR seller_id = auth.uid() OR sold_to = auth.uid()` (anyone can browse active listings; only the parties involved see resolved ones).

## eggs

`id, owner_id, species_id (the chain's Stage 0 species), source_wobblin_id (FK -> player_wobblins, nullable on delete set null), claimed_at, hatched_at (nullable), xp (integer, default 0)`. **`xp` is new (2026-07-27)** — an unhatched egg (`hatched_at IS NULL`) now has a progress bar filled only by `feed_egg_essence`; `hatch_egg` additionally requires `xp >= essence_config.egg_hatch_xp_required` before it will proceed. Claiming (`claim_egg`, cadence-gated) and hatching remain two distinct steps.

## player_public_profiles (view)

`select id, username, avatar, created_at from players` — exposes just enough to show a username/avatar on the Trade tab without broadcasting `essence_balance` (a real currency now, unlike a cosmetic column such as `avatar`). Runs with the view **owner's** privileges rather than the querying user's (no `security_invoker`), which is what lets it bypass `players`' owner-only RLS and return every player's row — this is deliberate and the whole point of the view, so don't "fix" the resulting `get_advisors` `security_definer_view` lint by adding `security_invoker = true`; that would revert it to owner-only visibility and defeat its purpose. `revoke ... from public, anon` / `grant select ... to authenticated` on the view itself, same discipline as function grants.

## Tables that do NOT exist (do not assume otherwise)

`battles`, `locations` were dropped in the 2026-07-26 revamp, along with the original `achievements`/`player_achievements` tables — **note: an achievement system was later reintroduced** as `achievement_definitions`/`player_achievement_claims` plus a `get_player_achievements`/`claim_achievement_reward` RPC pair; this doc doesn't yet have a full write-up of it (undocumented pre-existing gap, not something either revamp above covers), but see the `summons_count` metric note in revamp entry 5 above for the one corner of it this change touched. `shop_price_by_rarity`, `shop_rotations`, `shop_listings` (and their `get_weekly_shop`/`purchase_shop_listing` RPCs) were dropped in the 2026-07-28 shop-to-summon replacement — see revamp entry 5 and "Summon" below. **`groups`, `group_members`, `tasks`, `task_applications` were dropped in the 2026-07-27 revamp** (along with their 14 RPCs and the `is_group_member` helper) — the entire group/task economy no longer exists in any form. **`trade_offers` (and its three RPCs `propose_trade_offer`/`respond_to_trade_offer`/`cancel_trade_offer`) was added by the 2026-07-27 revamp and then removed later the same day.** That specific direct-1-for-1-proposal shape stays gone — don't reintroduce `trade_offers` itself. Wobblin-for-Wobblin trading was later reintroduced in a different shape, as a `marketplace_listings.listing_type = 'offers'` property plus the new `marketplace_offers`/`marketplace_offer_wobblins` tables — see "Marketplace" below. There is no moves/attacks system, no items/inventory system, no `trait_1`/`trait_2` columns, no `gold` anywhere, no energy system, and no per-instance stats (`player_wobblins.hp`/`attack`/`defense`/`speed` were dropped in an earlier cleanup pass). `player_wobblins.locked_reason` and `players.tasks_approved_count`/`tasks_rejected_count`/`disputes_filed_count`/`disputes_received_count` were dropped in the 2026-07-27 revamp along with tasks. Any older doc language implying otherwise (including earlier versions of this file) describes a prior state, not current.

A `task-submissions` Storage bucket and its previously-uploaded photos still physically exist (deliberately **not** deleted — real uploaded files, out of scope for a schema migration) but its two RLS policies were dropped and no client code references it anymore; treat it as dead/orphaned, not as evidence the task-submission-photo feature is still live.

---

# Screens (actual routes)

| Route | Purpose |
|---|---|
| `/login`, `/signup` | Email/password auth only. **No Google/Apple sign-in is implemented.** |
| `/character-creation` | Username + one of 3 emoji avatars (Explorer/Mage/Knight, `src/constants/avatars.ts`). Persisted to `players.username`/`players.avatar` via `completeCharacterCreation`. |
| `/starter-selection` | Pick 1 of the seeded stage-0 `wobblin_species` as a starter; creates a `player_wobblins` row for it (base stats are shown here for comparison, read from `wobblin_species`, but nothing per-instance is stored). This is still the only way a brand-new player gets their first Wobblin. |
| `(tabs)/index` (Home) | Player header (avatar + username) + an essence balance chip and daily-claim button (disabled/"Claimed" once `last_daily_essence_claim_date` matches today) + a Summon entry-point icon + the featured Wobblin card (glowing portrait + Lv./XP bar only, no stats). Silently calls `claim_passive_essence` on every focus (toast if `granted > 0`) alongside the existing player/featured-Wobblin refetches. **No more Active Tasks card** — tasks don't exist. |
| `(tabs)/collection` | Grid of owned Wobblins with element filter chips, filtered client-side over the already-fetched list (no more lock badges — nothing locks anymore), plus an Eggs strip above the grid: each unhatched egg shows an XP progress bar and a "Feed" essence-amount input, with the "Hatch" button only enabled once the bar is full (the server re-enforces the same threshold regardless of what the client shows). Refetches on focus for the same reason as Home. |
| `(tabs)/trade` | The global marketplace: browse active listings from other players (essence-priced listings show a "Buy" button, offers-type listings show "Make Offer" instead of a price); a sticky footer with a single "Trade" button (opens `/trade/choose-wobblin`, disabled with an inline note if the player has nothing eligible to list); a "My Listings" section with Cancel, plus a "View Offers" button on the player's own offers-type listings. |
| `/trade/choose-wobblin` | Pushed route: a full grid of the player's own sellable Wobblins (mirrors the Collection grid). Picking one pushes `/trade/list-wobblin`. |
| `/trade/list-wobblin` | Pushed route: the player decides whether the Wobblin they just picked lists for a fixed essence price or opens to other players' Wobblin offers, and submits. Either path jumps straight back to the Trade tab on success — this screen has no other exit. |
| `/trade/make-offer` | Pushed route (from another player's offers-type listing's "Make Offer" action): a multi-select grid (mirrors `/trade/choose-wobblin`, `Set<string>` selection) of the caller's own Wobblins to bundle into a single offer. Submitting jumps back to the Trade tab. |
| `/trade/listing-offers` | Pushed route (from the seller's own "View Offers" action): every pending offer on that listing, each showing the buyer and their offered Wobblin(s), with Accept/Decline. Accepting resolves the listing and jumps back to the Trade tab; declining just removes that one offer here. |
| `/summon` | Pushed route (linked from Home's summon icon): spend `essence_config.summon_cost_essence` for one random Stage 0 Wobblin, revealed on the screen after a successful summon; the Summon button is disabled if the balance is insufficient. |
| `/wobblin/[id]` (Monster Detail) | Hero card (portrait with an element-tinted glow, name + "Lv. N" pill, element/rarity badges, an acquired-date chip, and the XP bar); **no locked-as-task-reward banner anymore** — nothing to lock; a new **Feed XP** panel (spend essence for direct XP, shown to the owner) sits below the hero; an Evolution panel (shown if the species has a next stage); a "Sacrifice Duplicates" panel (multi-select same-chain Wobblins, sorted lowest-stage-first); and — for stage-2 Wobblins — an Eggs panel with a cadence countdown and "Claim Egg" button. |
| `(tabs)/profile` | Avatar, username, join date, Wobblins-owned count, essence balance, species-discovered count, Sign Out. **No more Groups-Joined or Tasks-Completed stats** — replaced with essence balance and species discovered. |
| `/supabase-test` | Dev-only connectivity check screen; not part of the player-facing flow. |

There is no dedicated Splash screen route — native splash + Expo font loading gate (`_layout.tsx`) serves that purpose, then `SupabaseProvider`'s session state determines where routing lands.

The bottom tab bar has **4 tabs**: **Home, Collection, Trade, Profile** — Groups is gone; Trade takes its slot.

---

# Game Systems (actual)

## Essence Economy

Essence is earned two ways: a flat **daily claim** (`claim_daily_essence`, gated to once per UTC calendar day) and **passive generation** from the player's featured Wobblin (`claim_passive_essence`, silently invoked on every Home-screen focus), at an hourly rate that's a function of that Wobblin's species stage and level (`essence_generation_rates`), capped at 72 hours of accrual so leaving the app closed for a long stretch doesn't grant unbounded essence. It's spent three ways: directly granting a Wobblin XP (`spend_essence_for_xp`), feeding an unhatched egg's progress bar (`feed_egg_essence`), and summoning a random Stage 0 Wobblin (`summon_wobblin`). All rates/amounts/thresholds live in `essence_config`/`essence_generation_rates` — placeholder-tunable, not balance-tested.

## Summon

Spend a flat `essence_config.summon_cost_essence` (default 150) for one random Stage 0 `wobblin_species` row, picked uniformly across all Stage 0 species regardless of rarity — unlike the weekly shop it replaced, there's no per-rarity pricing and no browsing: `summon_wobblin` just debits essence and inserts the new Wobblin in one call. Replaces the 2026-07-27-revamp weekly shop (see revamp entry 5 above) — that lazy per-ISO-week rotation and its per-rarity pricing no longer exist.

## Marketplace

The **only** way a Wobblin changes hands between players: `marketplace_listings`, gated by `listing_type`. One active listing per Wobblin regardless of type (partial unique index `marketplace_listings_active_wobblin_idx`), same pattern as the old task-reward-lock index.

- **`listing_type = 'essence'`** — the original fixed-price flow: `list_wobblin_for_sale` / `cancel_listing` / `buy_listed_wobblin`. List one of your own Wobblins at a price you set; any other player can buy it instantly, atomic first-buyer-wins.
- **`listing_type = 'offers'`** — Wobblin-for-Wobblin trading, reintroduced as a listing property rather than a direct 1-for-1 proposal (see revamp entry 4 at the top of this doc): `list_wobblin_for_offers` opens a Wobblin to offers instead of pricing it; any other player calls `propose_wobblin_offer` to bundle one or more of their own owned Wobblins into a pending `marketplace_offers` row; the seller reviews pending offers on `/trade/listing-offers` and calls `respond_to_wobblin_offer` to accept (swaps ownership both directions, cascades to cancel every other pending offer/listing touching either moved Wobblin, increments both parties' `total_trades_completed_count`) or decline. `cancel_wobblin_offer` lets a buyer retract their own pending offer but isn't wired to any screen yet.

Direct Wobblin-for-Wobblin trade offers in their *original* shape (`trade_offers`, `propose_trade_offer`/`respond_to_trade_offer`/`cancel_trade_offer`, the Trade tab's Offers mode, `/trade/compose` — a single fixed 1-for-1 proposal between two named players) existed briefly in the 2026-07-27 revamp and were removed the same day; that specific shape is what "Removed systems" below still refers to. The listing-based bundle-offer mechanic above is a different design, not a resurrection of that removed code.

## Evolution Chains

Each evolution chain has 3 stages (0/1/2) linked via `wobblin_species.evolves_into_id`/`evolution_level`, grouped by `evolution_chain_id`. `evolve_wobblin` requires the Wobblin's level to meet the next stage's `evolution_level`, then simply repoints `species_id` to the next stage — there are no per-instance stats to carry over (see the Product Philosophy note above).

## Duplicate-Monster Sacrifice & Leveling

Monsters gain XP two ways: sacrificing a duplicate (`sacrifice_wobblin` — consumes another owned Wobblin from the **same evolution chain**, checked via `evolution_chain_id`, not species name; the consumed Wobblin is permanently deleted; the target gains `100 * consumed.level` XP via `add_wobblin_xp`) or spending essence directly (`spend_essence_for_xp`, no duplicate needed). **The XP curve itself changed in the 2026-07-27 revamp**: `experience` is level-relative (resets to 0 per level-up) and the per-level requirement is read from `wobblin_level_xp_requirements` rather than a hardcoded quadratic formula — see "Supabase Setup" above. The Wobblin detail screen's "Sacrifice Duplicates" panel (multi-select, sequential RPC calls — there's no batch RPC) and its "Feed XP" panel (essence-based) sit side by side.

## Final-Evolution Egg Generation

Only stage-2 (fully evolved) Wobblins can generate eggs, and only for their own chain's stage-0 species (`claim_egg` uses `evolution_chain_id` directly as the new egg's `species_id`), timestamp-gated server-side by `egg_cadence_hours`. **Hatching changed in the 2026-07-27 revamp**: an egg now has an `xp` progress bar that only fills via `feed_egg_essence` (no passive time-based fill) — `hatch_egg` additionally requires `xp >= essence_config.egg_hatch_xp_required` before it will hatch the egg into a fresh level-1/0-XP Stage 0 Wobblin. Claiming and hatching (now gated by feeding) remain two genuinely distinct steps, both surfaced in the Collection screen's Eggs strip.

## Removed systems (do not build on top of these — they don't exist)

**2026-07-26 revamp:** exploration/locations, energy (and its regen-on-read pattern), wild-encounter capture, battling (PvE or otherwise), manual stat training, gold/currency, achievements, and the daily login reward.

**2026-07-27 revamp:** private groups (and invite codes), the entire task lifecycle (create/accept/submit/review/cancel), task applications/public-group-discovery, task disputes/reputation counters, task-reward locking (`locked_reason`), and task-submission photo uploads (the `task-submissions` storage bucket is orphaned, not deleted). All of it was replaced by the essence economy + weekly shop + marketplace/trade system described above.

**2026-07-28:** the weekly-rotating shop (`shop_price_by_rarity`/`shop_rotations`/`shop_listings`, `get_weekly_shop`/`purchase_shop_listing`, `/shop`) — replaced by Summon (`summon_wobblin`, `/summon`), see revamp entry 5 above and "Summon" below. Per-rarity shop pricing and the lazy per-ISO-week rotation concept are both gone; summoning is rarity-blind and has no rotation/browsing step.

If you find old references to any of these (in comments, unused imports, or stale planning docs), they describe a prior revamp's app, not the current one — don't reintroduce the underlying tables/RPCs/screens without discussing scope with the user first, since both revamps were deliberate product-direction changes, not oversights.

---

# Visual Constraints

The MVP requires minimal images — icons, emoji, SVG shapes, gradient/glow cards, progress bars, and the existing illustrated species portraits (`src/constants/speciesArt.ts`). Keep new UI consistent with this: no large new image-asset pipelines, no animated battle scenes (there's no battle system to animate). The Summon and Trade screens follow this too — both reuse `SPECIES_ART`/element icons rather than introducing new art.

---

# Design Direction

Dark fantasy mobile aesthetic: dark backgrounds (`COLORS.background = #0c0d16`), glowing/bordered cards, rounded corners, large readable text. Element colors (fire/water/grass/thunder/dark/ice/rock/wind/light/poison) and rarity colors (common→legendary) are defined in `src/constants/theme.ts` — reuse these constants rather than hardcoding new hex values. `COLORS.essence` (`#38bdf8`, renamed from the previously-unused `COLORS.energy` token in the 2026-07-27 revamp) is the color for all essence-currency UI — Home's balance chip, the Feed XP panel, egg-feeding UI, and the Summon cost/button.

---

# Security

- Every table has RLS enabled — verify this holds for any new table (`get_advisors` after migrating).
- Anything that mutates monster ownership, level/XP, essence balance, or timing-gated rewards (eggs) must go through a Postgres RPC that re-derives values server-side (see the RPC pattern above); never trust client-computed values for these fields.
- `players` has no client-facing INSERT policy — rows are created only by the `auth.users` trigger.
- **Every new function's grants must be checked with `has_function_privilege` against `anon`, not just reasoned about** — see the grants incident note above. `revoke ... from public` is not sufficient in this project because of its default-privileges configuration.
- `get_advisors(type: "security")` flags externally-callable `SECURITY DEFINER` functions but won't catch a missing ownership check inside one, so review new RPCs for an explicit `auth.uid()` check matching `sacrifice_wobblin`/`buy_listed_wobblin`/etc.
- **`player_wobblins` SELECT is now a single permissive policy open to any authenticated user** (`using (true)`) — replaced the old owner-only + groupmate-task-reward-visibility pair in the 2026-07-27 revamp, since Trade needs any player to browse any other player's Wobblins to buy/trade. Safe because there are no per-instance stats to leak (see Product Philosophy) — mutations remain fully RPC-gated regardless of read visibility.
- **`players` itself is still owner-only for SELECT** — the old groupmate-visibility policy was dropped along with groups. `player_public_profiles` (a view exposing only `id`/`username`/`avatar`/`created_at`) is what Trade uses instead, specifically so `essence_balance` never gets broadcast globally the way a cosmetic column safely could be.
- The `players`/`player_wobblins` UPDATE policies are row-scoped, not column-scoped — RLS policies gate rows, not columns. `avatar`/`active_wobblin_id` are safe to update directly from the client because they're not values that need server-side derivation. There is intentionally **no** client-facing UPDATE policy on `player_wobblins` at all — every mutation to level/species/ownership/essence goes through a `SECURITY DEFINER` RPC instead.

---

# Out of scope (still true)

Guilds, breeding, PvP matchmaking, real-time multiplayer, complex animations. **A marketplace is no longer out of scope** — it was built in the 2026-07-27 revamp (see "Marketplace" above) and is still live; if you see old references to a marketplace as excluded, they predate that revamp. **Wobblin-for-Wobblin trading is also no longer out of scope** — its original direct-1-for-1-proposal shape (`trade_offers`) was removed the same day it was built, but it was later reintroduced in a different, listing-based shape (`listing_type = 'offers'` + `marketplace_offers`) — see "Marketplace" above. Only the original `trade_offers` shape stays excluded; don't reintroduce that specific mechanic without discussing scope with the user.

---

# Current Status / Suggested Next Steps

Already working: auth, onboarding (with persisted username + avatar), starter selection, the essence economy (daily claim + passive generation from the featured Wobblin, spend-for-XP), duplicate-sacrifice leveling (single or multi-select) under the new level-relative XP curve, evolution through 3 stages, final-evolution egg generation with essence-fed hatching (claim + feed + hatch as distinct steps), summoning a random Stage 0 Wobblin for a flat essence cost, a global marketplace supporting both fixed-essence-price listings and Wobblin-for-Wobblin offer listings, a Collection screen with an eggs section, and a real Profile screen. **The original direct-1-for-1 `trade_offers` shape still does not exist** — see "Removed systems" — but Wobblin-for-Wobblin trading itself is back in the listing-based shape described in "Marketplace."

Remaining gaps worth knowing about before extending the game (not commitments, just the honest state):
- **There is no per-instance stats system at all** (unchanged from before the 2026-07-27 revamp — see the Product Philosophy note above and "Tables that do NOT exist").
- **No group/social feature of any kind remains** — the entire private-groups concept was removed along with tasks. If a group-based or social feature is wanted again later (leaderboards, friend lists, shared goals), it needs fresh design and a fresh migration, not resumption of dormant infrastructure — there isn't any anymore.
- **No essence-economy balancing has been play-tested** — every rate, price, and threshold (`essence_config` including `summon_cost_essence`, `essence_generation_rates`, `wobblin_level_xp_requirements`) is placeholder-tunable, matching the project's existing convention for `sacrifice_wobblin`'s XP formula.
- **Summon is rarity-blind** — `summon_wobblin` picks uniformly across all Stage 0 species regardless of rarity, unlike the weekly shop it replaced (which priced by rarity but didn't weight odds by it either). A rarity-weighted summon cost/odds system would need explicit design, not an assumption it already works that way.
- **A buyer has no screen to view or cancel their own outgoing pending offers** — `cancel_wobblin_offer` exists server-side and is exposed via `useCancelWobblinOffer`, but no screen calls it yet; a pending offer only ever resolves via the seller accepting/declining on `/trade/listing-offers`, or by the offer self-healing to `'cancelled'` if the buyer's offered Wobblin(s) stop being owned by them.
- **No rate-limiting on repeat offers** — nothing stops one buyer from proposing many pending offers at once on the same listing; matches the property the original (now-removed) `trade_offers` system also had.
- Login/signup copy still says "Monster Realms" in a couple of places — a cosmetic leftover from an earlier project name predating even the original monster-collection RPG; unrelated to either revamp.
- **Only 3 rarity tiers are actually seeded** (`common`/`rare`/`legendary`) even though `theme.ts`'s `RARITY_COLORS`/`Rarity` type still define `uncommon`/`epic` — a pre-existing discrepancy, confirmed via direct query during the 2026-07-27 revamp, not something either revamp introduced or fixed.
- The `players`/`player_wobblins` RLS UPDATE policies are row-scoped, not column-scoped — see the note under "Security" above.
