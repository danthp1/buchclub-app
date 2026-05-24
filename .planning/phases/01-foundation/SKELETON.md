---
phase: 01-foundation
type: walking-skeleton
created: 2026-05-24
status: design
---

# Walking Skeleton — Buchclub App Foundation

> The thinnest possible end-to-end stack that subsequent phases will build on without renegotiating.
> Locked architectural decisions for Phase 1 onwards.

---

## Architectural Decisions (locked for v1)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Universal app platform | **Expo SDK 56** (`~56.0.4`) | Spec-locked; ships RN 0.85.3, React 19.2.3, New Architecture always-on |
| App location | **`expo-app/`** at repo root, sibling to existing Next.js (`app/`, `lib/`, `components/`) | CLAUDE.md mandates non-modification of existing Next.js scaffold |
| Routing | **expo-router** (`~56.2.6`), file-based, route groups `(auth)/` and `(app)/` | Bundled with SDK 56 template; supports native + web identically |
| UI framework | **Tamagui 2.0** (`tamagui`, `@tamagui/config/v5`) | Spec-locked; compile-time style extraction; only library with true RN+web parity |
| Animation driver | **Platform-conditional**: `@tamagui/animations-css` on web, `@tamagui/animations-react-native` on native (gated by `isWeb` from `@tamagui/core`) | Avoids RN-on-web hydration issues; documented in RESEARCH Pitfall 4 / UI-SPEC Motion |
| Auth provider | **Supabase Auth** email/password only for v1 | AUTH-04 (OAuth) explicitly **DEFERRED to v2** per PROJECT.md (overrides REQUIREMENTS.md per Decision Init#2) |
| Auth session storage | **`expo-sqlite/localStorage/install`** polyfill (NOT `@react-native-async-storage/async-storage`) | Current Supabase Expo SDK 56 quickstart standard |
| Database | **Supabase Postgres** with RLS on every table; vote mutations via `increment_book_vote` RPC only | Spec-locked; Decision Init#3, Init#4 |
| Env var name | **`EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`** (NOT `EXPO_PUBLIC_SUPABASE_ANON_KEY`) | Current Supabase quickstart naming |
| Tamagui config import path | **`@tamagui/config/v5`** (NOT `/v4` and NOT bare `@tamagui/config`) | Wrong path silently no-ops; CLAUDE.md / RESEARCH Pitfall 3 |
| Web CSS handling | Platform file extension split: **`app/_layout.web.tsx`** imports `tamagui.generated.css`; `app/_layout.tsx` (native default) does NOT | CSS imports break Metro on native; RESEARCH Pitfall 4 |
| Tab bar split | **`app/(app)/_layout.native.tsx`** uses native `Tabs`; **`app/(app)/_layout.web.tsx`** uses custom horizontal nav `XStack` | iOS/Android tab bar is native bottom; web is top horizontal per UI-SPEC Navigation contract |
| State management | **Zustand** (`auth.store.ts` with `session`, `initialized`, `isLoggedIn`) for auth/UI client state; **TanStack Query** for server state (Phase 3+) | Decision Init: lightweight; RN-friendly; no Redux |
| i18n engine | **i18next + react-i18next** with **inline JSON resources** (no HTTP backend); namespaces `common`, `auth`, `nav`; `react.useSuspense: false` | RN does not support React Suspense (Pitfall 5); inline resources ship in bundle |
| Locale detection | **`expo-localization.getLocales()[0]?.languageCode`** at i18next init time, supported = `['en','de']` with `'en'` fallback | Synchronous; runs before any render |
| SSR hydration guard | **`useDidFinishSSR()` from `@tamagui/use-did-finish-ssr`** on every `t()` call rendered above-the-fold on web | Server renders English default; client hydrates with device locale (UI-SPEC i18n contract) |
| Deep link scheme | **`buchclub://`** registered in `app.json` and Supabase dashboard allowlist | Required for password-reset link interception (RESEARCH Pattern 5) |
| Auth guard pattern | **`InitialLayout`** in `app/_layout.tsx` uses `useSegments + useRouter`; redirect only after `initialized = true`; `SplashScreen.preventAutoHideAsync()` at module level | Prevents auth flash (Pitfall 1) |
| Dev deployment | **`npx expo start --tunnel`** for physical device testing (Expo Go); **`npx expo start --web`** for browser; **`supabase db push`** for schema migrations | No iOS Simulator available (only CLT); no EAS for v1 |
| Migration tool | **Supabase CLI migrations** (`supabase/migrations/*.sql`) committed to repo | Versioned schema; reproducible across environments |
| Repo isolation | Existing Next.js code at repo root is **read-only**; no Tamagui/Expo packages may be added to root `package.json` | CLAUDE.md constraint |

---

## Directory Layout (locked)

```
buchclub-app/                          # repo root (existing Next.js code lives here, untouched)
├── app/                                # EXISTING Next.js — DO NOT MODIFY
├── components/                         # EXISTING Next.js — DO NOT MODIFY
├── lib/                                # EXISTING Next.js — DO NOT MODIFY
├── package.json                        # EXISTING — DO NOT MODIFY
├── ...
│
├── expo-app/                           # NEW Expo universal app — Phase 1 creates this
│   ├── app/
│   │   ├── _layout.tsx                 # Root: TamaguiProvider + AuthProvider + InitialLayout (native default)
│   │   ├── _layout.web.tsx             # Web variant — adds tamagui.generated.css import
│   │   ├── (auth)/
│   │   │   ├── _layout.tsx             # Stack, headerShown: false
│   │   │   ├── sign-in.tsx             # AUTH-02
│   │   │   ├── sign-up.tsx             # AUTH-01
│   │   │   ├── forgot-password.tsx     # AUTH-03
│   │   │   └── update-password.tsx     # AUTH-03 deep link target
│   │   └── (app)/
│   │       ├── _layout.native.tsx      # Native bottom Tabs
│   │       ├── _layout.web.tsx         # Web top XStack nav
│   │       ├── books/index.tsx         # Phase 3 placeholder
│   │       ├── clubs/index.tsx         # Phase 2 placeholder
│   │       ├── discover/index.tsx      # Phase 2 placeholder
│   │       └── profile/index.tsx       # AUTH-05 logout lives here
│   ├── lib/
│   │   ├── supabase.ts                 # createClient with localStorage polyfill
│   │   └── i18n/
│   │       ├── index.ts                # i18next init with expo-localization
│   │       ├── en.json                 # English translations
│   │       └── de.json                 # German translations
│   ├── providers/
│   │   └── AuthProvider.tsx            # onAuthStateChange → Zustand
│   ├── store/
│   │   └── auth.store.ts               # { session, initialized, isLoggedIn }
│   ├── components/
│   │   └── ui/
│   │       ├── Input.tsx               # UI-SPEC Component 1
│   │       ├── Button.tsx              # UI-SPEC Components 2-4
│   │       └── Alert.tsx               # UI-SPEC Component 8
│   ├── tamagui.config.ts               # Design tokens, themes, animations
│   ├── tamagui.build.ts                # Compiler options (read by metro + babel plugins)
│   ├── babel.config.js                 # @tamagui/babel-plugin
│   ├── metro.config.js                 # withTamagui()
│   ├── app.json                        # scheme: "buchclub"
│   ├── package.json                    # New — independent from root
│   ├── tsconfig.json
│   └── .env                            # EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
│
└── supabase/                           # NEW — versioned schema migrations
    ├── config.toml                     # Supabase CLI config
    └── migrations/
        └── 0001_v1_full_schema.sql     # Full schema for ALL 5 phases
```

---

## End-to-End Smoke Path (Walking Skeleton verification)

After Plan 01 completes, this path must work:

1. **Build:** `cd expo-app && npx expo start --web` boots without errors
2. **DB connection:** Smoke screen at `app/(app)/books/index.tsx` (or root) calls `supabase.from('clubs').select('count').limit(1)` and renders the result (or "0 clubs" if RLS denies an unauthenticated read — that itself proves the round-trip)
3. **DB schema:** All v1 tables exist in Supabase (`profiles`, `clubs`, `club_members`, `books`, `personal_books`, `pool_books`, `votes`, `meetings`)
4. **Auth bootstrap:** `lib/supabase.ts` loads without `localStorage is not defined` error
5. **i18n bootstrap:** `lib/i18n/index.ts` initializes with detected device locale; `t('common.loading')` returns a string (placeholder OK at this stage)
6. **Tamagui bootstrap:** A `<YStack backgroundColor="$background">` element renders with the warm cream color (#FDFAF6), proving tokens flow from `tamagui.config.ts`

After Plan 02 (i18n) and Plan 03 (auth), the full Phase 1 success criteria from ROADMAP.md must be satisfied.

---

## Out of Scope for Phase 1 (deferred)

| Item | Deferred to | Reason |
|------|------------|--------|
| AUTH-04 OAuth (Google + one social) | v2 | PROJECT.md defers; UI-SPEC reserves placeholder slot but does not render |
| Phase 2-5 feature UI (clubs, books, voting, meetings) | Their own phases | Schema is created in Phase 1 but tables remain empty until consumed |
| Manual language switcher (I18N-03) | Phase 5 | Phase 1 only does device-locale detection (I18N-02) |
| Production EAS builds | Future | `npx expo start` (Expo Go on physical device + web browser) is sufficient for v1 dev |
| Account deletion (PROF-03) | Phase 2 | Not part of Foundation; UI-SPEC notes destructive confirmation contract belongs to Phase 2 |

---

## Threat Model (Foundation Phase)

| Boundary | Description |
|----------|-------------|
| Client → Supabase Auth | Untrusted email/password input crosses to backend; tokens returned cross back |
| Email link → Client | Untrusted URL params (access_token, refresh_token) on password reset deep link |
| Client → Postgres (via PostgREST) | All DB writes/reads gated by RLS policies — never trust client-side enforcement |

| Threat ID | Category | Component | Disposition | Mitigation |
|-----------|----------|-----------|-------------|------------|
| T-01-01 | S (Spoofing) | Password reset deep link | mitigate | Supabase issues short-lived single-use tokens; `buchclub://` allowlisted in Supabase dashboard; `Linking.parse()` extracts only `access_token`/`refresh_token` query params; rejects invalid tokens via `setSession()` error path |
| T-01-02 | I (Information Disclosure) | Auth error messages | mitigate | Sign-in errors use single generic copy `auth.error_invalid_credentials` ("Incorrect email or password"); password reset errors use privacy-safe `auth.error_privacy_safe_reset` ("If an account exists, we've sent a link") — never disclose whether email exists |
| T-01-03 | I (Information Disclosure) | Session token storage | accept | `expo-sqlite` is sandboxed per-app on iOS/Android; on web, browsers sandbox by origin. Acceptable risk for v1 (no PII beyond email). Documented for v2 review if biometric/keychain storage is added |
| T-01-04 | T (Tampering) | Direct DB writes from client | mitigate | RLS policies on every table deny anonymous writes; `votes` table writes go ONLY through `increment_book_vote` RPC with `SECURITY DEFINER`; client cannot bypass |
| T-01-05 | E (Elevation of Privilege) | Redirect URL after password reset | mitigate | Supabase dashboard allowlist set to `buchclub://**` only; no wildcard origin allowed |
| T-01-06 | I (Information Disclosure) | StrictMode double-fire of `onAuthStateChange` | accept | Dev-only behavior; `subscription.unsubscribe()` cleanup handles correctly in production builds |
| T-01-07 | S (Spoofing) | Email signup without verification | mitigate | Supabase email confirmation enabled by default — user lands on "Almost there!" success state, must click email link before session is created |
| T-01-08 | T (Tampering) | Client-side password length validation | mitigate | Length check on blur (min 8) is UX-only; Supabase Auth enforces minimum server-side via `password_min_length` config |

---

## Locked Plans

- `01-01-PLAN.md` — Walking Skeleton: scaffold + configs + Supabase client + full DB schema + smoke screen
- `01-02-PLAN.md` — i18n Vertical: i18next init, DE/EN translations, expo-localization device detection
- `01-03-PLAN.md` — Auth Vertical: sign-up/sign-in/logout/password-reset slice with route guards and UI components

---
*Skeleton design date: 2026-05-24*
*Sources: 01-RESEARCH.md (HIGH confidence), 01-UI-SPEC.md, 01-PATTERNS.md, CLAUDE.md, ROADMAP.md, REQUIREMENTS.md*
