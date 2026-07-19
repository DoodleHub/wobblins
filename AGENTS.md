# Monster Realms RPG - React Native + Supabase MVP

## Project Overview

Build a mobile-first social monster collection RPG using:

- React Native
- Expo
- TypeScript
- Supabase
- PostgreSQL
- Supabase Auth
- Supabase Realtime
- React Navigation

The goal of the MVP is to create a playable vertical slice:

Player creates an account →
chooses a starter monster →
explores locations →
discovers monsters →
captures monsters →
trains monsters →
battles →
progresses collection.

The MVP should feel like a lightweight social RPG similar to:

- Pokémon collection systems
- Mobile idle RPG progression
- Social MMO mechanics

The game should prioritize:

1. Player progression
2. Monster ownership
3. Collection addiction
4. Strategic customization
5. Future multiplayer expansion

The MVP should NOT require expensive artwork or animation.

---

# Product Philosophy

The game should create the feeling:

"My monster is unique."

Two players owning the same species should still have different monsters because of:

- Stats
- Traits
- Attacks
- Growth choices
- Personality
- Rarity

The database and game systems are more important than visuals.

---

# Technical Constraints

## Framework Constraints

Use:

- React Native
- Expo
- TypeScript

Avoid:

- Native modules unless required
- Heavy animation libraries
- Complex 3D rendering
- Large image assets

---

# Visual Constraints

The MVP should require minimal images.

Use:

- Icons
- Emojis
- SVG shapes
- Gradient backgrounds
- Cards
- Stat bars
- Simple illustrations

Do NOT build:

- Full character artwork pipeline
- Animated battle scenes
- Large map assets

---

# Supabase Requirements

Supabase handles:

- Authentication
- Player data
- Monster ownership
- Game state
- Leaderboards
- Future realtime features

Required features:

- Email authentication
- User profiles
- Database persistence
- Row level security
- Realtime ready architecture

---

# Database Schema

## users

Stores player information.

Fields:

id
username
level
experience
gold
energy
created_at

---

## monster_species

Static monster definitions.

Example:

Frostfang
Element: Ice
Rarity: Rare
Base HP: 100
Base Attack: 25

Fields:

id
name
element
rarity
description
base_hp
base_attack
base_defense
base_speed

---

## player_monsters

Owned monsters.

Fields:

id
player_id
species_id
nickname
level
experience
current_hp

attack_stat
defense_stat
speed_stat

trait_1
trait_2

created_at

---

## attacks

Available moves.

Fields:

id
name
element
damage
accuracy
description

---

## monster_attacks

Monster attack assignments.

Fields:

monster_id
attack_id
slot_number

---

## users_inventory

Items.

Fields:

id
user_id
item_type
quantity

---

## battles

Battle history.

Fields:

id
player_id
enemy_id
winner
created_at

---

# MVP Screens

The app contains the following screens.

---

# 1. Splash Screen

Purpose:

Brand introduction and loading.

Requirements:

Display:

- Game logo
- Loading indicator
- Background fantasy theme

Logic:

Check authentication state.

If authenticated:

Navigate to Home.

If new user:

Navigate to Login.

---

# 2. Login Screen

Purpose:

Allow account creation.

UI:

Monster Realms

[ Continue with Google ]

[ Continue with Apple ]

[ Email Login ]

Requirements:

- Supabase Auth integration
- Persist sessions
- Handle errors

Constraints:

No complex onboarding.

Login should take under 30 seconds.

---

# 3. Character Creation Screen

Purpose:

Create player's identity.

Fields:

Username

Avatar selection:

- Mage
- Knight
- Ranger
- Explorer

The avatar does not require images.

Use:

- Icons
- SVG
- Emoji

---

# 4. Starter Monster Screen

Purpose:

Choose first monster.

Display three options:

Example:

## Emberling

Element:
Fire

Style:
Aggressive

## Moss Slime

Element:
Nature

Style:
Balanced

## Frostfang

Element:
Ice

Style:
Defensive

Each starter receives:

- Level 5
- Two attacks
- One trait

---

# 5. Home Dashboard

Main player hub.

Display:

Player:

- Username
- Level
- Gold
- Energy

Featured monster:

- Name
- Level
- HP bar

Actions:

Primary buttons:

Explore
Battle
My Monsters

Bottom navigation:

