# Wobblins - React Native + Supabase Group Task & Monster Economy Game

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
creates or joins a private group (via a shareable invite code) →
creates a task in the group, offering an owned Wobblin as the reward →
another group member accepts the task, completes it, and submits it →
the creator approves it, transferring the reward Wobblin to the accepter →
collects duplicate Wobblins from the same evolution chain →
sacrifices duplicates to level a Wobblin up →
evolves it through Stage 0 → 1 → 2 once it reaches the required level →
a Stage 2 Wobblin periodically produces an egg for its chain's Stage 0 species →
hatches the egg into a brand new Stage 0 Wobblin.

This document describes what is **actually built**, not an aspirational spec. When adding features, match the patterns described here before introducing new ones. This is a revamped product direction (as of 2026-07-26) — the app was previously a solo-player "explore/capture/train/battle" monster collection RPG. That entire loop (exploration, energy, wild capture, training, battling, achievements, gold, daily rewards) has been **removed**; see "Removed systems" below before assuming any of it still exists.

---

# Product Philosophy

The central experience is: **complete tasks for people in your group, earn their monsters, combine duplicates to evolve them, and use fully evolved monsters to create the next generation.**

Tasks create opportunities for monsters to move between users. Duplicate monsters create progression through sacrifice. Final evolutions create new eggs and keep the monster economy active. The database and game systems matter more than visuals — the MVP should not require expensive artwork or animation.

**Uniqueness between two players' same-species Wobblins comes only from level, evolution stage, and nickname.** There is no per-instance stats system at all — `player_wobblins` has no `hp`/`attack`/`defense`/`speed` columns (removed; see "Removed systems"). `wobblin_species.base_hp`/`base_attack`/`base_defense`/`base_speed` are still there as flavor/reference data (shown on the starter-selection picker to help compare species archetypes) but nothing per-owned-Wobblin ever diverges from them, so don't build a feature that assumes an individual Wobblin can have stats different from its species.

---

# Technical Stack (as built)

- **Expo Router**, not React Navigation directly. Routes are files under `src/app/`. `(tabs)` is a route group for the bottom tab navigator. `group/[id]`, `group/[id]/create-task`, `task/[id]`, and `wobblin/[id]` are stack routes pushed on top of the tabs (not inside `(tabs)/`), so the tab bar isn't visible on them and they need their own back button.
- **NativeWind v4** (`className` props backed by Tailwind). Theme tokens live in two places that must stay in sync:
  - `global.css` — the `@theme` block, source of truth, used via `bg-*`/`text-*`/`border-*` class names.
  - `src/constants/theme.ts` — plain-JS mirror of the same values, used only where className strings can't reach (dynamic lookups keyed by data like `element`/`rarity`, and native APIs like `StatusBar` or SVG fill that need a raw hex string).
- **TanStack React Query** for all server state. `QueryClient` is created once in `src/app/_layout.tsx`. Do not introduce Zustand or another global state library — server state belongs in Supabase/React Query; there is currently no client-only global state need.
- **Supabase JS client** (`src/supabase/client.ts`), wrapped by `SupabaseProvider` (`src/supabase/SupabaseProvider.tsx`) which exposes `{ session, isLoading }` via `useSupabase()`.
- Fonts: Manrope (body) + Space Grotesk (display), loaded via `@expo-google-fonts/*` in `_layout.tsx`.
- **React Query cache invalidation is not enough on its own for screens the user navigates back to** — Expo Router/React Navigation can freeze an unfocused screen, so a cache update that lands while a screen isn't focused (e.g. sacrificing a duplicate while the Wobblin detail screen is on top of the Collection tab) doesn't reliably repaint once you return to it. `(tabs)/collection.tsx` uses `useFocusEffect` (from `expo-router`) to explicitly refetch on focus rather than relying on the frozen screen to pick up an already-updated cache on its own — follow this pattern for any other list screen that can be mutated from a pushed detail screen.

## Code organization (actual)

