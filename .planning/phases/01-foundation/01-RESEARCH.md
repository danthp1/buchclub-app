# Phase 01: Foundation - Research

**Researched:** 2026-05-24
**Domain:** Expo SDK 56 + Tamagui 2.0 + Supabase Auth + i18next — universal app scaffold with authentication and internationalization
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-01 | User can register with email and password | Supabase `signUp()` API; Expo Router `(auth)/sign-up.tsx` screen; email confirmation flow documented |
| AUTH-02 | Session persists across app restarts (cold-start) | `expo-sqlite/localStorage/install` polyfill + `persistSession: true`; Zustand `auth.store` hydrated from Supabase `onAuthStateChange` |
| AUTH-03 | User can reset password via email link | `resetPasswordForEmail()` + deep link scheme in `app.json` + `Linking.useURL()` handler in root layout |
| AUTH-04 | OAuth login (Google + one other) — **CONFLICT: deferred in PROJECT.md, v1 in REQUIREMENTS.md** | UI-SPEC reserves placeholder component; researcher recommendation: **defer to v2** (see AUTH-04 Conflict section) |
| AUTH-05 | User can log out from any screen | `supabase.auth.signOut()` → clear Zustand `auth.store` → redirect to `(auth)/sign-in` |
| I18N-01 | All UI text in German and English | i18next with inline resources; `auth`, `common`, `nav` namespaces; all keys defined in UI-SPEC |
| I18N-02 | App detects device language on first launch automatically | `expo-localization` `getLocales()[0].languageCode` → i18next `lng` init option; synchronous, no async needed |
</phase_requirements>

---

## Summary

Phase 1 builds a walking skeleton: a bootstrapped Expo SDK 56 app (`expo-app/`) with Tamagui 2.0 as the UI layer, Supabase Auth for email/password authentication with persistent sessions, and i18next for German/English UI driven by device locale. Every downstream phase (clubs, books, voting, meetings) builds on this foundation without retrofitting auth, i18n, or the provider tree.

The tech stack is fixed by CLAUDE.md with no deviations allowed. All packages have been verified against the npm registry as of 2026-05-24. The Expo app must be scaffolded at `expo-app/` as a sibling to the existing Next.js app in `my-app/` — that Next.js app must never be touched.

The single open issue entering this phase is AUTH-04 (OAuth): REQUIREMENTS.md marks it as v1 but PROJECT.md explicitly defers it. The UI-SPEC already reserves a placeholder component with a conditional `if AUTH-04 is deferred: do not render`. Researcher recommendation is to defer OAuth and proceed with email-only auth, leaving the placeholder slot in the UI without wiring it up.

**Primary recommendation:** Scaffold `expo-app/` with `npx create-expo-app`, install the fixed stack, set up TamaguiProvider + AuthProvider + I18nProvider in the root layout, implement the three auth screens per the UI-SPEC contract, and end with a working four-tab shell guarded by the auth state.

---

## AUTH-04 Conflict Resolution

**Conflict:** REQUIREMENTS.md lists AUTH-04 (OAuth: Google + one social provider) as a v1 requirement. PROJECT.md explicitly defers OAuth to v2. STATE.md flags this as a blocker requiring user decision before Phase 1 planning.

**UI-SPEC position:** The UI-SPEC already anticipates the conflict — it defines a conditional OAuth button placeholder:
> "If AUTH-04 is deferred: do not render this button. Show email/password form only."

**Researcher recommendation: Defer OAuth to v2.** Rationale:
1. OAuth in Expo requires `expo-auth-session`, `expo-web-browser`, and non-trivial deep-link configuration — significant extra scope for Phase 1.
2. The walking-skeleton success criteria (registration, login, logout, password reset, i18n) are fully satisfiable without OAuth.
3. The UI-SPEC already handles the layout gracefully without the OAuth button.
4. PROJECT.md's explicit deferral was written with full knowledge of REQUIREMENTS.md.

**Action for planner:** Include an explicit Wave 0 decision record: "AUTH-04 deferred to v2 per PROJECT.md. OAuth placeholder reserved in UI but not wired up." This prevents any future phase from being surprised.

---

## Project Constraints (from CLAUDE.md)

