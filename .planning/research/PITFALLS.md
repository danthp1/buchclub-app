# Domain Pitfalls

**Domain:** Universal Expo + Tamagui + Supabase book club app (iOS, Android, Web)
**Researched:** 2026-05-24
**Confidence:** HIGH — all critical pitfalls verified against official Supabase, Expo, and Tamagui docs via Context7

---

## Critical Pitfalls

Mistakes that cause rewrites, data loss, or complete feature breakage.

---

### Pitfall 1: Supabase Auth client not configured for React Native (no AsyncStorage, wrong detectSessionInUrl)

**What goes wrong:** The default `createClient` setup assumes a web browser environment. Without explicitly providing `AsyncStorage` as the storage adapter, sessions are not persisted between app launches. On native, the default `localStorage` fallback either silently fails or works in development but not production builds. Additionally, `detectSessionInUrl: true` (the web default) causes crashes or incorrect behaviour on native because native apps receive auth tokens via deep link parameters, not URL fragments.

**Why it happens:** Developers copy the web Supabase quickstart without reading the React Native–specific auth guide.

**Consequences:** Users are logged out on every cold start. Magic link / OAuth flows silently discard the returned session. Hard to debug because it works in Expo Go but fails in standalone builds.

**Prevention:**
```typescript
import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // MUST be false on native
  },
})
```
Also install `react-native-url-polyfill` and import it at the very top of the entry file — Supabase internals depend on the URL constructor.

**Detection:** Cold-start the app; if user is not still logged in after restart, this misconfiguration is the cause.

**Phase:** Phase 1 (Auth foundation) — must be correct before any auth feature ships.

---

### Pitfall 2: Token refresh silently stops after the app is backgrounded on mobile

**What goes wrong:** iOS and Android aggressively suspend background processes. When the app returns from background, the Supabase Realtime WebSocket connection is stale and token refresh timers have fired but their results were dropped. The user's JWT has expired but the client-side session object still shows as logged in. API calls start returning 401s without any visible "logged out" event.

**Why it happens:** `autoRefreshToken: true` uses a JavaScript timer which does not survive background suspension on native. The Supabase Realtime client also has no built-in reconnect logic by default for backgrounded apps.

**Consequences:** Votes silently fail, realtime subscriptions deliver no updates, API calls silently error — all without a clear logout event.

**Prevention:** Subscribe to `AppState` changes and force a Supabase reconnect when the app returns to the foreground:
```typescript
import { AppState } from 'react-native'

AppState.addEventListener('change', (nextState) => {
  if (nextState === 'active') {
    supabase.auth.startAutoRefresh()
    if (!supabase.realtime.isConnected()) {
      supabase.realtime.connect()
    }
  } else {
    supabase.auth.stopAutoRefresh()
  }
})
```
Call `stopAutoRefresh` when backgrounded to prevent timer drift, and `startAutoRefresh` on resume.

**Detection:** Background the app for 10+ minutes, bring it to foreground, attempt a vote or subscription update — if it silently fails, this pitfall is active.

**Phase:** Phase 1 (Auth) + Phase 3 (Realtime) — AppState listener belongs in the root provider, which must be set up early.

---

### Pitfall 3: Expo Router auth "flash of unauthenticated content" on cold start

**What goes wrong:** Expo Router renders the initial route immediately before the Supabase session has been loaded from AsyncStorage. The auth state initializes as `null` (not logged in), so the router redirects to the login screen for a fraction of a second — even for a logged-in user. Users see a flash of the login screen on every cold start.

**Why it happens:** AsyncStorage reads are asynchronous. The router runs synchronously on first render. Without an explicit "loading" gate before the redirect logic fires, the session is always null at render time.

**Consequences:** Poor UX jank on every launch. More seriously: if a developer treats this as "working" and ships it, deep-link navigation to a specific screen (e.g., accepting a club invite) will redirect to login and lose the deep link target.

