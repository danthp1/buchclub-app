# Project Research Summary

**Project:** Buchclub — Universal Book Club App
**Domain:** Social reading / club coordination — iOS, Android, Web (universal Expo)
**Researched:** 2026-05-24
**Confidence:** HIGH

---

## Executive Summary

Buchclub is a democratic book-selection and meeting-coordination app for small private book clubs. It is a universal Expo application (single codebase targeting iOS, Android, and web) built on Expo SDK 56 with Tamagui 2.x for UI, Supabase for backend (auth, database, realtime), and i18next for German/English i18n. The core product loop is: members search for books, add them to a personal reading list, propose books to their club pool, vote on proposals live, and an admin locks the winner for the upcoming meeting. Research confirms this is a well-understood problem space with mature tooling — the implementation risks are almost entirely in integration details, not in missing technology.

The recommended build strategy is a strict layer-by-layer approach: scaffold the Expo project with all providers correctly placed first (Tamagui, Auth, i18n), then build authentication, then clubs, then the book/reading-list layer, then voting with realtime, then meetings. This ordering is dictated by hard feature dependencies — nothing in the app works without auth, no club features work without clubs, and the vote/realtime layer depends on both clubs and books being in place. i18n must be scaffolded in Phase 1 before any UI string is written, because retrofitting translation keys across a completed codebase is one of the highest-friction rework tasks in this domain.

The top risks are all integration-level: Supabase auth session persistence on native requires specific configuration that diverges from the web quickstart; Supabase Realtime channels accumulate silently if not cleaned up on unmount; Google Books API is blocked by CORS on web and requires an Edge Function proxy; and vote integrity requires an atomic Postgres RPC rather than a client-side read-modify-write. Every one of these risks has a known, documented prevention pattern — the key is applying them at the phase where they first appear, not retroactively.

---

## Key Findings

### Recommended Stack

The Expo SDK 56 + Tamagui 2.0 + Supabase JS 2.x combination is fully compatible as of May 2026. Expo SDK 56 ships React Native 0.85.3 with New Architecture always-on, which is the hard requirement for Tamagui 2.0. There is no bridge-mode complexity to manage. The stack is bootstrapped as a standalone Expo app inside the existing repo (sibling to the Next.js app), with its own `package.json` — Tamagui and Expo packages must not be added to the Next.js `my-app/package.json`.

**Core technologies:**
- **Expo SDK `~56.0.4`** — universal app platform — current stable, ships RN 0.85.3 + React 19.2.3, New Architecture always-on
- **expo-router `~56.2.6`** — file-system routing — replaces manual React Navigation config, handles deep links and web routing
- **Tamagui `^2.0.0`** + `@tamagui/config`, `@tamagui/babel-plugin`, `@tamagui/metro-plugin` — UI + compile-time optimization — only cross-platform UI lib with true web/native parity and build-time CSS extraction
- **@tamagui/animations-react-native `^2.0.0`** (native) / CSS driver (web) — platform-conditional animation drivers — must be split or web bundle balloons
- **@supabase/supabase-js `^2.106.1`** — all backend: Postgres, Auth, Realtime — single client, no extra packages
- **expo-sqlite `~56.0.4`** (`localStorage` polyfill) + **react-native-url-polyfill `^3.0.0`** — Supabase auth session persistence on native — current official Supabase recommendation for SDK 56
- **i18next `^26.2.0`** + **react-i18next `^17.0.8`** + **expo-localization `~56.0.6`** — German/English i18n — hooks-based, no compile step, device locale detection
- **@tanstack/react-query `^5.100.14`** — all server state fetching and caching — handles loading/error/stale states; pairs with Realtime via `invalidateQueries`
- **zustand `^5.0.13`** — client-only state (auth session, UI preferences) — never server data
- **Google Books API** (REST, no SDK) — book search — free, no key for basic search; route through Edge Function for web CORS compliance
- **Open Library Covers API** — cover image fallback — free, no key, no rate limit

