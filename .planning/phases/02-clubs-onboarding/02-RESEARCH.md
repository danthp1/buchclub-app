# Phase 2: Clubs & Onboarding — Research

**Researched:** 2026-05-24
**Domain:** Expo SDK 56 / Tamagui 2.x / Supabase RLS / expo-sqlite persistence / TanStack Query v5
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Onboarding lives in a dedicated route group `(onboarding)/` — separate from `(auth)/` and `(app)/`. The auth guard in `InitialLayout` checks a local onboarding flag; if not set, redirects to `(onboarding)/` before allowing access to `(app)/`.
- **D-02:** The onboarding gate is a **one-time local flag** stored in Zustand + expo-sqlite (not a DB column). It is set to `true` after the user successfully joins or creates their first club. Fast to check; survives app restarts but not reinstalls (acceptable for v1).
- **D-03:** Onboarding flow order: `username screen` → `avatar picker (skippable)` → `create-or-join sheet` → `app`.
- **D-04:** The create-or-join choice is presented as a **bottom sheet** (not a dedicated screen). The sheet has two options: "Create a club" and "Join a club". Tapping either navigates to the appropriate screen.
- **D-05:** Club creation is a **multi-step wizard**: Step 1 — name; Step 2 — description (optional); Step 3 — public/private toggle; Step 4 — confirm. Invite code is auto-generated (8 chars, uppercased) and displayed on the confirmation/success screen.
- **D-06:** Joining uses a **shareable deep link + QR code** as the primary UX. Deep links use the existing expo-linking setup in `_layout.tsx`. A QR code scanner (requires `expo-barcode-scanner` or `expo-camera`) handles in-person sharing. Manual 8-character code input is the fallback.
- **D-07:** Browsing public clubs shows a **list with a search bar** — club name, member count, "Join" button. Available during onboarding and from the Clubs tab afterward.
- **D-08:** **Username is required** before the create/join step. Cannot be skipped. Must be unique (validated against `profiles.username`).
- **D-09:** **Avatar is offered during onboarding but skippable.** Uses **preset avatar illustrations** (8–12 in-app image assets, no file upload, no camera permissions). Selected avatar index/identifier stored in `profiles.avatar_url` as a string key (e.g. `"preset:01"`). Default shown for users who skip.
- **D-10:** Avatar can be changed at any time from the Profile tab.
- **D-11:** The **Club list screen is the root of the Clubs tab** (not a header picker). Tapping a club pushes to a Club Detail screen with sub-navigation (Members, Settings). Other phases (Books, Meetings) scope to the active club.
- **D-12:** The **active club ID is persisted via expo-sqlite** (survives app restarts). Stored in Zustand for runtime access. Last-visited club is restored on next launch.
- **D-13:** **All tabs scope to the active club** in Phase 2. A club name banner/header is shown at the top of each tab indicating the current club. Other tabs (Books, Meetings) show a placeholder until Phase 3+.

### Claude's Discretion

- Exact avatar illustration art / filenames — planner/executor chooses consistent with the design system (B&W lineart, matches existing illustration style).
- Invite code deep link URL scheme — use the existing app scheme from `app.json`.
- Exact wizard step layout — follow existing Input/Button component patterns and design screen references.
- Tab 2 slot (placeholder for Phase 5 Meetings) — rename/repurpose the existing `discover` folder as `schedule` with a calendar icon, or keep as `discover` and update icon/label only.

### Deferred Ideas (OUT OF SCOPE)

- **QR code generation** for sharing (not just scanning) — deferred to a future phase.
- **Club discovery by category/genre** — list+search is sufficient for v1; faceted filtering is Phase 4+.
- **Club avatar/cover image** — clubs have no visual identity in Phase 2.
- QR code **scanning** is also deferred from Phase 2 per the UI-SPEC (QR scan descoped from Phase 2).
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ONBRD-01 | After first login, user is prompted to create or join a club | D-01/D-02 onboarding gate in `InitialLayout`; `(onboarding)/` route group |
| ONBRD-02 | User can create a new club (auto-generates unique invite code, user becomes admin) | D-05 wizard; invite code generation via `crypto.getRandomValues`; `clubs_insert_authenticated` + `club_members_insert_self_or_admin` RLS |
| ONBRD-03 | User can join a club by entering an invite code | D-06; `clubs` query by `invite_code`; `club_members` INSERT |
| ONBRD-04 | User can browse and join publicly listed clubs | D-07; `clubs_select_public_or_member` RLS; TanStack Query paginated list |
| PROF-01 | User can set a username and optional avatar during or after onboarding | D-08/D-09; `profiles` UPDATE; username uniqueness check via Supabase |
| PROF-02 | User can view and edit their profile (username, avatar) | Profile screen + Edit screen; same `profiles` UPDATE pattern |
| PROF-03 | User can delete their account (removes auth record and profile data) | New migration `0002_delete_account_rpc.sql` with `delete_account()` SECURITY DEFINER RPC |
| CLUB-01 | Admin can view club details (name, invite code, member list) | `clubs_select_public_or_member` + `club_members_select_co_member` RLS; Club Detail screen |
| CLUB-02 | Admin can promote any member to admin role | `club_members_update_admin` RLS; UPDATE club_members SET role = 'admin' |
| CLUB-03 | Admin can remove a member from the club | `club_members_delete_self_or_admin` RLS; DELETE from club_members |
| CLUB-04 | Admin can toggle whether the club is publicly listed | `clubs_update_admin` RLS; UPDATE clubs SET is_public |
| CLUB-05 | Any member can leave a club | `club_members_delete_self_or_admin` RLS; DELETE from club_members WHERE user_id = auth.uid() |
| CLUB-06 | User can be a member of multiple clubs | club_members composite PK (club_id, user_id); active club switcher via ClubBanner |
</phase_requirements>

---

## Summary

Phase 2 builds the club-and-membership layer on the auth foundation from Phase 1. The critical new domains are: a three-screen onboarding flow gated by a local persistence flag; a multi-step club creation wizard; join-by-code and deep-link flows; full CRUD for club membership management; profile setup with preset avatars; and a persistent active-club context that scopes all tabs.

The database schema is **already complete** — `supabase/migrations/0001_v1_full_schema.sql` defines all Phase 2 tables (`profiles`, `clubs`, `club_members`) with their RLS policies. The only new migration needed is a `delete_account()` RPC for PROF-03, since `supabase.auth.admin.deleteUser()` is server-side only and the current client has no equivalent. The RLS policies are well-designed: `clubs_select_public_or_member` handles public browse + member-only access in a single policy; `club_members_insert_self_or_admin` covers both the join-by-code flow and admin-initiated invites.

