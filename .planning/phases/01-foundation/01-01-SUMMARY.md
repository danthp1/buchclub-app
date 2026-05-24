---
phase: 01-foundation
plan: "01"
subsystem: infra
tags: [expo, tamagui, supabase, react-native, typescript, i18n, zustand, tanstack-query]

# Dependency graph
requires: []
provides:
  - Expo SDK 56 universal app at expo-app/ (iOS, Android, Web)
  - Tamagui 2.0 provider tree with UI-SPEC design tokens (light/dark themes, Inter fonts)
  - Supabase client with expo-sqlite localStorage polyfill and detectSessionInUrl: false
  - Full v1 Supabase schema (8 tables + RPC + RLS) covering all 5 phases
  - Smoke screen proving Tamagui token rendering and Supabase round-trip
  - Deep link scheme buchclub:// declared in app.json
affects: [01-02-i18n, 01-03-auth, phase-2, phase-3, phase-4, phase-5]

# Tech tracking
tech-stack:
  added:
    - expo@~56.0.4
    - expo-router@~56.2.6
    - tamagui@^2.0.0
    - "@tamagui/config@^2.0.0 (v5 import path)"
    - "@tamagui/animations-css@^2.0.0"
    - "@tamagui/animations-react-native@^2.0.0"
    - "@tamagui/font-inter@^2.0.0"
    - "@tamagui/metro-plugin@^2.0.0"
    - "@tamagui/babel-plugin@^2.0.0"
    - "@tamagui/use-did-finish-ssr@^2.0.0"
    - "@supabase/supabase-js@^2.106.1"
    - expo-sqlite@~56.0.4 (localStorage polyfill for Supabase auth sessions)
    - react-native-url-polyfill@^3.0.0
    - i18next@^26.2.0
    - react-i18next@^17.0.8
    - expo-localization@~56.0.6
    - zustand@^5.0.13
    - "@tanstack/react-query@^5.100.14"
  patterns:
    - Platform file extension split (_layout.tsx vs _layout.web.tsx) for CSS import gating
    - expo-sqlite/localStorage/install polyfill must be first import in lib/supabase.ts
    - createAnimations() API for Tamagui 2.0 (not the legacy animations export)
    - tamagui.config.ts uses @tamagui/config/v5 (NOT v4 or bare import)
    - onlyAllowShorthands: false in settings for React Native long-form style props
    - SECURITY DEFINER RPC as sole write path to votes table (T-01-04 mitigation)

key-files:
  created:
    - expo-app/package.json
    - expo-app/app.json
    - expo-app/babel.config.js
    - expo-app/metro.config.js
    - expo-app/tsconfig.json
    - expo-app/tamagui.config.ts
    - expo-app/tamagui.build.ts
    - expo-app/.env.example
    - expo-app/.gitignore
    - expo-app/expo-env.d.ts
    - expo-app/lib/supabase.ts
    - expo-app/app/_layout.tsx
    - expo-app/app/_layout.web.tsx
    - expo-app/app/index.tsx
    - supabase/config.toml
    - supabase/migrations/0001_v1_full_schema.sql
  modified:
    - .gitignore (added !.env.example exception)
    - expo-app/tamagui.config.ts (fixed createAnimations API, settings override)

key-decisions:
  - "expo-app/app/ used as expo-router root (src/app/ template default removed) per plan file path spec"
  - "tamagui.config.ts settings.onlyAllowShorthands: false to allow React Native long-form props (backgroundColor etc.)"
  - "createAnimations() API used for Tamagui 2.0 animations (plan examples used legacy animations export which no longer exists)"
  - "expo-env.d.ts committed (removed from .gitignore) since it contains custom CSS type declarations"
  - "AUTH-04 (OAuth) deferred to v2 per SKELETON.md — no expo-auth-session installed"

patterns-established:
  - "Pattern: Platform-conditional CSS import via _layout.web.tsx file extension"
  - "Pattern: expo-sqlite/localStorage/install import ordering in supabase.ts (must precede createClient)"
  - "Pattern: Tamagui 2.0 createAnimations() with spring presets (fast/medium/slow) per UI-SPEC"