**Critical version / import notes:**
- Tamagui config preset: import as `@tamagui/config/v5` inside Tamagui 2.x — wrong import path silently no-ops
- Tamagui native setup (`@tamagui/native/setup-teleport`, `setup-gesture-handler`) must be imported in a custom `index.js` **before** `expo-router/entry`
- Supabase anon key env var: use `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to match current Supabase dashboard terminology (both names work with `createClient`)
- `detectSessionInUrl` must be `false` in the Supabase client config on native

---

### Expected Features

**Must have — table stakes (launch blockers):**
- Email + password registration and login (Supabase `signUp` / `signInWithPassword`)
- Onboarding fork: create club (generates invite code) or join club via invite code
- Invite code join flow — 8-char alphanumeric, deep-link compatible (`buchclub://join?code=...`)
- Book search by title / author / ISBN via Google Books API (debounced, cover thumbnails)
- Book cover display with Open Library fallback chain; store resolved URL at add-time
- Personal reading list with three statuses: `planned`, `reading`, `completed`
- Propose book to club pool from personal reading list (club members only via RLS)
- Club member list with two roles: `member` and `admin`
- Multi-select upvote in club pool — atomic via Postgres RPC, no downvote
- Live vote count display via Supabase Realtime `postgres_changes` subscription
- Meeting creation (title, datetime, optional location / video link) — admin only
- Live top-voted book shown on meeting until admin locks it
- German + English UI from day one — device locale auto-detected via `expo-localization`

