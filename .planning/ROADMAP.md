# Roadmap: Buchclub App

## Overview

Buchclub is built in five phases, each delivering a complete vertical slice of user capability. Phase 1 plants every cross-cutting concern (auth session, i18n scaffold, Tamagui provider) so they are never retrofitted. Phase 2 builds the club-and-membership layer on top of that foundation. Phase 3 delivers book search and personal reading lists — the prerequisite for proposals. Phase 4 is the core product value: proposing books, voting live, and watching the leaderboard update in real time. Phase 5 closes the loop with meetings, profile settings, and full i18n completion across all screens.

The existing Next.js app in the same repo is never modified. The Expo app lives at `expo-app/` as a sibling.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - Expo scaffold, Supabase auth (native + web), Tamagui provider, i18n scaffold (DE + EN), full DB schema SQL (completed 2026-05-24)
- [ ] **Phase 2: Clubs & Onboarding** - Club create/join/browse, member management, user profiles
- [ ] **Phase 3: Books & Reading List** - Google Books search (Edge Function proxy), personal reading list with cover images
- [ ] **Phase 4: Pool, Voting & Realtime** - Propose books to club pool, atomic upvoting via RPC, live vote counts via Supabase Realtime
- [ ] **Phase 5: Meetings, Settings & i18n Completion** - Meeting lifecycle (create, lock, history), language switcher, full translation audit

## Phase Details

### Phase 1: Foundation
**Goal:** The app runs on iOS, Android, and web with working authentication, persistent sessions, and German/English UI — every downstream phase builds on this without retrofitting anything.
**Mode:** mvp
**Depends on:** Nothing (first phase)
**Requirements:** AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, I18N-01, I18N-02
**Success Criteria** (what must be TRUE):
  1. A new user can register with email and password, receive a confirmation, and land inside the app.
  2. A returning user's session survives a full cold-start (app killed and relaunched) — no login screen flash.
  3. User can log out from any screen and is returned to the sign-in screen.
  4. User can request a password-reset email and follow the link to set a new password.
  5. App displays in German on a German-locale device and in English on an English-locale device from the very first launch, with no manual configuration.
**Plans:** 3/3 plans complete
- [x] 01-01-PLAN.md — Walking Skeleton: Expo SDK 56 scaffold at expo-app/, Tamagui + Supabase + i18n base stack, full v1 DB schema migration (8 tables + RPC + RLS) for all 5 phases, Supabase env setup, schema push (BLOCKING checkpoints for user setup)
- [x] 01-02-PLAN.md — i18n vertical: i18next init with expo-localization device detection, complete DE + EN translation files (common, auth, nav namespaces), useDidFinishSSR guard pattern
- [x] 01-03-PLAN.md — Auth vertical: Zustand auth store + AuthProvider, Input/Button/Alert UI components, all 4 auth screens (sign-in, sign-up, forgot-password, update-password), protected app shell with platform-specific tabs, route guard, password-reset deep link handler, AUTH-04 OAuth deferred to v2
**UI hint:** yes

### Phase 2: Clubs & Onboarding
**Goal:** A newly authenticated user can create a club, invite others via code, join public or code-gated clubs, and manage their membership — all club-level data is in Supabase with RLS.
**Mode:** mvp
**Depends on:** Phase 1
**Requirements:** ONBRD-01, ONBRD-02, ONBRD-03, ONBRD-04, PROF-01, PROF-02, PROF-03, CLUB-01, CLUB-02, CLUB-03, CLUB-04, CLUB-05, CLUB-06
**Success Criteria** (what must be TRUE):
  1. After first login, user is presented with a clear choice to create a new club or join one — they cannot reach the main app without completing this step.
  2. A club creator receives a shareable invite code; a second user can paste that code and immediately appear in the first user's member list.
  3. Admin can promote a member to admin, remove a member, and toggle the club's public visibility — all changes are reflected immediately for other members.
  4. User can set a username and optional avatar, then view and edit that profile at any time.
  5. User can be a member of multiple clubs simultaneously and switch between them without losing context.
