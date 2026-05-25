---
phase: 02-clubs-onboarding
verified: 2026-05-25T12:00:00Z
status: human_needed
score: 13/13 must-haves verified
overrides_applied: 0
requirements_checked:
  - ONBRD-01
  - ONBRD-02
  - ONBRD-03
  - ONBRD-04
  - PROF-01
  - PROF-02
  - PROF-03
  - CLUB-01
  - CLUB-02
  - CLUB-03
  - CLUB-04
  - CLUB-05
  - CLUB-06
human_verification:
  - test: "Onboarding gate blocks access to (app)/ on first login"
    expected: "After first login with a new account, the app routes to (onboarding)/username and NOT to (app)/clubs"
    why_human: "Routing gate depends on persisted Zustand state (_hasHydrated + onboardingCompleted). Cannot verify cold-start routing behavior without running the app."
  - test: "Profile edit save_profile translation key renders without crash"
    expected: "The save button in profile/edit.tsx shows a translated label, not undefined/blank"
    why_human: "profile/edit.tsx uses t('profile:save_profile') but that key does not exist in en.json or de.json. Must test at runtime to see whether it falls back gracefully or shows blank."
  - test: "Admin member actions (promote, remove) reflected immediately for other members"
    expected: "After admin promotes or removes a member, a second user viewing the same club sees the update without a manual refresh"
    why_human: "Cache invalidation triggers a re-fetch but there is no Supabase Realtime subscription; whether the second device sees the update depends on whether both sessions share the same TanStack Query cache (they do not — this is a multi-device behaviour test)."
  - test: "Browse screen shows debounced search (not per-keystroke)"
    expected: "Typing in the browse search bar triggers one query per 300–500 ms pause, not on every character"
    why_human: "The browse screen passes search state directly as a queryKey parameter without any debounce ref. Whether TanStack Query's staleTime prevents excessive queries is a runtime-only observable."
---

# Phase 2: Clubs & Onboarding — Verification Report

**Phase Goal:** A newly authenticated user can create a club, invite others via code, join public or code-gated clubs, and manage their membership — all club-level data is in Supabase with RLS.
**Verified:** 2026-05-25T12:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | After first login, user is presented with a create/join choice and cannot reach main app without completing it | ✓ VERIFIED | `_layout.tsx` InitialLayout gates on both `initialized` AND `_hasHydrated` before routing; routes to `/(onboarding)/username` when `!onboardingCompleted`; `setOnboardingCompleted(true)` is called in both create and join flows |
| 2 | A club creator receives a shareable invite code; a second user can paste it and appear in the member list | ✓ VERIFIED | `clubs/create/index.tsx` generates 8-char invite code with collision-retry loop; `clubs/join/index.tsx` inserts into `club_members` on success; `clubs/[id]/index.tsx` queries `['club', id, 'members']` and invalidates on mutation |
| 3 | Admin can promote a member, remove a member, and toggle public visibility | ✓ VERIFIED | `clubs/[id]/index.tsx`: `promoteMutation` does `UPDATE club_members SET role='admin'`; `removeMutation` does `DELETE from club_members`; `clubs/[id]/settings.tsx`: `saveMutation` does `UPDATE clubs SET is_public=...` |
| 4 | User can set a username and optional avatar, then view and edit that profile at any time | ✓ VERIFIED | `(onboarding)/username.tsx` does `UPDATE profiles SET username`; `(onboarding)/avatar.tsx` does `UPDATE profiles SET avatar_url`; `profile/edit.tsx` allows post-onboarding edit of both |
| 5 | User can be a member of multiple clubs simultaneously and switch between them | ✓ VERIFIED | `clubs/index.tsx` queries all `club_members` rows for the user; `useClubStore.setActiveClubId` enables context switching; `browse/index.tsx` join mutation also supports joining additional clubs |