```
src/
  app/            # Expo Router routes (screens) — file path = URL path
    (tabs)/       # Bottom tab group: index, groups, collection, profile
    group/[id]/   # Group detail + create-task, pushed stack routes
    task/[id]     # Task detail, pushed stack route
    wobblin/[id]  # Monster detail, pushed stack route
  components/     # Shared presentational components
  constants/      # theme.ts (design tokens), avatars.ts, speciesArt.ts
  hooks/          # React Query hooks, one file per domain, + queryKeys.ts
  supabase/       # Thin service functions wrapping supabase-js calls/RPCs
  utils/          # xp.ts (leveling curve), errors.ts
```

The `screens/`, `navigation/`, and `services/` folders from earlier planning docs do not exist — Expo Router's `app/` replaces both `screens/` and `navigation/`, and `supabase/` plays the role of `services/`.

### Hook / service pattern

Each domain has a `src/supabase/<domain>.ts` file of plain async functions (calling `supabase.from(...)` or `supabase.rpc(...)`) and a matching `src/hooks/use<Domain>.ts` file of React Query hooks that call those functions. `src/hooks/queryKeys.ts` is the single query-key factory — always add new keys there so mutations can invalidate the right queries. Follow this pattern for new features rather than calling `supabase` directly from a screen. Current domains: `players`, `wobblins`, `groups`, `tasks`, `eggs`.

## Reusable components (actual)