**Plans:** 4 plans
- [ ] 02-01-PLAN.md — Foundation & design system migration (fonts, colors, QueryClient, club store, delete-account RPC migration, tab bar, i18n namespaces)
- [ ] 02-02-PLAN.md — Onboarding vertical (username + avatar screens, WizardSteps, AvatarPicker, create-or-join sheet)
- [ ] 02-03-PLAN.md — Club creation/join/browse vertical (wizard, join-by-code, browse, ClubBanner, ClubCard, CodeInput)
- [ ] 02-04-PLAN.md — Club management + profile (member actions, club settings, profile view + edit, account deletion)
**UI hint:** yes

### Phase 3: Books & Reading List
**Goal:** Users can search the Google Books catalog (on all platforms including web), add books to a personal reading list with cover images and status tracking, and delete entries.
**Mode:** mvp
**Depends on:** Phase 2
**Requirements:** LIST-01, LIST-02, LIST-03, LIST-04, LIST-05, LIST-06
**Success Criteria** (what must be TRUE):
  1. User types a title, author, or ISBN into the search bar and sees results with cover thumbnails within a debounced delay — this works identically on iOS, Android, and in a browser (CORS-safe via Edge Function proxy).
  2. User can tap a search result and add it to their reading list; the book's cover URL, title, author, and ISBN are stored in Supabase at that moment.
  3. User can view their personal reading list with cover images displayed and change a book's status between planned, reading, and completed.
  4. User can delete a book from their reading list and it disappears immediately from the UI.
**Plans:** TBD
**UI hint:** yes

### Phase 4: Pool, Voting & Realtime
**Goal:** Club members can propose books from their reading list into the club pool, upvote proposals atomically (no race conditions), and watch vote counts update live on every connected device.
**Mode:** mvp
**Depends on:** Phase 3
**Requirements:** POOL-01, POOL-02, POOL-03, VOTE-01, VOTE-02, VOTE-03, VOTE-04
**Success Criteria** (what must be TRUE):
  1. A member can propose a book from their personal reading list into the club pool; the book appears in the pool for all club members immediately.
  2. Any member can upvote any number of books; each member can only cast one vote per book (duplicate votes rejected at the database level, not just the UI).
  3. Vote counts update in real time on all connected devices — a vote cast on one phone is visible on another phone within seconds, without a manual refresh.
  4. Vote mutations are routed exclusively through the `increment_book_vote` Postgres RPC; no direct INSERT or UPDATE to the votes table is possible from the client.
  5. Admin can remove a book from the club pool; the book disappears from all members' views immediately.
**Plans:** TBD
**UI hint:** yes

### Phase 5: Meetings, Settings & i18n Completion
**Goal:** Admins can create meetings with a live top-voted book that they can lock or override; all members see meeting history; every user-facing string is translated into both German and English; users can switch language in settings.
**Mode:** mvp
**Depends on:** Phase 4
**Requirements:** MEET-01, MEET-02, MEET-03, MEET-04, MEET-05, I18N-03
**Success Criteria** (what must be TRUE):
  1. Admin can create a meeting with a title, date/time, and optional location or video link; all club members can see upcoming and past meetings.
  2. Before admin confirms a book, the meeting detail screen shows the current top-voted book from the pool and updates live as votes change.
  3. Admin can lock a specific book for a meeting at any time; after locking, the confirmed book is displayed and the live vote view is replaced.
  4. Admin can change the confirmed book on a locked meeting at any time before the meeting date.
  5. User can switch the app language between German and English in the profile/settings screen; the choice persists across app restarts.
**Plans:** TBD
**UI hint:** yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 3/3 | Complete   | 2026-05-24 |
| 2. Clubs & Onboarding | 0/4 | Not started | - |
| 3. Books & Reading List | 0/? | Not started | - |
| 4. Pool, Voting & Realtime | 0/? | Not started | - |
| 5. Meetings, Settings & i18n Completion | 0/? | Not started | - |

---

## Coverage Notes

**Total v1 requirements mapped:** 39 across 5 phases — 0 orphans.

---
*Roadmap created: 2026-05-24*
*Last updated: 2026-05-24 after Phase 2 planning complete (4 plans)*
