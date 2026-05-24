# Technology Stack

**Project:** Buchclub — Universal Book Club App
**Researched:** 2026-05-24
**Research mode:** Ecosystem (Stack dimension)

---

## Recommended Stack

### Core Runtime

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Expo SDK | `~56.0.4` | Universal app platform (iOS, Android, Web) | Latest stable as of May 2026. SDK 56 ships React Native 0.85.3, React 19.2.3, and New Architecture always-on. No option to downgrade. |
| React Native | `0.85.3` | Pinned by Expo SDK 56 | Do not install independently — `npx create-expo-app` pins this automatically via `expo install`. |
| React | `19.2.3` | Pinned by Expo SDK 56 | Required by Tamagui 2.0 (`react >= 19` peer dep). SDK 56 satisfies this. |
| TypeScript | `^5.x` | Type safety | Required by Tamagui 2.0 as a hard requirement. Already in the Next.js app. |

**Confidence: HIGH** — Verified via `npm view expo-template-default@sdk-56` and Context7 Expo docs (sdk-54/sdk-56 branches). SDK 56 is the current stable template (`npx create-expo-app@latest --template default@sdk-56`).

---

### Routing

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| expo-router | `~56.2.6` | File-based routing for native + web | Ships with Expo SDK 56 template. File-system routing means `app/` directory routes work identically on iOS, Android, and web — no separate navigation tree. Replaces React Navigation configuration boilerplate. Supports typed routes, deep linking, and static rendering for web out of the box. |
| react-native-screens | `4.25.2` | Native screen containers | Required peer dep of expo-router. Managed automatically via `npx expo install`. |
| react-native-safe-area-context | `~5.7.0` | Safe area insets | Required peer dep of expo-router. SDK 56 template pins this version. |

**Confidence: HIGH** — expo-router version confirmed via `npm view expo-template-default@sdk-56` dependencies. Expo Router is the recommended and only maintained first-party routing solution for universal Expo apps.

**Do not use:** React Navigation standalone (without Expo Router) — Expo Router wraps it and eliminates the manual linking/deep-link wiring. React Navigation v7 can still be used for nested navigators inside Expo Router layouts if needed, but the top-level router must be Expo Router.

---

### UI Framework

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| tamagui | `^2.0.0` | Core UI components and styling engine | v2.0.0 is the current latest (released alongside RN 0.81+ New Architecture requirement). Compile-time optimization via `@tamagui/babel-plugin` extracts styles at build time, reducing runtime overhead on both native and web. Only UI library with true parity across RN and web from a single component API. |
| @tamagui/config | `^2.0.0` | Default design tokens and theme presets | Provides `defaultConfig` with pre-built tokens (colors, sizes, spacing, fonts). Use `@tamagui/config/v5` import path inside Tamagui 2.x. |
| @tamagui/babel-plugin | `^2.0.0` | Compile-time style extraction (native) | Optional but recommended. Enables the optimizing compiler for native builds. Set `disableExtraction: true` in development for faster reloads. |
| @tamagui/metro-plugin | `^2.0.0` | Metro bundler integration for web | Required to enable Tamagui's web CSS output via Metro. Wraps `getDefaultConfig` from `expo/metro-config`. |
| @tamagui/native | `^2.0.0` | Native platform integrations | Required for Sheet, Dialog, Toast, LinearGradient on native. Import specific setup modules at the entry point (before any Tamagui imports). |
| @tamagui/animations-react-native | `^2.0.0` | Spring animations on native | Use the RN animations driver for iOS/Android. Define `fast`, `medium`, `slow` presets in `tamagui.config.ts`. |
| @tamagui/font-inter | `^2.0.0` | Inter font for consistent cross-platform typography | Inter is the default Tamagui font. Load via `expo-font`'s `useFonts` hook on native. |
| react-native-gesture-handler | `~2.31.1` | Gesture support (Sheets, swipe) | Pinned by SDK 56 template. Required for `@tamagui/native/setup-gesture-handler`. |
| react-native-reanimated | `4.3.1` | Advanced animations | Pinned by SDK 56 template. Required if using `@tamagui/animations-reanimated` (optional upgrade from RN animations driver). |

