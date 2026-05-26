---
phase: "04"
phase_name: "pool-voting-realtime"
status: "warnings"
depth: "standard"
files_reviewed: 7
reviewed_at: "2026-05-26"
findings:
  critical: 0
  warning: 3
  info: 2
  total: 5
---

# Code Review: Phase 04 — Pool, Voting & Realtime

## Summary

7 files reviewed at standard depth. No critical bugs. 3 warnings (one potential runtime error, one data-loss risk in optimistic update, one UX timing issue) and 2 info items.

---

## Findings

### WR-01 — Optimistic vote_count can go negative on client

**File:** `expo-app/app/(app)/clubs/[id]/index.tsx`  
**Lines:** 205–210  
**Severity:** Warning

The optimistic update does `pb.vote_count + (isRemoving ? -1 : 1)` without a floor guard. If a Realtime event fires and updates the cache concurrently with an in-flight vote removal, the displayed count can briefly show `-1` before `onSettled` re-fetches. The DB correctly floors at 0 via `greatest()`, but the client UI can flash negative.

**Recommended fix:**
```typescript
vote_count: Math.max(0, pb.vote_count + (isRemoving ? -1 : 1))
```

---

### WR-02 — proposeError state never cleared on sheet reopen

**File:** `expo-app/app/(app)/clubs/[id]/index.tsx`  
**Lines:** 42, 266  
**Severity:** Warning

`proposeError` is set on mutation failure but never cleared when the sheet is closed and reopened. If the user dismisses the sheet after an error and reopens it, the error banner from the previous attempt still shows. Same issue with `proposeSuccess` (cleared by timeout, but not on sheet close).

**Recommended fix:** Clear `proposeError` (and optionally `proposeSuccess`) in the sheet's `onOpenChange` handler when it closes:
```typescript
onOpenChange={(open) => {
  if (!open) setProposeError(null);
  setProposeSheetOpen(open);
}}
```

---

### WR-03 — Book Detail propose section visible when bookId is null

**File:** `expo-app/app/(app)/books/[id].tsx`  
**Lines:** ~341, ~356  
**Severity:** Warning

`bookId` is derived from `(personalBook?.books as any)?.id` and can be `null` while `personalBook` is still loading (`isLoading === true`). The propose section renders when `isFromList && !!activeClubId`, but `bookId` may be null at that point. The `proposeToClubMutation.mutate()` would then insert `pool_books` with `book_id: null`, which would fail at the DB constraint level — but the UX shows a briefly-enabled button before the query resolves.

**Recommended fix:** Add `bookId` to the render guard:
```tsx
{isFromList && !!activeClubId && !!bookId && (
```

---

### INFO-01 — `any` casts in eligible books filter

**File:** `expo-app/app/(app)/clubs/[id]/index.tsx`  
**Lines:** 121, 131  
**Severity:** Info

`(pb: any)` casts in the eligible books filter bypass TypeScript type checking. Low risk since this is a read-only filter, but worth typing explicitly as Supabase generates types become available.

---

### INFO-02 — setTimeout leaks not cleaned up on unmount

**File:** `expo-app/app/(app)/clubs/[id]/index.tsx`, `expo-app/app/(app)/books/[id].tsx`  
**Lines:** 262, 308  
**Severity:** Info

`setTimeout(() => setProposeSuccess(false), 3000)` and `setTimeout(() => setCopied(false), 2000)` are not cleaned up if the component unmounts before the timeout fires. On React Native with fast navigation, this can cause "Can't perform a React state update on an unmounted component" warnings. Low severity since React 18 silences these warnings, but worth noting for completeness.

---

## Files with No Issues

- `supabase/migrations/0003_toggle_book_vote_rpc.sql` — Correct SECURITY DEFINER pattern, floor guard, idempotent delete. No issues.
- `expo-app/lib/i18n/en.json` — Valid JSON, all required keys present.
- `expo-app/lib/i18n/de.json` — Valid JSON, all required keys present.
- `expo-app/lib/i18n/index.ts` — Correct namespace registration pattern.
- `expo-app/components/ui/PoolBookCard.tsx` — Clean, well-typed component with correct accessibility attributes.
