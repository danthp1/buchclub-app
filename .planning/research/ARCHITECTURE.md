# Architecture Patterns

**Project:** Buchclub — Universal Expo + Tamagui + Supabase Book Club App
**Researched:** 2026-05-24
**Confidence:** HIGH (Context7 official docs + Expo/Supabase official documentation)

---

## Recommended Architecture

The app is a **universal Expo app** using **Expo Router** (file-system routing) with a
layered architecture: routing/presentation -> state -> service -> Supabase backend. The
Expo app lives inside the existing repo as a standalone directory (`expo-app/`) so it
does not disturb the existing Next.js app.

```
Browser / iOS / Android
        |
   Expo Router (app/ directory)
        |
   Screen Components (Tamagui UI)
        |
   ┌────────────┬──────────────┐
   │ Zustand    │ React Query  │
   │ (auth +    │ (remote data │
   │  UI state) │  + caching)  │
   └────────────┴──────────────┘
        |
   Service Layer  (lib/services/)
   ┌──────────────┬──────────────┐
   │ supabase/    │ books/       │
   │ (db + auth + │ (Google Books│
   │  realtime)   │  + OpenLib)  │
   └──────────────┴──────────────┘
        |
   ┌──────────────────────────────┐
   │  Supabase (Postgres + Auth   │
   │  + Realtime + RPC functions) │
   └──────────────────────────────┘
```

---

## File / Folder Structure

The Expo app sits at the repo root level alongside the Next.js app. Inside it the layout
follows Expo Router conventions with clear separation of concerns.

```
expo-app/                          # New Expo universal app root
├── app/                           # Expo Router: every file = a route
│   ├── _layout.tsx                # Root layout: TamaguiProvider + auth guard
│   ├── (auth)/                    # Route group: unauthenticated screens
│   │   ├── _layout.tsx            # Stack layout, no header
│   │   ├── sign-in.tsx
│   │   └── sign-up.tsx
│   ├── (app)/                     # Route group: protected screens
│   │   ├── _layout.tsx            # Stack with Stack.Protected guard={isLoggedIn}
│   │   ├── (tabs)/                # Bottom tab navigator
│   │   │   ├── _layout.tsx        # Tabs config (platform-specific see below)
│   │   │   ├── _layout.native.tsx # NativeTabs for iOS/Android
│   │   │   ├── _layout.web.tsx    # Custom web tab bar via expo-router/ui
│   │   │   ├── index.tsx          # Tab: My Books (personal reading list)
│   │   │   ├── clubs.tsx          # Tab: My Clubs
│   │   │   ├── discover.tsx       # Tab: Discover public clubs
│   │   │   └── profile.tsx        # Tab: Profile + settings
│   │   ├── clubs/
│   │   │   ├── [clubId]/
│   │   │   │   ├── _layout.tsx    # Club detail stack
│   │   │   │   ├── index.tsx      # Club home: current meeting, book pool
│   │   │   │   ├── pool.tsx       # Full book pool + voting
│   │   │   │   ├── meetings.tsx   # All meetings list
│   │   │   │   └── members.tsx    # Member list + admin controls
│   │   │   ├── create.tsx         # Create club modal
│   │   │   └── join.tsx           # Join by invite code
│   │   ├── books/
│   │   │   ├── search.tsx         # Google Books search
│   │   │   └── [bookId].tsx       # Book detail + add to list
│   │   └── meetings/
│   │       └── [meetingId].tsx    # Meeting detail + live vote view
│   └── +not-found.tsx
│
├── components/                    # Reusable Tamagui UI components
│   ├── ui/                        # Pure presentational (no data fetching)
│   │   ├── BookCard.tsx
│   │   ├── ClubCard.tsx
│   │   ├── VoteButton.tsx
│   │   └── MeetingCard.tsx
│   └── providers/
│       ├── AuthProvider.tsx       # Exposes useAuth() hook + session state
│       └── I18nProvider.tsx       # i18n context (i18next / expo-localization)
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts              # Singleton supabase client (see below)
│   │   └── types.ts               # Generated DB types (supabase gen types)
│   ├── services/
│   │   ├── auth.service.ts        # Auth: sign in, sign up, sign out
│   │   ├── clubs.service.ts       # Club CRUD + invite code generation
│   │   ├── members.service.ts     # Club membership + admin promotion
│   │   ├── books.service.ts       # Personal reading list operations
│   │   ├── pool.service.ts        # Club book pool: propose, vote (via RPC)
│   │   ├── meetings.service.ts    # Meeting CRUD
│   │   └── google-books.service.ts# Google Books API + OpenLibrary fallback
│   ├── stores/
│   │   ├── auth.store.ts          # Zustand slice: session + user profile
│   │   └── ui.store.ts            # Zustand slice: theme, locale, loading flags
│   ├── hooks/
│   │   ├── useClubVotes.ts        # Realtime subscription for vote changes
│   │   ├── useClubPool.ts         # React Query + realtime hybrid for pool
│   │   └── useAuth.ts             # Derived hook from auth.store + AuthProvider
│   └── i18n/
│       ├── index.ts               # i18next init, language detection
│       ├── de.json                # German translations
│       └── en.json                # English translations
│
├── tamagui.config.ts              # Tamagui config: tokens, themes, fonts, media
├── app.json                       # Expo config
├── babel.config.js                # Tamagui compiler plugin + path aliases
└── tsconfig.json                  # Extends root, paths: @/* -> ./
```