| Constraint | Directive |
|------------|-----------|
| Tech stack | Expo + Tamagui + Supabase — **no deviations** |
| Book APIs | Google Books API and Open Library Covers must remain completely free (no paid tiers) |
| Database | Supabase Postgres with RLS policies on ALL tables; votes via RPC only |
| i18n | German and English from day one; architecture must support adding languages |
| Repo isolation | Expo app lives at `expo-app/`; Next.js at `my-app/`; no changes to `my-app/` |
| Vote mutations | All via `increment_book_vote` Postgres RPC — no direct INSERT/UPDATE from client |
| Google Books | Must route through Supabase Edge Function proxy (CORS) — implement in Phase 3, not here |
| Token import path | `@tamagui/config/v5` — NOT `/v4` or plain `@tamagui/config` |
| Animation driver | Platform-conditional: CSS on web, Reanimated (or RN animations) on native |
| `useDidFinishSSR` | Required on all i18n `t()` calls rendered above-the-fold on web to prevent hydration mismatch |

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Email/password auth | API / Backend (Supabase Auth) | Frontend (form + validation) | Auth state lives in Supabase; client only calls `signUp/signIn/signOut` |
| Session persistence | Native storage (expo-sqlite localStorage) | Supabase JS client | `persistSession: true` + localStorage polyfill handles token refresh automatically |
| Auth guard / routing | Frontend Server (Expo Router root layout) | — | `InitialLayout` uses `useSegments` + `useRouter` to redirect based on auth state |
| i18n locale detection | Client (device OS) | Frontend (i18next init) | `expo-localization.getLocales()` is synchronous; used at i18next init time |
| Translation rendering | Browser / Client | Frontend Server (SSR default EN) | On web: `useDidFinishSSR` guard; on native: direct `t()` calls |
| App shell navigation | Frontend (Expo Router file-based routing) | — | `(auth)/` and `(app)/` route groups; tab bar in `(app)/_layout.tsx` |
| Tamagui theming | Browser / Client (compile-time + runtime) | — | `TamaguiProvider` at root; tokens compiled at build time |
| Password reset deep link | API (Supabase Auth email) + Client (Expo Linking) | — | Email sends deep link → `Linking.useURL()` intercepts → `supabase.auth.setSession()` |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| expo | `~56.0.4` | Universal app platform | Latest stable; ships RN 0.85.3, React 19.2.3, New Architecture always-on [VERIFIED: npm registry] |
| react-native | `0.85.3` | Pinned by Expo SDK 56 | Do not install independently — `npx create-expo-app` pins automatically [VERIFIED: npm registry] |
| react | `19.2.3` | Pinned by Expo SDK 56 | Required by Tamagui 2.0 (`react >= 19` peer dep) [VERIFIED: npm registry] |
| expo-router | `~56.2.6` | File-based routing native + web | Ships with SDK 56 template; `(auth)/` and `(app)/` route groups [VERIFIED: npm registry] |
| tamagui | `^2.0.0` | UI components + styling engine | Compile-time optimization; only lib with true RN + web parity [VERIFIED: npm registry] |
| @tamagui/config | `^2.0.0` | Design tokens and theme presets | `@tamagui/config/v5` import path — provides `defaultConfig` [VERIFIED: npm registry] |
| @supabase/supabase-js | `^2.106.1` | Auth, database, realtime | Single client covering all three pillars [VERIFIED: npm registry] |
| expo-sqlite | `~56.0.4` | localStorage polyfill for Supabase sessions | Official Supabase Expo quickstart recommendation for SDK 56 [VERIFIED: Context7 /supabase/supabase] |
| react-native-url-polyfill | `^3.0.0` | URL global polyfill for Supabase JS | Supabase JS uses `URL` constructor; RN does not have it globally [VERIFIED: Context7 /supabase/supabase] |
| i18next | `^26.2.0` | Core i18n engine | Industry standard; namespaced translations, pluralization, interpolation [VERIFIED: npm registry] |
| react-i18next | `^17.0.8` | React hooks for i18next | `useTranslation()` hook; works on RN and web without platform-specific imports [VERIFIED: npm registry] |
| expo-localization | `~56.0.6` | Device locale detection | `getLocales()[0].languageCode` synchronous; official Expo module [VERIFIED: Context7 /expo/expo] |
| zustand | `^5.0.13` | Auth state (client-side) | `auth.store` holds `session`, `initialized`, `isLoggedIn`; lightweight [VERIFIED: npm registry] |
| typescript | `^5.x` | Type safety | Required by Tamagui 2.0 as hard requirement [VERIFIED: npm registry] |

### Supporting (SDK 56 template — auto-installed)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-native-screens | `4.25.2` | Native screen containers | Required peer dep of expo-router [VERIFIED: npm registry] |
| react-native-safe-area-context | `~5.7.0` | Safe area insets | Required by expo-router; SDK 56 template pins [VERIFIED: npm registry] |
| react-native-gesture-handler | `~2.31.1` | Gesture support | Required by Tamagui `@tamagui/native`; pinned by SDK 56 template [VERIFIED: npm registry] |
| react-native-reanimated | `4.3.1` | Animations | Pinned by SDK 56 template; used by `@tamagui/animations-react-native` [VERIFIED: npm registry] |
| expo-splash-screen | `~56.0.10` | Splash screen management | `preventAutoHideAsync()` during font loading; prevents auth flash [VERIFIED: npm registry] |
| expo-font | `~56.0.5` | Font loading | Load Inter font files for Tamagui on native [VERIFIED: npm registry] |
| expo-constants | `~56.0.15` | App config access | Required by expo-router [VERIFIED: npm registry] |
| expo-linking | `~56.0.11` | Deep link URL handling | Password reset link interception via `Linking.useURL()` [VERIFIED: npm registry] |
| expo-status-bar | `~56.0.4` | Status bar control | Required by expo-router template [VERIFIED: npm registry] |

### Tamagui Supporting Packages

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @tamagui/babel-plugin | `^2.0.0` | Compile-time style extraction (native) | Add to `babel.config.js`; reads from `tamagui.build.ts` [VERIFIED: npm registry] |
| @tamagui/metro-plugin | `^2.0.0` | Metro bundler integration + web CSS | Wraps `getDefaultConfig`; reads from `tamagui.build.ts` [VERIFIED: Context7 /tamagui/tamagui] |
| @tamagui/animations-css | `^2.0.0` | CSS animations on web | Used with `isWeb` conditional in `tamagui.config.ts` [VERIFIED: npm registry] |
| @tamagui/animations-react-native | `^2.0.0` | Spring animations on native | Used on iOS/Android; `fast`, `medium`, `slow` presets [VERIFIED: npm registry] |
| @tamagui/font-inter | `^2.0.0` | Inter font | Load via `useFonts` hook on native [VERIFIED: npm registry] |
| @tamagui/use-did-finish-ssr | `^2.0.0` | SSR hydration guard | Required for all `t()` calls rendered above-the-fold on web [VERIFIED: Context7 /tamagui/tamagui] |