**Prevention:** Use an `initialized` flag in the auth context. Block navigation (render a `SplashScreen` or empty `Slot`) until `initialized === true`:
```typescript
// auth context
const [initialized, setInitialized] = useState(false)

useEffect(() => {
  supabase.auth.onAuthStateChange((event, session) => {
    setSession(session)
    setInitialized(true)
  })
}, [])
```
In the root layout, render nothing (or keep `SplashScreen` visible via `expo-splash-screen`) until `initialized` is true before making any auth-based redirect decision. Use `Stack.Protected` (Expo Router v5+) with `guard={isLoggedIn}` rather than imperative `<Redirect>` to make intent explicit.

**Detection:** Cold-start with a logged-in account and observe whether the login screen flashes. If yes, `initialized` is not being checked.

**Phase:** Phase 1 (Auth) — must be addressed before any navigation structure is built.

---

### Pitfall 4: Supabase Realtime subscriptions leaking across component remounts

**What goes wrong:** Each call to `supabase.channel('votes').on(...).subscribe()` creates a new WebSocket subscription. If the component remounts (e.g., navigating away and back), the old subscription is not cleaned up and a new one is added. After a few navigations, the same payload is delivered multiple times per event, causing duplicate vote counts in the UI and excessive server-side load.

**Why it happens:** Developers treat `subscribe()` like `useEffect` with no cleanup. React strict mode in development double-invokes effects, making this immediately visible in dev but often missed in prod tests.

**Consequences:** Vote count displayed as 2x, 3x, ... actual value. Memory grows with each navigation. Supabase may throttle the connection for exceeding channel limits.

**Prevention:** Always return a cleanup function from `useEffect` that calls `supabase.removeChannel(channel)`:
```typescript
useEffect(() => {
  const channel = supabase
    .channel(`votes:meeting:${meetingId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'votes',
        filter: `meeting_id=eq.${meetingId}` }, handleChange)
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}, [meetingId])
```
Use a stable, unique channel name (include IDs) to avoid accidentally reusing the same channel name across different instances.

**Detection:** React strict mode (double-invokes effects) will surface this immediately in development. Enable it. Also add a log in the subscription handler — if you see duplicate logs per DB event, cleanup is missing.

**Phase:** Phase 3 (Realtime voting) — verify cleanup before any subscription feature ships.

---

### Pitfall 5: RLS table has no policies — returns empty instead of error

**What goes wrong:** After enabling RLS with `ALTER TABLE votes ENABLE ROW LEVEL SECURITY`, all queries return zero rows (not an error) until at least one policy is explicitly created. A developer who enables RLS and then tests by inserting a row will find the select returns nothing and may think the insert failed, leading to double-inserts or disabling RLS entirely.

**Why it happens:** Postgres RLS with no policies defaults to DENY ALL for non-superuser roles. The Supabase JS client uses the `anon` or `authenticated` role, neither of which is a superuser.

**Consequences:** Silently broken features. Developers may work around it by querying the service role key from the client (catastrophic security hole) or by disabling RLS.

**Prevention:** Always create the minimum required policies immediately after enabling RLS. Treat "enable RLS" and "create policies" as a single atomic migration step. Write migration SQL in a single file:
```sql
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- SELECT: club members can read votes for their clubs
CREATE POLICY "members_read_votes" ON votes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM club_members
      WHERE club_members.club_id = votes.club_id
        AND club_members.user_id = (SELECT auth.uid())
    )
  );
