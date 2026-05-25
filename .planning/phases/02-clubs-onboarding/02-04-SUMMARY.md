---
phase: 02-clubs-onboarding
plan: 04
subsystem: ui
tags: [club-management, profile, member-actions, admin, rpc, tamagui, tanstack-query, i18n]

dependency_graph:
  requires:
    - phase: 02-01
      provides: "club.store.ts (useClubStore), design tokens, delete_account RPC migration"
    - phase: 02-02
      provides: "AvatarPicker, AVATAR_SOURCES, checkGeneration pattern, onboarding screens"
    - phase: 02-03
      provides: "ClubBanner, ClubCard, clubs/index.tsx, club store onboarding flow"
  provides:
    - expo-app/components/ui/MemberRow.tsx (member list item with role chip and admin menu)
    - expo-app/app/(app)/clubs/[id]/index.tsx (club detail — member list, promote, remove, leave, invite)
    - expo-app/app/(app)/clubs/[id]/settings.tsx (club settings — edit info, visibility, dissolve)
    - expo-app/app/(app)/profile/index.tsx (full profile replacing Phase 1 stub)
    - expo-app/app/(app)/profile/edit.tsx (profile edit — username uniqueness + avatar picker)
  affects:
    - All club navigation (clubs/[id] route now exists — prior `as never` assertions resolve)
    - Profile tab (Phase 1 stub replaced with full implementation)

tech_stack:
  added: []
  patterns:
    - "MemberRow: initials-fallback avatar (slice 0-2 toUpperCase) when AVATAR_SOURCES key absent"
    - "Dialog.Overlay: no animation prop in Tamagui 2.x — enterStyle/exitStyle only"
    - "Supabase join cast: use 'as unknown as T' for joined table results (PostgREST returns array shape)"
    - "TanStack Query v5: useQuery has no onSuccess — use useEffect watching data for form pre-fill"
    - "checkGeneration stale-guard reused in profile edit (same pattern as onboarding username.tsx)"

key_files:
  created:
    - expo-app/components/ui/MemberRow.tsx
    - expo-app/app/(app)/clubs/[id]/index.tsx
    - expo-app/app/(app)/clubs/[id]/settings.tsx
    - expo-app/app/(app)/profile/edit.tsx
  modified:
    - expo-app/app/(app)/profile/index.tsx (Phase 1 stub replaced with full implementation)

decisions:
  - "Dialog.Overlay animation prop removed — Tamagui 2.x Dialog.Overlay does not accept animation; enterStyle/exitStyle CSS transitions are sufficient"
  - "TanStack Query v5 onSuccess removed from useQuery in profile/edit.tsx — replaced with useEffect watching profile data (v5 removed query callbacks per breaking change)"
  - "clubs and profiles joins cast via 'as unknown as T' — PostgREST returns array shape for joined relations; Supabase client types do not narrow this automatically"

metrics:
  duration: "~12 minutes"
  completed: "2026-05-25T10:30:00Z"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 5
---

# Phase 2 Plan 4: Club Management + Profile Screens Summary

Club detail with member list (promote/remove/leave/invite), club settings (visibility toggle + dissolve), full profile screen (stats + clubs + delete account RPC), and profile edit (debounced username uniqueness + avatar picker). All 13 Phase 2 requirements now covered.

## Tasks Completed

| Task | Commit | Description |
|------|--------|-------------|
| Task 1: MemberRow component and Club Detail screen | 7203fa4 | MemberRow with avatar/initials/role chip/admin menu; club detail with queryKey ['club', id, 'members'], promote, remove, leave, invite sheet |
| Task 2: Club Settings, full Profile, Profile Edit | 0d78eec | is_public toggle + dissolve; delete_account RPC + stats; checkGeneration uniqueness + AvatarPicker |

## Success Criteria Verification

- [x] Club detail shows member list with correct role chips
- [x] Admin can promote and remove members (cache invalidation via queryKey ['club', id, 'members'])
- [x] Any member can leave club (CLUB-05 — self-delete from club_members)
- [x] Club settings allows name/description edit and is_public toggle (CLUB-04)
- [x] Dissolve club requires confirmation and removes the club
- [x] Profile shows username, avatar, member-since, clubs count
- [x] Profile edit uses same debounced uniqueness validation as onboarding (checkGeneration pattern)
- [x] Delete account uses delete_account() RPC with confirmation dialog (PROF-03)

## Requirements Coverage