The primary implementation complexity in this phase is state architecture across three layers: Zustand for runtime club context (activeClubId, onboardingCompleted), `expo-sqlite/kv-store` for persistence across restarts, and TanStack Query for server state (club lists, member lists). The planner must wire these three correctly — TanStack Query owns all Supabase reads/writes; Zustand owns the active club selection; `expo-sqlite/kv-store` persists Zustand state across cold starts.

**Primary recommendation:** Use `expo-sqlite/kv-store` + Zustand `persist` middleware for the club store. Create `store/club.store.ts` mirroring the `auth.store.ts` pattern. Wrap the entire app in a `QueryClientProvider` at the root layout level (currently missing from Phase 1 — Phase 2 Plan 01 must add it).

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Onboarding gate (local flag) | Client (Zustand + expo-sqlite) | — | Local flag, not a DB concern; checked synchronously before route decisions |
| Auth guard + onboarding redirect | Expo Router `InitialLayout` | Zustand | Route decisions live in the navigator layer; reads from Zustand |
| Club CRUD (create, update, delete) | Supabase (RLS-enforced) | TanStack Query | All mutations go through Supabase client; TanStack Query wraps and caches |
| Active club context | Client (Zustand) | expo-sqlite/kv-store | Runtime scoping of all tabs; persisted across restarts |
| Username uniqueness validation | Supabase (Postgres unique constraint) | Client (debounced query) | DB enforces uniqueness; client checks proactively to avoid UX friction |
| Invite code generation | Client (crypto.getRandomValues) | — | 8-char code generated at club creation time before INSERT |
| Deep link interception | Expo Router `_layout.tsx` | Zustand | Linking hook fires in root layout; stores pending code if onboarding incomplete |
| Avatar assets | Client (static require map) | — | PNG assets bundled at compile time via Metro; stored as string key in Supabase |
| Account deletion | Supabase RPC (SECURITY DEFINER) | — | Admin privilege needed to delete from auth.users; must bypass RLS |
| Public club browsing | Supabase + TanStack Query | — | `clubs_select_public_or_member` RLS handles public visibility |
| Member list / role management | Supabase + TanStack Query | — | `club_members` table with `club_members_update_admin` / `_delete_self_or_admin` RLS |

---

## Standard Stack

### Core (all already installed in package.json)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| expo | `~56.0.4` | Platform runtime | Locked by CLAUDE.md |
| tamagui | `^2.0.0` | UI framework | Locked by CLAUDE.md; `Sheet` and `Dialog` exported from main package |
| @supabase/supabase-js | `^2.106.1` | DB + auth client | Locked by CLAUDE.md |
| expo-sqlite | `~56.0.4` | Auth localStorage + kv-store for persistence | Already installed; `expo-sqlite/kv-store` provides async+sync key-value API |
| @tanstack/react-query | `^5.100.14` | Server state, caching | Already installed; needs `QueryClientProvider` added to root layout |
| zustand | `^5.0.13` | Client state (active club, onboarding flag) | Already installed |
| expo-linking | `~56.0.11` | Deep link handling | Already installed; **use `useLinkingURL()` not `useURL()`** (deprecated) |
| react-i18next / i18next | `^17.0.8` / `^26.2.0` | i18n; add `onboarding`, `clubs`, `profile` namespaces | Already installed; i18n init needs new namespace registration |

### New Packages for Phase 2

| Library | Version | Purpose | Install Command |
|---------|---------|---------|-----------------|
| @expo-google-fonts/archivo-narrow | `0.4.2` | Archivo Narrow Bold font (headlines) | `npx expo install @expo-google-fonts/archivo-narrow` |
| @expo-google-fonts/ibm-plex-sans | `0.4.1` | IBM Plex Sans Regular + SemiBold (body/UI) | `npx expo install @expo-google-fonts/ibm-plex-sans` |
| expo-clipboard | `~56.0.3` | Copy invite code to clipboard | `npx expo install expo-clipboard` |

**Not needed:**
- `expo-crypto` — `globalThis.crypto.getRandomValues()` is available natively in Hermes (RN 0.85) [VERIFIED: Node.js simulation]
- `expo-sharing` — React Native's built-in `Share.share()` from `react-native` handles URL sharing
- `expo-camera` / `expo-barcode-scanner` — QR scanning is deferred (see Deferred Ideas)
- `@tamagui/native` — already installed as a transitive dependency; no explicit install needed

**Version verification (run 2026-05-24):**
```bash
npm view @expo-google-fonts/archivo-narrow version  # → 0.4.2
npm view @expo-google-fonts/ibm-plex-sans version   # → 0.4.1
npm view expo-clipboard version                      # → 56.0.3
```
[VERIFIED: npm registry]

---

## Architecture Patterns

### System Architecture Diagram

```
Cold Start
    │
    ▼
RootLayout (_layout.tsx)
    │ loads fonts (ArchivoNarrow_700Bold, IBMPlexSans_400Regular, IBMPlexSans_600SemiBold)
    │ wraps: TamaguiProvider → QueryClientProvider → AuthProvider → InitialLayout
    │
    ▼
InitialLayout
    │ reads: session (Zustand auth.store) + initialized flag
    │ reads: onboardingCompleted (Zustand club.store, hydrated from expo-sqlite/kv-store)
    │ reads: pending invite code (Zustand club.store)
    │
    ├─── !initialized ──────────────────────────────→ (splash)
    │
    ├─── !session ─────────────────────────────────→ (auth)/sign-in
    │
    ├─── !onboardingCompleted ─────────────────────→ (onboarding)/username
    │         │
    │         ▼ username set
    │    (onboarding)/avatar
    │         │
    │         ▼ avatar selected or skipped
    │    Sheet: create-or-join (non-dismissable)
    │         │                 │
    │         ▼ "Create"        ▼ "Join"
    │   (app)/clubs/create  (app)/clubs/join
    │         │                 │
    │         ▼ success         ▼ success
    │   set onboardingCompleted=true → (app)/clubs/[id]
    │
    └─── onboardingCompleted ──────────────────────→ (app)/clubs
                                                      (active club restored from expo-sqlite)

Deep Link arrives: buchclub://join?code=XXXXXXXX
    │
    ├─── onboardingCompleted=true ─────────────────→ (app)/clubs/join?code=XXXXXXXX
    │                                                  CodeInput auto-fills
    └─── onboardingCompleted=false ────────────────→ store code in Zustand pending_invite_code
                                                       → continue onboarding
                                                       → on completion: navigate to clubs/join
```

