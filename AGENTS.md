# Wobblins - React Native + Supabase Monster Collection RPG

## Project Overview

Wobblins is a mobile-first monster collection RPG built with:

- React Native + Expo (SDK 57, Expo Router for file-based navigation)
- TypeScript
- NativeWind (Tailwind CSS v4 for React Native)
- TanStack React Query for server state
- Supabase (Postgres, Auth, Row Level Security, RPC functions)

The vertical slice that exists today:

Player creates an account (email/password) →
completes character creation →
chooses a starter Wobblin →
explores locations (spends energy) →
encounters a wild Wobblin →
attempts to capture it →
views their collection →
trains a Wobblin's stats →
battles a wild opponent →
earns gold/XP and levels up.

This document describes what is **actually built**, not an aspirational spec. When adding features, match the patterns described here before introducing new ones.

---

# Product Philosophy

The game should create the feeling: "My Wobblin is unique."

Two players owning the same species should still have different Wobblins because of stats, growth choices (training), and rarity. Right now uniqueness comes from **stats and training only** — traits, attacks/movesets, and personality are not implemented (see "Not Implemented" below). Don't assume they exist when reading or extending code.

The database and game systems matter more than visuals. The MVP should not require expensive artwork or animation.

---

# Technical Stack (as built)

- **Expo Router**, not React Navigation directly. Routes are files under `src/app/`. `(tabs)` is a route group for the bottom tab navigator.
- **NativeWind v4** (`className` props backed by Tailwind). Theme tokens live in two places that must stay in sync:
  - `global.css` — the `@theme` block, source of truth, used via `bg-*`/`text-*`/`border-*` class names.
  - `src/constants/theme.ts` — plain-JS mirror of the same values, used only where className strings can't reach (dynamic lookups keyed by data like `element`/`rarity`, and native APIs like `StatusBar` or SVG fill that need a raw hex string).
- **TanStack React Query** for all server state. `QueryClient` is created once in `src/app/_layout.tsx`. Do not introduce Zustand or another global state library — server state belongs in Supabase/React Query; there is currently no client-only global state need.
- **Supabase JS client** (`src/supabase/client.ts`), wrapped by `SupabaseProvider` (`src/supabase/SupabaseProvider.tsx`) which exposes `{ session, isLoading }` via `useSupabase()`.
- Fonts: Manrope (body) + Space Grotesk (display), loaded via `@expo-google-fonts/*` in `_layout.tsx`.

## Code organization (actual)

```
src/
  app/            # Expo Router routes (screens) — file path = URL path
    (tabs)/       # Bottom tab group: index, explore, collection, profile
  components/     # Shared presentational components
  constants/      # theme.ts (design tokens), locations.ts (explore data), avatars.ts
  hooks/          # React Query hooks, one file per domain, + queryKeys.ts
  supabase/       # Thin service functions wrapping supabase-js calls/RPCs
  utils/          # xp.ts (leveling curve), errors.ts
```

The `screens/`, `navigation/`, and `services/` folders from earlier planning docs do not exist — Expo Router's `app/` replaces both `screens/` and `navigation/`, and `supabase/` plays the role of `services/`.

### Hook / service pattern

Each domain has a `src/supabase/<domain>.ts` file of plain async functions (calling `supabase.from(...)` or `supabase.rpc(...)`) and a matching `src/hooks/use<Domain>.ts` file of React Query hooks that call those functions. `src/hooks/queryKeys.ts` is the single query-key factory — always add new keys there so mutations can invalidate the right queries. Follow this pattern for new features rather than calling `supabase` directly from a screen.

## Reusable components (actual)

`Button`, `MonsterCard`, `StatBar`, `XPBar`, `TraitBadge` (used for element/rarity pills, not personality traits), `TextField`, `LevelUpBanner`, `EmptyState`, `LoadingScreen`, `Skeleton`, `ComingSoonScreen`. Reuse these instead of building new ad hoc cards/badges/loaders.

---

# Supabase Setup (already provisioned)

There is **no local `supabase/migrations` folder** in this repo — the schema lives only in the remote project and is inspected/changed through the Supabase MCP tools (`list_tables`, `list_migrations`, `apply_migration`, `execute_sql`, `get_advisors`, `generate_typescript_types`, etc.). Before touching the schema:

1. Run `list_tables` / `list_migrations` to see current state — don't assume this doc is still current, it will drift.
2. Make schema changes with `apply_migration` (never hand-edit `src/supabase/database.types.ts` — regenerate it with `generate_typescript_types` after any schema change).
3. Check `get_advisors` after migrations for RLS/security lint issues.

Row Level Security is enabled on every table (`players`, `wobblin_species`, `player_wobblins`, `locations`, `battles`). Keep it that way for any new table.

## Core game-logic pattern: server computes truth, client replays