**Score:** 5/5 roadmap success criteria verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `expo-app/store/club.store.ts` | Zustand club store with persist + hydration guard | ✓ VERIFIED | Contains `useClubStore`, `_hasHydrated`, `_setHasHydrated`, `partialize` (excludes `_hasHydrated`), `onRehydrateStorage` |
| `supabase/migrations/0002_delete_account_rpc.sql` | delete_account() RPC for PROF-03 | ✓ VERIFIED | `SECURITY DEFINER`, `auth.uid()` null check, `authenticated` role grant |
| `expo-app/app/(onboarding)/_layout.tsx` | Stack navigator for onboarding group | ✓ VERIFIED | Exists; exports `OnboardingLayout` with `headerShown: false` |
| `expo-app/app/(onboarding)/username.tsx` | Username entry with debounced uniqueness validation | ✓ VERIFIED | Contains `checkGeneration` stale-guard, debounce at 500ms, `UPDATE profiles SET username`, navigates to `/(onboarding)/avatar` |
| `expo-app/app/(onboarding)/avatar.tsx` | Avatar picker + non-dismissable create-or-join sheet | ✓ VERIFIED | Contains `sheetOpen`, `dismissOnSnapToBottom={false}`, routes to `/(app)/clubs/create` and `/(app)/clubs/join` with `pendingInviteCode` support |
| `expo-app/components/ui/WizardSteps.tsx` | Step progress indicator | ✓ VERIFIED | Exports `WizardSteps`, `accessibilityRole="progressbar"` |
| `expo-app/components/ui/AvatarPicker.tsx` | Avatar selection grid | ✓ VERIFIED | Exports `AvatarPicker`, `accessibilityRole="radio"`, imports from `../../constants/avatars` |
| `expo-app/constants/avatars.ts` | Static require map for avatar PNGs | ✓ VERIFIED | `AVATAR_SOURCES` with `preset:01`–`preset:08` keys, static `require()` (not dynamic) |
| `expo-app/assets/avatars/` | 8 avatar PNG files | ✓ VERIFIED | 8 files present (`avatar-01.png` through `avatar-08.png`) |
| `expo-app/app/(app)/clubs/index.tsx` | Club list with TanStack Query | ✓ VERIFIED | `queryKey: ['clubs', 'my', userId]`, skeleton loading, empty state with create/join buttons |
| `expo-app/app/(app)/clubs/create/index.tsx` | 4-step club creation wizard | ✓ VERIFIED | Contains `generateInviteCode`, 23505 collision retry, `setOnboardingCompleted(true)`, all 4 steps present |
| `expo-app/app/(app)/clubs/join/index.tsx` | Join by code + deep link pre-fill | ✓ VERIFIED | `initialCode` from `useLocalSearchParams`, `setOnboardingCompleted(true)`, 23505 already-member error |
| `expo-app/app/(app)/clubs/browse/index.tsx` | Browse public clubs | ✓ VERIFIED | `.eq('is_public', true)`, `ilike` search, `joinMutation` with TanStack Query |
| `expo-app/components/ui/ClubBanner.tsx` | Active club context header | ✓ VERIFIED | `activeClubId` from store, TanStack Query fetch, nil-safe (`if (!activeClubId || !club) return null`) |
| `expo-app/components/ui/ClubCard.tsx` | Club list item component | ✓ VERIFIED | `borderLeftWidth` active indicator, `member_count`, visibility chip |
| `expo-app/components/ui/CodeInput.tsx` | 8-character segmented code input | ✓ VERIFIED | `CODE_LENGTH = 8`, `.toUpperCase()`, `onComplete` callback |
| `expo-app/app/(app)/clubs/[id]/index.tsx` | Club detail + member list | ✓ VERIFIED | `queryKey: ['club', id, 'members']`, `promoteMutation`, `removeMutation`, `leaveMutation`, `invite_code` display, `removeDialogOpen` |
| `expo-app/app/(app)/clubs/[id]/settings.tsx` | Club settings — visibility + dissolve | ✓ VERIFIED | `is_public` toggle with `saveMutation`, `dissolveMutation` with confirmation dialog, danger zone section |
| `expo-app/components/ui/MemberRow.tsx` | Member row with role chip and admin menu | ✓ VERIFIED | Initials fallback avatar, `role === 'admin'` chip, `isCurrentUserAdmin && !isCurrentUser` gate on more-press button |
| `expo-app/app/(app)/profile/index.tsx` | Full profile screen | ✓ VERIFIED | `supabase.rpc('delete_account')`, `deleteDialogOpen`, `memberships?.length` for clubs count, avatar display |
| `expo-app/app/(app)/profile/edit.tsx` | Profile edit | ✓ VERIFIED | `checkGeneration` stale-guard, `AvatarPicker` in sheet, `originalUsername` bypass, `UPDATE profiles` mutation |
| `expo-app/app/_layout.tsx` | Root layout with auth + onboarding guard | ✓ VERIFIED | `QueryClientProvider` wraps `AuthProvider`, `useLinkingURL()` (not deprecated `useURL()`), dual-gate `!initialized \|\| !hasHydrated` |
| `expo-app/tamagui.config.ts` | Design tokens: Papier/Ink/Blue palette + Archivo Narrow | ✓ VERIFIED | `background: '#F0EDE4'`, `ink: '#0D0D0D'`, `accent: '#1A4FE0'`, `ArchivoNarrow_700Bold` font |
| `expo-app/lib/i18n/en.json` | English translations for onboarding, clubs, profile namespaces | ✓ VERIFIED | All three namespaces present at top level |
| `expo-app/lib/i18n/de.json` | German translations for onboarding, clubs, profile namespaces | ✓ VERIFIED | All three namespaces present at top level |
| `expo-app/lib/i18n/index.ts` | i18n namespace registration | ✓ VERIFIED | `onboarding`, `clubs`, `profile` registered in both EN and DE resources; present in `ns` array |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `_layout.tsx InitialLayout` | `club.store.ts useClubStore` | `import useClubStore` + `_hasHydrated` read | ✓ WIRED | Lines 29-30: `const hasHydrated = useClubStore((s) => s._hasHydrated)` |
| `_layout.tsx RootLayout` | `QueryClientProvider` | Import + JSX wrap | ✓ WIRED | `QueryClientProvider client={queryClient}` wraps `AuthProvider` |
| `(onboarding)/username.tsx` | `profiles table` | `supabase.from('profiles').update({ username })` | ✓ WIRED | Line 71-72: UPDATE not INSERT; trigger creates row at signup |
| `(onboarding)/avatar.tsx` | `club.store setOnboardingCompleted` | NOT set in avatar.tsx | ✓ CORRECT | Per plan: `onboardingCompleted` is set in `clubs/create` and `clubs/join` after club action completes; avatar.tsx only opens the create-or-join sheet |
| `clubs/create/index.tsx` | `clubs table` | `supabase.from('clubs').insert(...)` | ✓ WIRED | Collision-safe INSERT with `.select('id, invite_code, name').single()` |
| `clubs/create/index.tsx` | `club.store setOnboardingCompleted` | `useClubStore.getState().setOnboardingCompleted(true)` | ✓ WIRED | Line 86 |
| `clubs/join/index.tsx` | `club.store setOnboardingCompleted` | `useClubStore.getState().setOnboardingCompleted(true)` | ✓ WIRED | Line 74 |
| `clubs/[id]/index.tsx` | `club_members table` | `useMutation` delete + update | ✓ WIRED | `removeMutation`: `.delete().eq('club_id', id).eq('user_id', memberId)`; `promoteMutation`: `.update({ role: 'admin' })` |
| `profile/index.tsx` | `delete_account RPC` | `supabase.rpc('delete_account')` | ✓ WIRED | Line 72 in profile/index.tsx |
| `browse/index.tsx` | `clubs table` | `supabase.from('clubs').select(...).eq('is_public', true)` | ✓ WIRED | Query with `is_public` filter and optional `ilike` name search |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `clubs/index.tsx` | `memberships` | `supabase.from('club_members').select(...)` via `useQuery` | Yes — DB join with clubs table | ✓ FLOWING |
| `clubs/[id]/index.tsx` | `members` | `supabase.from('club_members').select('user_id, role, profiles(...)')` | Yes — live DB query per `club_id` | ✓ FLOWING |
| `profile/index.tsx` | `profile` | `supabase.from('profiles').select(...)` | Yes — live DB query per `userId` | ✓ FLOWING |
| `profile/index.tsx` | `memberships.length` (clubs count) | Same clubs query as clubs/index | Yes — live count | ✓ FLOWING |
| `profile/index.tsx` | `stats_read`, `stats_votes` | Hardcoded `0` | No — static placeholder | ⚠️ STATIC (intentional — Phase 3/4 work) |
| `browse/index.tsx` | `clubs` | `supabase.from('clubs').select(...).eq('is_public', true)` | Yes — filtered DB query | ✓ FLOWING |