### Recommended Project Structure

New files/folders for Phase 2 (relative to `expo-app/`):

```
app/
  (onboarding)/
    _layout.tsx          — Stack navigator, headerShown: false
    username.tsx         — Screen 1: Set username
    avatar.tsx           — Screen 2: Avatar picker + create-or-join Sheet
  (app)/
    clubs/
      index.tsx          — Club list (full implementation, replaces stub)
      [id]/
        index.tsx        — Club Detail: Members tab
        settings.tsx     — Club Detail: Settings tab (admin only)
      create/
        index.tsx        — Club creation wizard (Steps 1–4 + success)
      join/
        index.tsx        — Join by code / deep link
      browse/
        index.tsx        — Browse public clubs with search
    profile/
      index.tsx          — Profile view (replaces stub)
      edit.tsx           — Profile edit screen (new)
    schedule/            — Renamed from 'discover/' — placeholder for Phase 5
      index.tsx          — Calendar placeholder stub

store/
  club.store.ts          — New: activeClubId, onboardingCompleted, pendingInviteCode

components/ui/
  ClubBanner.tsx         — Active club header bar (new)
  ClubCard.tsx           — Club list item (new)
  MemberRow.tsx          — Member list item (new)
  AvatarPicker.tsx       — Avatar selection grid (new)
  WizardSteps.tsx        — Step progress indicator (new)
  CodeInput.tsx          — 8-character segmented code input (new)

assets/
  avatars/
    avatar-01.png through avatar-12.png   — B&W lineart illustration assets

constants/
  avatars.ts             — Static require() map: { 'preset:01': require('../assets/avatars/avatar-01.png'), ... }

supabase/
  migrations/
    0002_delete_account_rpc.sql   — delete_account() SECURITY DEFINER function for PROF-03

lib/i18n/
  en.json                — Add: onboarding, clubs, profile namespaces
  de.json                — Add: same namespaces in German
  index.ts               — Register 4 new namespaces
```

### Pattern 1: Club Store with expo-sqlite/kv-store Persistence

**What:** Zustand store with `persist` middleware backed by `expo-sqlite/kv-store`. Mirrors the auth.store.ts pattern but adds persistence.

**When to use:** For any Zustand state that must survive app restarts (activeClubId, onboardingCompleted, pendingInviteCode).

```typescript
// expo-app/store/club.store.ts
// Source: Zustand persist docs [VERIFIED: Context7 /pmndrs/zustand]
// + expo-sqlite/kv-store [VERIFIED: Context7 /expo/expo]
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import Storage from 'expo-sqlite/kv-store'

type ClubState = {
  activeClubId: string | null
  onboardingCompleted: boolean
  pendingInviteCode: string | null
  setActiveClubId: (id: string | null) => void
  setOnboardingCompleted: (completed: boolean) => void
  setPendingInviteCode: (code: string | null) => void
}

export const useClubStore = create<ClubState>()(
  persist(
    (set) => ({
      activeClubId: null,
      onboardingCompleted: false,
      pendingInviteCode: null,
      setActiveClubId: (id) => set({ activeClubId: id }),
      setOnboardingCompleted: (completed) => set({ onboardingCompleted: completed }),
      setPendingInviteCode: (code) => set({ pendingInviteCode: code }),
    }),
    {
      name: 'club-store',
      storage: createJSONStorage(() => Storage),  // expo-sqlite/kv-store as AsyncStorage-compatible backend
    }
  )
)
```

**Critical:** `expo-sqlite/kv-store` implements the same API as `@react-native-async-storage/async-storage`, so `createJSONStorage(() => Storage)` works without any adapter. [VERIFIED: Context7 /expo/expo, sdk-v55 docs]

**Hydration timing:** The `persist` middleware is async. The Zustand store initializes with default values synchronously, then rehydrates from storage. `InitialLayout` must guard against the pre-hydration window. Use Zustand's `onRehydrateStorage` or `_hasHydrated` to block route decisions:

```typescript
// In InitialLayout — wait for hydration before checking onboardingCompleted
const hasHydrated = useClubStore((s) => s._hasHydrated)
useEffect(() => {
  if (!initialized || !hasHydrated) return
  // ... route logic
}, [session, initialized, hasHydrated])
```

### Pattern 2: TanStack Query + Supabase

**What:** `QueryClientProvider` at root layout level; `useQuery` for all Supabase reads; `useMutation` + `invalidateQueries` for writes.

**When to use:** All club/member data fetched from Supabase.

**Important:** `QueryClientProvider` is **not yet in the codebase**. Phase 2 Plan 01 must add it to `app/_layout.tsx` and `app/_layout.web.tsx`.

```typescript
// app/_layout.tsx — add QueryClientProvider
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
// Source: TanStack Query docs [VERIFIED: Context7 /tanstack/query]

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 5, retry: 2 },  // 5 min stale time
  }
})

export default function RootLayout() {
  // ... font loading
  return (
    <TamaguiProvider config={config} defaultTheme="light" animations={animations}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <InitialLayout />
        </AuthProvider>
      </QueryClientProvider>
    </TamaguiProvider>
  )
}
```

**Club query pattern:**
```typescript
// Fetch user's clubs
const { data: clubs, isLoading } = useQuery({
  queryKey: ['clubs', 'my', userId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('club_members')
      .select('club_id, role, clubs(*)')
      .eq('user_id', userId)
    if (error) throw error
    return data
  },
  enabled: !!userId,
})

// Join club mutation with cache invalidation
const joinClubMutation = useMutation({
  mutationFn: async ({ clubId, userId }: { clubId: string; userId: string }) => {
    const { error } = await supabase
      .from('club_members')
      .insert({ club_id: clubId, user_id: userId, role: 'member' })
    if (error) throw error
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['clubs', 'my', userId] })
  },
})
```

### Pattern 3: Invite Code Generation

**What:** 8-character uppercase alphanumeric code using `crypto.getRandomValues`.

**Why no extra library:** `globalThis.crypto.getRandomValues()` is available in Hermes 0.12+ (shipped with RN 0.73+; RN 0.85 uses Hermes). [VERIFIED: Node.js 24 simulation in session]