Home
Explore
Monsters
Battle
Profile

---

# 6. Explore Screen

Purpose:

Find monsters.

Locations:

Forest

Common:

- Moss Slime
- Leaf Bug

Volcano

Common:

- Emberling

Ocean

Common:

- Tide Crab

Shadow Realm

Rare monsters

Each exploration:

Costs energy.

Example:

Forest:

Cost:
5 energy

Result:

Random monster encounter.

---

# 7. Encounter Screen

Purpose:

Monster discovery moment.

Display:

Monster name

Level

Rarity

Element

Stats

Actions:

Capture

Battle

Run

---

# 8. Capture Screen

Purpose:

Capture mechanic.

Logic:

Calculate capture probability.

Formula:

Base capture chance

-

Player bonuses

-

Monster rarity penalty

Display:

Capture progress.

Success:

Add monster to player inventory.

---

# 9. Monster Collection Screen

Purpose:

View owned monsters.

Display:

Cards containing:

- Icon
- Name
- Level
- Rarity
- Element

Filters:

All

Fire

Water

Nature

Rare

---

# 10. Monster Detail Screen

Most important screen.

Display:

Monster:

Name

Level

Experience

Stats:

HP

Attack

Defense

Speed

Attacks:

Example:

Ice Bite

Blizzard

Traits:

Example:

Cold Blood

Effect:

Reduced fire damage

Actions:

Train

Battle

Release

---

# 11. Training Screen

Purpose:

Customize monster growth.

Training should NOT be unlimited.

Rules:

Each monster receives limited training points.

Training options:

Attack Training

+Attack

Defense Training

+Defense

Speed Training

+Speed

Costs:

Training Points

---

# 12. Battle Screen

Purpose:

Simple turn-based combat.

Battle flow:

Player chooses:

Attack

Defend

Swap

Damage calculated by:

Attack stat

Ability power

Defense

Random factor

No animations required.

Use:

Cards

Text logs

Health bars

---

# 13. Profile Screen

Display:

Player level

Collection count

Achievements

Future:

Guild information

Ranking

Badges

---

# Game Systems

## Monster Stats

Every monster has:

HP

Attack

Defense

Speed

---

## Traits

Traits are passive abilities.

Examples:

Cold Blood

Effect:

20% less fire damage

Lucky

Effect:

Higher rare encounter chance

Predator

Effect:

More damage against low HP enemies

Traits are NOT attacks.

---

## Attacks

Active battle actions.

Each monster has:

2-4 attacks.

Example:

Ice Bite

Damage:
40

Freeze Ray

Chance:
20% freeze

---

# Energy System

Exploration requires energy.

Example:

Maximum:

50

Regeneration:

1 energy every 5 minutes.

---

# Economy

Currencies:

Gold:

Used for:

- Training
- Items

Future:

Premium currency

---

# Code Organization

Recommended structure:

src/

components/

screens/

navigation/

services/

supabase/

hooks/

types/

utils/

constants/

---

# Component Rules

Create reusable components:

MonsterCard

StatBar

Button

ItemCard

AttackCard

TraitBadge

Avoid duplicated UI.

---

# State Management

Prefer:

React Query

or

Zustand

Avoid:

Large global state.

Server state belongs in Supabase.

---

# Security Rules

All database tables must use:

Row Level Security

Players can:

Read their own monsters

Modify their own monsters

Players cannot:

Modify another user's data

---

# MVP Exclusions

Do NOT build:

❌ Trading

❌ Guilds

❌ Breeding

❌ PvP matchmaking

❌ Marketplace

❌ Real-time battles

❌ Complex animations

These are future updates.

---

# MVP Success Criteria

A user should be able to:

✅ Create account

✅ Pick starter monster

✅ Explore

✅ Encounter monster

✅ Capture monster

✅ View collection

✅ Train monster

✅ Battle basic AI enemy

✅ Level up

✅ Return daily

---

# Development Priority

Build in this order:

1. Authentication

2. Database schema

3. Player profile

4. Starter selection

5. Monster collection

6. Exploration system

7. Capture system

8. Training

9. Battle

10. Polish UI

---

# Design Direction

Style:

Dark fantasy mobile RPG.

Use:

- Dark backgrounds
- Glowing cards
- Rounded corners
- Large readable text
- RPG-inspired UI

The game should feel premium while requiring minimal graphical assets.