**Should have — differentiators (high value, low cost):**
- Admin vote lock ("gavel moment") — stores `confirmed_book_id` on meeting, ends voting
- Admin manual override on confirmed book after lock
- Live vote leaderboard with animated re-ordering as votes arrive
- Multiple admins per club (promote any member to admin)
- Reading list as proposal source constraint (proposal UI shows only the user's own books)
- Per-club meeting history (past meetings with confirmed book)
- In-app language switcher (override device locale, persisted to Zustand/user metadata)
- Empty-state guidance on all major screens (reading list, club pool, meetings)
- Public club discovery with `is_public` flag and browse screen

**Defer to v2+:**
- OAuth / social login (Google, Apple) — adds native module complexity, App Store requirements
- Native push notifications — requires APNs/FCM, high setup cost for async-value app
- Per-book discussion threads / reviews / star ratings
- In-app messaging / chat
- Payment / subscription tiers
- File uploads (cover images, PDFs)
- Admin-only book pool (deliberately excluded — kills democratic engagement)

---

### Architecture Approach

The app uses a strict layered architecture: Expo Router screens call custom hooks; hooks call service functions in `lib/services/`; services call the Supabase singleton or external APIs. No screen ever imports `lib/supabase/client.ts` directly. State is divided between Zustand (auth session + UI preferences — ephemeral client state) and React Query (all Supabase data — server state with caching and background refresh). Supabase Realtime channels invalidate React Query cache on change events rather than managing their own state, keeping a single source of truth for data.

The Expo app lives at `expo-app/` (sibling to `my-app/`). Expo Router route groups `(auth)/` and `(app)/` keep unauthenticated and protected screens cleanly separated. Platform-specific tab bar files (`_layout.native.tsx` / `_layout.web.tsx`) handle the navigation chrome divergence without runtime `Platform.OS` checks in shared code. All vote mutations route through a Postgres `SECURITY DEFINER` RPC function; the votes table has no direct INSERT/UPDATE policy accessible from the client. Cover URLs are resolved once at book-add time and stored as strings — no runtime fallback needed.

**Major components:**

1. **`app/_layout.tsx` (root layout)** — mounts `TamaguiProvider`, `AuthProvider`, `I18nProvider`; defines `Stack.Protected` auth guard; imports `tamagui.generated.css` for web
2. **`components/providers/AuthProvider`** — listens to `supabase.auth.onAuthStateChange`; populates Zustand `auth.store`; owns the `initialized` flag that blocks navigation until session is known; registers `AppState` listener for token refresh on foreground
3. **`lib/services/` (service layer)** — pure TypeScript, no React imports; one file per domain (`auth`, `clubs`, `members`, `books`, `pool`, `meetings`, `google-books`); called only by hooks or other services
4. **`lib/hooks/useClubVotes`** — scoped Supabase Realtime subscription per club; triggers `React Query.invalidateQueries` on vote change; always cleans up in `useEffect` return
5. **`lib/supabase/client.ts` (singleton)** — one `createClient` instance for the entire app; `expo-sqlite/localStorage` polyfill + `react-native-url-polyfill` imported here
6. **`tamagui.config.ts`** — design tokens, light/dark themes, media queries, platform-conditional animation driver; imported once at root; module-augmented for full TypeScript inference
7. **Supabase schema** — RLS enabled on every table; `is_club_member()` / `is_club_admin()` helper functions reused across policies; `(SELECT auth.uid())` subquery pattern in all policies; `increment_book_vote` RPC for atomic vote inserts; votes computed as `COUNT(*)` aggregates, never stored as columns

---

### Critical Pitfalls

Ranked by impact. All five would cause either silent data loss, a security hole, or a complete feature rewrite if encountered post-launch.

1. **Supabase auth not configured for native (wrong storage adapter + `detectSessionInUrl: true`)** — Users silently log out on every cold start; magic link sessions are discarded. Use `expo-sqlite/localStorage` polyfill + `detectSessionInUrl: false` from the very first line of `lib/supabase/client.ts`. Must be correct in Phase 1 before any auth feature is tested.

2. **Auth flash of unauthenticated content on cold start** — The router renders before the async session load completes, flashing the login screen for logged-in users and discarding deep-link targets. Block navigation with an `initialized` flag in `AuthProvider`; keep `expo-splash-screen` visible until `initialized === true`. Use `Stack.Protected` declarative guard rather than imperative `router.replace()`. Must be addressed in Phase 1 before any navigation structure is tested.

3. **Vote mutations via direct UPDATE instead of RPC — race conditions on concurrent votes** — Two simultaneous votes can both read `count = 5` and both write `count = 6`, silently losing one vote. The wrong book can win. Use `supabase.rpc('increment_book_vote', ...)` exclusively — the votes table has no client-accessible INSERT/UPDATE policy. Non-negotiable from Phase 4 (voting).

4. **Realtime subscriptions not cleaned up on component unmount — channels accumulate** — Each remount adds a new WebSocket subscription. After a few navigations, vote counts display as 2x, 3x the real value and Supabase may throttle the connection. Always `return () => supabase.removeChannel(channel)` from every `useEffect` that subscribes. React StrictMode's double-invocation will surface this in development. Enforce in Phase 4.

5. **Google Books API blocked by CORS on web** — The API does not set CORS headers permitting browser requests. Book search works on native but is completely broken on web. Route all Google Books calls through a Supabase Edge Function proxy from the start. Do not build a native-only implementation and retrofit web later. Required before Phase 3 ships.

**Runners-up worth calling out:**
- **Service role key in client bundle** — catastrophic RLS bypass; never use `SUPABASE_SERVICE_ROLE_KEY` outside Edge Functions
- **RLS enabled without policies** — silently returns empty rows, not errors; write enable + policies in one migration
- **Token refresh dying after background** — `AppState` listener with `startAutoRefresh` / `stopAutoRefresh` required in root provider
- **Tamagui `TamaguiProvider` not at root** — causes hydration errors on web and runtime crashes in screens outside the provider subtree
- **Wrong animation driver** — single driver for all platforms either bloats the web bundle or breaks native sheet animations

---

## Implications for Roadmap

Research strongly supports a 6-phase build order matching the feature dependency graph. The ordering is driven by two constraints: (1) each layer is a prerequisite for the next, and (2) cross-cutting concerns (Tamagui config, auth session, i18n) must be scaffolded before any user-visible feature is built so they are never retrofitted.

---

### Phase 1: Foundation — Project Scaffold + Auth + i18n

**Rationale:** Everything downstream depends on these three pillars. Tamagui provider placement, the Supabase client configuration, the auth `initialized` flag, and the i18n scaffold must all be correct before any feature screen is written. Retrofitting any of them is the most disruptive possible rework. The cold-start auth flash (Pitfall 3) and the Tamagui hydration error (Pitfall 8) are both Phase 1 problems — get them right here and they never come up again.

**Delivers:**
- Expo app scaffolded (`create-expo-app --template default@sdk-56`) with `index.js` entry point for Tamagui native setup
- `tamagui.config.ts` with tokens, light/dark themes, Inter font, platform-conditional animation driver
- `lib/supabase/client.ts` singleton with correct native auth config (`expo-sqlite/localStorage`, `detectSessionInUrl: false`)
- `components/providers/AuthProvider` with `initialized` flag, single `onAuthStateChange` listener, `AppState` token-refresh handler
- `app/_layout.tsx` with `TamaguiProvider` + `Stack.Protected` auth guard
- Sign-in and sign-up screens (`app/(auth)/sign-in.tsx`, `app/(auth)/sign-up.tsx`)
- `lib/i18n/` scaffold with `de.json`, `en.json` and device-locale detection via `expo-localization`
- `components/providers/I18nProvider` wrapping `<I18nextProvider>`
- `app.json` with `scheme: "buchclub"` for deep links
- Zustand `auth.store` + `ui.store` (locale, theme)
- `.env` conventions enforced: only `EXPO_PUBLIC_` prefix keys in Expo app

**Gate:** User can register, log in, log out; session persists across cold starts; app displays in German on German-locale device, English otherwise; no auth flash on launch.

**Avoids:** Pitfalls 1 (auth config), 2 (token refresh), 3 (auth flash), 8 (TamaguiProvider placement), 9 (SSR/hydration from locale), 10 (animation driver), 18 (missing deep link scheme), 19 (locale at module level), 22 (service role key)

**Research flag:** Standard patterns — well-documented. No `/gsd-research-phase` needed.

---

### Phase 2: Clubs + Database Schema

**Rationale:** Clubs are the organizing entity for all other features. The database schema for clubs, members, and the RLS policies must be locked before any data-fetching code is written. This is also the phase where all RLS patterns are established — every subsequent table follows the same conventions. Getting `is_club_member()` / `is_club_admin()` helper functions and the `(SELECT auth.uid())` pattern right here means all later tables inherit correct patterns.

**Delivers:**
- Supabase migrations: `clubs`, `club_members`, `users/profiles` tables with RLS enabled + policies
- `is_club_member()` and `is_club_admin()` SQL helper functions
- `supabase gen types` run → `lib/supabase/types.ts`
- `lib/services/clubs.service.ts` + `lib/services/members.service.ts`
- My clubs list tab (`app/(app)/(tabs)/clubs.tsx`)
- Create club modal (`app/(app)/clubs/create.tsx`) with invite code generation
- Join club by invite code (`app/(app)/clubs/join.tsx`)
- Club home screen (`app/(app)/clubs/[clubId]/index.tsx`)
- Member list + basic admin controls (`app/(app)/clubs/[clubId]/members.tsx`)
- React Query keys established: `['clubs', 'mine']`, `['clubs', clubId]`, `['members', clubId]`

**Gate:** User can create a club, get an invite code, share it; another user can join via code; club home and member list render correctly.

**Avoids:** Pitfalls 5 (RLS without policies), 6 (`auth.uid()` per-row call), 12 (replica identity on realtime tables), 14 (FOR ALL policy on sensitive tables)

**Research flag:** Standard patterns. No `/gsd-research-phase` needed.

---

### Phase 3: Books + Personal Reading List

**Rationale:** The book search and personal reading list are the prerequisite for the proposal/voting feature in Phase 4. The Google Books Edge Function proxy must be built in this phase — not deferred — because book search is completely broken on web without it, and retrofitting the proxy after a native-only implementation adds platform divergence debt. Cover URL resolution strategy (resolve at add-time, store string) must be enforced here to avoid runtime fallback chains later.

**Delivers:**
- Supabase Edge Function: `/search-books` proxying Google Books API (solves CORS + centralizes caching)
- Supabase migrations: `books` (canonical metadata), `user_books` (reading list with status) with RLS
- `lib/services/google-books.service.ts` (calls Edge Function, normalizes response, Open Library fallback for cover URL)
- `lib/services/books.service.ts` (personal reading list CRUD)
- Book search screen (`app/(app)/books/search.tsx`) with debounced input
- Book detail screen (`app/(app)/books/[bookId].tsx`) with "Add to my list" + status selector
- Personal reading list tab (`app/(app)/(tabs)/index.tsx`) — "My Books"
- React Query keys: `['books', 'list', userId]`, `['books', 'search', query]`
- `BookCard` and cover image components with grey placeholder

**Gate:** User can search books, view results with covers, add to personal list, change status; works identically on iOS, Android, and web.

**Avoids:** Pitfall 15 (Google Books CORS on web), Pitfall 16 (rate limit — caching in Edge Function), Pitfall 20 (Dialog state — form state external to search dialog)

**Research flag:** The Edge Function proxy implementation is the only novel piece. Supabase Edge Function docs are well-documented. No `/gsd-research-phase` needed, but verify Edge Function CORS headers and caching strategy during implementation.

---

### Phase 4: Club Pool + Voting + Realtime

**Rationale:** This is the core value proposition of the app. The atomic RPC vote pattern is non-negotiable from the first line of voting code — no direct UPDATE ever. Vote counts are computed aggregates, never stored columns. Realtime subscription cleanup must be verified under React StrictMode before this phase ships; the double-invocation will expose any missing cleanup immediately. The `pool_votes` and `pool_books` tables must be added to the Supabase Realtime publication in the same migration that creates them.

**Delivers:**
- Supabase migrations: `pool_books`, `pool_votes` tables with RLS (read-only for clients; writes via RPC only)
- `increment_book_vote` RPC (`SECURITY DEFINER`, unique constraint on `(club_id, book_id, user_id)`)
- `ALTER PUBLICATION supabase_realtime ADD TABLE pool_votes`
- `ALTER TABLE pool_votes REPLICA IDENTITY FULL`
- `lib/services/pool.service.ts` (propose book, fetch pool, call RPC for vote)
- `lib/hooks/useClubVotes.ts` — Realtime subscription scoped to club, triggers `invalidateQueries`, always cleans up
- Club pool screen (`app/(app)/clubs/[clubId]/pool.tsx`) with live sorted leaderboard
- `VoteButton` component with optimistic update via React Query `useMutation`
- Admin vote lock control on pool screen

**Gate:** Members can propose books from their reading list; votes are cast and reflected live across all connected devices; vote counts are accurate under concurrent voting; subscription cleanup verified in StrictMode.

**Avoids:** Pitfalls 4 (subscription leak), 7 (direct UPDATE race condition), 11 (table not in realtime publication), 23 (subscription without filter clause)

**Research flag:** Realtime + React Query integration is the most complex pattern in the codebase. Standard enough that no `/gsd-research-phase` is needed, but the `useClubVotes` hook warrants a dedicated implementation spike before the pool screen is built.

---

### Phase 5: Meetings

**Rationale:** Meetings are the output of the vote/pool feature. They depend on clubs (Phase 2), books (Phase 3), and the vote lock mechanic (Phase 4). This phase is structurally straightforward — meetings are mostly a display/coordination layer on top of the existing data model. Admin controls (lock book, create meeting) are already partially built in Phase 4.

**Delivers:**
- Supabase migration: `meetings` table with RLS; `confirmed_book_id` FK; `status: upcoming | past`
- `lib/services/meetings.service.ts`
- Meeting list for club (`app/(app)/clubs/[clubId]/meetings.tsx`)
- Meeting detail screen (`app/(app)/meetings/[meetingId].tsx`) — live vote view pre-lock, confirmed book post-lock
- Admin meeting creation form (title, datetime, optional location / video link)
- Admin manual override on confirmed book
- Meeting history display (past meetings with their confirmed books)
- `MeetingCard` component

**Gate:** Admin can create meetings; live top-voted book appears on meeting detail; admin can lock the winner; meeting history shows previous decisions.

**Avoids:** No new pitfall categories. Inherits RLS and Realtime patterns from previous phases.

**Research flag:** Standard patterns. No `/gsd-research-phase` needed.

---

### Phase 6: Polish — i18n Completion + Discover + Web + Empty States

**Rationale:** i18n was scaffolded in Phase 1 so translation keys exist. This phase completes the audit: every user-facing string is verified to use `t()` with the correct key in both `de.json` and `en.json`, pluralization rules are tested (German `Abstimmung` vs `Abstimmungen`), and the in-app language switcher is wired to `ui.store`. Public club discovery, empty-state components, and web tab bar polish are all low-complexity finishing work that benefit from the full data model being available.

**Delivers:**
- Audit of all screens: every hardcoded string replaced with `t()` key
- German plural forms verified for all countable strings (votes, members, books, meetings)
- UI layout stress-tested with German strings (20-30% longer than English)
- In-app language switcher in profile screen, persisted to `ui.store` + user metadata
- Public club discovery screen (`app/(app)/(tabs)/discover.tsx`) with `is_public` filter
- Empty-state components on reading list, club pool, and meetings screens
- Web tab bar polish (`_layout.web.tsx` with custom styled navigation)
- Profile + settings tab (`app/(app)/(tabs)/profile.tsx`)
- `useDidFinishSSR` guards on all locale-dependent web renders

**Gate:** App renders fully and correctly in German and English on iOS, Android, and web; no hydration warnings in browser console; German-locale device sees German on first launch with no manual override.

**Avoids:** Pitfalls 9 (SSR hydration from locale), 19 (locale read at module level)

**Research flag:** German plural rules and string length stress-testing need manual review. SSR behavior on web with i18n is documented but should be verified with `expo export --platform web` during this phase.

---

### Phase Ordering Rationale

- **Auth before everything:** Supabase session state flows into every subsequent layer. The `initialized` flag must exist before any navigation guard is tested.
- **i18n in Phase 1, not Phase 6:** The dependency graph from FEATURES.md is explicit: "i18n architecture must be in place before any screen is built." Retrofitting translation keys across 5 phases of screens is the highest-friction rework identified.
- **Schema before services:** Supabase types (`supabase gen types`) must be generated from a stable schema before TypeScript service functions can be fully typed. Phase 2 stabilizes the initial schema.
- **Books before pool:** The proposal flow pulls from `user_books`. The pool service needs book metadata to already exist in the DB.
- **Pool before meetings:** Meetings display vote results and confirmed books — the pool data model must exist first.
- **Edge Function proxy in Phase 3, not deferred:** Building a native-only book search and retrofitting web proxy later creates two divergent code paths. One path from day one is cheaper.
- **Polish last:** All Phase 6 features (discover, empty states, language switcher) are genuinely non-blocking for the core club voting loop. Doing them last means they can be built with the full data model available and tested across real club scenarios.

---

### Research Flags

**Phases needing deeper research during planning:**
- **Phase 3 (Edge Function proxy):** The Supabase Edge Function caching strategy and rate-limit handling for Google Books has not been prototyped. Worth a spike to confirm caching approach (in-memory vs. DB cache) before committing to an implementation.
- **Phase 4 (Realtime + React Query integration):** The `useClubVotes` hook pattern (Realtime events triggering `invalidateQueries`) is documented but is the most complex integration in the codebase. A focused implementation spike before the full pool screen is worth the time.

**Phases with standard, well-documented patterns (skip `/gsd-research-phase`):**
- **Phase 1 (Scaffold):** Expo SDK 56 + Tamagui 2.x + Supabase client setup is thoroughly documented. Follow the exact patterns in STACK.md and ARCHITECTURE.md.
- **Phase 2 (Clubs + Schema):** Standard Supabase RLS patterns with established helper functions.
- **Phase 5 (Meetings):** Straightforward CRUD + display layer, no new integration patterns.
- **Phase 6 (Polish):** i18next plural rules and `useDidFinishSSR` are documented APIs.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All versions confirmed via `npm view` on 2026-05-24. Compatibility matrix (Tamagui 2.x + Expo SDK 56 + New Architecture) verified against official docs. |
| Features | MEDIUM-HIGH | Core feature set confirmed via competitor analysis (StoryGraph, Bookclubs.com) and PROJECT.md spec. Competitor analysis limited by SPA rendering — feature enumeration may be incomplete, but the table-stakes set is solid. |
| Architecture | HIGH | All patterns (layered services, Zustand/React Query split, RLS helper functions, atomic RPC votes) sourced from official Expo, Supabase, and Tamagui documentation via Context7. |
| Pitfalls | HIGH | All critical pitfalls verified against official docs. Prevention patterns are concrete and tested by the community. |

**Overall confidence: HIGH**

### Gaps to Address

- **Google Books API rate limit under Edge Function proxy:** The 1,000 req/day unauthenticated limit is per-IP. When all clients route through a single Edge Function IP, this quota applies to all users combined. The caching strategy (cache by query string in Supabase DB or Edge Function KV) needs to be designed and validated during Phase 3 before book search ships. If the app grows, an API key may be required — budget the migration path.
- **Tamagui `@tamagui/config/v5` animation driver split:** STACK.md recommends `@tamagui/animations-react-native` as the primary driver, while PITFALLS.md documents the need for a platform-conditional split (`isWeb ? CSS : Reanimated`). The exact configuration in `tamagui.config.ts` should be validated against both a native device and the web build in Phase 1 before any animated components are built.
- **Supabase Realtime publication management:** Adding tables to `supabase_realtime` publication requires explicit SQL in migrations (Pitfall 11). This step is easy to forget when creating new tables in later phases. Add a checklist item to every future schema migration: verify publication membership for any table that has a Realtime subscriber.
- **Web SSR depth:** The app uses `expo export --platform web` (static export via Metro). Full SSR with a Node server was not evaluated. If SEO or server-rendered meta tags become requirements post-launch, the routing and i18n architecture would need revisiting.

---

## Sources

### Primary (HIGH confidence)
- `npm view expo-template-default@sdk-56 --json` — Expo SDK 56 template dependencies and pinned versions
- Context7 `/expo/expo` (sdk-54/sdk-56 branches) — Expo Router, New Architecture, expo-localization, deep linking, AppState
- Context7 `/tamagui/tamagui` — Tamagui 2.x installation, Expo guide, Metro plugin, animation drivers, SSR, Dialog/Sheet
- Context7 `/supabase/supabase` — Expo quickstart, Auth config, Realtime, RLS, RPC, Edge Functions
- Context7 `/supabase/supabase-js` — `createClient` API, Realtime channels, auth state change
- Context7 `/i18next/react-i18next` — `initReactI18next`, `useTranslation`, plural rules, namespace support
- Context7 `/pmndrs/zustand` — Zustand v5 slices, TypeScript patterns
- `npm view [package] version` (run 2026-05-24) — all package version confirmations

### Secondary (MEDIUM confidence)
- StoryGraph homepage (https://www.thestorygraph.com) — reading status tracking, club voting, meeting organization feature confirmation
- Bookclubs.com (https://bookclubs.com) — club polling, meeting scheduling, member management feature confirmation
- Google Books API developer docs (https://developers.google.com/books/docs/v1/using) — search endpoint, rate limits, image links

### Tertiary (LOW confidence / inference)
- German string length estimates (20-30% longer than English) — industry-standard localization rule of thumb, not measured on this specific content
- Google Books unauthenticated rate limit (1,000 req/day per IP) — documented but behavior under Edge Function proxy IP sharing is inferred, not tested

---
*Research completed: 2026-05-24*
*Ready for roadmap: yes*
