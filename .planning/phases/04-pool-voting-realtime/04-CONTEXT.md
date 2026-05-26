# Phase 4: Pool, Voting & Realtime - Context

**Gathered:** 2026-05-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Club members can propose books from their personal reading list into the club's book pool, upvote proposals atomically via the `increment_book_vote` RPC (and un-vote via a toggle), and watch vote counts update live on all connected devices. The pool is ranked by vote count (live leaderboard). Admins can remove books from the pool. This phase delivers POOL-01 through POOL-03 and VOTE-01 through VOTE-04 from REQUIREMENTS.md.

</domain>

<decisions>
## Implementation Decisions

### Pool Navigation & Location
- **D-01:** The pool lives inside the **Club Detail screen**, accessed via a **top tab bar** on that screen — tabs: **Members | Pool | Settings**. It is NOT a separate bottom tab in the app nav.
- **D-02:** The pool list is sorted **by vote count descending** — a live leaderboard. As votes come in via Realtime, items re-order in real time.
- **D-03:** Pool books are displayed as **portrait cover cards with vote count** — same card style as the reading list (Phase 3: full-width card, cover image prominent, title + author below, plus vote count + upvote button). `borderRadius={16}`, shadow `0 2px 12px rgba(0,0,0,0.06)`.

### Propose-a-Book Flow
- **D-04:** There are **two entry points** to propose a book:
  1. A **'+' / FAB button on the Pool tab** → opens a picker/bottom sheet showing the user's personal reading list → user picks a book → it is proposed.
  2. A **'Propose to club' button on the Book Detail screen** (when viewing a book from the reading list) → proposes directly from that context.
- **D-05:** Books already in the club pool are **hidden from the proposal picker** — they do not appear as options when proposing from the Pool tab FAB.
- **D-06:** After a successful proposal, the user **stays in place with a success toast** ("Book proposed!") — no automatic navigation to the pool.

### Vote Interaction & State
- **D-07:** Voting is **Reddit-style toggle** — tap to upvote, tap again to remove your vote. This requires a `decrement_book_vote` RPC (or a toggle RPC) in addition to the existing `increment_book_vote`. Planning must account for this schema addition.
- **D-08:** A voted book shows a **filled orange upvote button** (`#E85D1F`). Unvoted = unfilled/outline. This is the sole visual indicator that the user has voted for that book.
- **D-09:** Vote count updates are **optimistic** — the count changes instantly in the UI without waiting for the RPC. If the RPC fails, the UI rolls back to the previous count and shows an error.

### Realtime Updates
- **D-10:** Realtime vote updates are handled by **Supabase Realtime subscription on `pool_books` triggering TanStack Query invalidation** — when a `pool_books` row update event fires, call `queryClient.invalidateQueries` on the pool query key, which triggers a background refetch. This is consistent with the existing codebase pattern.
- **D-11:** The Realtime subscription is **active only while the Pool screen is mounted** — subscribe on mount, unsubscribe on unmount. Channel name: `pool-{clubId}`.
- **D-12:** If the Realtime connection drops, **no indicator is shown** — stale data is acceptable. Users can scroll/pull to refresh if needed.

### Claude's Discretion
- Exact route path for the club detail screen with the tab bar (e.g., `(app)/clubs/[id]/index.tsx` with nested routes for each tab, or a single screen with a tab state).
- Whether the `decrement_book_vote` is a separate RPC or a combined `toggle_book_vote` RPC — choose the simplest approach that preserves atomicity.
- Empty state illustration and copy for an empty pool (reuse existing empty-state pattern from Phase 2/3).
- i18n namespace name for Phase 4 strings (e.g., `pool` or `voting`).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Database Schema
- `supabase/migrations/0001_v1_full_schema.sql` — Full schema. Phase 4 tables: `public.pool_books` (POOL-01..POOL-03), `public.votes` (VOTE-01..VOTE-04), `increment_book_vote` RPC (SECURITY DEFINER). RLS already defined. Do NOT create new migrations for existing tables — only add the toggle/decrement RPC.
- **NOTE:** The existing `increment_book_vote` only increments. A `decrement_book_vote` (or `toggle_book_vote`) RPC must be added in a new migration for the Reddit-style toggle (D-07).

### Design
- `design/design.md` — Design guidelines: colors, typography, spacing, component specs. All UI must follow this.
- `design/screen-book-list.png` — Pool book card style reference (same portrait card pattern)
- `design/screen-home.png` — Home/club detail screen reference

