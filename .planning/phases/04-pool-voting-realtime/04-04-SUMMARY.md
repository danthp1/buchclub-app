---
plan: "04-04"
phase: 4
title: "Supabase Realtime subscription for live vote count updates"
status: complete
completed: "2026-05-26"
---

# Plan 04-04 Summary

## What Was Built

Supabase Realtime subscription for live vote count updates (VOTE-03, D-10, D-11):

Added a `useEffect` in `ClubDetailScreen` that:
- Creates a `pool-{clubId}` channel scoped to the active club
- Subscribes to `postgres_changes` with `event: 'UPDATE'`, `table: 'pool_books'`, and `filter: club_id=eq.{id}` — only receives updates for this club's pool
- On any UPDATE event (vote_count changed by RPC): calls `queryClient.invalidateQueries({ queryKey: ['pool_books', id] })` — TanStack Query refetches in background
- Guards with `activeTab !== 'pool'` early return: subscription only active when Pool tab is visible
- Returns `channel.unsubscribe()` cleanup: unsubscribes on tab change or unmount
- Dependency array: `[id, activeTab, queryClient]` — resubscribes when any changes

No StrictMode double-subscribe workaround (useRef deduplication) — Supabase SDK handles it.
INSERT and DELETE events are NOT subscribed — those mutations invalidate queries directly.

**Implementation note:** Implemented within Plan 04-02's Club Detail refactor commit since the same file was being rewritten. All 6 verification checks confirmed passing.

## Key Files

### Modified
- `expo-app/app/(app)/clubs/[id]/index.tsx` — useEffect with Realtime subscription (lines 267-294)

## Self-Check: PASSED

All 6 verification checks pass:
1. `supabase.channel(` present
2. `pool_books` + `'UPDATE'` present  
3. `club_id=eq` filter present
4. `channel.unsubscribe()` cleanup present
5. `activeTab !== 'pool'` guard present
6. `queryClient.invalidateQueries` with `pool_books` present