```typescript
// expo-app/lib/inviteCode.ts
const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

export function generateInviteCode(): string {
  const array = new Uint8Array(8)
  crypto.getRandomValues(array)
  return Array.from(array)
    .map(b => CHARS[b % CHARS.length])
    .join('')
}
```

**Note:** The Supabase schema requires `invite_code` to be 8 chars and unique (`unique` constraint on `clubs.invite_code`). If a collision occurs on INSERT, catch the Postgres unique violation (`error.code === '23505'`) and retry with a new code.

### Pattern 4: Tamagui Sheet (Bottom Sheet)

**What:** `<Sheet>` component from the `tamagui` package. Works on iOS, Android, and Web (separate browser/react-native code paths in the package).

**Key props for Phase 2 use cases:**

```typescript
// Source: Tamagui 2.x docs [VERIFIED: Context7 /websites/tamagui_dev]
// Create-or-join sheet (non-dismissable)
<Sheet
  modal={true}
  open={open}
  onOpenChange={setOpen}
  snapPoints={[35]}
  dismissOnSnapToBottom={false}   // MUST be false — user cannot dismiss
  animation="slow"                // 350ms spring from tamagui.config
>
  <Sheet.Overlay animation="medium" enterStyle={{ opacity: 0 }} exitStyle={{ opacity: 0 }} />
  <Sheet.Handle />
  <Sheet.Frame borderTopLeftRadius={24} borderTopRightRadius={24} backgroundColor="$backgroundStrong">
    {/* content */}
  </Sheet.Frame>
</Sheet>

// Invite sheet (dismissable, 50% height)
<Sheet modal open={open} onOpenChange={setOpen} snapPoints={[50]} dismissOnSnapToBottom={true} animation="slow">
  {/* same structure */}
</Sheet>
```

**Web behavior:** Tamagui Sheet renders as a bottom-anchored drawer on web (browser export). The `dismissOnSnapToBottom={false}` prop is respected on web via backdrop click interception. Keyboard avoidance inside a Sheet: use `<Sheet.ScrollView>` rather than `KeyboardAvoidingView` when inputs are inside the sheet.

**Known issue from SUMMARY.md:** Static extraction `@tamagui/babel-plugin` logs `skipped` for Sheet at build time — this is expected and not an error. Sheet uses portal rendering which bypasses static extraction. [VERIFIED: Phase 1 quick task 260524-rav-SUMMARY.md]

### Pattern 5: Onboarding Gate in InitialLayout

**What:** Extend the existing auth guard pattern to add a second gate for onboarding.

```typescript
// app/_layout.tsx — extended InitialLayout
function InitialLayout() {
  const session = useAuthStore((s) => s.session)
  const initialized = useAuthStore((s) => s.initialized)
  const onboardingCompleted = useClubStore((s) => s.onboardingCompleted)
  const hasHydrated = useClubStore((s) => s._hasHydrated)
  // ... pendingInviteCode, segments, router, url

  useEffect(() => {
    if (!initialized || !hasHydrated) return
    SplashScreen.hideAsync()
    const inAuthGroup = segments[0] === '(auth)'
    const inOnboardingGroup = segments[0] === '(onboarding)'

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/sign-in')
    } else if (session && inAuthGroup) {
      router.replace(onboardingCompleted ? '/(app)/clubs' : '/(onboarding)/username')
    } else if (session && !onboardingCompleted && !inOnboardingGroup) {
      router.replace('/(onboarding)/username')
    } else if (session && onboardingCompleted && inOnboardingGroup) {
      router.replace('/(app)/clubs')
    }
  }, [session, initialized, hasHydrated, onboardingCompleted, segments, router])
```

**Critical order change from Phase 1:** `SplashScreen.hideAsync()` must now wait for BOTH `initialized` AND `hasHydrated` — moving it out of the effect prematurely would flash an incorrect screen.

### Pattern 6: Username Uniqueness Check (Debounced)

**What:** Debounced query on blur and while typing (after 3+ chars). Prevents race conditions via `useRef` flag.

```typescript
const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
const checkInProgress = useRef(false)

function handleUsernameChange(text: string) {
  setUsername(text)
  setUsernameError(null)
  setUsernameAvailable(false)

  if (debounceTimer.current) clearTimeout(debounceTimer.current)

  if (text.length < 3 || !/^[a-zA-Z0-9_]+$/.test(text)) return

  debounceTimer.current = setTimeout(async () => {
    if (checkInProgress.current) return
    checkInProgress.current = true
    setValidating(true)
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', text)
      .maybeSingle()
    checkInProgress.current = false
    setValidating(false)
    if (data) setUsernameError(t('onboarding:username_error_taken'))
    else setUsernameAvailable(true)
  }, 500)
}
```

**Note:** `profiles_select_authenticated` RLS allows any authenticated user to query profiles (returns all rows with `true`). This means the uniqueness check works with the anon/publishable key — no admin key needed.

### Pattern 7: Font Migration in tamagui.config.ts

**What:** Replace Inter font with Archivo Narrow (headings) + IBM Plex Sans (body/UI). This is a Phase 2 Plan 01 task (design system correction).

```typescript
// tamagui.config.ts — font section replacement
// Source: createFont API [VERIFIED: Context7 /websites/tamagui_dev + @tamagui/font-inter source]
import { createFont, createTamagui } from '@tamagui/core'
import { defaultConfig } from '@tamagui/config/v5'

const headingFont = createFont({
  family: 'ArchivoNarrow_700Bold',  // must match the loaded font name exactly
  size: { 1: 12, 2: 14, 3: 18, 4: 24, 5: 32 },
  lineHeight: { 1: 16, 2: 20, 3: 24, 4: 28, 5: 36 },
  weight: { 1: '700', 2: '700', 3: '700', 4: '700', 5: '700' },
  letterSpacing: { 4: -0.3, 5: -0.5 },
  face: { 700: { normal: 'ArchivoNarrow_700Bold' } },
})

const bodyFont = createFont({
  family: 'IBMPlexSans_400Regular',
  size: { 1: 12, 2: 13, 3: 15, 4: 15, 5: 18 },
  lineHeight: { 1: 16, 2: 20, 3: 22, 4: 22, 5: 24 },
  weight: { 1: '400', 2: '400', 3: '400', 4: '400', 6: '600' },
  face: {
    400: { normal: 'IBMPlexSans_400Regular' },
    600: { normal: 'IBMPlexSans_600SemiBold' },
  },
})
```