**Confidence: HIGH** — Tamagui 2.0.0 confirmed via `npm view tamagui version`. Requirements (RN 0.81+, React 19+, New Architecture, TypeScript 5+) verified via Context7 Tamagui docs. All version numbers confirmed against `npm view` output and Expo SDK 56 template.

**Critical compatibility note:** Tamagui 2.0 requires **React Native 0.81+ with New Architecture enabled**. Expo SDK 56 uses RN 0.85.3 and New Architecture is always-on (cannot be disabled from SDK 55+). This means Tamagui 2.x and Expo SDK 56 are **fully compatible** — there is no bridge-mode fallback to worry about.

**Do not use:** Tamagui 1.x — it predates New Architecture and is incompatible with Expo SDK 55+. NativeWind or Tailwind alternatives violate the project spec and don't provide the same compile-time optimization on native.

---

### Backend — Supabase

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| @supabase/supabase-js | `^2.106.1` | Supabase client (database, auth, realtime) | v2.x is the stable client. The `createClient` API covers all three pillars: Postgres via PostgREST, Auth with session management, and Realtime via WebSocket channels. Single package, no separate clients needed. |
| expo-sqlite | `~56.0.4` | localStorage polyfill for Supabase auth session | Supabase's official Expo quickstart (verified via Context7) recommends importing `expo-sqlite/localStorage/install` to provide a `localStorage` polyfill for native session persistence. This is the current recommended approach over `@react-native-async-storage/async-storage` for new SDK 56 projects. |
| react-native-url-polyfill | `^3.0.0` | URL global polyfill for Supabase JS | Supabase JS uses `URL` constructor internally. React Native does not have it globally. Must be imported at the top of the Supabase client file (`import 'react-native-url-polyfill/auto'`). |

**Supabase client initialization pattern for this project:**
```ts
// lib/supabase.ts
import 'react-native-url-polyfill/auto'
import { createClient } from '@supabase/supabase-js'
import 'expo-sqlite/localStorage/install'

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

**Supabase Realtime pattern for vote subscriptions:**
```ts
// useEffect cleanup is mandatory — Supabase channels are not auto-cleaned
useEffect(() => {
  const channel = supabase
    .channel(`meeting:${meetingId}:votes`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'votes',
      filter: `meeting_id=eq.${meetingId}`,
    }, (payload) => handleVoteChange(payload))
    .subscribe()
  return () => { channel.unsubscribe() }
}, [meetingId])
```

**Confidence: HIGH** — `@supabase/supabase-js` version `2.106.1` confirmed via `npm view`. Expo quickstart pattern verified via Context7 Supabase docs. The `expo-sqlite/localStorage/install` approach is the current (2025/2026) Supabase official recommendation for Expo projects, replacing the older AsyncStorage approach.

**Do not use:** `@react-native-async-storage/async-storage` as the Supabase auth storage adapter — the `expo-sqlite/localStorage` polyfill is the current recommended path for new Expo SDK 56 projects and integrates better with the Expo ecosystem. Keep `@react-native-async-storage/async-storage` only if other non-Supabase features require it.

---

### Internationalization (i18n)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| i18next | `^26.2.0` | Core i18n engine | Industry standard, works on any JS runtime including React Native and web with the same API. Supports namespaced translation files, pluralization, interpolation, and fallback languages. |
| react-i18next | `^17.0.8` | React bindings for i18next | Provides `useTranslation()` hook and `<Trans>` component. Works with both the web and native renderers — no platform-specific imports needed. |
| expo-localization | `~56.0.6` | Device locale detection | Official Expo module for reading the device's preferred locale. `getLocales()[0].languageCode` returns `'de'` or `'en'` synchronously. Use this to set the initial i18next language at app startup. |

**i18n initialization pattern:**
```ts
// lib/i18n.ts
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { getLocales } from 'expo-localization'

