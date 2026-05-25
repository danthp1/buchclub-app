---
phase: 02-clubs-onboarding
plan: 02
subsystem: ui
tags: [onboarding, expo-router, tamagui, supabase, i18n, zustand, accessibility]

dependency_graph:
  requires:
    - phase: 02-01
      provides: "useClubStore (pendingInviteCode), design tokens (ink/accent/borderColor/papier), onboarding gate in _layout.tsx, i18n onboarding namespace (EN + DE)"
  provides:
    - expo-app/app/(onboarding)/_layout.tsx (Stack navigator for onboarding route group)
    - expo-app/app/(onboarding)/username.tsx (username entry screen with debounced uniqueness check)
    - expo-app/app/(onboarding)/avatar.tsx (avatar picker screen + non-dismissable create-or-join Sheet)
    - expo-app/components/ui/WizardSteps.tsx (step progress indicator component)
    - expo-app/components/ui/AvatarPicker.tsx (avatar selection grid component)
    - expo-app/constants/avatars.ts (static Metro-safe require map for 8 avatar PNGs)
    - expo-app/assets/avatars/ (8 placeholder PNG files, avatar-01.png through avatar-08.png)
  affects:
    - 02-03 (clubs/create and clubs/join routes — avatar screen navigates to them)
    - 02-04 (profile screen — avatar_url stored here, profile edit will use same picker)

tech-stack:
  added: []
  patterns:
    - "checkGeneration ref pattern — stale debounce guard: increment counter before async call, discard response if counter changed"
    - "Non-dismissable Tamagui Sheet: dismissOnSnapToBottom={false} prevents gesture-dismissal"
    - "Metro static require map pattern: AVATAR_SOURCES Record<string, ImageSourcePropType> with hardcoded require() per key"
    - "SSR guard pattern: useDidFinishSSR() + isClient ternary with English fallback literal above the fold"

key-files:
  created:
    - expo-app/app/(onboarding)/_layout.tsx
    - expo-app/app/(onboarding)/username.tsx
    - expo-app/app/(onboarding)/avatar.tsx
    - expo-app/components/ui/WizardSteps.tsx
    - expo-app/components/ui/AvatarPicker.tsx
    - expo-app/constants/avatars.ts
    - expo-app/assets/avatars/avatar-01.png
    - expo-app/assets/avatars/avatar-02.png
    - expo-app/assets/avatars/avatar-03.png
    - expo-app/assets/avatars/avatar-04.png
    - expo-app/assets/avatars/avatar-05.png
    - expo-app/assets/avatars/avatar-06.png
    - expo-app/assets/avatars/avatar-07.png
    - expo-app/assets/avatars/avatar-08.png
  modified: []

key-decisions:
  - "Input component does not accept a loading prop — removed loading={validating} from Input call; button disabled state provides the only visual loading cue during uniqueness check"
  - "Used react-native Image + style prop instead of Tamagui Image in AvatarPicker — avoids Tamagui Image type complexity with ImageSourcePropType require maps"
  - "Avatar PNG placeholders are 1x1 pixel valid PNGs — sufficient for Metro static require() bundling; replace with real 160x160 B&W lineart before release"

patterns-established:
  - "checkGeneration pattern: debounced async validation uses a ref counter to discard stale responses — copy this pattern for any debounced async input validation"
  - "Onboarding screen scaffold: SafeAreaView (#F0EDE4) > KeyboardAvoidingView > ScrollView (flexGrow:1) > YStack with $gtSm maxWidth:420 centering"

requirements-completed: [ONBRD-01, ONBRD-02, ONBRD-03, PROF-01]

duration: 3min
completed: "2026-05-25"
---

# Phase 2 Plan 2: Onboarding Flow — Username, Avatar, Create-or-Join Summary

**Three-screen onboarding flow: username entry with debounced Supabase uniqueness check (stale-request guard), avatar picker with 8 preset illustrations, and non-dismissable create-or-join Sheet routing to clubs/create or clubs/join**

## Performance

- **Duration:** 3 minutes
- **Started:** 2026-05-25T10:10:23Z
- **Completed:** 2026-05-25T10:13:53Z
- **Tasks:** 2
- **Files modified:** 14 (11 created in Task 1, 3 created in Task 2)

