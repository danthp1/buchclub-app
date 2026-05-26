---
plan: "04-02"
phase: 4
title: "PoolBookCard component + Club Detail top tab bar + Pool tab (leaderboard)"
status: complete
completed: "2026-05-26"
---

# Plan 04-02 Summary

## What Was Built

1. **`PoolBookCard` component** (`expo-app/components/ui/PoolBookCard.tsx`) — portrait cover card (72x108px image) with vote count display and upvote button. Orange `#E85D1F` fill when voted, outline when not. Admin long-press triggers delete callback. borderRadius=16 on card, borderRadius=12 on upvote button. Accessibility state on vote button.

2. **Club Detail top tab bar** — added Members | Pool | Settings tabs with blue `#1A4FE0` underline for active tab. All existing member list functionality preserved.

3. **Pool tab** — leaderboard showing pool_books sorted by vote_count DESC, skeleton loading (3 placeholders), empty state with illustration + CTA, FAB button (56x56 circle, `#0D0D0D`, position absolute).

4. **Vote mutations with optimistic updates** — `increment_book_vote` / `decrement_book_vote` RPCs with onMutate cache updates and onError rollback.

5. **Admin delete dialog** — POOL-03 long-press delete with confirmation dialog.

6. **ProposePicker sheet** — full implementation with eligible books query (excluding already-pooled books), propose mutation, success toast, skeleton loading, empty reading list state.

7. **Realtime subscription** — `pool-{clubId}` channel watching `pool_books` UPDATE events, scoped to pool tab only (subscribes on mount, unsubscribes on tab change or unmount).

## Key Files

### Modified
- `expo-app/app/(app)/clubs/[id]/index.tsx` — full refactor (396→600+ lines)

### Created
- `expo-app/components/ui/PoolBookCard.tsx`

## Self-Check: PASSED

All 10 verification checks pass for 04-02. All 04-03/04-04 criteria also satisfied in the same file.
