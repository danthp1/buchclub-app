# Buchclub App

## What This Is

A universal mobile and web app (iOS, Android, Web) for organizing and managing book clubs. Anyone can sign up, create a club, or join an existing one via invite code or public listing. The app lets members track personal reading lists, vote on books for their club, and coordinate meetings — all from a single TypeScript codebase built with Expo, Tamagui, and Supabase.

## Core Value

Members stay engaged and aligned because the next book they read together is decided democratically and visible to everyone in real time.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] User can register, log in, and log out via Supabase Auth (email + password)
- [ ] After first login, user can create a new club (generates unique invite code) or join one via code
- [ ] Clubs can optionally be listed publicly so users can find and join them
- [ ] User can search for books via Google Books API (by title, author, ISBN)
- [ ] User can save books to a personal reading list with statuses: planned, reading, completed
- [ ] User can propose a book from their personal list into the club pool
- [ ] Club members can upvote any number of books in the club pool
- [ ] Meeting shows the live top-voted book until an admin confirms/locks it
- [ ] Admin can also manually change the chosen book on a meeting at any time
- [ ] Admin (any promoted member) can create meetings: title, date/time, location or video link
- [ ] Multiple admins supported per club
- [ ] Votes update in real time via Supabase Realtime subscriptions
- [ ] Vote increments are atomic via Postgres RPC (no race conditions)
- [ ] App UI supports German and English from launch (i18n-ready architecture)
- [ ] App runs as native iOS/Android (Expo) and as web app in browser

### Out of Scope

- In-app messaging / chat — not core to book club value, high complexity
- Video posts or file uploads — out of scope for v1
- OAuth / social login (Google, GitHub) — email/password sufficient for v1
- Native push notifications — deferred to v2
- Payment / subscription tiers — this is a free personal app
- Book reviews or ratings beyond voting — deferred

## Context

- Existing repo already has a Next.js app — this Expo app is built fresh inside the same repository, not replacing it
- Tech stack is fixed: Expo (React Native + Web), Tamagui for UI, Supabase (PostgreSQL + Auth + Realtime)
- Book data from Google Books API (free, no key required for basic search); cover fallback via Open Library Covers API
- Cover image URLs stored as strings in DB to minimize API calls
- All UI must be built with Tamagui components; mobile-first but must render well on web

## Constraints

- **Tech Stack**: Expo + Tamagui + Supabase — no deviations (spec is fixed)
- **APIs**: Google Books API and Open Library Covers must remain completely free to use
- **Database**: Supabase Postgres with RLS policies on all tables; votes via RPC only
- **i18n**: German and English included from day one; architecture must support adding languages
- **Existing Repo**: New Expo app lives alongside existing Next.js code — no breaking changes to it

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Expo universal app (not separate RN + Next.js) | Single codebase for iOS, Android, Web per spec | — Pending |
| Tamagui for all UI components | Compile-time performance on mobile and web, per spec | — Pending |
| Cover URLs stored as DB strings | Minimizes runtime API calls, per spec | — Pending |
| Votes via Postgres RPC | Prevents race conditions on concurrent upvotes, per spec | — Pending |
| Meeting book is live until admin locks | UX decision: democratic process continues until admin confirms | — Pending |
| Multiple admins per club | Any member can be promoted; club creator starts as admin | — Pending |
| i18n from day one (DE + EN) | User wants both languages at launch, not as an afterthought | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-24 after initialization*