Every mechanic that affects rewards, currency, or randomness is a **Postgres RPC function**, called via `supabase.rpc(...)`, not computed client-side:

- `spend_energy(p_location_id)` — regenerates the caller's energy first (see below), then looks up the location's energy cost server-side and debits `players.energy`. The client never sends a cost.
- `sync_player_energy()` — applies passive energy regen for the caller and returns their refreshed `players` row; `getPlayer()` calls this instead of a plain select, so every read (not just explores) is up to date.
- `regen_player_energy(p_player_id)` — internal helper behind the two RPCs above. It is **not** grantable to `anon`/`authenticated` (EXECUTE is explicitly revoked) and only meant to be called from other `SECURITY DEFINER` functions that have already established `p_player_id = auth.uid()`. If you ever need regen logic elsewhere, call `sync_player_energy()`, don't grant this one directly — see the "energy regen" incident note below.
- `attempt_capture(p_species_name)` — rolls capture odds and, on success, creates the `player_wobblins` row with stats derived from `wobblin_species` server-side.
- `resolve_battle(p_wobblin_id)` — picks a random wild opponent, simulates the entire multi-turn battle, credits gold/XP, and logs a `battles` row, all atomically. The client (`battle.tsx`) only replays the returned `turns[]` array one tap at a time for pacing/feel — it never reports its own outcome.
- `train_wobblin(p_player_wobblin_id, p_training_option)` — enforces ownership and remaining `training_points` server-side.
- `add_player_xp` / `add_wobblin_xp` — leveling curve functions; `src/utils/xp.ts` (`getXpProgress`) is a client-side **mirror** of the same curve (`cumulativeXp(level) = 100 * level * (level+1) / 2`) purely for rendering XP bars — it must stay in sync if the curve changes server-side.

