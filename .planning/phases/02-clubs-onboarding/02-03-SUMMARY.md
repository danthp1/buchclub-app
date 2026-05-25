---
phase: 02-clubs-onboarding
plan: 03
subsystem: ui
tags: [react-query, zustand, supabase, tamagui, expo-router, i18n, deep-link, onboarding]

requires:
  - phase: 02-01
    provides: club.store.ts (useClubStore with hydration guard), tamagui tokens, QueryClientProvider, i18n namespaces

provides:
  - expo-app/components/ui/ClubBanner.tsx (active club context header with nil-safe query)
  - expo-app/components/ui/ClubCard.tsx (club list item with active indicator, member count, visibility chip)
  - expo-app/components/ui/CodeInput.tsx (8-char segmented code entry with onComplete callback)
  - expo-app/components/ui/WizardSteps.tsx (step progress dots with a11y role)
  - expo-app/app/(app)/clubs/index.tsx (club list screen with TanStack Query, skeleton, empty state)
  - expo-app/app/(app)/clubs/create/index.tsx (4-step wizard, collision-safe invite code, sets onboardingCompleted=true)
  - expo-app/app/(app)/clubs/join/index.tsx (join-by-code, deep link pre-fill, sets onboardingCompleted=true)
  - expo-app/app/(app)/clubs/browse/index.tsx (public club search with join mutation)

affects:
  - 02-04 (club detail screen — depends on ClubCard, ClubBanner, club store)
  - 02-02 (onboarding screens — route into clubs/create and clubs/join post-onboarding)

tech-stack:
  added: []
  patterns:
    - TanStack Query v5 useQuery/useMutation for Supabase club data fetching
    - Collision-safe INSERT with 23505 retry loop (up to 3 attempts) for invite_code uniqueness
    - useLocalSearchParams for deep link ?code= pre-fill in join screen
    - useClubStore.getState() (outside React) for fire-and-forget club state mutations post-onboarding
    - useDidFinishSSR() guard on all string literals for web SSR hydration safety

key-files:
  created:
    - expo-app/components/ui/ClubBanner.tsx
    - expo-app/components/ui/ClubCard.tsx
    - expo-app/components/ui/CodeInput.tsx
    - expo-app/components/ui/WizardSteps.tsx
    - expo-app/app/(app)/clubs/create/index.tsx
    - expo-app/app/(app)/clubs/join/index.tsx
    - expo-app/app/(app)/clubs/browse/index.tsx
  modified:
    - expo-app/app/(app)/clubs/index.tsx (full replacement of Phase 1 stub)

key-decisions:
  - "member_count in clubs/index.tsx is hardcoded to 0 — fetching count per club requires N+1 queries or a join aggregate; populated in Club Detail plan instead"
  - "as never type assertion used for router.push/replace calls to not-yet-created [id] routes — same pattern as Plan 01 for forward-references"
  - "WizardSteps created as a dependency (Rule 3) since create/index.tsx imports it but it was not in Task 1 scope — added to Task 1 commit to keep it atomic"

patterns-established:
  - "Collision-safe INSERT: for attempt in 0..3: generate code → insert → break on success, continue on 23505, throw on other errors"
  - "Onboarding completion: useClubStore.getState().setActiveClubId(id) + setOnboardingCompleted(true) called outside React after successful club create/join"
  - "Deep link pre-fill: useLocalSearchParams<{ code?: string }>() then useState(initialCode?.toUpperCase() ?? '')"

requirements-completed: [ONBRD-02, ONBRD-03, ONBRD-04, CLUB-06]

duration: 8min
completed: "2026-05-25"
---

# Phase 2 Plan 3: Club Screens and Shared Components Summary

**4-step club creation wizard (collision-safe invite code), join-by-code with deep link pre-fill, public browse with search, and 4 shared UI components (ClubBanner, ClubCard, CodeInput, WizardSteps) — full onboarding-to-club path complete**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-05-25T10:06:00Z
- **Completed:** 2026-05-25T10:14:40Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Created 4 shared UI components: ClubBanner (active club header), ClubCard (list item), CodeInput (8-char segmented entry), WizardSteps (progress dots)
- Built 4-step club creation wizard with cryptographically random invite codes and 23505 collision retry
- Built join-by-code screen with CodeInput pre-fill from `?code=` deep link parameter
- Built public club browse with TanStack Query + debounced search and join mutation
- Replaced Phase 1 clubs/index.tsx stub with full TanStack Query implementation (skeleton + empty state)
- Both create and join flows call `setOnboardingCompleted(true)` completing the onboarding gate