## Accomplishments

- (onboarding)/ route group with Stack navigator, username screen, and avatar screen — first-time users are gated here before accessing (app)/
- Username screen: debounced async Supabase uniqueness check with `checkGeneration` stale-request guard (Pitfall 5 from RESEARCH); saves via UPDATE to existing profiles row (trigger creates it on signup)
- Avatar screen: 8-option picker using static Metro require map, non-dismissable Sheet (dismissOnSnapToBottom={false}) offering Create or Join, with pendingInviteCode deep-link passthrough
- WizardSteps component (step progress dots with accessibilityRole progressbar) and AvatarPicker component (selection grid with accessibilityRole radio) added to components/ui/

## Task Commits

1. **Task 1: Create shared UI components — WizardSteps, AvatarPicker, avatar assets, and constants/avatars.ts** - `0c740dd` (feat)
2. **Task 2: Create (onboarding)/ route group — _layout.tsx, username.tsx, avatar.tsx** - `2f53c80` (feat)

## Files Created/Modified

- `expo-app/app/(onboarding)/_layout.tsx` - Stack navigator, headerShown: false
- `expo-app/app/(onboarding)/username.tsx` - Username entry with debounced uniqueness check, WizardSteps step 1/2
- `expo-app/app/(onboarding)/avatar.tsx` - Avatar picker + non-dismissable Sheet for create-or-join, WizardSteps step 2/2
- `expo-app/components/ui/WizardSteps.tsx` - Step progress indicator, accessibilityRole progressbar
- `expo-app/components/ui/AvatarPicker.tsx` - 8-option avatar grid, accessibilityRole radio per option
- `expo-app/constants/avatars.ts` - Static require map (AVATAR_SOURCES) for Metro bundling
- `expo-app/assets/avatars/avatar-01.png` through `avatar-08.png` - Placeholder PNGs (replace with real art before release)

## Decisions Made

- **Input loading prop absent:** The existing Input component has no `loading` prop. Removed `loading={validating}` from the Input in username.tsx; the button's disabled state already conveys the validation-in-progress state clearly enough.
- **React Native Image over Tamagui Image:** Used `Image` from `react-native` with `style={{ width, height }}` in AvatarPicker to avoid type complexity with `ImageSourcePropType` require maps and Tamagui's Image source format differences.
- **1x1 pixel PNG placeholders:** Minimal valid PNG bytes satisfy Metro's static require() requirement. Real 160x160 B&W lineart illustrations should replace these before release.

## Deviations from Plan

None - plan executed exactly as written. The only adaptation was removing the non-existent `loading` prop from Input (pre-noted in the plan itself: "If Input component does not accept a loading prop, remove it").

## Issues Encountered

None. TypeScript check produced zero errors for all onboarding files.

## Known Stubs

- `expo-app/assets/avatars/avatar-0{1..8}.png`: Placeholder 1x1 pixel PNGs. Intentional — real B&W lineart illustrations (160x160px, transparent background) must replace these before release. The file paths and Metro require map are correct; only the image content is placeholder.

## Threat Model Verification

| Threat ID | Mitigation | Status |
|-----------|------------|--------|
| T-02-02-01 | Client regex `/^[a-zA-Z0-9_]+$/` + min 3 chars before DB write | Implemented in handleUsernameChange |
| T-02-02-02 | profiles SELECT — intentional information disclosure accepted | Accepted per plan |
| T-02-02-03 | avatar_url only stores preset:01..08 keys via UI | Implemented — only AVATAR_KEYS values can be selected |
| T-02-02-04 | Onboarding gate bypass accepted — RLS enforces access | Accepted per plan |

## Next Phase Readiness

- (onboarding)/ route group exists — Plan 02-01's `as any` type assertions in _layout.tsx will resolve properly after merge (expo-router generates typed routes from file system)
- Plan 02-03 (clubs/create and clubs/join) can be implemented — avatar.tsx already navigates to `/(app)/clubs/create` and `/(app)/clubs/join`
- Profile screen (Plan 02-04) can reuse AvatarPicker component for the avatar change flow

---
*Phase: 02-clubs-onboarding*
*Completed: 2026-05-25*