**Why this structure:**
- Route groups `(auth)` and `(app)` keep unauthenticated screens cleanly separated from protected screens without URL path leakage.
- `lib/services/` is a pure TypeScript layer; it has no React imports, making it fully testable and importable from any screen.
- `lib/stores/` holds only ephemeral client state; server data lives in React Query cache.
- Platform-specific `_layout.native.tsx` / `_layout.web.tsx` lets the tab bar use native platform controls on mobile and a styled web nav on browser, per official Expo Router docs.

---

## Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `app/_layout.tsx` | Mount TamaguiProvider, I18nProvider, AuthProvider; route guard | AuthProvider, Tamagui config |
| `app/(app)/_layout.tsx` | Stack.Protected guard based on auth state | AuthProvider (via useAuth hook) |
| `app/(app)/(tabs)/` | Screen-level composition, data fetching via hooks | Zustand, React Query hooks |
| `components/ui/*` | Render only — receive data as props, emit callbacks | Nothing (pure) |
| `components/providers/AuthProvider` | Manages Supabase auth listener, surfaces session | supabase/client.ts singleton |
| `lib/supabase/client.ts` | Single Supabase client instance | Process env vars at init time |
| `lib/services/*` | Data operations, no state, return promises | supabase/client.ts, fetch (Google Books) |
| `lib/stores/auth.store.ts` | Zustand: userId, profile, isLoggedIn | Populated by AuthProvider |
| `lib/stores/ui.store.ts` | Zustand: locale, theme preference | i18n init, Tamagui theme |
| `lib/hooks/useClubVotes.ts` | Supabase Realtime subscription per club | supabase/client.ts, React Query invalidate |
| `tamagui.config.ts` | Design tokens, fonts, media queries, themes | Imported by app/_layout.tsx once |

**Strict rule:** screens (`app/`) call hooks; hooks call services; services call the Supabase singleton or external APIs. No screen imports `supabase/client.ts` directly.

---

## Data Flow

### Authentication Flow

```
User submits credentials
  → auth.service.ts (signInWithPassword)
    → Supabase Auth
      → onAuthStateChange fires in AuthProvider
        → Zustand auth.store updated (session, user profile)
          → Stack.Protected re-evaluates guard
            → Router navigates to (app)/(tabs)/index
```

### Reading Data (query path)

```
Screen mounts
  → React Query useQuery([key, params])
    → service function (e.g. clubs.service.getMyClubs)
      → supabase.from('clubs').select(...)  [RLS filters automatically]
        → Postgres returns rows matching user's memberships
          → React Query caches result
            → Screen renders via props
```

### Writing Data (mutation path)

```
User action (e.g. vote on book)
  → VoteButton onPress
    → React Query useMutation
      → pool.service.voteBook(bookId, clubId)
        → supabase.rpc('increment_book_vote', { p_book_id, p_club_id })
          → Postgres RPC: atomic UPDATE with row-level lock
            → Supabase Realtime broadcasts postgres_changes on pool_votes table
              → useClubVotes hook receives change
                → React Query.invalidateQueries(['pool', clubId])
                  → Screen re-renders with fresh vote count
```

### Real-time Subscription Flow

```
Screen (pool.tsx or meetings/[meetingId].tsx) mounts
  → useClubVotes(clubId) custom hook
    → supabase.channel(`club-votes:${clubId}`)
        .on('postgres_changes', { event: '*', table: 'pool_votes',
             filter: `club_id=eq.${clubId}` }, handler)
        .subscribe()
          → handler: React Query.invalidateQueries(['pool', clubId])
  ← Screen unmounts → useEffect cleanup → channel.unsubscribe()
```

