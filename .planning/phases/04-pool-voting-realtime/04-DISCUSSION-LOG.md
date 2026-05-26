# Phase 4: Pool, Voting & Realtime - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-26
**Phase:** 4-Pool, Voting & Realtime
**Areas discussed:** Pool location & layout, Propose-a-book flow, Vote interaction & state, Realtime UX & loading

---

## Pool Location & Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated Pool tab | Pool is a bottom nav tab, always visible | |
| Inside Club detail | Pool is inside club detail screen | |
| Club Detail with top tabs | Top tab bar: Members \| Pool \| Settings within club detail | ✓ |
| Ranked by votes | Books sorted descending by vote count, re-ordered live | ✓ |
| Chronological | Books in proposal order | |
| Portrait cover cards with vote count | Same card style as reading list, vote count + upvote button | ✓ |
| Compact rows | Small thumbnail, horizontal row | |

**User's choice:** Club detail has a top tab bar (Members | Pool | Settings). Pool sorted by vote count (live leaderboard). Portrait cover cards.

**Notes:** User described the pool as belonging to the club context, not a standalone nav item. "it lives in the club but u are also able to track ur own stuff" — the reading list stays separate (personal), the pool is the club-shared space.

---

## Propose-a-Book Flow

| Option | Description | Selected |
|--------|-------------|----------|
| '+' button in pool tab → pick from reading list | FAB in pool tab opens picker | ✓ |
| From Book Detail screen → Propose button | Propose from book detail only | |
| Both entry points | Both pool FAB and book detail button | ✓ |
| Show 'Already in pool' indicator | Disabled button/label for existing pool books | |
| Hide from picker | Books in pool not shown in proposal picker | ✓ |
| Let DB reject it | Allow duplicate attempt, show error | |
| Go to pool — see it in the list | Navigate to pool after propose | |
| Stay in place with success toast | Toast confirmation, no navigation | ✓ |

**User's choice:** Both entry points. Books already in pool hidden from picker. Success toast (no navigation).

**Notes:** No additional notes.

---

## Vote Interaction & State

| Option | Description | Selected |
|--------|-------------|----------|
| One-way upvote only | Permanent vote, no un-vote | |
| Toggle vote on/off | Reddit-style toggle | ✓ |
| Filled orange button = voted | Orange fill when voted, outline when not | ✓ |
| Checkmark / 'Voted' label | Separate voted indicator | |
| Orange vote count | Count changes color when voted | |
| Optimistic update | Instant UI update, rollback on error | ✓ |
| Wait for server confirmation | Spinner while RPC is in flight | |

**User's choice:** Reddit-style toggle (can un-vote). Filled orange button as voted indicator. Optimistic updates.

**Notes:** "same as reddit" — user wants the familiar upvote-toggle UX. This requires a `decrement_book_vote` RPC (or `toggle_book_vote`) in addition to the existing `increment_book_vote` — noted as a planning constraint in CONTEXT.md.

---

## Realtime UX & Loading

| Option | Description | Selected |
|--------|-------------|----------|
| Realtime triggers query invalidation | Realtime event → invalidateQueries | ✓ |
| Realtime patches Zustand store | Local Zustand copy, patched by events | |
| Realtime patches React Query cache directly | setQueryData on event | |
| Show reconnecting indicator | Banner/icon while reconnecting | |
| No indicator — stale data is fine | Silent degradation, manual refresh if needed | ✓ |
| Subscribe on pool screen mount | Active only while pool screen visible | ✓ |
| Global subscription | App-level always-active subscription | |

**User's choice:** Realtime → query invalidation. No reconnection indicator (stale is fine). Subscribe on mount/unmount.

**Notes:** No additional notes.

---

## Claude's Discretion

- Route path for club detail with top tabs
- Whether `decrement_book_vote` is separate RPC or a combined `toggle_book_vote`
- Empty state for empty pool (reuse existing pattern)
- i18n namespace name for Phase 4 strings (`pool` or `voting`)

## Deferred Ideas

None — discussion stayed within phase scope.