### Auth Deep Link Supporting Packages

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| expo-web-browser | `~56.0.5` | In-app browser session handling | Required for password-reset deep link on web; `maybeCompleteAuthSession()` [VERIFIED: npm registry] |

**Installation (after scaffold):**

```bash
# From expo-app/ directory
npx expo install expo-sqlite expo-localization expo-web-browser
npm install @supabase/supabase-js react-native-url-polyfill
npm install i18next react-i18next
npm install zustand
npm install tamagui @tamagui/config @tamagui/babel-plugin @tamagui/metro-plugin
npm install @tamagui/animations-css @tamagui/animations-react-native
npm install @tamagui/font-inter @tamagui/use-did-finish-ssr
```

**Version verification:** All versions verified against npm registry on 2026-05-24.

---

## Architecture Patterns

### System Architecture Diagram

```
Device (iOS / Android / Web Browser)
           |
           v
   expo-app/ (Expo SDK 56)
   ┌─────────────────────────────────────────────────────────────┐
   │ app/_layout.tsx  [Root Layout]                              │
   │   TamaguiProvider (tamagui.config.ts)                       │
   │   → AuthProvider (providers/AuthProvider.tsx)               │
   │     supabase.auth.onAuthStateChange → Zustand auth.store    │
   │     → I18nProvider (lib/i18n/index.ts)                      │
   │       expo-localization.getLocales()[0].languageCode        │
   │       → InitialLayout                                       │
   │         useSegments + useRouter → redirect guard            │
   │         SplashScreen held until auth.store.initialized=true │
   └─────────────────────────────────────────────────────────────┘
           |
      ┌────┴────┐
      |         |
      v         v
  (auth)/     (app)/
  group        group
  ┌───────┐   ┌──────────────────────────────────┐
  │sign-in│   │_layout.tsx (tab navigator)        │
  │sign-up│   │  Tab: Books | Clubs | Discover    │
  │forgot-│   │            | Profile              │
  │passwd │   │(tabs are scaffolded, empty in P1) │
  └───────┘   └──────────────────────────────────┘
      |
      v
  lib/supabase.ts
  ┌─────────────────────────────────────────────────┐
  │ import 'react-native-url-polyfill/auto'          │
  │ import 'expo-sqlite/localStorage/install'        │
  │ createClient(url, key, {                         │
  │   auth: { storage: localStorage,                 │
  │           persistSession: true,                  │
  │           detectSessionInUrl: false }            │
  │ })                                               │
  └─────────────────────────────────────────────────┘
      |
      v
  Supabase (cloud)
  ┌─────────────────────┐
  │ Auth (email/password)│
  │ Postgres (RLS)       │
  │ Storage (future)     │
  └─────────────────────┘
```

**Password Reset Deep Link Flow:**

```
User taps "Send Link" → supabase.auth.resetPasswordForEmail()
    → Supabase sends email with link: buchclub://reset-password?...
    → User taps link → OS opens app with URL
    → Linking.useURL() in root layout intercepts
    → supabase.auth.setSession({ access_token, refresh_token })
    → router.replace('/(auth)/update-password')
    → User enters new password → supabase.auth.updateUser({ password })
```

### Recommended Project Structure

```
expo-app/
├── app/
│   ├── _layout.tsx              # Root: TamaguiProvider + AuthProvider + I18nProvider
│   ├── (auth)/
│   │   ├── _layout.tsx          # Stack layout, headerShown: false
│   │   ├── sign-in.tsx          # AUTH-01, AUTH-02
│   │   ├── sign-up.tsx          # AUTH-01
│   │   ├── forgot-password.tsx  # AUTH-03
│   │   └── update-password.tsx  # AUTH-03 (deep link target)
│   └── (app)/
│       ├── _layout.tsx          # Tab navigator (native + web variants)
│       ├── books/
│       │   └── index.tsx        # Placeholder (Phase 3)
│       ├── clubs/
│       │   └── index.tsx        # Placeholder (Phase 2)
│       ├── discover/
│       │   └── index.tsx        # Placeholder (Phase 2)
│       └── profile/
│           └── index.tsx        # Logout action lives here (AUTH-05)
├── lib/
│   ├── supabase.ts              # Supabase client initialization
│   └── i18n/
│       ├── index.ts             # i18next init with inline resources
│       ├── en.json              # English translations (all Phase 1 keys from UI-SPEC)
│       └── de.json              # German translations (all Phase 1 keys from UI-SPEC)
├── providers/
│   └── AuthProvider.tsx         # onAuthStateChange → Zustand auth.store
├── store/
│   └── auth.store.ts            # Zustand: { session, initialized, isLoggedIn }
├── components/
│   └── ui/
│       ├── Input.tsx            # Tamagui Input wrapper (UI-SPEC contract)
│       ├── Button.tsx           # Primary / Secondary / TextLink variants
│       └── Alert.tsx            # Inline success/error banner
├── tamagui.config.ts            # Tokens, themes, fonts, animations, breakpoints
├── tamagui.build.ts             # Compiler options (read by metro + babel plugins)
├── babel.config.js              # @tamagui/babel-plugin
├── metro.config.js              # withTamagui()
├── app.json                     # Expo config + scheme: "buchclub"
└── .env                         # EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

### Pattern 1: Supabase Client Initialization

**What:** Initialize `supabase-js` with `expo-sqlite` localStorage polyfill for session persistence on native and web.
**When to use:** Single file `lib/supabase.ts`; imported everywhere auth or database access is needed.

```typescript
// lib/supabase.ts
// Source: Context7 /supabase/supabase — quickstarts/expo-react-native.mdx
import 'react-native-url-polyfill/auto'
import 'expo-sqlite/localStorage/install'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage: localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // CRITICAL: must be false for native
  },
})
```

Note: The env var is `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (not `ANON_KEY`) as used in current Supabase quickstart. [VERIFIED: Context7 /supabase/supabase]