### Behavioral Spot-Checks

Step 7b: SKIPPED — No runnable entry points available without starting the Expo dev server. App requires native runtime for meaningful checks.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| ONBRD-01 | 02-01, 02-02 | After first login, user prompted to create or join | ✓ SATISFIED | Onboarding gate in `_layout.tsx`; `(onboarding)/username.tsx` + `avatar.tsx` + create-or-join sheet |
| ONBRD-02 | 02-03 | User can create a club (auto-generates invite code, becomes admin) | ✓ SATISFIED | `clubs/create/index.tsx` — collision-safe INSERT, inserts creator as `admin`, displays invite code |
| ONBRD-03 | 02-03 | User can join a club by entering invite code | ✓ SATISFIED | `clubs/join/index.tsx` — CodeInput, lookup by `invite_code`, INSERT into `club_members` |
| ONBRD-04 | 02-03 | User can browse and join publicly listed clubs | ✓ SATISFIED | `clubs/browse/index.tsx` — `is_public=true` filter, search, join mutation |
| PROF-01 | 02-02, 02-04 | User can set username and optional avatar during/after onboarding | ✓ SATISFIED | Username + avatar set in onboarding; editable via `profile/edit.tsx` |
| PROF-02 | 02-04 | User can view and edit profile (username, avatar) | ✓ SATISFIED | `profile/index.tsx` (view) + `profile/edit.tsx` (edit with debounced uniqueness check) |
| PROF-03 | 02-01, 02-04 | User can delete account (removes auth record and profile data) | ✓ SATISFIED | `0002_delete_account_rpc.sql` with SECURITY DEFINER; `profile/index.tsx` calls `supabase.rpc('delete_account')` with confirmation dialog |
| CLUB-01 | 02-04 | Admin can view club details (name, invite code, member list) | ✓ SATISFIED | `clubs/[id]/index.tsx` — queries club + members; invite sheet shows invite_code; settings gear visible to admins |
| CLUB-02 | 02-04 | Admin can promote any member to admin | ✓ SATISFIED | `promoteMutation` in `clubs/[id]/index.tsx` — `UPDATE club_members SET role='admin'` |
| CLUB-03 | 02-04 | Admin can remove a member | ✓ SATISFIED | `removeMutation` in `clubs/[id]/index.tsx` — `DELETE from club_members` with confirmation dialog |
| CLUB-04 | 02-04 | Admin can toggle public/private listing | ✓ SATISFIED | `saveMutation` in `clubs/[id]/settings.tsx` — `UPDATE clubs SET is_public=...` |
| CLUB-05 | 02-04 | Any member can leave a club | ✓ SATISFIED | `leaveMutation` in `clubs/[id]/index.tsx` — self-DELETE from club_members; clears activeClubId if needed |
| CLUB-06 | 02-03 | User can be a member of multiple clubs | ✓ SATISFIED | `clubs/index.tsx` fetches all club_members rows for user; multiple ClubCard items rendered; `setActiveClubId` enables switching |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `profile/index.tsx` | 148, 153 | `stats_read` and `stats_votes` hardcoded to `0` | ℹ️ Info | Intentional — acknowledged stub per SUMMARY.md; Phase 3/4 work |
| `profile/edit.tsx` | 170 | `t('profile:save_profile')` — key `save_profile` absent from `en.json` and `de.json` | ⚠️ Warning | Button label will show `undefined` or fallback string at runtime; does not crash but is a UX defect |
| `clubs/browse/index.tsx` | 25 | `queryKey: ['clubs', 'public', search]` — no debounce on `search` state | ℹ️ Info | Every keystroke triggers a new query key and fires a Supabase request; not a data-correctness issue but is inefficient |
| `clubs/index.tsx` | 61 | `member_count: 0` hardcoded for all clubs in the list | ℹ️ Info | Member count in club list is always 0; accurate count is only shown in `clubs/[id]`; noted as intentional performance trade-off in SUMMARY |