**Rule:** Realtime channels are scoped to individual screens/hooks, never global. Each channel is cleaned up in the `useEffect` return function. Use `channelRef` pattern to prevent double-subscription in React StrictMode (confirmed from Supabase official docs).

---

## Supabase Client Initialization Pattern

**Singleton — one instance per app process.** (Confirmed: Supabase official docs show `createClient` called once and exported.)

```typescript
// lib/supabase/client.ts
import 'expo-sqlite/localStorage/install';  // polyfill for web-compatible localStorage
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: localStorage,          // expo-sqlite/localStorage/install provides this
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,      // Must be false for React Native
  },
});
```

**Env var naming:** Expo requires the `EXPO_PUBLIC_` prefix for client-accessible env vars. Store in `.env.local` (gitignored). Two vars needed: `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

**Type generation:** Run `npx supabase gen types typescript --project-id <ref> > lib/supabase/types.ts` after every schema migration. Add this as a `package.json` script (`"db:types": "supabase gen types typescript ..."`). The generated `Database` type is passed as a generic to `createClient<Database>()` and to every `.from<Table>()` call for full type inference.

---

## State Management Architecture

Use **two complementary tools** — Zustand for client/ephemeral state, React Query for server/remote state. Do not use one for the other's job.

### Zustand: Client State Only

Zustand owns two slices:

1. **auth.store** — current session, user profile object, `isLoggedIn` boolean. Populated by `AuthProvider` listening to `supabase.auth.onAuthStateChange`. This is the single source of truth for auth — do not duplicate it in React Query.
2. **ui.store** — locale (`de` | `en`), theme preference (`light` | `dark`), any transient modal flags.

```typescript
// lib/stores/auth.store.ts
import { create } from 'zustand';
import type { User, Session } from '@supabase/supabase-js';

interface AuthSlice {
  session: Session | null;
  user: User | null;
  isLoggedIn: boolean;
  setSession: (session: Session | null) => void;
}

export const useAuthStore = create<AuthSlice>((set) => ({
  session: null,
  user: null,
  isLoggedIn: false,
  setSession: (session) => set({
    session,
    user: session?.user ?? null,
    isLoggedIn: !!session,
  }),
}));
```

### React Query: Server State

All Supabase data (clubs, reading lists, pool votes, meetings) is fetched and cached by React Query. Benefits:
- Automatic background refresh and stale-while-revalidate
- Optimistic updates for vote button UX
- Cache invalidation triggered by Realtime events

**Query key convention:**
```
['clubs', 'mine']                  -- user's clubs list
['clubs', clubId]                  -- single club detail
['pool', clubId]                   -- book pool for a club
['meetings', clubId]               -- meetings for a club
['books', 'list', userId]          -- personal reading list
['books', 'search', query]         -- Google Books search results
```

### Why not TanStack Query Supabase hooks directly?

Unofficial Supabase React Query libraries exist but lack realtime integration. The pattern of React Query + manual Supabase Realtime channel hooks (where realtime events trigger `invalidateQueries`) is more explicit, better documented, and works identically on native and web.

---

## Tamagui Config and Provider Structure

```typescript
// tamagui.config.ts  (at expo-app root, imported once)
import { createFont, createTamagui, createTokens, isWeb } from '@tamagui/core';
import { defaultConfig } from '@tamagui/config/v5';  // sensible baseline

// Extend defaultConfig with app-specific tokens
const config = createTamagui({
  ...defaultConfig,
  fonts: {
    heading: createFont({
      family: isWeb ? '"Inter", Helvetica, sans-serif' : 'Inter',
      // size, weight, letterSpacing scales
    }),
    body: createFont({ ... }),
  },
  themes: {
    light: { background: '#ffffff', color: '#111111', ... },
    dark:  { background: '#111111', color: '#f0f0f0', ... },
  },
  media: {
    sm:   { maxWidth: 640 },
    md:   { maxWidth: 1024 },
    gtMd: { minWidth: 1025 },
  },
});

// Module augmentation for TypeScript
type AppConfig = typeof config;
declare module '@tamagui/core' {
  interface TamaguiCustomConfig extends AppConfig {}
}

