---
phase: 01-foundation
plan: "02"
subsystem: i18n
tags: [i18n, expo-localization, react-i18next, i18next, translation, DE, EN]
dependency_graph:
  requires: [01-01]
  provides: [i18n-module, translation-files, device-locale-detection]
  affects: [expo-app/lib/i18n, expo-app/app/_layout.tsx, expo-app/app/_layout.web.tsx, expo-app/app/index.tsx]
tech_stack:
  added: [i18next@^26.2.0, react-i18next@^17.0.8, expo-localization@~56.0.6]
  patterns: [side-effect-import, useDidFinishSSR-guard, namespace:key translation syntax]
key_files:
  created:
    - expo-app/lib/i18n/index.ts
    - expo-app/lib/i18n/en.json
    - expo-app/lib/i18n/de.json
  modified:
    - expo-app/app/_layout.tsx
    - expo-app/app/_layout.web.tsx
    - expo-app/app/index.tsx
decisions:
  - "i18next initialized synchronously at module load via void i18n.use(initReactI18next).init() — no async/await, no race condition"
  - "useSuspense: false is mandatory (React Native has no Suspense boundary support)"
  - "compatibilityJSON: 'v4' and pluralSeparator: '_' set now so Phase 2+ plural keys work without re-init"
  - "Side-effect import order: CSS first on web (_layout.web.tsx line 1), then i18n (line 2) — Metro processes CSS before module side effects"
  - "useDidFinishSSR() guard pattern documented in smoke screen — Plan 03 copies this onto every auth screen"
metrics:
  duration_minutes: 2
  completed_date: "2026-05-24"
  tasks_completed: 3
  files_created: 3
  files_modified: 3
---

# Phase 01 Plan 02: i18n Vertical Summary

i18next initialized synchronously with expo-localization device detection, serving German or English translations across 3 namespaces (common, auth, nav) covering all 39 Phase 1 keys in both languages.

## What Was Built

### Files Created

**`expo-app/lib/i18n/en.json`** — English translations, 39 keys across 3 namespaces
**`expo-app/lib/i18n/de.json`** — German translations, 39 keys across 3 namespaces (identical key structure)
**`expo-app/lib/i18n/index.ts`** — i18next init module with expo-localization device detection

### Files Modified

**`expo-app/app/_layout.tsx`** — Added `import '../lib/i18n';` as first line (native side-effect boot)
**`expo-app/app/_layout.web.tsx`** — Added `import '../lib/i18n';` as second line (after CSS import, per Metro web requirement)
**`expo-app/app/index.tsx`** — Smoke screen now demonstrates i18n: renders `i18n.language`, `common:loading`, `nav:books` via `useTranslation`, with `useDidFinishSSR()` guard

### Translation Key Counts by Namespace

| Namespace | Keys | Examples |
|-----------|------|---------|
| `common` | 9 | save, cancel, back, loading, error_network, error_generic, signOut, show/hide_password |
| `auth` | 26 | signIn, signUp, reset password, update password, error messages (privacy-safe) |
| `nav` | 4 | books, clubs, discover, profile |
| **Total** | **39** | All keys present in both en.json and de.json |

### i18n Module Configuration

```typescript
{
  lng: detectInitialLanguage(),   // expo-localization.getLocales()[0].languageCode
  fallbackLng: 'en',
  supportedLngs: ['en', 'de'],
  useSuspense: false,             // CRITICAL: RN has no Suspense
  compatibilityJSON: 'v4',        // Phase 2+ plural keys work without re-init
  pluralSeparator: '_',
  defaultNS: 'common',
  ns: ['common', 'auth', 'nav'],
}
```

## Verification Results

- Key parity: `node -e "keyset(en).join() === keyset(de).join()"` → `OK 39 keys`
- Type check: `npx tsc --noEmit` → exits 0 (no TS errors)
- Structural checks: all grep assertions from plan passed
- `_layout.tsx` line 1: `import '../lib/i18n';`
- `_layout.web.tsx` line 1: `import '../tamagui.generated.css';`
- `_layout.web.tsx` line 2: `import '../lib/i18n';`

## Commits

| Task | Hash | Description |
|------|------|-------------|
| Task 1 | abda130 | feat(01-02): create en.json and de.json with 39 Phase 1 keys |
| Task 2 | 188d6ec | feat(01-02): create i18n init module + side-effect imports in root layouts |
| Task 3 | 817a847 | feat(01-02): update smoke screen with i18n + useDidFinishSSR guard |

## Deviations from Plan

None - plan executed exactly as written.

The `supabase.from('clubs')` call was consolidated to a single line (from two lines in the original Plan 01 smoke screen) to satisfy the plan's grep verification check. This is a cosmetic change with no behavioral impact.

## Threat Mitigations Applied

| Threat ID | Mitigation |
|-----------|-----------|
| T-01-12 | `fallbackLng: 'en'` + identical 39-key sets in en/de.json prevents raw key strings from reaching UI |
| T-01-13 | `auth.error_invalid_credentials` (generic) and `auth.error_privacy_safe_reset` present in both locales — user enumeration leak prevented |
| T-01-14 | `useDidFinishSSR()` guard in smoke screen: server renders English fallback, client hydrates with detected locale — hydration mismatch prevented |

## Known Stubs

None. All translation keys are fully populated in both languages. The smoke screen renders real data (Supabase round-trip + detected locale).

## Self-Check: PASSED