### Pattern 2: AuthProvider with Expo Router Guard

**What:** React Context provider that subscribes to `onAuthStateChange`, stores session in Zustand, and holds the splash screen until `initialized = true`.
**When to use:** Wrap the entire app in `_layout.tsx`; `InitialLayout` inner component reads auth state to redirect.

```typescript
// providers/AuthProvider.tsx
// Source: Context7 /supabase/supabase — react-native-storage.mdx
import { useEffect, createContext, useContext, useState } from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

type AuthContextType = {
  session: Session | null
  initialized: boolean
}

const AuthContext = createContext<AuthContextType>({ session: null, initialized: false })

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setInitialized(true)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  return <AuthContext.Provider value={{ session, initialized }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
```

```typescript
// Inside app/_layout.tsx — InitialLayout component
// Source: Context7 /supabase/supabase — react-native-storage.mdx
import { Slot, useRouter, useSegments } from 'expo-router'
import { useEffect } from 'react'
import * as SplashScreen from 'expo-splash-screen'
import { useAuth } from '../providers/AuthProvider'

SplashScreen.preventAutoHideAsync()

function InitialLayout() {
  const { session, initialized } = useAuth()
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    if (!initialized) return
    SplashScreen.hideAsync()

    const inAuthGroup = segments[0] === '(auth)'

    if (session && inAuthGroup) {
      router.replace('/(app)/books')
    } else if (!session && !inAuthGroup) {
      router.replace('/(auth)/sign-in')
    }
  }, [session, initialized])

  return <Slot />
}
```

### Pattern 3: TamaguiProvider in Root Layout

**What:** Wrap the entire app with `TamaguiProvider` using platform-conditional animation driver.
**When to use:** Outermost provider in `app/_layout.tsx`, wrapping AuthProvider.

```typescript
// app/_layout.tsx — TamaguiProvider setup
// Source: Context7 /tamagui/tamagui — docs/guides/expo.mdx
import '../tamagui.generated.css' // web only — conditional import
import { TamaguiProvider } from 'tamagui'
import config from '../tamagui.config'

export default function RootLayout() {
  return (
    <TamaguiProvider config={config} defaultTheme="light">
      <AuthProvider>
        <I18nProvider>
          <InitialLayout />
        </I18nProvider>
      </AuthProvider>
    </TamaguiProvider>
  )
}
```

The `tamagui.generated.css` import is for web. Use platform file extension (`_layout.web.tsx` vs `_layout.native.tsx`) or conditional `if (Platform.OS === 'web')` to scope it.

### Pattern 4: i18next Initialization for React Native

**What:** Initialize i18next with inline resources (no HTTP backend — translations are bundled) using `expo-localization` for initial language detection.
**When to use:** `lib/i18n/index.ts` — imported at the top of `app/_layout.tsx` (side-effect import).

```typescript
// lib/i18n/index.ts
// Source: Context7 /i18next/react-i18next + Context7 /expo/expo localization
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { getLocales } from 'expo-localization'
import en from './en.json'
import de from './de.json'

const deviceLang = getLocales()[0]?.languageCode ?? 'en'
const supportedLang = ['en', 'de'].includes(deviceLang) ? deviceLang : 'en'

i18n
  .use(initReactI18next)
  .init({
    lng: supportedLang,
    fallbackLng: 'en',
    supportedLngs: ['en', 'de'],
    resources: {
      en: { common: en.common, auth: en.auth, nav: en.nav },
      de: { common: de.common, auth: de.auth, nav: de.nav },
    },
    ns: ['common', 'auth', 'nav'],
    defaultNS: 'common',
    interpolation: { escapeValue: false }, // React handles escaping
    pluralSeparator: '_',
    compatibilityJSON: 'v4', // Phase 2+ plural keys work without config changes
    react: { useSuspense: false }, // Required for React Native (no Suspense support)
  })

export default i18n
```

**Critical:** `react: { useSuspense: false }` is required for React Native — RN does not support React Suspense. [ASSUMED — standard React Native i18next recommendation; verifiable in react-i18next RN docs]

### Pattern 5: Password Reset Deep Link Handling

**What:** Intercept Supabase password-reset email link on native using `Linking.useURL()`, exchange token for session, redirect to update-password screen.
**When to use:** `app/_layout.tsx` — root layout that's always mounted.