export default config;
```

```tsx
// app/_layout.tsx  — mount once at root
import { TamaguiProvider } from '@tamagui/core';
import config from '../tamagui.config';

export default function RootLayout() {
  return (
    <TamaguiProvider config={config} defaultTheme="light">
      <AuthProvider>
        <I18nProvider>
          <Stack>
            <Stack.Protected guard={isLoggedIn}>
              <Stack.Screen name="(app)" />
            </Stack.Protected>
            <Stack.Protected guard={!isLoggedIn}>
              <Stack.Screen name="(auth)" />
            </Stack.Protected>
          </Stack>
        </I18nProvider>
      </AuthProvider>
    </TamaguiProvider>
  );
}
```

**Critical:** `TamaguiProvider` and the Tamagui compiler Babel plugin (`@tamagui/babel-plugin`) must both be present. The compiler converts styled components to atomic CSS at build time; without it, performance on web regresses significantly. Add to `babel.config.js`:

```javascript
plugins: [
  ['@tamagui/babel-plugin', { components: ['tamagui'], config: './tamagui.config.ts' }],
]
```

---

## Row Level Security (RLS) Patterns

**Rule:** Every table has RLS enabled. Never disable. Votes are only mutated via RPC, never direct UPDATE.

### Helper Function Pattern

Define a reusable SQL helper for membership checks. This avoids repeating subqueries across policies and enables query plan caching:

```sql
-- Define once, reuse across all club-scoped tables
create or replace function is_club_member(p_club_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from club_members
    where club_id = p_club_id
    and user_id = (select auth.uid())
  );
$$;

create or replace function is_club_admin(p_club_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from club_members
    where club_id = p_club_id
    and user_id = (select auth.uid())
    and role = 'admin'
  );
$$;
```

### Per-Table RLS Policies

```sql
-- clubs table
alter table clubs enable row level security;

create policy "members can view their clubs"
  on clubs for select to authenticated
  using (is_club_member(id));

create policy "anyone can view public clubs"
  on clubs for select to authenticated
  using (is_public = true);

create policy "admins can update their club"
  on clubs for update to authenticated
  using (is_club_admin(id));

-- club_members table
alter table club_members enable row level security;

create policy "members can view club roster"
  on club_members for select to authenticated
  using (is_club_member(club_id));

create policy "anyone can join a public club"
  on club_members for insert to authenticated
  with check (
    (select is_public from clubs where id = club_id) = true
    and user_id = (select auth.uid())
  );

-- pool_votes table (read only — writes via RPC only)
alter table pool_votes enable row level security;

create policy "members can view pool votes"
  on pool_votes for select to authenticated
  using (is_club_member(club_id));

-- No INSERT/UPDATE policy on pool_votes:
-- All writes go through increment_book_vote() RPC with SECURITY DEFINER

-- personal_books table
alter table personal_books enable row level security;

create policy "users own their reading list"
  on personal_books for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
```

### Atomic Vote RPC

```sql
create or replace function increment_book_vote(p_club_id uuid, p_book_id uuid)
returns void
language plpgsql
security definer  -- bypasses RLS, runs as postgres owner
as $$
begin
  -- Verify caller is a club member before mutating
  if not is_club_member(p_club_id) then
    raise exception 'not a member of this club';
  end if;

  insert into pool_votes (club_id, book_id, user_id)
    values (p_club_id, p_book_id, auth.uid())
    on conflict (club_id, book_id, user_id) do nothing;
  -- vote counts are computed via aggregate query, not a stored counter
end;
$$;
```

**Do not store a `vote_count` integer.** Compute it as `count(*) from pool_votes where club_id = ? and book_id = ?`. This eliminates the counter race condition entirely without needing atomic increments. The Realtime subscription on `pool_votes` triggers React Query invalidation, which re-fetches the aggregate.

---

## Google Books API Service Layer

```
lib/services/google-books.service.ts
```

This service is a plain TypeScript module (no Supabase, no React):

```typescript
const GOOGLE_BOOKS_BASE = 'https://www.googleapis.com/books/v1';
const OPEN_LIBRARY_COVERS = 'https://covers.openlibrary.org/b/isbn';

export async function searchBooks(query: string, maxResults = 20) {
  const url = `${GOOGLE_BOOKS_BASE}/volumes?q=${encodeURIComponent(query)}&maxResults=${maxResults}`;
  const res = await fetch(url);
  const data = await res.json();
  return (data.items ?? []).map(normalizeGoogleBook);
}