### Human Verification Required

#### 1. Onboarding Gate Routing on First Login

**Test:** Register a brand-new account via sign-up screen. After email confirmation, log in.
**Expected:** App routes to `/(onboarding)/username`, NOT to `/(app)/clubs`. The club list or any other app screen should NOT be reachable before username is set and create-or-join sheet is completed.
**Why human:** The routing gate depends on `_hasHydrated` (Zustand persist rehydration from expo-sqlite KV store) AND `onboardingCompleted` (initially `false`). The combination of cold-start hydration timing and route group evaluation cannot be verified statically.

#### 2. Profile Edit Save Button Label

**Test:** Navigate to Profile → Edit. Observe the save button label.
**Expected:** Button shows "Save profile" (EN) or equivalent (DE), not blank or `undefined`.
**Why human:** `profile/edit.tsx` line 170 calls `t('profile:save_profile')` but this key does not exist in `en.json` or `de.json`. Whether i18next falls back to the key name (`save_profile`) or renders empty depends on runtime i18next configuration. This is a confirmed missing translation key.

#### 3. Multi-Device Member Update Visibility

**Test:** Open the club detail screen on two devices simultaneously (or two browser tabs). From device A (admin), promote device B's user to admin. Observe device B's screen.
**Expected:** Device B sees the updated role chip without manually refreshing.
**Why human:** TanStack Query cache invalidation on device A does not propagate to device B. Requires Supabase Realtime subscriptions (not yet implemented in Phase 2) for live cross-device updates. The SC says "reflected immediately" — this is only true for the acting device.