```typescript
// Inside InitialLayout or a sibling hook
// Source: Context7 /supabase/supabase — native-mobile-deep-linking.mdx
import * as Linking from 'expo-linking'
import * as QueryParams from 'expo-auth-session/build/QueryParams'

const url = Linking.useURL()

useEffect(() => {
  if (!url) return
  const { params, errorCode } = QueryParams.getQueryParams(url)
  if (errorCode || !params.access_token) return
  supabase.auth.setSession({
    access_token: params.access_token,
    refresh_token: params.refresh_token,
  }).then(() => {
    router.replace('/(auth)/update-password')
  })
}, [url])
```

**app.json scheme required:** [VERIFIED: Context7 /supabase/supabase — native-mobile-deep-linking.mdx]
```json
{ "expo": { "scheme": "buchclub" } }
```

**Supabase dashboard:** Add `buchclub://**` to allowed redirect URLs. [ASSUMED — standard Supabase dashboard configuration; must be done manually]

### Pattern 6: Tamagui Config File

**What:** Single `tamagui.config.ts` declaring all design system tokens, themes, fonts, animations, and breakpoints from the UI-SPEC.
**When to use:** Consumed by `TamaguiProvider`, Metro plugin, and Babel plugin.

```typescript
// tamagui.config.ts (structure — fill tokens from UI-SPEC)
// Source: Context7 /tamagui/tamagui — docs/core/config-v5.mdx
import { createFont, createTamagui, createTokens, isWeb } from '@tamagui/core'
import { defaultConfig } from '@tamagui/config/v5'
import { animations as animationsCSS } from '@tamagui/animations-css'
import { animations as animationsReanimated } from '@tamagui/animations-react-native'

const config = createTamagui({
  ...defaultConfig,
  animations: isWeb ? animationsCSS : animationsReanimated,
  // tokens.space: xs=4, sm=8, md=16, lg=24, xl=32, 2xl=48, 3xl=64
  // tokens.color: full palette from UI-SPEC
  // themes.light + themes.dark from UI-SPEC
  // fonts: Inter heading + body via @tamagui/font-inter
  // media: sm/md/gtSm/gtMd from UI-SPEC
})

type AppConfig = typeof config
declare module '@tamagui/core' {
  interface TamaguiCustomConfig extends AppConfig {}
}

export default config
```

**tamagui.build.ts** (read by Metro + Babel plugins automatically):
```typescript
// tamagui.build.ts
// Source: Context7 /tamagui/tamagui — docs/intro/compiler-install.mdx
import type { TamaguiBuildOptions } from 'tamagui'

export default {
  config: './tamagui.config.ts',
  components: ['tamagui'],
  outputCSS: './tamagui.generated.css',
  disableExtraction: process.env.NODE_ENV === 'development',
} satisfies TamaguiBuildOptions
```

### Anti-Patterns to Avoid

- **`detectSessionInUrl: true` in Supabase client:** Causes infinite loops on native; must always be `false`. [VERIFIED: Context7 /supabase/supabase]
- **Importing `@tamagui/config/v4` or plain `@tamagui/config`:** Silently no-ops in Tamagui 2.x. Must be `@tamagui/config/v5`. [CITED: CLAUDE.md]
- **Using `AsyncStorage` instead of `expo-sqlite/localStorage`:** The older approach still works but Supabase's official SDK 56 quickstart uses the localStorage polyfill. [VERIFIED: Context7 /supabase/supabase]
- **Setting `react.useSuspense: true` in i18next:** React Native does not support Suspense; causes crashes. [ASSUMED — verified pattern from community]
- **Calling `router.replace()` before `initialized = true`:** Causes a race condition that produces an auth flash or redirect loop. [VERIFIED: Context7 /supabase/supabase — guard pattern]
- **Inline pixel values in Tamagui components:** Defeats the compiler optimization. All values must be tokens (`$space.md`, not `16`). [CITED: 01-UI-SPEC.md]
- **Hard-coding `textAlign: 'left'`:** Breaks RTL readiness. Use `textAlign: 'start'` or no explicit alignment. [CITED: 01-UI-SPEC.md]
- **Using `marginLeft`/`marginRight` for icon-to-text offsets:** Use `gap` or `marginStart`/`marginEnd`. [CITED: 01-UI-SPEC.md]
- **Modifying `my-app/package.json`:** The Next.js app must not receive Expo or Tamagui packages. [CITED: CLAUDE.md]

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session persistence across restarts | Custom token storage | `expo-sqlite/localStorage/install` + `persistSession: true` | Edge cases: token refresh, expiry, concurrent reads, platform differences |
| Auth state management | Manual `useState` auth flags | `supabase.auth.onAuthStateChange` → Zustand store | Handles SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, USER_UPDATED events correctly |
| Auth routing guard | Manual conditional rendering in each screen | `InitialLayout` with `useSegments` + `useRouter` pattern | Centralized; handles initialized state; prevents flash of wrong content |
| i18n pluralization / interpolation | String concatenation | i18next interpolation syntax `{{variable}}` | German plurals are irregular; concatenation breaks grammatical gender agreement |
| Locale detection | `Platform.OS === 'ios' ? ... : ...` | `expo-localization.getLocales()` | Handles regional variants (`de-AT`, `de-CH`), returns preference order |
| Deep link URL parsing | Manual URL string parsing | `expo-auth-session/build/QueryParams` | Handles URL encoding, hash fragments, error codes correctly |
| Animation drivers | Custom animation logic | `@tamagui/animations-css` (web) + `@tamagui/animations-react-native` (native) | Cross-platform spring physics; integrates with `pressStyle`, `enterStyle`, `exitStyle` |
| Font loading coordination | Manual font load state | `expo-font` `useFonts` + `expo-splash-screen` `preventAutoHideAsync` | Prevents FOUC (flash of unstyled content) on both platforms |