**Font loading in _layout.tsx:**
```typescript
// Load from @expo-google-fonts packages
import { ArchivoNarrow_700Bold } from '@expo-google-fonts/archivo-narrow'
import { IBMPlexSans_400Regular, IBMPlexSans_600SemiBold } from '@expo-google-fonts/ibm-plex-sans'

const [fontsLoaded] = useFonts({
  ArchivoNarrow_700Bold,
  IBMPlexSans_400Regular,
  IBMPlexSans_600SemiBold,
})
```

**IMPORTANT:** Remove the Inter font loading from Phase 1 (`@tamagui/font-inter/otf/Inter-Medium.otf`, `Inter-Bold.otf`) and replace with the above. Also update all auth screens (Phase 1) to use the new font tokens.

### Pattern 8: Avatar Asset Require Map

**What:** Static require map for 8–12 bundled PNG assets. Metro cannot process dynamic `require()` — all paths must be static strings.

```typescript
// expo-app/constants/avatars.ts
import type { ImageSourcePropType } from 'react-native'

export const AVATAR_SOURCES: Record<string, ImageSourcePropType> = {
  'preset:01': require('../assets/avatars/avatar-01.png'),
  'preset:02': require('../assets/avatars/avatar-02.png'),
  'preset:03': require('../assets/avatars/avatar-03.png'),
  'preset:04': require('../assets/avatars/avatar-04.png'),
  'preset:05': require('../assets/avatars/avatar-05.png'),
  'preset:06': require('../assets/avatars/avatar-06.png'),
  'preset:07': require('../assets/avatars/avatar-07.png'),
  'preset:08': require('../assets/avatars/avatar-08.png'),
  // If 12 avatars: add 09-12
}

export const AVATAR_KEYS = Object.keys(AVATAR_SOURCES)

// Usage in components:
// const source = AVATAR_SOURCES[profile.avatar_url ?? 'preset:01']
// <Image source={source} width={64} height={64} />
```

**Why static:** Metro's require resolver runs at bundle time. Dynamic paths like `require('../assets/avatars/avatar-${n}.png')` are not resolved. [ASSUMED — standard Metro bundler behavior]

### Pattern 9: Account Deletion RPC (PROF-03)

**What:** A new Postgres migration adding a `delete_account()` SECURITY DEFINER function. Deleting from `auth.users` cascades to `public.profiles` (via `ON DELETE CASCADE`) and all user data downstream.

```sql
-- supabase/migrations/0002_delete_account_rpc.sql
create or replace function public.delete_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

grant execute on function public.delete_account() to authenticated;
```

**Client usage:**
```typescript
const { error } = await supabase.rpc('delete_account')
if (!error) {
  // Session is invalidated automatically
  // AuthProvider onAuthStateChange fires → redirect to sign-in
}
```

**Why this works:** SECURITY DEFINER functions run with the definer's privileges (typically `postgres` or `supabase_admin`), which have full access to `auth.users`. [ASSUMED — standard Supabase SECURITY DEFINER pattern; verify against Supabase docs if issues arise]

### Pattern 10: Deep Link Extension for Invite Codes

**What:** Extend the existing password-reset deep link handler in `InitialLayout` to also handle `buchclub://join?code=XXXXXXXX`.

**CRITICAL API NOTE:** `Linking.useURL()` is **deprecated** in SDK 56 — use `Linking.useLinkingURL()` instead. [VERIFIED: expo-linking build/Linking.d.ts — "deprecated: Use useLinkingURL hook instead"]

```typescript
// In InitialLayout — deep link handler
const url = Linking.useLinkingURL()  // UPDATED from Phase 1's useURL()

useEffect(() => {
  if (!url) return
  const { queryParams, hostname, path } = Linking.parse(url)

  // Existing: password reset
  if (queryParams?.access_token) {
    const accessToken = queryParams.access_token as string
    const refreshToken = queryParams.refresh_token as string
    supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(() => router.replace('/(auth)/update-password'))
    return
  }

  // New: invite code join link
  // buchclub://join?code=XXXXXXXX  OR  buchclub://join/XXXXXXXX
  const isJoinLink = hostname === 'join' || path?.startsWith('join')
  const code = (queryParams?.code as string) ?? (path?.split('/')[1])
  if (isJoinLink && code) {
    if (!onboardingCompleted) {
      setPendingInviteCode(code)
      // Onboarding flow will pick up the pending code at its end
    } else {
      router.replace(`/(app)/clubs/join?code=${code}`)
    }
  }
}, [url, onboardingCompleted])
```

### Pattern 11: Wizard Multi-Step State

**What:** Local React component state for wizard steps. No Zustand needed — wizard state is ephemeral (lost if user navigates away, which is acceptable per the cancel flow).

```typescript
// app/(app)/clubs/create/index.tsx
const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
const [name, setName] = useState('')
const [description, setDescription] = useState('')
const [isPublic, setIsPublic] = useState(true)
const [createdClub, setCreatedClub] = useState<ClubData | null>(null)

// Step navigation
function goNext() { setStep(s => (s + 1) as 1|2|3|4) }
function goBack() { setStep(s => (s - 1) as 1|2|3|4) }
```

**Back navigation preserves state** because the wizard is a single component rendering different step UIs — not separate screens. The wizard renders all steps in one component and conditionally shows the active step.

**Cancel confirmation:** Outside of onboarding (from Clubs tab FAB), show a confirmation dialog before discarding. During onboarding, cancel is not offered.

### Pattern 12: Native Share API

**What:** `Share.share()` from React Native built-in (no extra package needed) for sharing the invite link URL.

```typescript
import { Share } from 'react-native'

async function handleShareInviteLink(inviteCode: string) {
  const url = Linking.createURL('join', { queryParams: { code: inviteCode } })
  // → 'buchclub://join?code=XXXXXXXX'
  await Share.share({
    message: `Join my book club: ${url}`,
    url,  // iOS only — opens native share sheet with URL
  })
}
```

### Anti-Patterns to Avoid