| Requirement | File | Coverage |
|-------------|------|----------|
| CLUB-01 | clubs/[id]/index.tsx | Club detail screen with member list |
| CLUB-02 | clubs/[id]/index.tsx | Promote to admin mutation |
| CLUB-03 | clubs/[id]/index.tsx | Remove member mutation with confirm dialog |
| CLUB-04 | clubs/[id]/settings.tsx | is_public toggle with save mutation |
| CLUB-05 | clubs/[id]/index.tsx | Leave club mutation (self-delete) |
| CLUB-06 | clubs/browse/index.tsx | (completed in Plan 03) |
| ONBRD-01 | (onboarding)/username.tsx | (completed in Plan 02) |
| ONBRD-02 | clubs/create/index.tsx | (completed in Plan 03) |
| ONBRD-03 | clubs/join/index.tsx | (completed in Plan 03) |
| ONBRD-04 | clubs/join/index.tsx | (completed in Plan 03) |
| PROF-01 | profile/index.tsx | Username, avatar, member-since, clubs count stats |
| PROF-02 | profile/edit.tsx | Edit username + avatar with validation |
| PROF-03 | profile/index.tsx | delete_account() RPC + confirmation dialog |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Dialog.Overlay animation prop TypeScript error**
- **Found during:** TypeScript check post-Task 2
- **Issue:** `Dialog.Overlay` in Tamagui 2.x does not accept an `animation` prop — TS error on all 4 dialog overlays across 3 files
- **Fix:** Removed `animation="medium"` from all `Dialog.Overlay` usages; kept `enterStyle`/`exitStyle` for CSS-based transition
- **Files modified:** clubs/[id]/index.tsx, clubs/[id]/settings.tsx, profile/index.tsx
- **Commit:** 0d78eec (included in Task 2 commit)

**2. [Rule 1 - Bug] Fixed Supabase join type cast for profiles and clubs relations**
- **Found during:** TypeScript check post-Task 2
- **Issue:** PostgREST returns array shape for joined relations (`profiles(...)`) but type narrowing expects singular object; standard `as T` cast fails — "neither type sufficiently overlaps"
- **Fix:** Applied `as unknown as T` double-cast for `member.profiles` in clubs/[id]/index.tsx and `m.clubs` in profile/index.tsx
- **Files modified:** clubs/[id]/index.tsx, profile/index.tsx
- **Commit:** 0d78eec

**3. [Rule 1 - Bug] Replaced onSuccess query callback with useEffect (TanStack Query v5)**
- **Found during:** Plan action note (pre-noted in plan); confirmed in implementation
- **Issue:** TanStack Query v5 removed `onSuccess` from `useQuery` options
- **Fix:** Used `useEffect` watching `profile` data to pre-fill form state in profile/edit.tsx
- **Files modified:** profile/edit.tsx
- **Commit:** 0d78eec

## Threat Model Verification

| Threat ID | Mitigation | Status |
|-----------|------------|--------|
| T-02-04-01 | Promote to admin — RLS enforces caller is already admin | Implemented — client-side isAdmin check is UX only; DB enforces via `club_members_update_admin` RLS |
| T-02-04-02 | Remove member — RLS: self-remove OR admin | Implemented — .delete().eq('club_id', id).eq('user_id', memberId) |
| T-02-04-03 | Dissolve club — RLS: admin only | Implemented — .delete().eq('id', id) gated by Supabase RLS |
| T-02-04-04 | Delete account — SECURITY DEFINER, auth.uid() scoped | Implemented — supabase.rpc('delete_account') |
| T-02-04-05 | Profile visibility — intentionally public | Accepted — usernames/avatars not private data |

## Known Stubs

- `expo-app/app/(app)/profile/index.tsx` stats_read and stats_votes: hardcoded to `0`. Intentional — read books tracking is Phase 4, voting is Phase 3. The clubs count (`memberships?.length`) is live data. These stubs do not prevent the plan goal (profile screen) from being achieved.

## Self-Check: PASSED

Files exist:
- expo-app/components/ui/MemberRow.tsx: FOUND
- expo-app/app/(app)/clubs/[id]/index.tsx: FOUND
- expo-app/app/(app)/clubs/[id]/settings.tsx: FOUND
- expo-app/app/(app)/profile/index.tsx: FOUND (updated)
- expo-app/app/(app)/profile/edit.tsx: FOUND

Commits exist:
- 7203fa4: FOUND (feat(02-04): club detail screen + MemberRow component)
- 0d78eec: FOUND (feat(02-04): club settings, full profile screen, profile edit)

TypeScript: 0 errors (npx tsc --noEmit clean)