**Key insight:** The "don't hand-roll" list for Phase 1 centers on auth session lifecycle — it has more edge cases than it appears (token expiry during app background, platform-specific storage APIs, StrictMode double-fire). Let the Supabase client + localStorage polyfill handle all of it.

---

## Common Pitfalls

### Pitfall 1: Auth Flash on Cold Start
**What goes wrong:** App briefly shows the sign-in screen before the session is loaded, then jumps to the home screen.
**Why it happens:** `initialized` starts as `false`; redirect fires before `getSession()` returns; splash screen is hidden too early.
**How to avoid:** Call `SplashScreen.preventAutoHideAsync()` at module level before any render. Only call `SplashScreen.hideAsync()` inside the `useEffect` guard after `initialized === true`. [VERIFIED: Context7 /supabase/supabase — auth redirect pattern]
**Warning signs:** "auth flash" visible in Expo Go; session exists in logs but sign-in screen renders.

### Pitfall 2: `detectSessionInUrl: true` on Native
**What goes wrong:** Supabase client tries to read auth tokens from the URL hash — works on web, causes redirect loops or errors on native.
**Why it happens:** Default behavior assumes web environment.
**How to avoid:** Always set `detectSessionInUrl: false` in the Supabase client config for Expo/React Native projects. [VERIFIED: Context7 /supabase/supabase]
**Warning signs:** Infinite loop on auth state change, or unexpected sign-out events on native.

### Pitfall 3: Wrong Tamagui Config Import Path
**What goes wrong:** Tokens and themes are silently empty; components render with no styles.
**Why it happens:** `@tamagui/config/v4` was the path for Tamagui 1.x. In 2.x the path is `@tamagui/config/v5`.
**How to avoid:** Always import `defaultConfig` from `@tamagui/config/v5`. [CITED: CLAUDE.md]
**Warning signs:** No visual styling on Tamagui components; no TypeScript errors (the import resolves, just to the wrong version).

### Pitfall 4: `tamagui.generated.css` Imported on Native
**What goes wrong:** Metro bundler error on native builds; CSS imports are not supported in React Native.
**Why it happens:** The CSS import is required for web hydration but breaks native.
**How to avoid:** Gate the import with platform file extensions: create `app/_layout.web.tsx` with the CSS import and `app/_layout.native.tsx` without it. Or use a conditional require inside the layout. [VERIFIED: Context7 /tamagui/tamagui — expo guide]
**Warning signs:** `Unable to resolve module` or Metro bundler error referencing `.css` file on iOS/Android build.

### Pitfall 5: i18next `useSuspense: true` on React Native
**What goes wrong:** App crashes or white-screens on native platforms.
**Why it happens:** React Native does not support React Suspense. i18next's default `useSuspense: true` wraps children in a Suspense boundary.
**How to avoid:** Set `react: { useSuspense: false }` in the i18next `init()` options. [ASSUMED — standard community recommendation; aligns with react-i18next RN docs]
**Warning signs:** White screen on native; works on web but not iOS/Android.

### Pitfall 6: Splash Screen Not Held During Font Loading
**What goes wrong:** FOUC — Inter font loads after first render; text jumps from system font to Inter.
**Why it happens:** `useFonts` is async; if the splash screen is dismissed before fonts load, the initial render uses the system default.
**How to avoid:** Call `SplashScreen.preventAutoHideAsync()` before any component renders. Only dismiss in the `useEffect` that awaits both `fontsLoaded && initialized`. [VERIFIED: Context7 /tamagui/tamagui — expo guide]
**Warning signs:** Text layout shifts visibly after initial render.

### Pitfall 7: Password Reset Deep Link Not Intercepted on Web
**What goes wrong:** User clicks email link on desktop browser; token appears as URL hash; Supabase JS does not auto-exchange it when `detectSessionInUrl: false`.
**Why it happens:** On web, `detectSessionInUrl: true` is the correct behavior; the flag conflict with native means we need platform-aware handling.
**How to avoid:** On web, use `detectSessionInUrl: true` OR use `Linking.useURL()` to manually exchange the token. Consider separate Supabase client init for web vs native using platform file extensions (`lib/supabase.ts` + `lib/supabase.native.ts`). [ASSUMED — pattern inferred from Supabase + Expo Router multi-platform combination]
**Warning signs:** Password reset link works on mobile but not web.

### Pitfall 8: `expo-sqlite/localStorage/install` Must Be First Import
**What goes wrong:** `localStorage is not defined` error at Supabase client initialization.
**Why it happens:** The polyfill must run before any code that references `localStorage`. Import order matters.
**How to avoid:** Place `import 'expo-sqlite/localStorage/install'` as the very first import in `lib/supabase.ts`, before `@supabase/supabase-js`. [VERIFIED: Context7 /supabase/supabase — quickstart ordering]
**Warning signs:** `ReferenceError: localStorage is not defined` at startup.

### Pitfall 9: Supabase `onAuthStateChange` Firing Twice in StrictMode
**What goes wrong:** Auth state updates fire twice in development; redirect logic triggers two router navigations.
**Why it happens:** React StrictMode double-invokes effects in development.
**How to avoid:** The subscription cleanup (`subscription.unsubscribe()`) handles this correctly when implemented. Use `useRef` to guard navigation in `useEffect`. [ASSUMED — known React StrictMode behavior]
**Warning signs:** Console shows `SIGNED_IN` event twice in development; doesn't reproduce in production builds.