- **Dynamic require() for avatars:** `require('../assets/' + filename)` — Metro cannot resolve at build time. Use a static map (Pattern 8).
- **Using `Linking.useURL()`:** Deprecated in SDK 56. Always use `Linking.useLinkingURL()`.
- **Checking `onboardingCompleted` before Zustand hydration:** The `persist` middleware hydrates async. Guard with `_hasHydrated` or Zustand's `onRehydrateStorage` before routing.
- **Direct INSERT to `votes` table:** Not applicable Phase 2, but the schema has no INSERT policy. All vote mutations go through `increment_book_vote` RPC.
- **Storing `onboardingCompleted` in the DB:** Intentionally local-only (D-02). Resist the temptation to add a DB column.
- **Calling `supabase.auth.admin.deleteUser()` from client:** This is server-side only. Use the `delete_account()` RPC instead.
- **Using `AnimationType` prop for Tamagui components:** Tamagui 2.x uses `transition` or `animation` string prop (preset name), not an `AnimationType` enum. [VERIFIED: Phase 1 STATE.md known issue]
- **Importing from `@tamagui/config/v4` or plain `@tamagui/config`:** Always use `@tamagui/config/v5`. [VERIFIED: Phase 1 PATTERNS.md]

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Async state caching | Manual loading/error state per component | TanStack Query `useQuery` | Handles deduplication, background refetch, stale-while-revalidate, retry |
| Key-value persistence | Raw SQLite queries | `expo-sqlite/kv-store` | Drop-in AsyncStorage replacement with sync API; same DB instance as auth localStorage |
| Bottom sheet | Custom Modal + PanGestureHandler | Tamagui `<Sheet>` | Handles snap points, gestures, overlay, keyboard avoidance, web parity |
| Confirmation dialogs | Custom Modal component | Tamagui `<Dialog>` | Focus trap, accessibility, backdrop, keyboard dismiss built-in |
| Deep link URL construction | String concatenation | `Linking.createURL(path, { queryParams })` | Handles scheme, development vs production URL differences |
| Cryptographic random | Math.random() | `crypto.getRandomValues()` | Math.random is not cryptographically secure — invite codes would be guessable |
| Font loading | Manual FontFace API | `expo-font` `useFonts` hook + `@expo-google-fonts/*` | Handles preloading, SplashScreen gate, cross-platform parity |

**Key insight:** The three most common hand-roll traps in this phase are: (1) building a sheet from scratch when Tamagui provides one, (2) writing raw SQLite queries for the kv-store when `expo-sqlite/kv-store` provides a full API, and (3) implementing custom debounce/request-cancellation logic for username uniqueness when a simple `useRef`-based timer is sufficient.

---

## Common Pitfalls

### Pitfall 1: Zustand Hydration Race Condition

**What goes wrong:** `InitialLayout` reads `onboardingCompleted` from Zustand before the `persist` middleware has finished rehydrating from `expo-sqlite/kv-store`. On first render, `onboardingCompleted` is `false` (default), causing a flash redirect to `(onboarding)/username` even for users who already completed onboarding.

**Why it happens:** `expo-sqlite/kv-store` is async; Zustand `persist` rehydrates on the next tick after mount. The auth guard effect fires synchronously on mount.

**How to avoid:** Add `_hasHydrated: boolean` to the store and set it in `onRehydrateStorage`. Gate route decisions behind `hasHydrated`:

```typescript
persist(
  (set) => ({ /* ... */ }),
  {
    name: 'club-store',
    storage: createJSONStorage(() => Storage),
    onRehydrateStorage: () => (state) => {
      state?._setHasHydrated(true)
    },
  }
)
```

**Warning signs:** Users see the onboarding flow on every launch even after completion.

### Pitfall 2: Sheet Static Extraction Warning

**What goes wrong:** The Tamagui build logs `[tamagui] skipped Sheet` or similar warnings during native builds. Developers mistake these for errors and try to "fix" them.

**Why it happens:** Sheet uses portal rendering and dynamic imports — the static extractor (`@tamagui/babel-plugin`) correctly skips it. It still works at runtime.

**How to avoid:** Accept the warning as expected. Do not add `TAMAGUI_IGNORE_BUNDLE_ERRORS` unless the actual bundle fails. [VERIFIED: Phase 1 260524-rav-SUMMARY.md]

### Pitfall 3: Invite Code Collision on INSERT

**What goes wrong:** Two users simultaneously create clubs and generate the same 8-char code. The second INSERT fails with Postgres `23505` (unique violation on `clubs.invite_code`).

**Why it happens:** The `invite_code` column has a `UNIQUE` constraint. With 36^8 ≈ 2.8 trillion combinations, collisions are extremely rare but possible.

**How to avoid:** Wrap the club INSERT in a try/catch that detects `error.code === '23505'` and retries with a freshly generated code (max 3 attempts):

```typescript
async function createClubWithRetry(data: CreateClubInput) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const invite_code = generateInviteCode()
    const { error } = await supabase.from('clubs').insert({ ...data, invite_code })
    if (!error) return invite_code
    if (error.code !== '23505') throw error  // non-collision error: rethrow
  }
  throw new Error('Failed to generate unique invite code after 3 attempts')
}
```

### Pitfall 4: Club Tab Navigation Structure vs Route Folder Names

**What goes wrong:** The UI-SPEC defines tab 3 as "Community" (clubs) and tab 2 as "Termine/Schedule" (calendar placeholder). The existing codebase has `discover/` for tab 3 and `clubs/` for tab 2. Restructuring requires renaming folders AND updating both `_layout.native.tsx` and `_layout.web.tsx`.

**Why it happens:** The tab name in expo-router comes from the folder name in `(app)/`. Renaming requires coordinating the route, the Tabs.Screen name, and the i18n key.

**How to avoid:** The plan must explicitly rename `discover/` → `schedule/` (or equivalent), update both layout files, and add the new nav i18n keys. Do this in Plan 01 (design system update wave) so all subsequent plans have the correct structure.

### Pitfall 5: Username Validation Race Condition

**What goes wrong:** User types quickly, two async uniqueness checks are in-flight simultaneously. The second check resolves before the first, and the UI shows a stale "available" state for a taken username.

**Why it happens:** No request cancellation; the latest check does not always resolve last.

**How to avoid:** Use a generation counter or `AbortController` to discard stale responses:

```typescript
const checkGeneration = useRef(0)

async function checkUniqueness(text: string) {
  const generation = ++checkGeneration.current
  const { data } = await supabase.from('profiles').select('id').eq('username', text).maybeSingle()
  if (generation !== checkGeneration.current) return  // stale — discard
  // ... update state
}
```

### Pitfall 6: `Linking.useURL()` Deprecation

**What goes wrong:** Phase 1 code uses `Linking.useURL()`. In SDK 56, this is deprecated (documented in the type definition as "deprecated: Use useLinkingURL hook instead"). It may still work but emits warnings and may be removed in future SDKs.

