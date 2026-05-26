---
phase: 3
plan: "03-02"
subsystem: ui
tags: [books, reading-list, BookCard, segmented-tabs, sheet]
provides:
  - BookCard component
  - books/_layout.tsx sub-stack
  - books/index.tsx reading list with segmented control
affects:
  - expo-app/components/ui/BookCard.tsx
  - expo-app/app/(app)/books/_layout.tsx
  - expo-app/app/(app)/books/index.tsx
key-files:
  created:
    - expo-app/components/ui/BookCard.tsx
    - expo-app/app/(app)/books/_layout.tsx
  modified:
    - expo-app/app/(app)/books/index.tsx
key-decisions:
  - BookCard uses TouchableOpacity wrapper for onLongPress (native gesture parity)
  - Status badge uses borderRadius 9999 for pill shape
  - Long-press opens Sheet with three status buttons matching status colors
  - Header title uses tab_reading key (i18n) as screen title for brevity
requirements-completed:
  - LIST-04
  - LIST-05
duration: 12 min
completed: "2026-05-26"
---

# Phase 3 Plan 03-02: BookCard component + Books tab Summary

BookCard component built with status badges and cover images; books sub-stack layout created; reading list screen fully replaces the Phase 1 stub with segmented tab control (Reading/Planned/Done), skeleton loading, empty state, and long-press status change sheet.

**Duration:** 12 min | **Tasks:** 3 | **Files:** 3

## What Was Built

1. **BookCard component** (`expo-app/components/ui/BookCard.tsx`): Reusable portrait card showing 72×108 cover image, book title (Archivo Narrow 18px), author, and a colored pill status badge. Status colors: Planned=`#1A4FE0`, Reading=`#E85D1F`, Completed=`#2A7A3A`. Falls back to `empty-man.png` illustration when no cover URL or ISBN is available. Supports `onPress` and `onLongPress` props.

2. **Books layout** (`expo-app/app/(app)/books/_layout.tsx`): Minimal Stack layout with `headerShown: false` — ensures `search.tsx` and `[id].tsx` push correctly onto the books sub-stack.

3. **Books index screen** (`expo-app/app/(app)/books/index.tsx`): Replaces Phase 1 stub. Features:
   - Segmented tab control with `reading`, `planned`, `completed` tabs
   - TanStack Query fetch from `personal_books` table (joined with `books`)
   - 3-item skeleton loading state
   - Empty state with illustration, heading, and "Search books" CTA
   - `+` icon in header navigates to `/(app)/books/search`
   - Long-press opens a `Sheet` with status change buttons
   - `useDidFinishSSR()` guard for web SSR safety

## Deviations from Plan

- Header title uses `t('tab_reading')` instead of `t('add_book_fab')` — the design shows "Books" / current tab as the title, which maps more naturally to the tab label rather than the FAB action text. Functionally equivalent.

## Verification Results

| Check | Result |
|-------|--------|
| BookCard exists | PASS |
| exports BookCard | PASS |
| STATUS_COLORS has planned=#1A4FE0 | PASS |
| STATUS_COLORS has reading=#E85D1F | PASS |
| STATUS_COLORS has completed=#2A7A3A | PASS |
| books/_layout.tsx exists | PASS |
| books/index.tsx uses useQuery (no Phase 3 placeholder) | PASS |
| books/index.tsx has Sheet | PASS |
| books/index.tsx has segmented tabs | PASS |

## Self-Check: PASSED

All 7 verification checks passed. Wave 2 plan 03-02 complete — BookCard and reading list are ready. Plan 03-04 (Book Detail) can proceed after 03-03 also completes.