### Requirements
- `.planning/REQUIREMENTS.md` — POOL-01..POOL-03 and VOTE-01..VOTE-04 are Phase 4 requirements

### Phase 3 Artifacts (established patterns — pool inherits these)
- `.planning/phases/03-books-reading-list/03-CONTEXT.md` — portrait cover card pattern (D-09), BookCard component spec, TanStack Query patterns, i18n books namespace structure
- `.planning/phases/02-clubs-onboarding/02-CONTEXT.md` — club detail screen structure, ClubCard pattern, active club context (Zustand)
- `.planning/phases/01-foundation/01-PATTERNS.md` — Code patterns from Phase 1

### Existing Code (integration points)
- `expo-app/lib/supabase.ts` — Supabase client — use for all DB calls and Realtime channel setup
- `expo-app/store/club.store.ts` — Active club context — `activeClubId` needed for scoping pool queries and Realtime channel name
- `expo-app/store/auth.store.ts` — Auth session — `session.user.id` needed for vote ownership checks
- `expo-app/app/(app)/clubs/[id]` — Club detail screen (to be extended with Pool tab)
- `expo-app/app/(app)/books/[id].tsx` — Book detail screen (needs 'Propose to club' button added — D-04)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `expo-app/components/ui/Button.tsx` — Primary/secondary button, height 52px, radius-md. Use for FAB/'+' propose button and upvote button.
- `expo-app/components/ui/Alert.tsx` — Use for error feedback (vote failure, propose failure, rollback notification).
- `expo-app/components/ui/ClubCard.tsx` — Reference pattern for `PoolBookCard`: `YStack`, `borderRadius={16}`, shadow `0 2px 12px rgba(0,0,0,0.06)`, `animation="fast"`.
- Phase 3 `BookCard` component (once built) — Pool book cards share the same portrait-cover-card structure; extend or reuse.

### Established Patterns
- **TanStack Query** for all Supabase data fetching. Use `useQuery` for pool list, `useMutation` for vote/propose. Invalidate query on Realtime event.
- **Optimistic updates** via TanStack Query `useMutation` `onMutate`/`onError`/`onSettled` hooks — matches D-09.
- **`useDidFinishSSR()`** guard from `@tamagui/use-did-finish-ssr` — required on all web-rendered screens. Copy from `app/(app)/clubs/index.tsx`.
- **Direct Supabase client calls** from components — no abstraction layer; keep consistent.
- **i18next namespaces** per feature area — create `pool` namespace for all Phase 4 strings; both DE and EN required.
- **Empty-state pattern** — illustration + heading + subtext + optional CTA. Established in clubs/index.tsx. Copy for empty pool.
- **Skeleton loading** — 2–3 placeholder cards while query is loading.
- **`@ts-expect-error` on `animation` prop** — Tamagui 2.x animation prop requires this on animated components.
- **Supabase Realtime pattern** — `supabase.channel('pool-{clubId}').on('postgres_changes', ...)` — subscribe in `useEffect`, return unsubscribe cleanup. Do NOT use `StrictMode` double-subscribe workaround — SDK handles it.

### Integration Points
- Club detail screen at `app/(app)/clubs/[id]` — needs top tab bar (Members | Pool | Settings) added.
- `app/(app)/books/[id].tsx` — Book detail screen needs 'Propose to club' action added (D-04 entry point 2).
- New route: `app/(app)/clubs/[id]/pool.tsx` (or equivalent for the Pool tab within club detail).
- `increment_book_vote` RPC already exists — call via `supabase.rpc('increment_book_vote', { p_pool_book_id })`.
- New RPC needed: `decrement_book_vote` (or `toggle_book_vote`) — must be SECURITY DEFINER like the existing RPC.

</code_context>

<specifics>
## Specific Ideas

- Pool is a **leaderboard** — the democratic core of the app. Vote count is prominent on each card.
- **Reddit-style vote toggle** — the user chose this explicitly. Tapping the filled orange button again removes the vote. The decrement RPC must be added.
- **Optimistic updates** are required for vote interactions — the vote count changes immediately, no spinner.
- The pool tab lives **inside the club detail screen** — not a separate bottom nav tab. Keep club context central.
- **Both propose entry points** are required: pool FAB and book detail screen button.
- Already-in-pool books **hidden from picker** — don't show items the user can't propose.

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope.

</deferred>

---

*Phase: 4-Pool, Voting & Realtime*
*Context gathered: 2026-05-26*