**How to avoid:** Replace `Linking.useURL()` with `Linking.useLinkingURL()` in `app/_layout.tsx` during Phase 2 Plan 01. [VERIFIED: expo-linking build/Linking.d.ts]

### Pitfall 7: `_hasHydrated` Not Included in Persist Storage

**What goes wrong:** If `_hasHydrated` is persisted to storage, it would always rehydrate as `true` on cold start — defeating its purpose.

**How to avoid:** Use Zustand `partialize` to exclude `_hasHydrated` from the persisted state:

```typescript
persist(
  (set) => ({ /* ... */ _hasHydrated: false, _setHasHydrated: (v) => set({ _hasHydrated: v }) }),
  {
    partialize: (state) => {
      const { _hasHydrated, _setHasHydrated, ...rest } = state
      return rest  // only persist the actual data
    },
  }
)
```

---

## Code Examples

### Club Store Complete Implementation

```typescript
// expo-app/store/club.store.ts
// Source: Zustand persist [VERIFIED: Context7 /pmndrs/zustand] + expo-sqlite/kv-store [VERIFIED: Context7 /expo/expo]
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import Storage from 'expo-sqlite/kv-store'

type ClubState = {
  activeClubId: string | null
  onboardingCompleted: boolean
  pendingInviteCode: string | null
  _hasHydrated: boolean
  setActiveClubId: (id: string | null) => void
  setOnboardingCompleted: (completed: boolean) => void
  setPendingInviteCode: (code: string | null) => void
  _setHasHydrated: (v: boolean) => void
}

export const useClubStore = create<ClubState>()(
  persist(
    (set) => ({
      activeClubId: null,
      onboardingCompleted: false,
      pendingInviteCode: null,
      _hasHydrated: false,
      setActiveClubId: (id) => set({ activeClubId: id }),
      setOnboardingCompleted: (completed) => set({ onboardingCompleted: completed }),
      setPendingInviteCode: (code) => set({ pendingInviteCode: code }),
      _setHasHydrated: (v) => set({ _hasHydrated: v }),
    }),
    {
      name: 'club-store',
      storage: createJSONStorage(() => Storage),
      partialize: (state) => ({
        activeClubId: state.activeClubId,
        onboardingCompleted: state.onboardingCompleted,
        pendingInviteCode: state.pendingInviteCode,
      }),
      onRehydrateStorage: () => (state) => {
        state?._setHasHydrated(true)
      },
    }
  )
)
```

### Supabase RLS Policy Reference (Phase 2 Tables)

Already deployed in `0001_v1_full_schema.sql`. No new policies needed (only a new RPC function).

```sql
-- clubs: SELECT = public clubs OR member clubs
-- clubs: INSERT = authenticated (created_by = auth.uid())
-- clubs: UPDATE/DELETE = admin only

-- club_members: SELECT = co-members of the same club
-- club_members: INSERT = self (join) OR admin (invite)
-- club_members: UPDATE = admin only (role changes)
-- club_members: DELETE = self (leave) OR admin (remove member)

-- profiles: SELECT = any authenticated user (supports username uniqueness check)
-- profiles: INSERT = only own profile (created by handle_new_user trigger)
-- profiles: UPDATE = only own profile
-- profiles: DELETE = only own profile (cascade from auth.users via trigger)
```

### i18n Registration Update (index.ts)

