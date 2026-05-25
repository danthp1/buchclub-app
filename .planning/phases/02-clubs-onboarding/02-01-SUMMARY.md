---
phase: 02-clubs-onboarding
plan: 01
subsystem: foundation
tags: [design-system, fonts, zustand, i18n, supabase-rpc, routing, tamagui]
dependency_graph:
  requires: []
  provides:
    - expo-app/store/club.store.ts (useClubStore with hydration guard)
    - supabase/migrations/0002_delete_account_rpc.sql (delete_account RPC)
    - expo-app/app/(app)/schedule/index.tsx (schedule placeholder)
    - expo-app/tamagui.config.ts (authoritative design tokens)
    - expo-app/app/_layout.tsx (QueryClientProvider + onboarding gate)
  affects:
    - All Wave 2 plans (depend on useClubStore._hasHydrated)
    - All Phase 2 screens (depend on updated color/font tokens)
    - All auth flows (depend on updated InitialLayout routing logic)
tech_stack:
  added:
    - "@expo-google-fonts/archivo-narrow@0.4.2"
    - "@expo-google-fonts/ibm-plex-sans@0.4.1"
    - "expo-clipboard@~56.0.3"
  patterns:
    - Zustand persist + partialize (exclude _hasHydrated from storage)
    - onRehydrateStorage hydration guard pattern
    - Dual-gate auth: initialized AND _hasHydrated before routing
    - useLinkingURL() (replaces deprecated Linking.useURL())
key_files:
  created:
    - expo-app/store/club.store.ts
    - supabase/migrations/0002_delete_account_rpc.sql
    - expo-app/app/(app)/schedule/index.tsx
  modified:
    - expo-app/tamagui.config.ts
    - expo-app/components/ui/Button.tsx
    - expo-app/app/_layout.tsx
    - expo-app/app/_layout.web.tsx
    - expo-app/app/(app)/_layout.native.tsx
    - expo-app/app/(app)/_layout.web.tsx
    - expo-app/lib/i18n/en.json
    - expo-app/lib/i18n/de.json
    - expo-app/lib/i18n/index.ts
    - expo-app/package.json
    - expo-app/package-lock.json
decisions:
  - "Use as any for (onboarding)/* routes in router.replace — route group does not exist yet; TypeScript typed routes require the file to exist first. Will become typed once plan 02-02 creates the onboarding screens."
  - "Keep createInterFont removed entirely — ArchivoNarrow_700Bold and IBMPlexSans_400Regular/SemiBold replace it completely in createFont calls."
  - "de.json browse_no_results uses Unicode typographic quotes (the character „" U+201E and U+201C) — these caused a TypeScript JSON parser false-alarm that was already fixed by the file being valid JSON. Confirmed OK."
metrics:
  duration: "6 minutes"
  completed: "2026-05-25T10:07:36Z"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 14
---

# Phase 2 Plan 1: Foundation — Design System, Club Store, i18n Namespaces Summary

Migrated design tokens to Archivo Narrow Bold + IBM Plex Sans + authoritative palette (#F0EDE4 Papier, #1A4FE0 Electric Blue, #0D0D0D Ink Black), wired QueryClientProvider at root, created Zustand club store with persist hydration guard, added PROF-03 delete_account() SQL migration, and registered three new i18n namespaces (onboarding, clubs, profile) in both EN and DE.

## Tasks Completed

| Task | Commit | Description |
|------|--------|-------------|
| Task 1: Install packages, club store, migration, schedule placeholder | a7cdad1 | Font packages installed, club.store.ts created, 0002 migration added, schedule/index.tsx created |
| Task 2: Design system migration — all 9 files | 6bd9a51 | tamagui.config, Button, layouts (native+web), i18n namespaces, root layouts with QueryClientProvider + onboarding gate |

## Success Criteria Verification

- [x] Design tokens match design.md: background #F0EDE4, accent #1A4FE0, ink #0D0D0D
- [x] Both root layouts use Archivo Narrow + IBM Plex Sans fonts
- [x] Both root layouts have QueryClientProvider wrapping AuthProvider
- [x] InitialLayout gates on both `initialized` AND `_hasHydrated`
- [x] InitialLayout uses `useLinkingURL()` (not deprecated `useURL()`)
- [x] club.store.ts exists with persist + partialize + onRehydrateStorage
- [x] delete_account() SQL migration exists with SECURITY DEFINER
- [x] Tab bar: Books / Schedule / Community / Profile (in that order)
- [x] i18n has onboarding, clubs, profile namespaces in both EN and DE

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript route type errors for not-yet-created (onboarding)/* routes**
- **Found during:** Task 2 TypeScript check
- **Issue:** `router.replace('/(onboarding)/username')` and `segments[0] === '(onboarding)'` caused TypeScript errors because the `(onboarding)` route group doesn't exist yet — expo-router's typed routes are generated from the file system
- **Fix:** Applied `as any` type assertions to forward-references and `(segments as any)[0]` for the segment comparison. Added eslint-disable comments. These will become properly typed once plan 02-02 creates the onboarding route files.
- **Files modified:** expo-app/app/_layout.tsx, expo-app/app/_layout.web.tsx
- **Commit:** 6bd9a51

## Threat Model Verification

| Threat ID | Mitigation | Status |
|-----------|------------|--------|
| T-02-01-01 | Onboarding gate (local flag) | Implemented — dual-gate: initialized AND hasHydrated |
| T-02-01-02 | Invite code deep link | Implemented — code stored in pendingInviteCode, validated server-side |
| T-02-01-03 | Linking.parse(url) | Accepted — no secrets in URL |
| T-02-01-04 | delete_account SECURITY DEFINER | Implemented — auth.uid() null check at line 1 |

## Known Stubs

- `expo-app/app/(app)/schedule/index.tsx`: Phase 5 placeholder with static "Phase 5" text. Intentional — schedule/meetings feature is deferred to Phase 5 per ROADMAP.

## Pre-existing TypeScript Errors (Not Introduced by This Plan)

The following errors existed before this plan and are out of scope:
- `animations` prop on `TamaguiProvider` (pre-existing in both layout files)
- `transition` prop type mismatch in Button.tsx, Alert.tsx, Input.tsx
- `/explore` route in `src/components/app-tabs.web.tsx`

## Self-Check: PASSED

Files exist:
- expo-app/store/club.store.ts: FOUND
- supabase/migrations/0002_delete_account_rpc.sql: FOUND
- expo-app/app/(app)/schedule/index.tsx: FOUND

Commits exist:
- a7cdad1: FOUND (feat(02-01): install font packages...)
- 6bd9a51: FOUND (feat(02-01): migrate design system...)