```

**Detection:** If a select on a freshly RLS-enabled table returns 0 rows and no error, check `pg_policies` to confirm at least one policy exists.

**Phase:** Phase 2 (Database schema) — set up RLS + policies together, never separately.

---

### Pitfall 6: RLS policy uses `auth.uid()` directly instead of `(SELECT auth.uid())` — causes per-row function call overhead

**What goes wrong:** Writing `USING (user_id = auth.uid())` causes Postgres to call `auth.uid()` once per row in the result set. On a table with thousands of rows, this becomes a performance bottleneck. For the votes table with concurrent active users and realtime updates, this compounds quickly.

**Why it happens:** The direct call looks idiomatic and works correctly — the problem is performance, not correctness, so it passes all tests.

**Consequences:** Slow query response at scale, especially on tables with many rows and frequent realtime polling. Votes page becomes sluggish under load.

**Prevention:** Always wrap in a subquery to cache the result per statement:
```sql
USING ( (SELECT auth.uid()) = user_id )
```
This causes Postgres to execute an `initPlan` and cache the result for the entire query, not per row.

**Detection:** Use `EXPLAIN ANALYZE` on queries with RLS; look for repeated `FunctionScan` nodes on `auth.uid()`.

**Phase:** Phase 2 (Database schema) — establish this pattern in the first migration, enforce it via code review for all subsequent policies.

---

### Pitfall 7: Votes implemented with direct UPDATE instead of RPC — race conditions on concurrent upvotes

**What goes wrong:** A naive implementation reads the current vote count, increments it client-side, and writes it back with an `UPDATE votes SET count = count + 1`. Two users clicking simultaneously can both read `count = 5`, both write `count = 6`, and one vote is silently lost.

**Why it happens:** The pattern works fine in single-user testing and only fails under concurrent load.

**Consequences:** Vote counts are incorrect. In a book club context, the wrong book can "win" a vote. The error is silent — no exception is thrown, just wrong data.

**Prevention:** All vote mutations must go through a Postgres RPC function that does the increment atomically inside the database transaction:
```sql
CREATE OR REPLACE FUNCTION increment_vote(p_book_id uuid, p_meeting_id uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO votes (book_id, meeting_id, user_id, voted_at)
  VALUES (p_book_id, p_meeting_id, (SELECT auth.uid()), now())
  ON CONFLICT (book_id, meeting_id, user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```
The client calls `supabase.rpc('increment_vote', { book_id, meeting_id })` — no read-modify-write cycle on the client. The unique constraint on `(book_id, meeting_id, user_id)` prevents double-votes. This is already in the project spec; it must not be weakened during implementation.

**Detection:** Run a load test: fire 10 concurrent vote calls for the same book — count should be 1 (or however many distinct users), not 10.

**Phase:** Phase 3 (Voting) — never use direct UPDATE for votes. RPC-only from day one.

---

### Pitfall 8: Tamagui `TamaguiProvider` placed inside a route layout instead of the root layout, causing hydration errors on web

**What goes wrong:** `TamaguiProvider` must wrap the entire application at the root (`app/_layout.tsx`). If it is placed inside a nested layout (e.g., `app/(auth)/_layout.tsx`), screens outside that group render without Tamagui context, producing runtime errors. On web with SSR, the provider placement mismatch causes React hydration errors because the server-rendered HTML does not match the client's component tree structure.

**Why it happens:** Developers add Tamagui to an existing Expo Router app incrementally and scope the provider to only the routes they are actively working on.

**Consequences:** Cryptic "cannot read property of undefined" errors from Tamagui internals. Hydration mismatches on web that cause entire subtrees to re-render on the client, breaking SSR performance gains.

**Prevention:** Place `TamaguiProvider` in `app/_layout.tsx` only. Also import the generated CSS file at the top of root layout for web:
```typescript
// app/_layout.tsx
import '../tamagui.generated.css' // web CSS extraction
import { TamaguiProvider } from 'tamagui'
import { tamaguiConfig } from '../tamagui.config'

export default function RootLayout() {
  return (
    <TamaguiProvider config={tamaguiConfig} defaultTheme="light">
      <Stack />
    </TamaguiProvider>
  )
}
```

**Detection:** Open the web version of the app and check the browser console for React hydration warnings. Any "Text content does not match" or "Expected server HTML to contain" errors point here.

**Phase:** Phase 1 (Project scaffold) — set up provider placement correctly before building any UI.

---

### Pitfall 9: Tamagui SSR hydration mismatch from theme/locale-dependent values rendered on server

**What goes wrong:** Tamagui's SSR support requires that the server and client render identical output on first paint. Any value that differs between server and client (e.g., user's locale, `useColorScheme()`, `Platform.OS`, or browser-only APIs) will cause a hydration mismatch if used directly in a styled component during SSR. The most common trigger in this app: using the device locale (from `expo-localization`) to render translated strings during SSR, where the server has no locale context.

**Why it happens:** `getLocales()[0].languageCode` returns different values on server (Node.js, no locale) versus client (device locale). If this value influences the rendered JSX during SSR, React detects a mismatch.

**Consequences:** React discards the server-rendered HTML and re-renders from scratch on the client, eliminating all SSR performance benefits. In severe cases, causes visible content flash or layout shift.

**Prevention:**
1. Use Tamagui's `useDidFinishSSR` hook to defer locale-dependent rendering until after hydration:
```typescript
import { useDidFinishSSR } from '@tamagui/use-did-finish-ssr'

function LocalizedText({ i18nKey }) {
  const isClient = useDidFinishSSR()
  return <Text>{isClient ? t(i18nKey) : ''}</Text>
}
```
2. For components that cannot wait (e.g., page titles for SEO), ensure the i18n provider defaults to a stable server-safe locale and only switches to device locale after hydration.
3. Use `<ClientOnly>` from `@tamagui/use-did-finish-ssr` to wrap any component that reads browser or device APIs.

**Detection:** Run `expo export --platform web` and inspect the static HTML for translated strings. If the HTML contains translated text but the client shows different text on first load, hydration is mismatching.

**Phase:** Phase 1 (i18n setup) and Phase 4 (web output) — establish SSR-safe i18n pattern in the initial scaffold.

---

### Pitfall 10: Using wrong Tamagui animation driver — reanimated on web causes bundle bloat, CSS driver on native causes missing animations

**What goes wrong:** Tamagui requires different animation drivers for web (CSS-based, lightweight) versus native (Reanimated, off-thread). Using a single driver for both platforms results in either: a large bundle on web (Reanimated adds significant size) or missing/broken animations on native (CSS driver has no native support).

**Why it happens:** Developers set up one animation driver in `tamagui.config.ts` and never check the other platform.

**Consequences:** Web bundle is 40-80KB larger than necessary, slowing initial load. Or native animations are choppy/absent, especially for sheet/dialog transitions central to the book club UI.

**Prevention:** Use platform-conditional driver configuration:
```typescript
import { isWeb } from 'tamagui'
import { animations as animationsCSS } from '@tamagui/config/v5-css'
import { animations as animationsReanimated } from '@tamagui/config/v5-reanimated'

export const config = createTamagui({
  ...defaultConfig,
  animations: isWeb ? animationsCSS : animationsReanimated,
})
```
Install `@tamagui/animations-css` for web and `@tamagui/animations-reanimated` + `react-native-reanimated` for native.

**Detection:** Check web bundle analyzer output — if `react-native-reanimated` appears in the web bundle, the wrong driver is being used.

**Phase:** Phase 1 (UI scaffold) — part of initial Tamagui configuration.

---

## Moderate Pitfalls

Mistakes that cause degraded functionality, bad UX, or require non-trivial rework.

---

### Pitfall 11: Supabase Realtime subscription receives no events because table is not in the realtime publication

**What goes wrong:** Subscribing to `postgres_changes` on a table that has not been added to the `supabase_realtime` publication produces no error — events simply never arrive. The subscription appears to connect successfully.

**Prevention:** After creating any table that needs realtime, explicitly add it:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE votes;
ALTER PUBLICATION supabase_realtime ADD TABLE meeting_books;
```
Do this in the same migration that creates the table.

**Warning signs:** Subscription `subscribe()` callback reports "SUBSCRIBED" status but no events ever fire despite confirmed DB changes.

**Phase:** Phase 3 (Realtime) — verify publication membership for every realtime table before writing subscription code.

---

### Pitfall 12: Realtime UPDATE/DELETE events deliver empty `old_record` because replica identity is not set to FULL

**What goes wrong:** By default, Postgres only includes the primary key in `old_record` for UPDATE and DELETE events. If your subscription logic needs the previous vote count or the previous book assignment to update UI state, the `old_record` will only contain the `id`, not the full row.

**Prevention:** For any table where UPDATE/DELETE realtime events must carry full previous values:
```sql
ALTER TABLE votes REPLICA IDENTITY FULL;
ALTER TABLE meeting_books REPLICA IDENTITY FULL;
```
Note: when RLS is enabled, DELETE events only expose primary key(s) in `old_record` regardless of replica identity — this is a Supabase constraint, not a bug. Plan delete logic around IDs, not full row data.

**Warning signs:** Realtime handler receives `payload.old` with only `{ id: "..." }` when you expect full row data.

**Phase:** Phase 2 (Database schema) — set in migrations alongside RLS policies.

---

### Pitfall 13: `onAuthStateChange` listener is never unsubscribed — causes ghost auth state in unmounted components

**What goes wrong:** If `supabase.auth.onAuthStateChange` is called inside a component or hook without cleaning up the returned subscription, the callback fires indefinitely, even after the component has unmounted. This can trigger `setState` on unmounted components, causing React warnings and stale state bugs.

**Prevention:**
```typescript
useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => { /* ... */ }
  )
  return () => subscription.unsubscribe()
}, [])
```
Set up exactly one `onAuthStateChange` listener at the root auth provider level. Never add additional listeners in child components.

**Warning signs:** "Can't perform a React state update on an unmounted component" console warnings during navigation.

**Phase:** Phase 1 (Auth) — establish the single-listener pattern at the root level.

---

### Pitfall 14: RLS `FOR ALL` policy on `votes` table allows users to delete other members' votes

**What goes wrong:** Writing `FOR ALL USING (auth.uid() = user_id)` seems safe but applies the `USING` clause to all operations including DELETE. This is actually correct for DELETE (users can only delete their own votes), but the same policy also acts as the insert check — meaning the `WITH CHECK` clause is implicitly the same as `USING`. If the schema later allows admins to remove votes, a misconfigured `FOR ALL` policy blocks it.

**More common mistake:** Writing separate policies but accidentally making the INSERT policy `FOR ALL` or forgetting to write a `WITH CHECK` on INSERT, allowing users to insert rows with arbitrary `user_id` values.

**Prevention:** Always use separate per-operation policies. For INSERT, always add `WITH CHECK`:
```sql
CREATE POLICY "users_insert_own_vote" ON votes
  FOR INSERT TO authenticated
  WITH CHECK ( (SELECT auth.uid()) = user_id );

CREATE POLICY "users_delete_own_vote" ON votes
  FOR DELETE TO authenticated
  USING ( (SELECT auth.uid()) = user_id );

CREATE POLICY "members_read_votes" ON votes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM club_members
      WHERE club_members.club_id = votes.club_id
        AND club_members.user_id = (SELECT auth.uid())
    )
  );
```

**Warning signs:** A user can insert a vote with another user's `user_id`. Test this explicitly in the DB test suite.

**Phase:** Phase 2 (Database schema) — test each policy's SELECT/INSERT/UPDATE/DELETE independently.

---

### Pitfall 15: Google Books API returns CORS errors on web because requests are made from client-side JavaScript

**What goes wrong:** The Google Books API (`https://www.googleapis.com/books/v1/volumes`) does NOT set CORS headers permitting requests from arbitrary origins. Direct `fetch()` calls from a browser-based Expo web app will fail with a CORS error, even though the exact same call works fine on native (where there is no browser CORS enforcement).

**Why it happens:** The API is designed for server-to-server or native client calls. Browser cross-origin restrictions apply only on web.

**Consequences:** Book search works on iOS/Android but is completely broken on web.

**Prevention:** Route all Google Books API calls through a Supabase Edge Function that acts as a proxy. The Edge Function runs server-side (no CORS), calls the Books API, and returns the result to the client. Apply request-level caching in the Edge Function to stay well under the 1,000 requests/day free quota.

```
Client (web) → Supabase Edge Function /search-books → Google Books API
Client (native) → Supabase Edge Function /search-books → Google Books API
```
Use the same code path on all platforms to avoid a platform-specific divergence in book search behaviour. Alternatively, use Expo's `fetch` from `expo/fetch` which has consistent behaviour, but note this does not bypass CORS on web — only server-side proxying does.

**Warning signs:** `TypeError: Failed to fetch` or `CORS policy` error in the browser console on the book search screen.

**Phase:** Phase 2 (Book search) — design the Edge Function proxy from the start; do not build a native-only implementation and retrofit web later.

---

### Pitfall 16: Google Books API rate limiting — no key means 1,000 requests/day shared across all users

**What goes wrong:** Without an API key, all requests from your app share a single per-IP quota of ~1,000 requests/day when routed through an Edge Function (which has one IP). With an API key the quota is per-key and much higher, but the project spec requires "completely free to use" — meaning no paid quota upgrade.

**Prevention:**
1. Cache search results in Supabase DB or Edge Function memory by query string. A search for "Harry Potter" by one user should not re-query Google Books if another user searched the same string recently.
2. Cache cover image URLs in the DB (already in the spec — enforce this).
3. Store book metadata (title, author, ISBN, cover URL) on first lookup so subsequent access to the same book is served from the DB.
4. Rate-limit the search endpoint per user (e.g., max 20 searches per hour) to prevent a single user from exhausting the quota.

**Warning signs:** `429 Too Many Requests` from `googleapis.com` in Edge Function logs.

**Phase:** Phase 2 (Book search) — implement caching before any user-visible search feature ships.

---

### Pitfall 17: Expo Router navigation inside an active `useEffect` or async callback — "Cannot navigate before mounting" error

**What goes wrong:** Calling `router.push()` or `router.replace()` inside an async callback that resolves after the component has unmounted (e.g., after an auth confirmation) throws a runtime error. This also happens if navigation is called during the initial render before the router is mounted.

**Why it happens:** Expo Router requires the navigator to be fully mounted before imperative navigation calls. Async operations (auth state changes, deep link handling) can resolve before or after mounting.

**Prevention:**
1. Use the declarative `<Redirect>` component for auth-based routing rather than imperative `router.replace()`. Let the layout re-render trigger the redirect.
2. If imperative navigation is needed (e.g., after form submit), wrap in `requestAnimationFrame` or use a mounted ref guard.
3. Use `Stack.Protected` (Expo Router v5) with a reactive auth guard — the router handles the redirect internally, not via JavaScript navigation calls.

**Warning signs:** "Error: Cannot navigate before mounting" in the console during auth flow or deep link handling.

**Phase:** Phase 1 (Auth + Navigation) — establish routing patterns before building any screen.

---

### Pitfall 18: Deep link scheme not configured in `app.json` — invite codes and magic links silently fail to open the app

**What goes wrong:** Club invites and (if added later) magic links both require the app to register a custom URL scheme so the OS redirects the deep link into the app. Without `expo.scheme` in `app.json`, the OS has no registered handler for the URL, and the user is left on an error page in their browser rather than being taken to the join-club screen.

**Prevention:**
```json
{
  "expo": {
    "scheme": "buchclub",
    "ios": { "bundleIdentifier": "com.yourorg.buchclub" },
    "android": { "package": "com.yourorg.buchclub" }
  }
}
```
Also configure the Supabase Auth redirect URL to use this scheme for any future magic link or OAuth flows: `buchclub://auth/callback`.

**Warning signs:** Clicking a `buchclub://...` link on the device opens the browser or does nothing.

**Phase:** Phase 1 (Scaffold) — set scheme before building any invite or auth deep link flow.

---

## Minor Pitfalls

Mistakes that create friction or inconsistency but are fixable without major rework.

---

### Pitfall 19: i18n strings initialized outside React lifecycle — locale read at module load time, not component render time

**What goes wrong:** Calling `getLocales()[0].languageCode` at the top level of a module (outside a component or hook) caches the locale at bundle load time. If the locale determination logic needs to be reactive (e.g., the user changes the device language while the app is open), the cached value is stale. More critically, on web this runs during SSR in Node.js where `getLocales()` has no locale to return.

**Prevention:** Treat locale as reactive state. Read it inside a `useEffect` or during component initialization, not at module level. Provide a static default (`'de'` or `'en'`) as the server-safe fallback:
```typescript
const i18n = new I18n(translations)
i18n.defaultLocale = 'de'
i18n.enableFallback = true

// Inside component or hook:
const locale = useDidFinishSSR() ? getLocales()[0]?.languageCode ?? 'de' : 'de'
i18n.locale = locale
```

**Warning signs:** All users see English on web regardless of device locale, or SSR logs warnings about `getLocales()` returning undefined.

**Phase:** Phase 1 (i18n scaffold) — establish the pattern before adding any translated string.

---

### Pitfall 20: Tamagui `Dialog.Sheet` does not preserve state when adapting between sheet and portal

**What goes wrong:** When using `<Dialog.Adapt>` to render a dialog as a bottom sheet on small screens, the contents are re-mounted when transitioning between sheet and portal modes (e.g., resizing the browser window). Any form state inside the dialog (e.g., partially typed book title search) is lost.

**Prevention:** Keep form state in a parent component or a React context, not inside the dialog's own state. This is good practice regardless of the Tamagui adapter behavior and ensures state survives any re-mount.

**Warning signs:** Typing into the book search dialog and resizing the window clears the input.

**Phase:** Phase 3 (Book proposal UI) — design dialog state management with external state from the start.

---

### Pitfall 21: `Platform.OS === 'web'` check used in runtime code that Tamagui's compiler inlines — causes unexpected dead code elimination

**What goes wrong:** Tamagui's compiler statically inlines `isWeb` and `Platform.OS` checks at compile time. If you write conditional logic relying on `Platform.OS === 'web'` at runtime (e.g., for a dynamic import), the compiler may inline the wrong branch or strip the check entirely, breaking the native/web divergence.

**Prevention:** Use platform file extensions (`.web.tsx`, `.native.tsx`) for components that fundamentally differ between platforms. Reserve `Platform.OS` runtime checks for minor variations (e.g., different padding). For features that are absent on one platform, use file-extension-based platform splitting, not runtime guards.

**Warning signs:** A feature works in the Expo Go web preview but breaks in a production web build, or vice versa.

**Phase:** Phase 2+ (any platform-divergent feature) — establish file extension convention in the scaffold.

---

### Pitfall 22: Service role key exposed in client bundle — complete RLS bypass

**What goes wrong:** Using `SUPABASE_SERVICE_ROLE_KEY` in the Expo app bundle allows any user who decompiles the app to bypass all RLS and access every row in every table.

**Prevention:** The service role key must never appear in client code. It belongs only in Edge Functions or server-side code. All client operations use `SUPABASE_ANON_KEY`. Any operation that requires elevated privileges (e.g., admin actions) must be implemented as a `SECURITY DEFINER` Postgres function that validates the caller's role via `auth.uid()` internally.

**Warning signs:** `SUPABASE_SERVICE_ROLE_KEY` appears anywhere in the Expo app directory or is referenced in `createClient()` outside of an Edge Function or server file.

**Phase:** Phase 1 (Scaffold) — enforce via `.env` conventions and code review from day one.

---

### Pitfall 23: Supabase Realtime `postgres_changes` subscription on a table without a `filter` clause — broadcasts all table changes to all subscribers

**What goes wrong:** A subscription without a `filter` option receives every row change on the table for all clubs, not just the current user's club. With multiple clubs running simultaneous votes, every client receives all vote events and must filter client-side, wasting bandwidth and potentially leaking data to users in other clubs.

**Prevention:** Always add a `filter` clause scoped to the current club or meeting:
```typescript
supabase.channel(`votes:${meetingId}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'votes',
    filter: `meeting_id=eq.${meetingId}`
  }, handleVoteChange)
  .subscribe()