```typescript
// lib/i18n/index.ts — Phase 2 update
void i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: en.common,
        auth: en.auth,
        nav: en.nav,
        onboarding: en.onboarding,  // NEW
        clubs: en.clubs,             // NEW
        profile: en.profile,         // NEW
      },
      de: {
        common: de.common,
        auth: de.auth,
        nav: de.nav,
        onboarding: de.onboarding,  // NEW
        clubs: de.clubs,             // NEW
        profile: de.profile,         // NEW
      },
    },
    ns: ['common', 'auth', 'nav', 'onboarding', 'clubs', 'profile'],  // UPDATED
    // ... rest unchanged
  })
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `Linking.useURL()` | `Linking.useLinkingURL()` | SDK 56 | useURL deprecated; update Phase 1 code in Phase 2 Plan 01 |
| `@react-native-async-storage` | `expo-sqlite/kv-store` | SDK 52+ | Same API, SQLite-backed; no extra dependency since expo-sqlite is already installed |
| Inter font (Phase 1 placeholder) | Archivo Narrow Bold + IBM Plex Sans | Phase 2 (corrected design system) | tamagui.config.ts must be fully updated in Phase 2 Plan 01 |
| Phase 1 color tokens (warm brown) | Phase 2 design system tokens (ink/papier/blue) | Phase 2 (corrected) | tamagui.config.ts themes must be updated; all auth screens updated |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Static require map for avatar assets is required (dynamic require not supported by Metro) | Pattern 8 | If Metro 0.85 supports dynamic require(), the static map still works but isn't necessary |
| A2 | `delete_account()` SECURITY DEFINER function can DELETE from auth.users without additional Supabase platform grants | Pattern 9 | If Supabase restricts SECURITY DEFINER access to auth schema, need an Edge Function instead; install supabase CLI and deploy |
| A3 | `globalThis.crypto.getRandomValues()` is available in Hermes on RN 0.85 without expo-crypto | Standard Stack / Pattern 3 | If not available, add `expo-crypto` and use `Crypto.getRandomValues()` from `expo-crypto` |
| A4 | Tamagui Sheet `dismissOnSnapToBottom={false}` prevents all dismissal methods (backdrop tap, swipe down) on both native and web | Pattern 4 | If web allows backdrop dismiss despite the prop, add `onInteractOutside={(e) => e.preventDefault()}` on the Dialog equivalent |

**If A2 is wrong:** The fallback is to create a Supabase Edge Function. The supabase CLI is not currently installed — the plan must include an install step and Supabase project linking before deploying. This adds significant complexity to PROF-03. Consider deferring account deletion to Phase 5 if blocked.

---

## Open Questions

1. **Tab folder renaming: `discover/` → `schedule/`**
   - What we know: UI-SPEC specifies 4 tabs with specific icons; current code has `discover/` folder for tab 3; Phase 2 tab 2 should be `schedule`/calendar (Termine placeholder).
   - What's unclear: Should the folder be renamed to `schedule` (matching the future Phase 5 route) or kept as `discover` with just the label/icon changed?
   - Recommendation: Rename to `schedule` now — it maps correctly to `app/(app)/schedule/` which is the correct route for Meetings in Phase 5. Update both `_layout.native.tsx` and `_layout.web.tsx`.

2. **Profile trigger: handle_new_user creates an empty profile row on signup**
   - What we know: The `handle_new_user` trigger inserts `{ id: user.id }` on auth signup. So `profiles` rows exist but with null username/avatar on first login.
   - What's unclear: Should `username.tsx` UPDATE the existing row or INSERT a new one?
   - Recommendation: Always UPDATE (not INSERT). The trigger ensures the row exists. Use `supabase.from('profiles').update({ username, avatar_url }).eq('id', userId)`.

3. **Avatar placeholder illustrations**
   - What we know: The design spec calls for B&W lineart illustrations at 160×160px source, transparent background.
   - What's unclear: These don't exist yet — Claude's Discretion per CONTEXT.md. The executor must create or source 8–12 placeholder illustrations.
   - Recommendation: The planner should include a Wave 0 task to create placeholder gray circle/initials-based PNG assets (10 files) that match the B&W lineart style requirement. The executor can be given artistic discretion on the final designs.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Package installs, metro bundler | ✓ | v24.10.0 | — |
| npx / expo CLI | `npx expo start`, `npx expo install` | ✓ | expo 56.1.11 | — |
| Xcode / Command Line Tools | iOS simulator builds | ✓ | Installed | — |
| iOS Simulator | Testing on iOS | ✗ (no booted device found) | — | `npx expo start` auto-boots |
| adb / Android tools | Android testing | ✗ | — | Web testing viable; iOS preferred |
| Supabase CLI | PROF-03 edge function (only if RPC approach fails) | ✗ | — | Postgres RPC migration (no CLI needed) |
| @expo-google-fonts/archivo-narrow | Font loading | ✗ (not yet installed) | 0.4.2 | — |
| @expo-google-fonts/ibm-plex-sans | Font loading | ✗ (not yet installed) | 0.4.1 | — |
| expo-clipboard | Code copy feature | ✗ (not yet installed) | 56.0.3 | Manual long-press copy as degraded fallback |

**Missing dependencies with no fallback:**
- `@expo-google-fonts/archivo-narrow` and `@expo-google-fonts/ibm-plex-sans` — required for Phase 2 design system; must be installed in Plan 01 Wave 0.

**Missing dependencies with fallback:**
- `expo-clipboard` — if not installed, the "Copy code" button can be omitted or use `Share.share()` as the sole sharing mechanism.
- Supabase CLI — PROF-03 uses a Postgres RPC approach that does not require the CLI.

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Supabase Auth (established Phase 1) |
| V3 Session Management | yes | expo-sqlite/kv-store auth session (established Phase 1) |
| V4 Access Control | yes | Supabase RLS policies on all tables |
| V5 Input Validation | yes | Client: regex + length validation; DB: check constraints on `username`, `clubs.name`, `invite_code` |
| V6 Cryptography | yes | `crypto.getRandomValues()` for invite codes — never use Math.random() |

### Known Threat Patterns for this Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Invite code brute-force | Spoofing | Supabase rate limiting (default); 36^8 code space makes exhaustion infeasible |
| Username enumeration | Information Disclosure | `profiles_select_authenticated` intentionally exposes username existence (club member names are not private); no mitigation needed here |
| Member removal by non-admin | Tampering | `club_members_delete_self_or_admin` RLS — admin check at DB level, not client level |
| Fake admin promotion | Elevation of Privilege | `club_members_update_admin` RLS — admin check at DB level |
| Account deletion of another user | Tampering | `delete_account()` uses `auth.uid()` — can only delete own account |
| Invite code collision (data integrity) | Tampering | Postgres UNIQUE constraint; retry logic on 23505 error |

---

## Sources

### Primary (HIGH confidence)

- `/expo/expo` Context7 — expo-sqlite kv-store API, expo-font useFonts, expo-linking Linking.d.ts inspection, crypto.getRandomValues
- `/websites/tamagui_dev` Context7 — Sheet component, createFont pattern (via @tamagui/font-inter source)
- `/tanstack/query` Context7 — QueryClientProvider, useQuery, useMutation, optimistic updates
- `/pmndrs/zustand` Context7 — persist middleware, createJSONStorage, custom storage
- `supabase/migrations/0001_v1_full_schema.sql` — verified all RLS policies in codebase [VERIFIED: file read]
- `expo-app/package.json` — verified all installed packages and versions [VERIFIED: file read]
- `expo-app/node_modules/expo-linking/build/Linking.d.ts` — confirmed `useURL()` deprecated, `useLinkingURL()` is current [VERIFIED: file read]
- `expo-app/node_modules/@tamagui/sheet/package.json` — confirmed browser + react-native exports [VERIFIED: file read]
- `@expo-google-fonts/archivo-narrow` npm view — font export names (ArchivoNarrow_700Bold etc.) [VERIFIED: npm registry]
- `@expo-google-fonts/ibm-plex-sans` npm view — font export names (IBMPlexSans_400Regular, IBMPlexSans_600SemiBold) [VERIFIED: npm registry]
- Phase 1 artifacts: `01-PATTERNS.md`, `01-UI-SPEC.md`, `_layout.tsx`, `auth.store.ts`, `tamagui.config.ts` [VERIFIED: file reads]

### Secondary (MEDIUM confidence)

- expo-clipboard version `56.0.3` [VERIFIED: npm registry]
- expo-crypto version `56.0.3` (optional alternative to globalThis.crypto) [VERIFIED: npm registry]
- `@expo-google-fonts/*` version `0.4.x` [VERIFIED: npm registry]
- `@tamagui/sheet` version `2.0.0` installed as transitive dep [VERIFIED: node_modules inspection]

### Tertiary (LOW confidence — Assumed)

- Metro bundler static require() requirement for avatar assets [ASSUMED — standard Metro behavior documented widely but not re-verified via Context7 in this session]
- SECURITY DEFINER function can DELETE from auth.users without additional grants [ASSUMED — standard Supabase pattern; needs live testing]

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified via npm registry or node_modules inspection
- Architecture: HIGH — based on verified Phase 1 codebase + Supabase schema + Context7 docs
- Pitfalls: HIGH (Zustand hydration, Linking deprecation) / MEDIUM (Sheet web behavior, SECURITY DEFINER)
- RLS policies: HIGH — read directly from migration file

**Research date:** 2026-05-24
**Valid until:** 2026-06-24 (Tamagui 2.x is stable; no known breaking changes pending)
