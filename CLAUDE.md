<!-- GSD:project-start source:PROJECT.md -->
## Project

**Buchclub App**

A universal mobile and web app (iOS, Android, Web) for organizing and managing book clubs. Anyone can sign up, create a club, or join an existing one via invite code or public listing. The app lets members track personal reading lists, vote on books for their club, and coordinate meetings — all from a single TypeScript codebase built with Expo, Tamagui, and Supabase.

**Core Value:** Members stay engaged and aligned because the next book they read together is decided democratically and visible to everyone in real time.

### Constraints

- **Tech Stack**: Expo + Tamagui + Supabase — no deviations (spec is fixed)
- **APIs**: Google Books API and Open Library Covers must remain completely free to use
- **Database**: Supabase Postgres with RLS policies on all tables; votes via RPC only
- **i18n**: German and English included from day one; architecture must support adding languages
- **Existing Repo**: New Expo app lives alongside existing Next.js code — no breaking changes to it
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Recommended Stack
### Core Runtime
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Expo SDK | `~56.0.4` | Universal app platform (iOS, Android, Web) | Latest stable as of May 2026. SDK 56 ships React Native 0.85.3, React 19.2.3, and New Architecture always-on. No option to downgrade. |
| React Native | `0.85.3` | Pinned by Expo SDK 56 | Do not install independently — `npx create-expo-app` pins this automatically via `expo install`. |
| React | `19.2.3` | Pinned by Expo SDK 56 | Required by Tamagui 2.0 (`react >= 19` peer dep). SDK 56 satisfies this. |
| TypeScript | `^5.x` | Type safety | Required by Tamagui 2.0 as a hard requirement. Already in the Next.js app. |
### Routing
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| expo-router | `~56.2.6` | File-based routing for native + web | Ships with Expo SDK 56 template. File-system routing means `app/` directory routes work identically on iOS, Android, and web — no separate navigation tree. Replaces React Navigation configuration boilerplate. Supports typed routes, deep linking, and static rendering for web out of the box. |
| react-native-screens | `4.25.2` | Native screen containers | Required peer dep of expo-router. Managed automatically via `npx expo install`. |
| react-native-safe-area-context | `~5.7.0` | Safe area insets | Required peer dep of expo-router. SDK 56 template pins this version. |
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
### Backend — Supabase
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| @supabase/supabase-js | `^2.106.1` | Supabase client (database, auth, realtime) | v2.x is the stable client. The `createClient` API covers all three pillars: Postgres via PostgREST, Auth with session management, and Realtime via WebSocket channels. Single package, no separate clients needed. |
| expo-sqlite | `~56.0.4` | localStorage polyfill for Supabase auth session | Supabase's official Expo quickstart (verified via Context7) recommends importing `expo-sqlite/localStorage/install` to provide a `localStorage` polyfill for native session persistence. This is the current recommended approach over `@react-native-async-storage/async-storage` for new SDK 56 projects. |
| react-native-url-polyfill | `^3.0.0` | URL global polyfill for Supabase JS | Supabase JS uses `URL` constructor internally. React Native does not have it globally. Must be imported at the top of the Supabase client file (`import 'react-native-url-polyfill/auto'`). |
### Internationalization (i18n)
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| i18next | `^26.2.0` | Core i18n engine | Industry standard, works on any JS runtime including React Native and web with the same API. Supports namespaced translation files, pluralization, interpolation, and fallback languages. |
| react-i18next | `^17.0.8` | React bindings for i18next | Provides `useTranslation()` hook and `<Trans>` component. Works with both the web and native renderers — no platform-specific imports needed. |
| expo-localization | `~56.0.6` | Device locale detection | Official Expo module for reading the device's preferred locale. `getLocales()[0].languageCode` returns `'de'` or `'en'` synchronously. Use this to set the initial i18next language at app startup. |
### External APIs
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Google Books API | N/A (REST, no SDK) | Book search by title, author, ISBN | Free tier requires no API key for basic search queries (`volumes?q=...`). Rate limit is 1,000 queries/day per IP (unauthenticated). Cover images are included in `volumeInfo.imageLinks`. No npm package needed — use native `fetch`. |
| Open Library Covers API | N/A (REST, no SDK) | Book cover image fallback | Format: `https://covers.openlibrary.org/b/isbn/{ISBN}-M.jpg`. Completely free, no key, no rate limit documentation. Use as `<Image>` `source` fallback when Google Books `imageLinks` is absent. |
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
## Monorepo / Project Structure Note
- The Expo app lives in a separate subdirectory (e.g., `apps/expo/` or `expo/`) with its own `package.json`
- The Next.js `package.json` in `my-app/` must not be modified — Tamagui and Expo packages must not be added to it
- No monorepo tooling (Turborepo, Nx) is required for this setup — the two apps are independent
- Shared TypeScript types (e.g., Supabase database types) can live in a `shared/` directory or be duplicated initially
## Environment Variables
# expo/.env
## Installation Commands
# Bootstrap the Expo app (run from the repo root, not inside my-app/)
# Supabase
# expo-sqlite is already included in SDK 56 (provides localStorage polyfill)
# Verify: npx expo install expo-sqlite
# Tamagui (core)
# Gesture handler and reanimated are already in the SDK 56 template
# Verify both are present in package.json: react-native-gesture-handler, react-native-reanimated
# i18n
# State management
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
## Known Compatibility Issues
### Tamagui 2.x + Expo SDK 56: COMPATIBLE
### Tamagui Entry Point with Expo Router
### Metro Web + Tamagui CSS
### Tamagui `TamaguiProvider` + Expo Router Root Layout
### `@tamagui/config/v5` import path
### Google Books API rate limit
### Supabase Realtime + React StrictMode
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
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