---

## Code Examples

### Supabase Client (complete)

```typescript
// lib/supabase.ts
// Source: Context7 /supabase/supabase — quickstarts/expo-react-native.mdx
import 'react-native-url-polyfill/auto'
import 'expo-sqlite/localStorage/install'
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  {
    auth: {
      storage: localStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
)
```

### expo-localization Locale Detection

```typescript
// Source: Context7 /expo/expo — guides/localization.mdx
import { getLocales } from 'expo-localization'

const deviceLocale = getLocales()[0]?.languageCode ?? 'en'
// Returns 'de', 'en', 'fr', etc. Synchronous — safe to call at module init time.
// On iOS: fixed for app lifecycle. On Android: can change when app returns to foreground.
```

### Tamagui Font Loading

```typescript
// Source: Context7 /tamagui/tamagui — docs/guides/expo.mdx
import { useFonts } from 'expo-font'

const [fontsLoaded] = useFonts({
  Inter: require('@tamagui/font-inter/otf/Inter-Medium.otf'),
  InterBold: require('@tamagui/font-inter/otf/Inter-Bold.otf'),
})
```

### Metro Config (withTamagui)

```javascript
// metro.config.js
// Source: Context7 /tamagui/tamagui — docs/guides/metro.mdx
const { getDefaultConfig } = require('expo/metro-config')
const { withTamagui } = require('@tamagui/metro-plugin')

const config = getDefaultConfig(__dirname)
module.exports = withTamagui(config) // reads tamagui.build.ts automatically
```

### Babel Config

```javascript
// babel.config.js
// Source: Context7 /tamagui/tamagui — docs/intro/compiler-install.mdx
module.exports = {
  presets: ['babel-preset-expo'],
  plugins: [
    '@tamagui/babel-plugin', // reads tamagui.build.ts automatically
  ],
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@react-native-async-storage` for Supabase sessions | `expo-sqlite/localStorage/install` polyfill | SDK 55/56 era | expo-sqlite is included in SDK 56; no extra install; official Supabase quickstart uses it |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` env var | `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Recent Supabase quickstart update | Rename only; both work but new quickstart uses Publishable Key |
| `@tamagui/config/v4` import path | `@tamagui/config/v5` import path | Tamagui 2.0 release | Wrong path silently no-ops — always use `/v5` in Tamagui 2.x |
| React Navigation standalone | expo-router (wraps React Nav) | Expo SDK 50+ | File-based routing; `(groups)` for auth/app separation; typed routes |
| New Architecture opt-in (SDK 51–54) | New Architecture always-on (SDK 55+) | SDK 55 | Cannot opt out; Tamagui 2.0 requires it; no compatibility workaround needed |

**Deprecated/outdated:**
- `@react-native-async-storage/async-storage` for Supabase: Not deprecated but superseded by `expo-sqlite/localStorage` for SDK 56 new projects per Supabase official quickstart.
- `expo-router/link` `Redirect` component for auth guards: Replaced by `useRouter().replace()` inside `useEffect` for more reliable behavior.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `react: { useSuspense: false }` is required in i18next for React Native | Pattern 4, Pitfall 5 | App crashes or white-screens on native in dev/production; easy to fix if wrong |
| A2 | Separate Supabase client init (web vs native) may be needed for `detectSessionInUrl` | Pitfall 7 | Password reset link works on mobile but silently fails on web; fixable in Phase 1 if caught |
| A3 | `onAuthStateChange` fires twice in React StrictMode dev | Pitfall 9 | Double navigation in dev only; use `useRef` guard to suppress |
| A4 | Supabase dashboard must be manually configured to add `buchclub://**` as an allowed redirect URL | Pattern 5 | Password reset deep link silently fails if redirect URL is not whitelisted |
| A5 | `export default config` (not named export) is the correct pattern for `tamagui.config.ts` | Pattern 6 | Tamagui Metro plugin may fail to resolve config; check actual import in generated code |

**If this table is empty:** All claims in this research were verified or cited — no user confirmation needed. (It is not empty — 5 assumptions listed above require attention.)

---

## Open Questions (RESOLVED)

1. **AUTH-04 (OAuth) — resolve before planning begins**
   - What we know: REQUIREMENTS.md says v1; PROJECT.md says deferred; UI-SPEC has a conditional placeholder
   - What's unclear: User intent — was PROJECT.md written after REQUIREMENTS.md with intentional scope reduction, or is this a documentation error?
   - Recommendation: Treat as deferred (PROJECT.md is the more recent and authoritative document). Confirm with user before Wave 0.

2. **Supabase project configuration — does one exist?**
   - What we know: `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` must exist in `.env`
   - What's unclear: Whether a Supabase project has already been created; whether email confirmation is enabled/disabled (affects AUTH-01 test flow)
   - Recommendation: Wave 0 must include "create Supabase project and configure auth settings" as a task if no project exists.

3. **`tamagui.generated.css` import on web — platform split strategy**
   - What we know: The CSS import is needed for web; breaks native
   - What's unclear: Whether to use `_layout.web.tsx` + `_layout.native.tsx` split or a conditional require — Context7 shows the split approach
   - Recommendation: Use platform file extension split (`_layout.web.tsx` / `_layout.native.tsx`) for cleaner separation. Plan should specify this explicitly.