**When adding a new mechanic that touches currency, stats, or randomness, add a new Postgres RPC rather than computing it in the client.** This is the load-bearing security pattern in this codebase (a tampered client can't forge rewards) — don't break it for convenience.

**Incident note:** `regen_player_energy` was initially created taking a raw `p_player_id` argument with no ownership check and no revoked grants — Postgres grants EXECUTE to `PUBLIC` on new functions by default, so it was briefly callable by any signed-in (or anonymous) user via `/rest/v1/rpc/regen_player_energy` with an arbitrary player id, letting them regen someone else's energy for free. Fixed by adding the same `p_player_id <> auth.uid()` check `add_player_xp` already used, and revoking EXECUTE from `public`/`anon`/`authenticated`. **Any new internal helper function (one meant to be called only from other RPCs, not directly by clients) must have its EXECUTE grant revoked from `anon`/`authenticated`** — Postgres does not do this by default, `get_advisors(type: "security")` will not necessarily catch a missing ownership check on its own, and RLS does not protect function *arguments*, only table rows.

Two RPCs exist in the schema (`capture_wobblin`, `start_battle`) that the client does **not** currently call — `attempt_capture` and `resolve_battle` superseded them. Check before assuming either is live.

---

# Database Schema (actual, introspected from Supabase)

## players

```
id (uuid, = auth.users.id)
username (text, unique)
level (int, default 1)
experience (int, default 0)
gold (int, default 500)
energy (int, default 50)
energy_updated_at (timestamptz, default now())
avatar (text, nullable — 'explorer' | 'mage' | 'knight')
active_wobblin_id (uuid, nullable, FK -> player_wobblins.id, on delete set null)
onboarding_completed (bool, default false)
created_at
```

A trigger on `auth.users` insert creates this row automatically with a placeholder username; `onboarding_completed` (not row existence) is what gates character creation. `avatar` is set at character creation and is otherwise cosmetic (Profile screen). `active_wobblin_id` is the player's chosen featured Wobblin — see `getFeaturedWobblin`/`setActiveWobblin` in `src/supabase/wobblins.ts` / `src/supabase/players.ts`.

## wobblin_species

Static species definitions: `id, name (unique), element, rarity, description, base_hp, base_attack, base_defense, base_speed`. Seeded with 9 species. No `attacks` or `traits` columns.

## player_wobblins

Owned Wobblins: `id, player_id, species_id, nickname, level, experience, hp, attack, defense, speed, training_points, created_at`.

The Home screen's "featured Wobblin" is `players.active_wobblin_id` if set (via the "Set as Featured" button on the Monster Detail screen), falling back to the player's oldest (`created_at asc`, limit 1) Wobblin — i.e. the starter — if they haven't chosen one. `active_wobblin_id` is set with a plain table update (RLS-gated, not an RPC) since it's just an ownership pointer, not a value needing server-side derivation; `getFeaturedWobblin` re-filters by `player_id` when reading it back so a spoofed id can't surface another player's Wobblin.

## locations

`id, name (unique), energy_cost`. Backs the server-side cost lookup for `spend_energy`. The 4 explorable locations (Forest, Volcano, Ocean, Shadow Realm) and which wild species appear in each are currently **hardcoded client-side** in `src/constants/locations.ts`, not read from this table or from `wobblin_species` — there's no capture-from-database flow yet for wild encounters, only for the resulting captured Wobblin.

## battles

Battle history: `id, player_id, wobblin_id, enemy_species_id, winner, reward (jsonb), created_at`.

## Tables that do NOT exist (do not assume otherwise)

`attacks`, `monster_attacks`, `users_inventory`. There is no moves/attacks system, no items/inventory system, and no `trait_1`/`trait_2` columns anywhere. Any older design-doc language implying otherwise is describing future work, not current state.

---

# Screens (actual routes)

| Route | Purpose |
|---|---|
| `/login`, `/signup` | Email/password auth only. **No Google/Apple sign-in is implemented** despite that being a common RPG pattern — don't assume OAuth buttons exist. |
| `/character-creation` | Username + one of 3 emoji avatars (Explorer/Mage/Knight, `src/constants/avatars.ts`). Both are persisted to `players.username`/`players.avatar` via `completeCharacterCreation`. |
| `/starter-selection` | Pick 1 of the seeded `wobblin_species` as a starter; creates a `player_wobblins` row at the species' base stats (not level 5 with attacks/traits as older planning docs suggested — there are no attacks/traits to assign). |
| `(tabs)/index` (Home) | Player header (username, level, gold, energy, XP bar) + featured Wobblin card. `usePlayer` refetches every 60s so passive energy regen is visible without a manual action. |
| `(tabs)/explore` | Location list from `constants/locations.ts`; spends energy via RPC, then navigates to `/encounter` with the rolled species passed as route params. |
| `/encounter` | Wild Wobblin reveal + Capture/Run. There is no separate "Capture Screen" with a progress meter — capture is a single button on this screen, resolved instantly by `attempt_capture`. |
| `(tabs)/collection` | Grid/list of owned Wobblins with element filter chips (All/Fire/Ice/Water/Nature/Shadow), filtered client-side over the already-fetched list. No rarity filter yet. |
| `/wobblin/[id]` (Monster Detail) | Stats, XP bar, "Set as Featured" (shown unless this is already the player's featured Wobblin), Train / Battle actions. No attacks list or traits section (nothing to show). |
| `/train` | Spend `training_points` on Attack/Defense/Speed. |
| `/battle` | Auto-resolves a full battle server-side on entry; player taps "Attack" repeatedly to reveal turns from the precomputed log. There is no Attack/Defend/Swap choice per turn, no move selection, and no multi-monster team swapping. |
| `(tabs)/profile` | Avatar, username, join date, XP bar, Wobblins-owned count, gold, and a placeholder "Achievements" card, plus Sign Out. Achievements themselves aren't implemented yet. |
| `/supabase-test` | Dev-only connectivity check screen; not part of the player-facing flow. |

There is no dedicated Splash screen route — native splash + Expo font loading gate (`_layout.tsx`) serves that purpose, then `SupabaseProvider`'s session state determines where routing lands.

The bottom tab bar has **4 tabs** (Home, Explore, Collection, Profile) — there is no separate Battle tab; battles are entered from a Wobblin's detail screen.

---

# Game Systems (actual)

## Stats

Every `player_wobblins` row has `hp, attack, defense, speed`, initialized from the species' base stats and increased only via training.

## Leveling / XP

`experience` accumulates on `players` and on individual `player_wobblins`. Curve: cumulative XP to reach level L is `100 * L * (L+1) / 2` (see `src/utils/xp.ts`, mirroring the server-side `add_player_xp`/`add_wobblin_xp` functions). Leveling is triggered server-side inside `resolve_battle`.

## Training

Each `player_wobblins` row has a `training_points` balance (starts at 0 — currently only grows via leveling server-side). Training screen offers Attack/Defense/Speed, each costing 1 point, enforced by the `train_wobblin` RPC.

## Exploration & Energy

4 locations, each with a fixed energy cost (Forest 5, Volcano 8, Ocean 8, Shadow Realm 15 — not a flat 5 across all locations). `players.energy` defaults to 50 (`v_max_energy` in the regen functions — update both places if this ever changes).

Energy regenerates passively at 1 per 5 minutes, computed **lazily** rather than via a cron job: `players.energy_updated_at` is a checkpoint timestamp, and `regen_player_energy(p_player_id)` (internal only) computes `floor(elapsed_seconds / 300)` whole ticks and advances the checkpoint by exactly that many ticks' worth of time — never to "now" — so partial progress toward the next tick is never lost between reads. It's invoked via `sync_player_energy()` (called by `getPlayer()` on every read) and inline at the top of `spend_energy` (so a stale energy value can never wrongly block an affordable explore). There is no `pg_cron` job — everything is compute-on-read. If a true background regen (energy ticking up even while the app is closed, for push-notification purposes, etc.) is ever needed, `pg_cron` is available in the project but not installed.

## Capture

Single-step: tap Capture on the encounter screen → `attempt_capture` RPC rolls success and, if successful, inserts the `player_wobblins` row. No visible capture-probability formula or progress bar client-side (odds are entirely server-side).

## Battle

Player-vs-wild-AI only (no PvP). One Wobblin at a time (no team/swap). `resolve_battle` runs the full simulation server-side and returns a turn log the client replays for feel; on a win, gold + XP are credited and a `battles` row is logged automatically.

## Traits & Attacks — NOT implemented

Despite being central to earlier concept docs, there is no traits system (Cold Blood, Lucky, Predator, etc.) and no attacks/moves system (no move selection, no elemental type-effectiveness logic, no accuracy/damage-per-move). `ELEMENT_COLORS`/`ELEMENT_EMOJI` in `theme.ts` are purely cosmetic (badge tinting), not a combat mechanic. Treat these as future work, not existing surface area to build on top of.

---

# Visual Constraints

The MVP requires minimal images — icons, emoji, SVG shapes, gradient/glow cards, stat bars. This is followed throughout (`ELEMENT_EMOJI` placeholders, no monster artwork pipeline). Keep new UI consistent with this: no large image assets, no animated battle scenes.

---

# Design Direction

Dark fantasy mobile RPG: dark backgrounds (`COLORS.background = #0c0d16`), glowing/bordered cards, rounded corners, large readable text. Element colors (fire/ice/water/nature/shadow) and rarity colors (common→legendary) are defined in `src/constants/theme.ts` — reuse these constants rather than hardcoding new hex values.

---

# Security

- Every table has RLS enabled — verify this holds for any new table (`get_advisors` after migrating).
- Anything that mutates gold, energy, XP, stats, or capture/battle outcomes must go through a Postgres RPC that re-derives values server-side (see the RPC pattern above); never trust client-computed values for these fields.
- `players` has no client-facing INSERT policy — rows are created only by the `auth.users` trigger.
- Postgres grants `EXECUTE` on new functions to `PUBLIC` by default. Any RPC meant to be called only from other RPCs (not directly by a client) needs that grant explicitly revoked (`revoke execute on function ... from public, anon, authenticated;`) — see the `regen_player_energy` incident note above. `get_advisors(type: "security")` flags externally-callable `SECURITY DEFINER` functions but won't catch a missing ownership check inside one, so review new RPCs for an explicit `p_<id> <> auth.uid()` (or equivalent `where ... = auth.uid()`) check, matching `add_player_xp`/`add_wobblin_xp`/`resolve_battle`/etc.
- The pre-existing `players` UPDATE policy (`id = auth.uid()`) permits updating *any* column on your own row, not just non-sensitive ones — RLS policies gate rows, not columns. `avatar`/`active_wobblin_id` are safe to update directly from the client because they're not values that need server-side derivation (an ownership pointer and a cosmetic label). `gold`/`energy`/`level`/`experience` are also technically writable this way today (RLS doesn't stop it) even though the app never does so client-side — they're protected only by the client code always going through RPCs, not by a database-level constraint. Flagged here, not fixed, since locking it down (e.g. a column-privilege `REVOKE` or a trigger) is a deliberate scope decision, not an incidental one.

---

# Out of scope (still true)

Trading, guilds, breeding, PvP matchmaking, marketplace, real-time multiplayer battles, complex animations. These remain explicitly excluded from the current build.

---

# Current Status / Suggested Next Steps

Already working: auth, onboarding (with persisted username + avatar), starter selection, exploration with passive energy regen, capture, collection view with element filtering, training, single-player battle with rewards and leveling, a real Profile screen, and featured-Wobblin selection.

Remaining gaps worth knowing about before extending the game (not commitments, just the honest state):
- **No attacks/moves or traits system** — combat is a single "Attack" action with no differentiation between Wobblins beyond raw stats. This was deliberately deferred (2026-07-20) because it needs real game-design decisions (trait effects, move sets, damage/accuracy formulas) and, for attacks, a battle-UI rework (move selection instead of a single Attack button) — scope it out with the user before building rather than guessing at balance.
- No rarity filter in the collection (element filter exists).
- No achievements system — the Profile screen has a placeholder card for it.
- Login/signup copy still says "Monster Realms" in a couple of places — a cosmetic leftover from an earlier project name; the product, package, schema, and routes are all "Wobblins" now.
- Energy regen is compute-on-read only (see "Exploration & Energy" above) — energy won't visibly tick up in, say, a push notification while the app is closed, since nothing runs server-side on a timer.
- The `players` RLS UPDATE policy is row-scoped, not column-scoped — see the note under "Security" above.