import en from '../locales/en.json'
import de from '../locales/de.json'

const deviceLang = getLocales()[0].languageCode ?? 'en'

i18n
  .use(initReactI18next)
  .init({
    resources: { en: { translation: en }, de: { translation: de } },
    lng: deviceLang,
    fallbackLng: 'en',
    supportedLngs: ['en', 'de'],
    interpolation: { escapeValue: false },
  })

export default i18n
```

**Confidence: HIGH** — react-i18next `17.0.8` and i18next `26.2.0` confirmed via `npm view`. expo-localization `56.0.6` pinned by SDK 56. The combination of react-i18next (for hooks) + expo-localization (for device detection) + bundled JSON files is the standard universal pattern — avoids HTTP backend dependency which is unnecessary for a 2-language app.

**Do not use:** `i18next-http-backend` or `i18next-browser-languagedetector` — these are web-only plugins that won't work in React Native. Bundle translation JSON files directly and use `expo-localization` for device detection instead. Also avoid `i18n-js` (lighter but no React hooks integration) and `lingui` (complex pipeline, overkill for 2 languages).

---

### External APIs

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Google Books API | N/A (REST, no SDK) | Book search by title, author, ISBN | Free tier requires no API key for basic search queries (`volumes?q=...`). Rate limit is 1,000 queries/day per IP (unauthenticated). Cover images are included in `volumeInfo.imageLinks`. No npm package needed — use native `fetch`. |
| Open Library Covers API | N/A (REST, no SDK) | Book cover image fallback | Format: `https://covers.openlibrary.org/b/isbn/{ISBN}-M.jpg`. Completely free, no key, no rate limit documentation. Use as `<Image>` `source` fallback when Google Books `imageLinks` is absent. |

**Google Books fetch pattern:**
```ts
// No auth header required for basic search
const searchBooks = async (query: string) => {
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=20`
  const res = await fetch(url)
  const data = await res.json()
  return data.items ?? []
}
```

**Confidence: MEDIUM** — API endpoints and free-tier behavior are well-documented but verified via project spec and public documentation only. The 1,000/day unauthenticated rate limit is a known constraint — acceptable for a personal app but worth monitoring if usage grows.

---

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @tanstack/react-query | `^5.100.14` | Server state, caching, background refetch | Use for all Supabase data fetching (books search, club/member lists). Provides caching, loading/error states, and stale-while-revalidate without manual state management. |
| zustand | `^5.0.13` | Lightweight client state | Use only for UI-local state that crosses component boundaries (e.g., currently selected club in session). Do not use for server state — that belongs in React Query. |
| expo-constants | `~56.0.15` | App config access | Required by expo-router (installed automatically). Also useful for accessing `expoConfig.extra` values. |
| expo-linking | `~56.0.11` | Deep link URL handling | Required by expo-router. Handles universal links and app scheme URLs. |
| expo-status-bar | `~56.0.4` | Status bar control | Required by expo-router template. Controls light/dark status bar appearance. |
| expo-splash-screen | `~56.0.10` | Splash screen management | Included in SDK 56 template. Call `preventAutoHideAsync()` during font loading. |
| expo-font | `~56.0.5` | Font loading for Tamagui | Load Inter font files for Tamagui typography on native. |

**Confidence: HIGH** for React Query and Zustand (versions confirmed via `npm view`). MEDIUM for supporting Expo modules (pinned by SDK 56 template).

---

## Monorepo / Project Structure Note

The existing repo is a Next.js 16 app (React 19, Tailwind v4, Shadcn). The Expo app is built fresh **inside the same git repo** but as a sibling, not integrated into the Next.js app. Key constraints:

- The Expo app lives in a separate subdirectory (e.g., `apps/expo/` or `expo/`) with its own `package.json`
- The Next.js `package.json` in `my-app/` must not be modified — Tamagui and Expo packages must not be added to it
- No monorepo tooling (Turborepo, Nx) is required for this setup — the two apps are independent
- Shared TypeScript types (e.g., Supabase database types) can live in a `shared/` directory or be duplicated initially

**Do not** add `expo`, `tamagui`, or React Native packages to the existing Next.js `my-app/package.json`. The existing app uses Shadcn + Tailwind; mixing Tamagui into it would create conflicts and is out of scope.

---

## Environment Variables

All client-side secrets in Expo must use the `EXPO_PUBLIC_` prefix. The Expo bundler only inlines variables with this prefix into the JavaScript bundle.

```
# expo/.env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJ...
```

Note: The key name changed from `ANON_KEY` to `PUBLISHABLE_KEY` in recent Supabase official docs (verified via Context7 Supabase Expo quickstart). Either name works with `createClient`; use `PUBLISHABLE_KEY` to match current Supabase dashboard terminology.

---

## Installation Commands

```bash
# Bootstrap the Expo app (run from the repo root, not inside my-app/)
npx create-expo-app@latest expo --template default@sdk-56

