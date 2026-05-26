---
plan: "04-03"
phase: 4
title: "Propose book flows: ProposePicker sheet + Book Detail propose button"
status: complete
completed: "2026-05-26"
---

# Plan 04-03 Summary

## What Was Built

Both book proposal entry points (D-04):

1. **ProposePicker Sheet** (in Club Detail) — implemented as part of Plan 04-02's Club Detail refactor since both plans modify the same file. Full implementation: eligible books query excluding already-pooled books (D-05), propose mutation with `supabase.from('pool_books').insert`, success toast, skeleton loading, empty reading list state with navigate-to-search button, snapPoints={[75]}.

2. **"Propose to club" button** on Book Detail screen (`expo-app/app/(app)/books/[id].tsx`):
   - `useClubStore` import and `activeClubId` selector
   - `pool_check` query to detect if book is already in pool
   - `proposeToClubMutation` calling `pool_books.insert`
   - Disabled button with `pool:already_in_pool` text when already pooled
   - Success toast with `pool:propose_success_toast`
   - `pool` added to `useTranslation` namespaces

## Key Files

### Modified
- `expo-app/app/(app)/clubs/[id]/index.tsx` — ProposePicker sheet (in 04-02 commit)
- `expo-app/app/(app)/books/[id].tsx` — propose section added

## Self-Check: PASSED

All 10 plan verification checks pass.
- Club Detail has `eligible_propose` query, `pool_books` insert, `snapPoints={[75]}`, D-05 exclusion, success toast
- Book Detail has `useClubStore`, `pool_check` query, propose mutation, disabled state, `pool` namespace
- `public.books` table is never deleted from (Phase 3 invariant preserved)