#### 4. Browse Search Debounce Behavior

**Test:** Open the browse clubs screen. Type a search query quickly, one character at a time.
**Expected:** Observe whether the app fires one network request per character typed or batches them.
**Why human:** `browse/index.tsx` uses `search` state directly as a TanStack Query key without any debounce wrapper. TanStack Query may avoid redundant fetches via its own deduplication but the number of actual Supabase queries fired per keystroke cannot be verified statically.

---

## Gaps Summary

No blocking gaps were found. All 13 requirements are covered with substantive implementations wired to live Supabase data. Four items require human verification:

1. **Missing translation key `profile:save_profile`** — a WARNING (not a blocker). The profile edit screen compiles and runs; the save button label shows whatever i18next falls back to for an unknown key. Fix: add `"save_profile": "Save profile"` to both `en.json` and `de.json` under the `profile` namespace.

2. **Browse screen missing search debounce** — an INFO. Every keystroke in browse fires a Supabase query. Fix: add a `useRef` debounce timer and only update `search` state after 300ms pause (same pattern as the username uniqueness check).

3. **Multi-device member update** — requires human acknowledgement that the SC "reflected immediately for other members" is met only for the acting device (no Realtime subscriptions in Phase 2). Cross-device live updates are a Phase 4 concern (vote counts via Realtime are planned there).

4. **Hardcoded stats `stats_read=0` and `stats_votes=0`** — intentional stubs, explicitly documented in the SUMMARY as deferred to Phase 3 and Phase 4.

---

_Verified: 2026-05-25T12:00:00Z_
_Verifier: Claude (gsd-verifier)_