## Task Commits

1. **Task 1: Create ClubBanner, ClubCard, CodeInput, WizardSteps** - `53cda42` (feat)
2. **Task 2: Build club screens** - `f75ef51` (feat)

## Files Created/Modified

- `expo-app/components/ui/ClubBanner.tsx` - Active club header (40px ink, club name + chevron-down, nil-safe via useQuery)
- `expo-app/components/ui/ClubCard.tsx` - Club list item (radius-16, shadow, member count, visibility chip, active left-border)
- `expo-app/components/ui/CodeInput.tsx` - 8-char segmented code entry (hidden TextInput, visual cells, auto-uppercase, onComplete)
- `expo-app/components/ui/WizardSteps.tsx` - Step progress dots (accent=active, ink=done, borderColor=upcoming, a11y progressbar)
- `expo-app/app/(app)/clubs/index.tsx` - Club list with TanStack Query, skeleton loading, empty state (create/join CTAs)
- `expo-app/app/(app)/clubs/create/index.tsx` - 4-step wizard: name → description → visibility → confirm; collision-safe INSERT with 23505 retry; sets onboardingCompleted=true
- `expo-app/app/(app)/clubs/join/index.tsx` - Join by code; pre-fills from deep link `?code=`; 23505 already-member error; sets onboardingCompleted=true
- `expo-app/app/(app)/clubs/browse/index.tsx` - Public club search (is_public=true filter), join mutation with already-member handling

## Decisions Made

- `member_count` is hardcoded to 0 in the list screen — fetching count for all clubs at once requires an aggregate join or N+1 queries; Club Detail plan will provide exact counts for the detail view.
- `as never` type assertions used for router.push/replace to not-yet-created `(app)/clubs/[id]` routes — same forward-reference pattern established in Plan 01.
- `WizardSteps` created in Task 1 commit (deviation Rule 3 — blocking dependency) since the create wizard imports it.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created WizardSteps component missing from Task 1 scope**
- **Found during:** Task 1 pre-flight (Task 2 create wizard imports `WizardSteps`)
- **Issue:** `expo-app/components/ui/WizardSteps.tsx` was not listed in Task 1 files but `clubs/create/index.tsx` imports it — would cause a runtime error
- **Fix:** Created WizardSteps per UI-SPEC Component 13 spec (XStack of 8px circles, accent/ink/border colors, a11y progressbar role) and included it in Task 1 commit
- **Files modified:** expo-app/components/ui/WizardSteps.tsx
- **Committed in:** 53cda42 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Required for create wizard to function. No scope creep.

## Threat Model Verification

| Threat ID | Mitigation | Status |
|-----------|------------|--------|
| T-02-03-01 | Invite code brute-force | Accepted — 36^8 combinations, Supabase rate limiting |
| T-02-03-02 | is_public field tampering | Accepted — user's own preference, admin-only RLS for changes |
| T-02-03-03 | Member role injection | Implemented — client always inserts `role: 'member'`; RLS enforces this server-side |
| T-02-03-04 | Deep link code injection | Accepted — `?code=` only pre-fills UI; server validates against clubs.invite_code before INSERT |
| T-02-03-05 | invite_code uniqueness | Implemented — Postgres UNIQUE constraint + client retry loop on 23505 (3 attempts) |

## Known Stubs

- `expo-app/app/(app)/clubs/index.tsx` line 60: `member_count: 0` — hardcoded to 0 for performance. The ClubCard will show "0 members" on the list screen. Intentional: Club Detail plan will populate accurate counts. Does not block plan goal (club list navigation works correctly).

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- All club creation and join flows complete — onboarding path is now end-to-end
- ClubBanner, ClubCard, CodeInput, WizardSteps available for Plan 04 (club detail)
- `/(app)/clubs/[id]` route still needs to be created (Plan 04) — currently navigated to with `as never` type assertions

---
*Phase: 02-clubs-onboarding*
*Completed: 2026-05-25*