cd expo

# Supabase
npx expo install @supabase/supabase-js react-native-url-polyfill

# expo-sqlite is already included in SDK 56 (provides localStorage polyfill)
# Verify: npx expo install expo-sqlite

# Tamagui (core)
npm install tamagui @tamagui/config @tamagui/babel-plugin @tamagui/metro-plugin @tamagui/native @tamagui/font-inter @tamagui/animations-react-native

# Gesture handler and reanimated are already in the SDK 56 template
# Verify both are present in package.json: react-native-gesture-handler, react-native-reanimated

# i18n
npm install i18next react-i18next expo-localization

# State management
npm install @tanstack/react-query zustand
```

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| UI Framework | Tamagui 2.x | NativeWind v4 / Tailwind | Project spec is fixed. NativeWind also works but Tamagui's compile-time extraction is superior for animation-heavy UIs and the spec mandates Tamagui. |
| UI Framework | Tamagui 2.x | React Native Paper | Web support is secondary-class; no compile-time optimization. |
| Routing | expo-router 56.x | React Navigation standalone | Expo Router is expo-router — it wraps React Navigation and adds file-system routing and web SSR. No reason to use the lower-level API directly. |
| Auth | Supabase Auth (email) | Clerk / Auth0 | Project spec mandates Supabase. OAuth/social login explicitly deferred to v2. |
| i18n | react-i18next + i18next | lingui | Lingui requires a compile step (message extraction); heavier toolchain for 2 languages. react-i18next is sufficient and has better React Native compatibility. |
| i18n | react-i18next + i18next | i18n-js | No React hooks, less ecosystem, less maintained. |
| Data fetching | TanStack Query v5 | SWR | TanStack Query has better React Native support and more features (optimistic updates, infinite scroll). SWR is web-first. |
| State | Zustand v5 | Redux Toolkit | RTK is overkill for a single-user app with simple client state. Zustand has a smaller bundle and simpler API. |
| Auth storage | expo-sqlite/localStorage | @react-native-async-storage | expo-sqlite/localStorage is the current Supabase official recommendation for SDK 56. AsyncStorage is being phased out of Supabase's official guides. |
| Animations | @tamagui/animations-react-native | @tamagui/animations-reanimated | RN animations driver is simpler to set up. Reanimated is available as an upgrade path if complex gesture-driven animations are needed (SDK 56 template includes it). |

---

## Known Compatibility Issues

### Tamagui 2.x + Expo SDK 56: COMPATIBLE
Tamagui 2.0 requires RN 0.81+ with New Architecture. SDK 56 uses RN 0.85.3 and New Architecture is mandatory. No bridge-mode issues.

### Tamagui Entry Point with Expo Router
Tamagui v2 native setup imports (`@tamagui/native/setup-*`) **must run before `expo-router/entry`**. Create a custom `index.js` at the project root:

```js
// index.js
import '@tamagui/native/setup-teleport'       // Sheet, Dialog, Popover, Select, Toast
import '@tamagui/native/setup-gesture-handler' // smoother Sheet on native
import 'expo-router/entry'
```

Then in `package.json`:
```json
{ "main": "index.js" }
```

Skipping this causes Sheets and Dialogs to fail silently on native.

### Metro Web + Tamagui CSS
For web support via Metro, `metro.config.js` must use `@tamagui/metro-plugin`:

```js
// metro.config.js
const { getDefaultConfig } = require('expo/metro-config')
const { withTamagui } = require('@tamagui/metro-plugin')
module.exports = withTamagui(getDefaultConfig(__dirname))
```

The root layout imports `'../tamagui.generated.css'` (web-only). This file is generated at build/start time and must not be committed to git.

### Tamagui `TamaguiProvider` + Expo Router Root Layout
```ts
// app/_layout.tsx
import '../tamagui.generated.css'  // web only — safe to import unconditionally, no-ops on native
import { TamaguiProvider } from 'tamagui'
import { tamaguiConfig } from '../tamagui.config'
import { Stack } from 'expo-router'