```
Note: Supabase Realtime RLS filtering applies RLS policies to change events, but explicit filter clauses reduce server-side fan-out even further.

**Warning signs:** UI updates when a different club casts votes, or network tab shows realtime payloads for unrelated meeting IDs.

**Phase:** Phase 3 (Realtime) — add filter clauses to all subscriptions before testing.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Auth scaffold | No AsyncStorage adapter, wrong detectSessionInUrl | Use Pitfall 1 config verbatim as the starting point |
| Auth scaffold | Auth flash on cold start | Implement `initialized` flag before any redirect logic |
| Auth scaffold | Token refresh dying after background | Add AppState listener in root provider |
| DB schema migrations | RLS enabled without policies (silent deny all) | Write enable + policies in a single migration file |
| DB schema migrations | Missing replica identity FULL on realtime tables | Add FULL identity in same migration as realtime publication |
| DB schema migrations | Calling auth.uid() without SELECT subquery wrapping | Lint all RLS policies for the `(SELECT auth.uid())` pattern |
| Book search | Google Books CORS on web | Design Edge Function proxy before any book search UI |
| Book search | Rate limit exhaustion | Implement DB-level caching before exposing search to users |
| Voting feature | Direct UPDATE instead of RPC | RPC-only vote mutations; no read-modify-write from client |
| Voting feature | Realtime subscription not cleaned up | Enforce useEffect cleanup in PR review |
| Voting feature | Subscription missing filter clause | Always filter by meetingId |
| Voting feature | votes table not in realtime publication | Add to publication in the votes table migration |
| i18n setup | Locale read at module level, SSR unsafe | Use useDidFinishSSR guard for all locale-dependent renders |
| i18n setup | Hydration mismatch from translated strings | Default to server-safe locale, hydrate on client |
| Navigation | Imperative router.push before mount | Use declarative Redirect or Stack.Protected |
| Navigation | Missing deep link scheme | Set app.json scheme before any invite link feature |
| UI scaffold | TamaguiProvider not at root | Set up in app/_layout.tsx only |
| UI scaffold | Wrong animation driver | Use platform-conditional animation config |
| Security | Service role key in client bundle | Never use service role key outside Edge Functions |
| Dialog/Sheet UI | Form state lost on Dialog.Adapt transition | Lift state out of dialog into parent |

---

## Sources

- Supabase React Native Auth guide: https://supabase.com/blog/react-native-authentication (Context7, HIGH confidence)
- Supabase Realtime subscription cleanup: https://supabase.com/docs/guides/realtime/getting_started (Context7, HIGH confidence)
- Supabase Realtime reconnection in backgrounded apps: https://supabase.com/docs/troubleshooting/realtime-heartbeat-messages (Context7, HIGH confidence)
- Supabase RLS documentation: https://supabase.com/docs/guides/database/postgres/row-level-security (Context7, HIGH confidence)
- Supabase RLS performance best practices: https://supabase.com/docs/troubleshooting/rls-performance-and-best-practices (Context7, HIGH confidence)
- Supabase RLS policy syntax reference: https://github.com/supabase/supabase/blob/master/examples/prompts/database-rls-policies.md (Context7, HIGH confidence)
- Supabase Realtime replica identity: https://supabase.com/docs/guides/realtime/postgres-changes (Context7, HIGH confidence)
- Tamagui SSR / server rendering: https://tamagui.dev/docs/core/server-rendering (Context7, HIGH confidence)
- Tamagui animation drivers: https://tamagui.dev/docs/core/animation-drivers (Context7, HIGH confidence)
- Tamagui Expo Router setup: https://tamagui.dev/docs/guides/expo (Context7, HIGH confidence)
- Tamagui Dialog.Sheet state note: https://tamagui.dev/docs/components/dialog (Context7, HIGH confidence)
- Expo Router protected routes: https://docs.expo.dev/router/advanced/protected (Context7, HIGH confidence)
- Expo deep linking configuration: https://docs.expo.dev/versions/latest/sdk/webbrowser (Context7, HIGH confidence)
- Expo AppState / token refresh pattern: https://supabase.com/docs/troubleshooting/realtime-heartbeat-messages (Context7, HIGH confidence)
- Expo localization i18n setup: https://github.com/expo/expo/blob/main/docs/pages/guides/localization.mdx (Context7, HIGH confidence)
- Expo Metro platform extensions: https://docs.expo.dev/guides/customizing-metro (Context7, HIGH confidence)