4. **Supabase Auth email confirmation setting**
   - What we know: AUTH-01 success criterion says user registers, receives confirmation, and lands inside the app
   - What's unclear: If email confirmation is enabled in Supabase (the default), there's a two-step sign-up flow; if disabled, it's single-step
   - Recommendation: Keep email confirmation enabled (default) — the UI-SPEC already has the success state for "almost there!" — and test accordingly.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Expo CLI, npm | ✓ | 24.10.0 | — |
| npm | Package installation | ✓ | 11.6.0 | — |
| Expo CLI (npx) | `npx create-expo-app` | ✓ | 56.1.11 | — |
| Xcode Command Line Tools | iOS builds | ✓ | present (`/Library/Developer/CommandLineTools`) | — |
| Xcode Simulator (simctl) | iOS simulator testing | ✗ | not available (CLT only, no full Xcode) | Use Expo Go on physical device, or web testing |
| adb / Android SDK | Android testing | ✗ | not in PATH | Use Expo Go on physical device |
| Supabase CLI (npx) | DB migrations, type gen | ✓ (npx) | 2.101.0 | Use Supabase dashboard UI |
| EAS CLI | Production builds | ✗ | not in PATH | Use `npx eas` or skip for Phase 1 (Expo Go sufficient) |

**Missing dependencies with no fallback:** None — all Phase 1 work can be completed with Expo Go on a physical device or web browser.

**Missing dependencies with fallback:**
- iOS Simulator: Full Xcode not installed (only CLT). Use `npx expo start --web` or physical iOS device with Expo Go for native testing.
- Android emulator/adb: Use physical Android device with Expo Go.
- EAS CLI: Phase 1 does not require production builds. `npx expo start` is sufficient.

---

## Validation Architecture

> nyquist_validation is `false` in `.planning/config.json` — this section is OMITTED per configuration.

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Supabase Auth — email/password, bcrypt hashing server-side; client never touches passwords after submission |
| V3 Session Management | yes | Supabase JWT + refresh tokens; `expo-sqlite/localStorage` storage; `autoRefreshToken: true` |
| V4 Access Control | yes | Supabase RLS policies on all tables — enforced at DB layer, not client |
| V5 Input Validation | yes | Client-side: blur validation on form fields (password length, mismatch); server-side: Supabase Auth validates email format |
| V6 Cryptography | no | No cryptographic operations in Phase 1 client code; Supabase handles all crypto server-side |

### Known Threat Patterns for this Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Password enumeration (reset flow) | Information Disclosure | Privacy-safe copy: "If an account exists, we've sent a link." — already specified in UI-SPEC |
| Session token theft (localStorage) | Information Disclosure | `expo-sqlite` is sandboxed per-app on native; acceptable for v1 |
| Deep link hijacking (password reset) | Spoofing | Supabase uses short-lived tokens in reset links; `buchclub://` scheme registered in `app.json`; token is single-use |
| PKCE downgrade on web | Tampering | Supabase default flow on web uses PKCE; do not override auth flow type |
| Unvalidated redirect URL | Elevation of Privilege | `buchclub://**` allowlist in Supabase dashboard restricts redirect targets |
| Overly verbose error messages | Information Disclosure | Auth errors must not distinguish between "email not found" and "wrong password" — UI-SPEC enforces single generic credential error |

---

## Sources

### Primary (HIGH confidence)
- Context7 `/supabase/supabase` — Supabase client init, Expo quickstart, auth redirect pattern, deep linking, password reset, `onAuthStateChange`
- Context7 `/tamagui/tamagui` — TamaguiProvider setup, Expo guide, font loading, Metro plugin, `tamagui.build.ts`, `useDidFinishSSR`, animation drivers
- Context7 `/expo/expo` — `getLocales()` API, SDK 56 localization guide
- Context7 `/i18next/react-i18next` — i18next init with `initReactI18next`, inline resources pattern
- npm registry (2026-05-24) — all package versions verified: expo@56.0.4, expo-router@56.2.6, tamagui@2.0.0, @supabase/supabase-js@2.106.1, i18next@26.2.0, react-i18next@17.0.8, zustand@5.0.13, @tanstack/react-query@5.100.14
- `npm view expo-template-default@sdk-56 --json` — SDK 56 template dependency list verified

### Secondary (MEDIUM confidence)
- CLAUDE.md — project constraints, stack decisions, compatibility notes (project authority)
- `.planning/phases/01-foundation/01-UI-SPEC.md` — component contracts, layout specs, i18n keys, animation presets, token definitions

### Tertiary (LOW confidence)
- Standard React Native i18next community pattern: `useSuspense: false` requirement (A1 in assumptions)
- Multi-platform `detectSessionInUrl` handling pattern (A2 in assumptions)
- React StrictMode double-fire for `onAuthStateChange` (A3 in assumptions)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified against npm registry on 2026-05-24; all key packages confirmed via Context7
- Architecture: HIGH — patterns verified against official Supabase Expo quickstart and Tamagui Expo guide in Context7
- Pitfalls: MEDIUM — Pitfalls 1–4, 6, 8 verified via Context7/official docs; Pitfalls 5, 7, 9 are ASSUMED (common patterns, not explicitly verified in this session)
- i18n: HIGH — expo-localization `getLocales()` API and react-i18next patterns verified via Context7

**Research date:** 2026-05-24
**Valid until:** 2026-06-24 (30 days — SDK 56 is stable; Tamagui 2.x is newly released so monitor for patch updates)