export default function RootLayout() {
  return (
    <TamaguiProvider config={tamaguiConfig} defaultTheme="light">
      <Stack />
    </TamaguiProvider>
  )
}
```

### `@tamagui/config/v5` import path
Inside Tamagui 2.x, configuration presets are imported as:
```ts
import { defaultConfig } from '@tamagui/config/v5'
```
**Not** `@tamagui/config/v4` or plain `@tamagui/config`. Using the wrong path produces a silent no-op.

### Google Books API rate limit
The unauthenticated Google Books API allows ~1,000 requests/day per IP. For a personal app this is acceptable, but debounce search inputs (300-500ms) and consider caching results in React Query with a reasonable `staleTime` (e.g., 5 minutes) to avoid hitting the limit during active search sessions.

### Supabase Realtime + React StrictMode
StrictMode double-invokes effects in development, which can create duplicate Supabase Realtime channel subscriptions. Always include a cleanup function (`channel.unsubscribe()`) in `useEffect` and check for existing subscriptions with `channelRef.current?.state === 'subscribed'` if needed.

---

## Sources

| Source | Confidence | URL / Method |
|--------|------------|-------------|
| Expo SDK 56 template dependencies | HIGH | `npm view expo-template-default@sdk-56 --json` |
| Expo Router v56.2.6 | HIGH | `npm view expo-router version` |
| Tamagui 2.0.0 requirements | HIGH | Context7 `/llmstxt/tamagui_dev_llms_txt` — Installation > Requirements |
| Tamagui Expo guide | HIGH | Context7 `/tamagui/tamagui` — docs/guides/expo.mdx |
| Tamagui Metro plugin | HIGH | Context7 `/llmstxt/tamagui_dev_llms_txt` — docs/guides/metro.mdx |
| Supabase Expo quickstart | HIGH | Context7 `/supabase/supabase` — quickstarts/expo-react-native.mdx |
| Supabase Realtime React patterns | HIGH | Context7 `/supabase/supabase` — troubleshooting/realtime-too-many-channels |
| react-i18next React Native example | HIGH | Context7 `/i18next/react-i18next` |
| expo-localization getLocales API | HIGH | Context7 `/expo/expo` — guides/localization.mdx |
| Expo New Architecture (always-on SDK 55+) | HIGH | Context7 `/expo/expo` — guides/new-architecture.mdx |
| Package versions | HIGH | `npm view [package] version` (run 2026-05-24) |