function normalizeGoogleBook(item: GoogleBooksVolume): NormalizedBook {
  const info = item.volumeInfo;
  return {
    googleBooksId: item.id,
    title: info.title,
    authors: info.authors ?? [],
    isbn13: info.industryIdentifiers?.find(i => i.type === 'ISBN_13')?.identifier,
    coverUrl: info.imageLinks?.thumbnail
      ?? (info.industryIdentifiers?.[0]?.identifier
          ? `${OPEN_LIBRARY_COVERS}/${info.industryIdentifiers[0].identifier}-M.jpg`
          : null),
    description: info.description ?? null,
  };
}
```

**Cover URL strategy (per spec):** Store the resolved cover URL string in Postgres when a user adds a book to their list. Query Google Books only at search time, not on every render. Open Library is the fallback if Google Books returns no thumbnail. This keeps all cover fetching at "add book" time.

---

## i18n Architecture

Use `i18next` + `react-i18next` + `expo-localization` for device locale detection. The i18n system initializes before the app tree renders.

```
lib/i18n/index.ts      — i18next init, resources: { de, en }
lib/i18n/de.json       — German strings (namespaced by screen)
lib/i18n/en.json       — English strings
components/providers/I18nProvider.tsx  — wraps <I18nextProvider>
```

**Namespace structure in translation files:**
```json
{
  "common": { "save": "Speichern", "cancel": "Abbrechen" },
  "auth": { "signIn": "Anmelden", "signUp": "Registrieren" },
  "clubs": { "create": "Club erstellen", "join": "Club beitreten" },
  "books": { "addToList": "Zur Liste hinzufügen" },
  "meetings": { "voteTitle": "Abstimmung läuft" }
}
```

**Device locale detection:** `expo-localization` reads the device language at startup. Pass it as `lng` to `i18next.init()`. Locale preference can also be overridden and stored in `ui.store` (Zustand) for in-app language switching.

---

## Scalability Considerations

| Concern | Small scale (< 500 users) | Medium scale (< 50K users) | Large scale |
|---------|--------------------------|---------------------------|-------------|
| Realtime connections | Supabase free tier adequate | Monitor channel count; scope channels to active screen only | Consider debouncing vote events |
| RLS query performance | Helper functions + stable cache | Add index on `club_members(club_id, user_id, role)` | Materialized views for vote counts |
| Google Books API | No key, no rate limit concern | Cache search results in React Query (staleTime: 5min) | Optional: cache common queries in Supabase Edge Function |
| Cover images | URLs stored in DB, no CDN needed | Still fine | Consider Supabase Storage if user uploads emerge |

---

## Suggested Build Order (Dependencies Between Components)

The following sequence respects hard dependencies — each layer enables the next.

### Phase 1: Foundation
1. `expo-app/` directory scaffold + `app.json` + `babel.config.js` (Tamagui plugin)
2. `tamagui.config.ts` — tokens, themes, fonts
3. `lib/supabase/client.ts` — singleton
4. Supabase project: schema migrations + RLS policies (tables: users, clubs, club_members)
5. `components/providers/AuthProvider.tsx` + `lib/stores/auth.store.ts`
6. `app/_layout.tsx` — TamaguiProvider + Stack.Protected auth routing
7. `app/(auth)/sign-in.tsx` + `app/(auth)/sign-up.tsx`
8. `lib/services/auth.service.ts`

**Gate:** User can register, log in, log out, and be redirected correctly.

### Phase 2: Clubs
1. Add `lib/supabase/types.ts` (generate after schema is stable)
2. `lib/services/clubs.service.ts` + `lib/services/members.service.ts`
3. `app/(app)/(tabs)/clubs.tsx` — my clubs list
4. `app/(app)/clubs/create.tsx` + `app/(app)/clubs/join.tsx`
5. `app/(app)/clubs/[clubId]/index.tsx` — club home

**Gate:** User can create clubs, join by invite code, view club members.

### Phase 3: Books + Personal List
1. `lib/services/google-books.service.ts`
2. `lib/services/books.service.ts` (personal list CRUD)
3. Supabase schema: personal_books, pool_books tables + RLS
4. `app/(app)/books/search.tsx` + `app/(app)/books/[bookId].tsx`
5. `app/(app)/(tabs)/index.tsx` — personal reading list

**Gate:** User can search books, add to list with statuses, view list.

### Phase 4: Club Pool + Voting
1. Supabase schema: pool_books, pool_votes tables + RLS + `increment_book_vote` RPC
2. `lib/services/pool.service.ts`
3. `lib/hooks/useClubVotes.ts` — Realtime subscription
4. `app/(app)/clubs/[clubId]/pool.tsx`
5. `components/ui/VoteButton.tsx`

**Gate:** User can propose books, vote, see live vote updates.

### Phase 5: Meetings
1. Supabase schema: meetings table + RLS
2. `lib/services/meetings.service.ts`
3. `app/(app)/clubs/[clubId]/meetings.tsx`
4. `app/(app)/meetings/[meetingId].tsx` — live vote view + admin lock
5. Admin controls: promote member, lock meeting book

**Gate:** Admin can create meetings, lock the chosen book; all members see live result.

### Phase 6: i18n + Polish
1. `lib/i18n/` — i18next init, de.json, en.json
2. `components/providers/I18nProvider.tsx`
3. Audit all user-facing strings, replace with `t()` calls
4. `lib/stores/ui.store.ts` — language toggle in profile screen
5. Web layout polish (`_layout.web.tsx` tab bar styling)

**Gate:** All screens render correctly in German and English on all three platforms.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Supabase Client Created in Components
**What:** `createClient(url, key)` called inside a React component
**Why bad:** Creates a new client (and new WebSocket connection) on every render
**Instead:** Import the singleton from `lib/supabase/client.ts`

### Anti-Pattern 2: Realtime Channels Without Cleanup
**What:** Subscribing in `useEffect` without a return cleanup
**Why bad:** Accumulates dead channels, hits Supabase channel limits, causes duplicate updates
**Instead:** Always `return () => channel.unsubscribe()` from every `useEffect` that subscribes

### Anti-Pattern 3: Direct UPDATE on Vote Tables
**What:** `supabase.from('pool_votes').update({ count: count + 1 })`
**Why bad:** Race condition when two users vote simultaneously; count becomes inconsistent
**Instead:** Use `supabase.rpc('increment_book_vote', ...)` which runs in a single atomic transaction

### Anti-Pattern 4: Storing Vote Counts as a Column
**What:** `pool_books.vote_count integer`
**Why bad:** Requires atomic increment; easy to desync on network failures
**Instead:** Compute `count(*) from pool_votes` on query; Realtime invalidates React Query when votes change

### Anti-Pattern 5: Using `AsyncStorage` for Auth Sessions (React Native)
**What:** Passing `AsyncStorage` as the auth storage option
**Why bad:** Deprecated approach; Expo now recommends `expo-sqlite/localStorage/install` polyfill which is more reliable and web-compatible
**Instead:** `import 'expo-sqlite/localStorage/install'` and pass `storage: localStorage` to `createClient`

### Anti-Pattern 6: Global Zustand Store for All Server Data
**What:** Clubs, books, votes all stored in Zustand
**Why bad:** Manual invalidation on every mutation; no built-in retry or background refresh
**Instead:** Zustand owns only auth session + UI preferences; React Query owns all Supabase data

### Anti-Pattern 7: Skipping RLS on Any Table
**What:** `alter table X disable row level security`
**Why bad:** Direct PostgREST access bypasses all application-level auth
**Instead:** Every table has RLS enabled. Use `security definer` functions for operations that need elevated access (votes, invite code validation)

---

## Sources

- Expo Router official docs (Expo SDK v54): `https://docs.expo.dev/router/` — HIGH confidence
- Expo + Supabase integration guide: `https://docs.expo.dev/guides/using-supabase` — HIGH confidence
- Supabase JS client docs (v2.58.0) via Context7 `/supabase/supabase-js` — HIGH confidence
- Supabase Realtime cleanup patterns: `https://supabase.com/docs/guides/troubleshooting/realtime-too-many-channels-error` — HIGH confidence
- Supabase RLS room-membership helper pattern: `https://supabase.com/blog/flutter-authentication-and-authorization-with-rls` — HIGH confidence (pattern is language-agnostic SQL)
- Tamagui config + provider docs (v1.141.5) via Context7 `/tamagui/tamagui` — HIGH confidence
- Zustand slices pattern + TypeScript docs (v5.0.12) via Context7 `/pmndrs/zustand` — HIGH confidence
- Expo Router Stack.Protected API: `https://docs.expo.dev/router/advanced/protected` — HIGH confidence
- Platform-specific tab extensions: `https://docs.expo.dev/router/advanced/native-tabs` — HIGH confidence