requirements-completed: []

# Metrics
duration: 11min
completed: "2026-05-24"
---

# Phase 01 Plan 01: Walking Skeleton Summary

**Expo SDK 56 app scaffolded at expo-app/ with Tamagui 2.0 + Supabase client + full v1 DB schema (8 tables, RLS, increment_book_vote RPC); Supabase project created and env wired; schema push pending supabase CLI auth**

## Performance

- **Duration:** 11 min
- **Started:** 2026-05-24T14:02:54Z
- **Completed:** 2026-05-24T14:14:53Z
- **Tasks:** 4 of 5 (Task 5 is a blocking human-action checkpoint requiring supabase CLI auth)
- **Files modified:** 16

## Accomplishments

- Scaffolded expo-app/ from Expo SDK 56 template with full dependency stack (Tamagui 2.0, Supabase, i18n, Zustand, TanStack Query)
- Created tamagui.config.ts with all UI-SPEC design tokens (warm literary palette, Inter fonts, spring animation presets, media breakpoints)
- Wired Supabase client with expo-sqlite localStorage polyfill and platform-appropriate settings
- Created smoke screen at app/index.tsx proving Tamagui token rendering and Supabase round-trip
- Authored complete v1 schema migration covering all 5 phases (8 tables, 25+ RLS policies, increment_book_vote SECURITY DEFINER RPC)

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold expo-app/ with Expo SDK 56 template + full stack** - `a981b9a` (feat)
2. **Task 2: Supabase client + smoke screen + root layout** - `a11d47f` (feat)
3. **Task 3: Full v1 Supabase schema migration** - `56dbfc7` (feat)
4. **Task 4: Supabase project created + expo-app/.env populated** - human-action checkpoint (verified: env vars set, buchclub://** added to redirect allowlist)

## Files Created/Modified

- `expo-app/package.json` - Independent Expo SDK 56 manifest with full pinned stack
- `expo-app/app.json` - Expo config with `"scheme": "buchclub"` deep link scheme
- `expo-app/babel.config.js` - @tamagui/babel-plugin for compile-time style extraction
- `expo-app/metro.config.js` - withTamagui() Metro integration
- `expo-app/tsconfig.json` - strict TypeScript extending expo/tsconfig.base
- `expo-app/tamagui.config.ts` - Design tokens, themes, Inter fonts, animation presets
- `expo-app/tamagui.build.ts` - outputCSS and disableExtraction config for Metro/Babel plugins
- `expo-app/.env.example` - Supabase env var template
- `expo-app/.gitignore` - Excludes .env and tamagui.generated.css
- `expo-app/expo-env.d.ts` - Type declarations for tamagui.generated.css CSS import
- `expo-app/lib/supabase.ts` - Supabase client with localStorage polyfill + detectSessionInUrl: false
- `expo-app/app/_layout.tsx` - Native root layout with TamaguiProvider + SplashScreen + fonts
- `expo-app/app/_layout.web.tsx` - Web variant adds tamagui.generated.css as first import
- `expo-app/app/index.tsx` - Smoke screen querying Supabase + rendering Tamagui tokens
- `supabase/config.toml` - Supabase CLI configuration
- `supabase/migrations/0001_v1_full_schema.sql` - Full v1 schema for all 5 phases

## Decisions Made

- Used `expo-app/app/` directory structure (not `src/app/`) per plan file path spec; removed template's `src/app/` so expo-router falls back to `app/`
- `tamagui.config.ts` sets `onlyAllowShorthands: false` because plan examples use long-form React Native props (`backgroundColor`, `alignItems`) which Tamagui v5 restricts by default with `onlyAllowShorthands: true`
- Used `createAnimations()` API from `@tamagui/animations-css` and `@tamagui/animations-react-native` (Tamagui 2.0 changed from `animations` named export to `createAnimations()` function)
- Committed `expo-env.d.ts` (removed from .gitignore since it contains project-specific CSS type declarations, not auto-generated runtime types)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Tamagui 2.0 animation API changed from named export to createAnimations()**
- **Found during:** Task 2 (TypeScript check after creating tamagui.config.ts)
- **Issue:** Plan's code example uses `import { animations as animationsCSS } from '@tamagui/animations-css'` but the package no longer exports a named `animations` object — it exports `createAnimations()` function
- **Fix:** Changed imports to `import { createAnimations as createCSSAnimations } from '@tamagui/animations-css'` and used `createAnimations({ fast: '120ms ease-in', ... })` pattern
- **Files modified:** expo-app/tamagui.config.ts
- **Verification:** TypeScript no longer reports "Module has no exported member 'animations'"
- **Committed in:** a11d47f (Task 2 commit)

**2. [Rule 1 - Bug] Tamagui v5 config onlyAllowShorthands: true incompatible with plan's JSX**
- **Found during:** Task 2 (TypeScript check after creating app/index.tsx)
- **Issue:** `defaultConfig.settings.onlyAllowShorthands: true` in @tamagui/config/v5 causes TypeScript to reject `backgroundColor` and `alignItems` props on YStack — plan's own code examples use these long-form props
- **Fix:** Added `settings: { ...defaultConfig.settings, onlyAllowShorthands: false, allowedStyleValues: 'somewhat-strict', styleCompat: 'react-native' }` to tamagui.config.ts
- **Files modified:** expo-app/tamagui.config.ts
- **Verification:** TypeScript passes with no errors in app/index.tsx
- **Committed in:** a11d47f (Task 2 commit)

**3. [Rule 3 - Blocking] expo-env.d.ts blocked by .gitignore**
- **Found during:** Task 2 (git add attempt for expo-env.d.ts)
- **Issue:** expo-app/.gitignore excluded `expo-env.d.ts` which is normally auto-generated, but we added custom CSS type declarations to it
- **Fix:** Removed `expo-env.d.ts` from expo-app/.gitignore so it can be committed
- **Files modified:** expo-app/.gitignore
- **Verification:** `git add expo-app/expo-env.d.ts` succeeds
- **Committed in:** a11d47f (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (2 Rule 1 bugs, 1 Rule 3 blocking)
**Impact on plan:** All auto-fixes required for TypeScript correctness. No scope creep. Tamagui 2.0 API changes not reflected in plan examples.

## Issues Encountered

- Expo SDK 56 template default uses `src/app/` directory for expo-router; plan specifies `expo-app/app/` paths. Resolved by removing the `src/app/` template content — expo-router auto-detects `app/` when `src/app/` is absent (confirmed via metro-config source code)
- `expo-env.d.ts` had to be customized to declare `tamagui.generated.css` module type since CSS imports are TypeScript errors without a declaration

## User Setup Required

**External services require manual configuration:**

**Task 4 (COMPLETE):** Supabase project created, expo-app/.env populated with real values:
- `EXPO_PUBLIC_SUPABASE_URL=https://mlrpdcfjumvmgjjcrvyz.supabase.co`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` set (sb_publishable_... format)
- `buchclub://**` added to Auth → URL Configuration → Redirect URLs
- lib/supabase.ts already used correct variable name `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — no fix needed

**Task 5 (BLOCKING):** Push schema migration:
```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```
Then verify smoke screen at `cd expo-app && npx expo start --web` shows `✓ Supabase reachable`.

## Next Phase Readiness

**Ready:**
- Expo app scaffolded and TypeScript-clean
- Tamagui tokens and provider tree wired
- Supabase client configured (needs env vars)
- Full v1 schema migration authored
- Deep link scheme declared

**Blocking:**
- Task 4: User must create Supabase project and populate expo-app/.env
- Task 5: User must run supabase db push after Task 4 completes

**After Tasks 4+5:** Phase 1 Plan 02 (i18n vertical) and Plan 03 (auth vertical) can proceed.

## Known Stubs

None — smoke screen will show a Supabase connection error until Task 4+5 are completed (env vars not yet set). This is expected behavior documented in the checkpoint.

---
*Phase: 01-foundation*
*Completed: 2026-05-24*