`Button`, `MonsterCard`, `XPBar`, `TraitBadge` (used for element/rarity pills), `TextField`, `LevelUpBanner`, `EvolutionBanner`, `RewardToast` (generic icon/title/subtitle toast — no gold field anymore, currency doesn't exist), `EmptyState`, `LoadingScreen`, `Skeleton`, `ComingSoonScreen`. Reuse these instead of building new ad hoc cards/badges/loaders. `AchievementTray`, `HexBadge`/`HexIconBadge`, and `StatBar` were deleted along with the achievements/player-level/per-instance-stats systems they supported — don't reintroduce them without a reason to re-add those systems. `MonsterCard`'s level label reads "Lv. N" (not "Level N") — match that phrasing in any new UI that shows a Wobblin's level as a standalone label (full sentences like "Unlocks at level 15" are fine as prose).

---

# Supabase Setup (already provisioned)

There is **no local `supabase/migrations` folder** in this repo — the schema lives only in the remote project and is inspected/changed through the Supabase MCP tools (`list_tables`, `list_migrations`, `apply_migration`, `execute_sql`, `get_advisors`, `generate_typescript_types`, etc.). Before touching the schema:

1. Run `list_tables` / `list_migrations` to see current state — don't assume this doc is still current, it will drift.
2. Make schema changes with `apply_migration` (never hand-edit `src/supabase/database.types.ts` — regenerate it with `generate_typescript_types` after any schema change).
3. Check `get_advisors` after migrations for RLS/security lint issues.

Row Level Security is enabled on every table (`players`, `wobblin_species`, `player_wobblins`, `groups`, `group_members`, `tasks`, `eggs`). Keep it that way for any new table.

## Core game-logic pattern: server computes truth, client replays

Every mechanic that affects monster ownership, stats, or randomness/timing is a **Postgres RPC function**, called via `supabase.rpc(...)`, not computed client-side:

- `create_group(p_name)` — creates a `groups` row (generating a unique 6-character `invite_code`) and the owner's `group_members` row, atomically.
- `join_group(p_invite_code)` — looks up the group by code and inserts the caller as a `member`.
- `is_group_member(p_group_id)` — `SECURITY DEFINER` helper (not a mutation) used inside RLS policies on `groups`/`group_members`/`tasks`/`player_wobblins` to check the caller's membership without recursive-RLS issues. Only ever checks `auth.uid()` against the given group, never an arbitrary target user, so it's safe to leave broadly executable.
- `create_task(p_group_id, p_title, p_description, p_reward_wobblin_id)` — validates group membership and that the reward Wobblin is owned by the caller and unlocked, then locks it (`locked_reason = 'task_reward'`) and inserts the task as `status='open'`, atomically.
- `accept_task(p_task_id)` — validates the caller is a group member, isn't the creator, and the task is `open`.
- `submit_task(p_task_id, p_submission_note)` — validates the caller is the accepter and the task is `accepted`.
- `review_task(p_task_id, p_approve, p_resolution_note)` — validates the caller is the creator and the task is `submitted`. On approval, transfers `player_wobblins.player_id` to the accepter and clears the lock; on rejection, just clears the lock (ownership never left the creator).
- `cancel_task(p_task_id)` — creator-only, allowed while `open`/`accepted`/`submitted`; clears the reward lock.
- `sacrifice_wobblin(p_target_wobblin_id, p_consumed_wobblin_id)` — validates both Wobblins are owned by the caller, unlocked, not the same row, and share the same `evolution_chain_id`; grants the target XP (via `add_wobblin_xp`) and permanently deletes the consumed row.
- `evolve_wobblin(p_player_wobblin_id)` — validates ownership, that the species has a next stage, the Wobblin's level meets `evolution_level`, and it isn't locked; just repoints `species_id` to the next stage (no stats to carry over — see the Product Philosophy note above).
- `claim_egg(p_player_wobblin_id)` — validates ownership and that the species is Stage 2, and that `now() - coalesce(last_egg_claimed_at, created_at) >= egg_cadence_hours`; inserts an `eggs` row for the chain's Stage 0 species and updates the checkpoint.
- `hatch_egg(p_egg_id)` — validates ownership and that the egg hasn't hatched yet, then inserts a new `player_wobblins` row for the egg's species (just `player_id`/`species_id` — no stats to set).
- `add_wobblin_xp(p_player_wobblin_id, p_xp)` — internal-only leveling-curve helper (see incident note below); `src/utils/xp.ts` (`getXpProgress`) is a client-side **mirror** of the same curve (`cumulativeXp(level) = 100 * level * (level+1) / 2`) purely for rendering XP bars — it must stay in sync if the curve changes server-side.
- `handle_new_user()` — trigger on `auth.users` insert that creates the placeholder `players` row.

**When adding a new mechanic that touches ownership, stats, or randomness/timing, add a new Postgres RPC rather than computing it in the client.** This is the load-bearing security pattern in this codebase (a tampered client can't forge ownership transfers or rewards) — don't break it for convenience.

**Incident note (grants):** every new RPC above was initially created with only `revoke execute ... from public;` before granting back to `authenticated` — this turned out to be insufficient. This Supabase project has default privileges configured so that **new functions auto-grant `EXECUTE` to `anon` and `authenticated` at creation time**, independent of the `PUBLIC` pseudo-role grant. `revoke ... from public` alone left `anon` still able to call every one of these RPCs unauthenticated. Fixed by explicitly revoking from `public, anon, authenticated` before re-granting to `authenticated` only. **Any new RPC in this project must revoke from all three (`public, anon, authenticated`), not just `public`** — verify with `select has_function_privilege('anon', 'public.<fn>(<argtypes>)', 'execute')`, don't assume a bare `revoke ... from public` is sufficient the way it would be in a vanilla Postgres install. This is a project-specific gotcha, distinct from (but easy to conflate with) the older `regen_player_energy`-style incident below.

**Incident note (ownership checks, historical — the functions involved no longer exist but the lesson still applies):** the old solo-game RPC `regen_player_energy` was initially created taking a raw `p_player_id` argument with no ownership check, letting any signed-in user regen another player's energy for free. **Any internal helper function (one meant to be called only from other RPCs, not directly by clients) must have its EXECUTE grant revoked from `anon`/`authenticated`** — `get_advisors(type: "security")` will not necessarily catch a missing ownership check on its own, and RLS does not protect function *arguments*, only table rows. `add_wobblin_xp` (see above) follows this pattern today: it's revoked from `anon`/`authenticated` and only reachable via `sacrifice_wobblin`.

---

# Database Schema (actual, introspected from Supabase)

## players

```
id (uuid, = auth.users.id)
username (text, unique)
avatar (text, nullable — 'explorer' | 'mage' | 'knight')
active_wobblin_id (uuid, nullable, FK -> player_wobblins.id, on delete set null)
onboarding_completed (bool, default false)
created_at
```

A trigger on `auth.users` insert creates this row automatically with a placeholder username; `onboarding_completed` (not row existence) is what gates character creation. `avatar` is set at character creation and is otherwise cosmetic (Profile screen). `active_wobblin_id` is the player's chosen featured Wobblin — see `getFeaturedWobblin`/`setActiveWobblin` in `src/supabase/wobblins.ts` / `src/supabase/players.ts`. **No `level`, `experience`, `gold`, or `energy` columns** — the solo-player progression/currency system was removed; the player's own account has no progression of its own, only their Wobblins do.

## wobblin_species

Static species/evolution-chain definitions: `id, name (unique), element, rarity, description, base_hp, base_attack, base_defense, base_speed, stage, evolves_into_id, evolution_level, evolution_chain_id, egg_cadence_hours`. Seeded with 30 rows — 10 elemental lines × 3 stages.

- `stage` is `0` (base), `1` (first evolution), or `2` (final evolution). Renumbered from an earlier `1`/`2`/`3` scheme to match the spec's terminology exactly — if you see stray references to stage `1` meaning "base," they're stale.
- `evolves_into_id` points to the next stage's species row, `null` on stage-2 (final) rows.
- `evolution_level` is the `player_wobblins.level` required to evolve into `evolves_into_id`, `null` when `evolves_into_id` is `null`.
- `evolution_chain_id` groups all 3 stages of a line — elegantly, it's simply the `id` of that line's own stage-0 row (no separate lookup table needed). `sacrifice_wobblin` requires both Wobblins to share this value; `claim_egg` uses it directly as the new egg's `species_id`.
- `egg_cadence_hours` is set only on stage-2 rows (varies by rarity at seed time — common lines shorter, legendary longer) and drives `claim_egg`'s eligibility check.

## player_wobblins

Owned Wobblins: `id, player_id, species_id, nickname, level, experience, created_at, acquired_at, locked_reason, last_egg_claimed_at`.

- `locked_reason` is nullable, `CHECK (locked_reason IN ('task_reward'))` — set by `create_task`, cleared by `review_task`/`cancel_task`. A locked Wobblin cannot evolve, be sacrificed, be offered as another task's reward, or have its ownership transferred by anything except the task RPCs.
- `last_egg_claimed_at` is only meaningful when the species is stage 2; `claim_egg` reads `coalesce(last_egg_claimed_at, created_at)` as the cadence checkpoint.
- `acquired_at` is when the **current** owner came to own this row — distinct from `created_at` (when the row was first created). They match at creation (starter pick, egg hatch) but diverge on a task-reward transfer: `review_task` sets `acquired_at = now()` on approval without touching `created_at`. Anything ordering/displaying "how long has this player had this Wobblin" (the Home/Collection "featured"/newest-first fallback logic, the Monster Detail screen's date chip) must use `acquired_at`, not `created_at` — using `created_at` would show/sort by the *previous* owner's acquisition time for a transferred Wobblin.
- **No `hp`/`attack`/`defense`/`speed` columns** — removed along with the per-instance stats concept (see the Product Philosophy note above). **No `training_points` column** — the training system was removed; the only way to change a Wobblin's level is `sacrifice_wobblin`.

The Home screen's "featured Wobblin" is `players.active_wobblin_id` if set (via the "Set as Featured" button on the Monster Detail screen, disabled while the Wobblin is locked as a task reward), falling back to the player's first-acquired (`acquired_at asc`, limit 1) Wobblin — i.e. the starter — if they haven't chosen one. `active_wobblin_id` is set with a plain table update (RLS-gated, not an RPC) since it's just an ownership pointer, not a value needing server-side derivation; `getFeaturedWobblin` re-filters by `player_id` when reading it back so a spoofed id can't surface another player's Wobblin.

## groups

`id, name, owner_id (FK -> players), invite_code (unique text), created_at`. Created via `create_group`; the invite code is shareable indefinitely (Discord-style) — there's no separate invites table or per-invite expiry/usage limit.

## group_members

`id, group_id, player_id, role ('owner' | 'member'), joined_at`, unique on `(group_id, player_id)`. Rows are only ever created by `create_group`/`join_group` — no client-facing INSERT policy.

## tasks

`id, group_id, creator_id, title, description, reward_wobblin_id (FK -> player_wobblins), status, accepted_by (nullable), accepted_at, submitted_at, submission_note (nullable), resolved_at, resolution_note (nullable), created_at`.

`status` is one of `open`, `accepted`, `submitted`, `approved`, `rejected`, `cancelled`. A partial unique index (`tasks_active_reward_wobblin_idx`) enforces that a given `reward_wobblin_id` can only be referenced by one **active** (`open`/`accepted`/`submitted`) task at a time. **No `expires_at` column and no `'expired'` status** — a task-expiry feature was scoped early in the revamp but never wired to any RPC, so the placeholder column/status value were dropped rather than left inert; if task expiry gets built, it needs a fresh migration (plus deciding the mechanism — a lazy check inside the task RPCs, mirroring the old energy-regen lazy-tick pattern, or a `pg_cron` job, which is available in the project but not installed).

## eggs

`id, owner_id, species_id (the chain's Stage 0 species), source_wobblin_id (FK -> player_wobblins, nullable on delete set null — the Stage 2 Wobblin that produced it), claimed_at, hatched_at (nullable)`. A row with `hatched_at IS NULL` is an unhatched egg sitting in the owner's collection; `hatch_egg` sets `hatched_at` and creates the real `player_wobblins` row.

## Tables that do NOT exist (do not assume otherwise)

`battles`, `locations`, `achievements`, `player_achievements` were all dropped in the 2026-07-26 revamp along with the systems they supported. There is no moves/attacks system, no items/inventory system, no `trait_1`/`trait_2` columns, no currency (`gold`) anywhere, and no energy system. `player_wobblins.hp`/`attack`/`defense`/`speed` and `tasks.expires_at` were dropped in a later cleanup pass once it was clear nothing used them (see "player_wobblins" and "tasks" above). Any older doc language implying otherwise (including earlier versions of this file) describes a prior state, not current.

---

# Screens (actual routes)

| Route | Purpose |
|---|---|
| `/login`, `/signup` | Email/password auth only. **No Google/Apple sign-in is implemented.** |
| `/character-creation` | Username + one of 3 emoji avatars (Explorer/Mage/Knight, `src/constants/avatars.ts`). Persisted to `players.username`/`players.avatar` via `completeCharacterCreation`. |
| `/starter-selection` | Pick 1 of the seeded stage-0 `wobblin_species` as a starter; creates a `player_wobblins` row for it (base stats are shown here for comparison, read from `wobblin_species`, but nothing per-instance is stored). This is still the only way a brand-new player gets their first Wobblin — there's no wild-capture flow anymore. |
| `(tabs)/index` (Home) | Player header (avatar + username, no level/gold/energy — none of that exists anymore) + an "Active Tasks" summary (tasks the player created or accepted that haven't reached a final state, across every group) + the featured Wobblin card (glowing portrait + Lv./XP bar only, no stats — matches the Monster Detail redesign). Refetches on focus (player, featured Wobblin, active tasks) for the same reason as Collection below. |
| `(tabs)/groups` | List of the player's groups; "Create Group" and "Join Group" (invite-code entry) actions. Replaces the old `(tabs)/explore` tab. |
| `/group/[id]` | Members list, shareable invite code (with a native Share sheet), and the group's task feed (all tasks regardless of status); "Create Task" CTA. |
| `/group/[id]/create-task` | Title/description fields + a picker of the caller's own unlocked Wobblins to offer as the reward. |
| `/task/[id]` | Task detail: reward Wobblin card, status pill, and the role-appropriate action — Accept (open, not-creator), Submit-with-optional-note (accepted, accepter), Approve/Reject-with-optional-note (submitted, creator), Cancel (creator, while open/accepted/submitted). |
| `(tabs)/collection` | Grid of owned Wobblins with element filter chips, filtered client-side over the already-fetched list, plus an "Eggs Ready to Hatch" strip above the grid for any unhatched `eggs` rows. Refetches on focus (see the React Query note above) so it doesn't show stale data after a sacrifice/evolve/task-approval performed on another screen. |
| `/wobblin/[id]` (Monster Detail) | Hero card (portrait with an element-tinted glow, name + "Lv. N" pill, element/rarity badges, a caught/acquired-date chip, and the XP bar — the only stat that still exists); "Set as Featured" (disabled with a lock icon while the Wobblin is locked as a task reward); a locked-as-task-reward banner, owner-only, tappable through to the specific task (going back instead of pushing a duplicate screen if that's where the user came from); an Evolution panel (shown if the species has a next stage); a "Sacrifice Duplicates" panel (multi-select same-chain Wobblins to consume in one batch, sorted lowest-stage-first); and — for stage-2 Wobblins — an Eggs panel with a cadence countdown and "Claim Egg" button. No stats panel, no training UI, no Battle button (none of those systems exist). |
| `(tabs)/profile` | Avatar, username, join date, Wobblins-owned count, Groups-joined count, Sign Out. No gold/energy/achievements — none of that exists. |
| `/supabase-test` | Dev-only connectivity check screen; not part of the player-facing flow. |

There is no dedicated Splash screen route — native splash + Expo font loading gate (`_layout.tsx`) serves that purpose, then `SupabaseProvider`'s session state determines where routing lands.

The bottom tab bar has **4 tabs** (Home, Groups, Collection, Profile).

---

# Game Systems (actual)

## Groups & Invites

Any signed-in player can create a group (`create_group`, becoming its `owner` in `group_members`) or join one via a shareable 6-character invite code (`join_group`). There's no targeted/pending-invite flow — anyone with the code can join, matching the "private groups, not discoverable/public" requirement without needing a user-search UI. Any member (not just the owner) can create tasks and see the invite code to share further.

## Tasks

The core loop: a group member creates a task (`create_task`) offering one of their own unlocked Wobblins as the reward, which locks it. Another member (not the creator) accepts it (`accept_task`), completes it in the real world, and submits it with an optional note (`submit_task`). The creator then reviews it (`review_task`): approving transfers the reward Wobblin's ownership to the accepter and clears the lock; rejecting just clears the lock (ownership never left the creator, since it only ever transfers on approval). The creator can also cancel a task any time before it's resolved (`cancel_task`), which clears the lock the same way a rejection does. A reward Wobblin can only be attached to one active task at a time (enforced by a partial unique index, not just application logic).

**Task expiry is not implemented** — it was scoped out and its schema placeholder (`expires_at`/`'expired'` status) was later removed rather than left dormant. See "Current Status" below if picking this up.

## Evolution Chains

Each of the 10 elemental lines has 3 stages (0/1/2) linked via `wobblin_species.evolves_into_id`/`evolution_level`, grouped by `evolution_chain_id`. `evolve_wobblin` requires the Wobblin's level to meet the next stage's `evolution_level` and that it isn't locked as a task reward, then simply repoints `species_id` to the next stage — there are no per-instance stats to carry over (see the Product Philosophy note above).

## Duplicate-Monster Sacrifice & Leveling

Monsters do **not** gain XP from tasks, battles, or passive play — the only way to level one up is `sacrifice_wobblin`, consuming another owned, unlocked Wobblin from the **same evolution chain** (checked via `evolution_chain_id`, not species name — a Fire Cub can consume any stage of the Fire line). The consumed Wobblin is permanently deleted; the target gains XP (`100 * consumed.level` currently — a placeholder-tunable formula, not a carefully balanced one) via `add_wobblin_xp`. The Wobblin detail screen's "Sacrifice Duplicates" panel supports selecting several duplicates at once and sacrifices them sequentially under one loading state (there's no batch RPC — the server has no multi-consume variant).

## Final-Evolution Egg Generation

Only stage-2 (fully evolved) Wobblins can generate eggs, and only for their own chain's stage-0 species (`claim_egg` uses `evolution_chain_id` directly as the new egg's `species_id`). Eligibility is timestamp-gated server-side (`egg_cadence_hours`, varies by rarity) — the client only mirrors the countdown for display, exactly like the old energy-regen display mirror pattern, and `claim_egg` re-validates regardless of what the client's clock shows. Claiming and hatching are modeled as two distinct steps (an `eggs` row with `hatched_at IS NULL` sits in the Collection screen's "Eggs Ready to Hatch" strip until `hatch_egg` is called) — this was a deliberate choice to keep "claimed" and "hatched" as genuinely separate states, matching the spec's own wording, rather than collapsing them into one client action.

## Removed systems (do not build on top of these — they don't exist)

Exploration/locations, energy (and its regen-on-read pattern), wild-encounter capture, battling (PvE or otherwise), manual stat training, gold/currency, achievements, and the daily login reward were all removed in the 2026-07-26 revamp in favor of the task-driven economy above. If you find old references to any of these (in comments, unused imports, or stale planning docs), they describe the pre-revamp app — don't reintroduce the underlying tables/RPCs/screens without discussing scope with the user first, since this was a deliberate product-direction change, not an oversight.

---

# Visual Constraints

The MVP requires minimal images — icons, emoji, SVG shapes, gradient/glow cards, progress bars, and the existing illustrated species portraits (`src/constants/speciesArt.ts`). Keep new UI consistent with this: no large new image-asset pipelines, no animated battle scenes (there's no battle system to animate).

---

# Design Direction

Dark fantasy mobile aesthetic: dark backgrounds (`COLORS.background = #0c0d16`), glowing/bordered cards, rounded corners, large readable text. Element colors (fire/water/grass/thunder/dark/ice/rock/wind/light/poison) and rarity colors (common→legendary) are defined in `src/constants/theme.ts` — reuse these constants rather than hardcoding new hex values.

---

# Security

- Every table has RLS enabled — verify this holds for any new table (`get_advisors` after migrating).
- Anything that mutates monster ownership, locking, level/XP, or timing-gated rewards (eggs) must go through a Postgres RPC that re-derives values server-side (see the RPC pattern above); never trust client-computed values for these fields.
- `players` has no client-facing INSERT policy — rows are created only by the `auth.users` trigger. `group_members` similarly has no client-facing INSERT policy — rows are created only by `create_group`/`join_group`.
- **Every new function's grants must be checked with `has_function_privilege` against `anon`, not just reasoned about** — see the grants incident note above. `revoke ... from public` is not sufficient in this project because of its default-privileges configuration.
- `get_advisors(type: "security")` flags externally-callable `SECURITY DEFINER` functions but won't catch a missing ownership check inside one, so review new RPCs for an explicit `auth.uid()` check matching `sacrifice_wobblin`/`create_task`/etc.
- `player_wobblins` SELECT has two policies: owner-only, plus a second one making a Wobblin visible to any member of a group where it's referenced as a task's `reward_wobblin_id` (so an accepter can see what they're working toward before it's theirs). `players` similarly has a second SELECT policy making a profile visible to anyone sharing a group with that player (needed to show usernames on task/group screens) — `is_group_member`-style policies like this are why that helper function exists.
- The `players`/`player_wobblins` UPDATE policies are row-scoped, not column-scoped — RLS policies gate rows, not columns. `avatar`/`active_wobblin_id` are safe to update directly from the client because they're not values that need server-side derivation. There is intentionally **no** client-facing UPDATE policy on `player_wobblins` at all — every mutation to level/species/locked_reason/ownership goes through a `SECURITY DEFINER` RPC instead.

---

# Out of scope (still true)

Trading, guilds, breeding, PvP matchmaking, marketplace, real-time multiplayer, complex animations. These remain explicitly excluded from the current build.

---

# Current Status / Suggested Next Steps

Already working: auth, onboarding (with persisted username + avatar), starter selection, private groups with shareable invite codes, the full task lifecycle (create/accept/submit/review/cancel) with secure ownership transfer on approval, duplicate-sacrifice leveling (single or multi-select), evolution through 3 stages, final-evolution egg generation (claim + hatch as distinct steps), a Collection screen with an eggs section, and a real Profile screen.

Remaining gaps worth knowing about before extending the game (not commitments, just the honest state):
- **There is no per-instance stats system at all** (removed, not just dormant — see the Product Philosophy note above and "Tables that do NOT exist"). If per-Wobblin differentiation beyond level/stage/nickname is wanted later, it needs a fresh migration (re-add stat columns, decide a growth formula, wire it into `sacrifice_wobblin`/`evolve_wobblin`) rather than resuming dormant infrastructure — there isn't any anymore.
- **No task expiry** — scoped out; `tasks.expires_at`/`'expired'` status were removed rather than left as an unused placeholder. Needs a fresh migration if this gets built (see "tasks" above for the mechanism options).
- **No task submission evidence beyond a free-text note** — no photo attachment, matching the "no image asset pipeline" visual constraint, but worth confirming that's still the right call as the feature matures.
- Login/signup copy still says "Monster Realms" in a couple of places — a cosmetic leftover from an earlier project name predating even the original monster-collection RPG; unrelated to the 2026-07-26 revamp.
- The `players`/`player_wobblins` RLS UPDATE policies are row-scoped, not column-scoped — see the note under "Security" above.
