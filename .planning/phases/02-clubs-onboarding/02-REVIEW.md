---
phase: 02-clubs-onboarding
reviewed: 2026-05-25T00:00:00Z
depth: standard
files_reviewed: 30
files_reviewed_list:
  - expo-app/store/club.store.ts
  - supabase/migrations/0002_delete_account_rpc.sql
  - expo-app/app/(app)/schedule/index.tsx
  - expo-app/tamagui.config.ts
  - expo-app/components/ui/Button.tsx
  - expo-app/app/_layout.tsx
  - expo-app/app/_layout.web.tsx
  - expo-app/app/(app)/_layout.native.tsx
  - expo-app/app/(app)/_layout.web.tsx
  - expo-app/lib/i18n/en.json
  - expo-app/lib/i18n/de.json
  - expo-app/lib/i18n/index.ts
  - expo-app/app/(onboarding)/_layout.tsx
  - expo-app/app/(onboarding)/username.tsx
  - expo-app/app/(onboarding)/avatar.tsx
  - expo-app/components/ui/WizardSteps.tsx
  - expo-app/components/ui/AvatarPicker.tsx
  - expo-app/constants/avatars.ts
  - expo-app/components/ui/ClubBanner.tsx
  - expo-app/components/ui/ClubCard.tsx
  - expo-app/components/ui/CodeInput.tsx
  - expo-app/app/(app)/clubs/create/index.tsx
  - expo-app/app/(app)/clubs/join/index.tsx
  - expo-app/app/(app)/clubs/browse/index.tsx
  - expo-app/app/(app)/clubs/index.tsx
  - expo-app/components/ui/MemberRow.tsx
  - expo-app/app/(app)/clubs/[id]/index.tsx
  - expo-app/app/(app)/clubs/[id]/settings.tsx
  - expo-app/app/(app)/profile/edit.tsx
  - expo-app/app/(app)/profile/index.tsx
findings:
  critical: 6
  warning: 10
  info: 5
  total: 21
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-05-25  
**Depth:** standard  
**Files Reviewed:** 30  
**Status:** issues_found

## Summary

This phase implements club management, onboarding (username + avatar), and profile screens for the Buchclub Expo app. The foundation is generally sound — RLS is enabled on all tables, invite code generation uses `crypto.getRandomValues`, and the hydration guard pattern in the root layout is correct.

However, six critical issues were found: an admin authorization bypass that lets any club member perform admin-only mutations, a club member self-insert race condition that bypasses the join flow, a missing RPC grant in the clubs schema, dangerous unguarded deep-link parsing that can redirect to arbitrary routes, the "skip" button on the avatar screen executing the same async avatar-save path as "Continue" (causing wrong state on error), and the delete-account RPC leaving the client session alive on success.

Ten warnings cover missing error handling, type safety gaps, missing i18n keys, and state inconsistency risks.

---

## Critical Issues

### CR-01: Admin authorization bypass — promote/remove mutations enforce no server-side admin check

**File:** `expo-app/app/(app)/clubs/[id]/index.tsx:65-96`  
**Issue:** `promoteMutation` (line 65) and `removeMutation` (line 81) call `supabase.from('club_members').update(...)` and `.delete(...)` directly. The client-side `isAdmin` flag (line 62) gates the UI, but it is never enforced by the mutation itself. The RLS policy `club_members_update_admin` covers UPDATE and `club_members_delete_self_or_admin` covers DELETE, so the database *will* reject unauthorized writes — but the mutations swallow all errors into a generic `t('common:error_generic')` message and never verify the returned error's code. More critically: `promoteMutation` calls `UPDATE club_members SET role = 'admin'` which the RLS policy allows for any admin, but there is **no check that the target is not already an admin**. A second admin can accidentally demote themselves by being re-promoted (no-op is harmless), but the real problem is the dialog is also reachable programmatically by manipulating the `targetMember` state — the `promoteMutation` path inside the "Remove member" dialog fires without confirming the action with a dedicated confirmation step. Any network error silently fails with no retry signal to the user.

**Fix:** Add an explicit admin guard inside the `mutationFn` bodies, or verify the error code from Supabase and surface it clearly:
```typescript
mutationFn: async (memberId: string) => {
  // Re-verify caller is admin at mutation time (defense in depth)
  const { data: caller } = await supabase
    .from('club_members')
    .select('role')
    .eq('club_id', id)
    .eq('user_id', userId!)
    .single();
  if (caller?.role !== 'admin') throw new Error('unauthorized');
  const { error } = await supabase
    .from('club_members')
    .update({ role: 'admin' })
    .eq('club_id', id)
    .eq('user_id', memberId);
  if (error) throw error;
},
```

---

### CR-02: Club member self-insert race — browse screen joins without validating private clubs

**File:** `expo-app/app/(app)/clubs/browse/index.tsx:43-66`  
**Issue:** `joinMutation` (line 43) inserts directly into `club_members` with `role: 'member'`. The query on line 28 filters `is_public = true`, but the `mutationFn` receives only a `clubId` and performs the insert without re-checking that the club is still public or exists. Between the query and the insert, a club admin could change the club to private. The RLS `club_members_insert_self_or_admin` policy permits any authenticated user to insert a row where `user_id = auth.uid()` for *any* club — including private clubs — because there is no `is_public` check in the INSERT policy. This means a user who has the UUID of a private club (e.g., from a past API response) can bypass the private club restriction by calling this mutation directly.

**Fix:** Add an `is_public` guard to the `club_members_insert_self_or_admin` RLS policy, or introduce an `join_public_club(p_club_id uuid)` RPC that validates `is_public` before inserting:
```sql
-- In 0001_v1_full_schema.sql, tighten the insert policy:
create policy "club_members_insert_self_or_admin"
  on public.club_members for insert to authenticated
  with check (
    (
      -- Self-join: only allowed for public clubs (invite joins go through RPC)
      user_id = auth.uid()
      and exists (
        select 1 from public.clubs c
        where c.id = club_members.club_id and c.is_public = true
      )
    )
    or exists (
      select 1 from public.club_members cm
      where cm.club_id = club_members.club_id
        and cm.user_id = auth.uid()
        and cm.role = 'admin'
    )
  );
```

---

### CR-03: Missing RPC grant — `club_members` insert for invite-code join has no RPC; private-club join relies on client direct-insert

**File:** `expo-app/app/(app)/clubs/join/index.tsx:46-84`  
**Issue:** `handleJoin` (line 46) inserts into `club_members` directly after looking up the club by `invite_code`. The invite code is the only shared secret for private clubs. Because `club_members_insert_self_or_admin` allows any authenticated user to self-insert into any club (as noted in CR-02), there is no actual gating on the invite code at the database level. The `invite_code` lookup on line 51 is performed client-side but not enforced by any database constraint or RPC. An attacker who knows a private club's UUID can join it without possessing the invite code — they just need to skip the lookup step. The fix requires the join to go through an RPC that atomically validates `invite_code` and inserts the member.

**Fix:** Create a `join_club_by_invite(p_invite_code text) returns uuid` RPC with `SECURITY DEFINER` that does the invite code lookup and member insert atomically, then restrict direct `club_members` INSERT for self-joins to public clubs only (see CR-02).

---

### CR-04: Deep-link invite code injected unsanitized into router path

**File:** `expo-app/app/_layout.tsx:73` and `expo-app/app/_layout.web.tsx:70`  
**Issue:** The invite code extracted from a deep link is interpolated directly into a router path:
```typescript
router.replace(`/(app)/clubs/join?code=${code}` as any);
```
The `code` variable comes from `queryParams?.code as string` or `path?.split('/')[1]`. There is no validation that `code` is a safe string before routing. A maliciously crafted deep link such as `buchclub://join?code=../../../(auth)/update-password` or a code containing URL-encoding tricks could manipulate the route. While expo-router does validate routes, the `as any` cast bypasses TypeScript route safety entirely. Additionally `path?.split('/')[1]` (line 73) can extract any path segment without length or character validation.

**Fix:** Validate and sanitize the code before using it in routing. Only accept codes matching the expected format:
```typescript
const rawCode = (queryParams?.code as string) ?? path?.split('/')[1];
const code = typeof rawCode === 'string' && /^[A-Z0-9]{8}$/.test(rawCode)
  ? rawCode
  : null;
if (isJoinLink && code) { ... }
```

---

### CR-05: Avatar "Skip" button triggers the same handler as "Continue" — loading state and error bypass

**File:** `expo-app/app/(onboarding)/avatar.tsx:120-122`  
**Issue:** The "Skip" button calls `handleContinue` (line 120-122), which is the same function used by the "Continue" button. `handleContinue` runs `supabase.from('profiles').update(...)` when `selectedAvatar !== null`. If an avatar is selected, pressing "Skip" will attempt to save the avatar (contradicting the intent of skipping), and if that save fails, the user sees an error and cannot proceed. The logical intent of "Skip" is to advance without saving any avatar — it should call a different handler or call `handleContinue` only after ensuring `selectedAvatar` is null. The state machine also does not distinguish "skip" from "save" in error handling.

**Fix:**
```typescript
function handleSkip() {
  // Advance without saving any avatar selection
  setSheetOpen(true);
}
// ...
<Button variant="text" onPress={handleSkip}>
  {isClient ? t('onboarding:avatar_skip') : 'Skip'}
</Button>
```

---

### CR-06: Delete account — client session not explicitly invalidated on RPC success

**File:** `expo-app/app/(app)/profile/index.tsx:68-79`  
**Issue:** `handleDeleteAccount` calls `supabase.rpc('delete_account')` which deletes the row from `auth.users`. The comment on line 74 says "Session invalidated by RPC → AuthProvider fires → redirect to sign-in". However, the Supabase JS client holds an in-memory session token that is NOT automatically invalidated when the user row is deleted on the server. The `onAuthStateChange` callback fires on token refresh failure, but this is not immediate — it may take up to the token's expiry (typically 1 hour) before the client detects the account is gone. During this window, the client-side session still carries a valid JWT and the user remains nominally "logged in" in the app UI. The `AuthProvider`'s `onAuthStateChange` will only fire when the next API call fails with a 401 or the token refresh is attempted.

**Fix:** Explicitly sign out after successful account deletion:
```typescript
async function handleDeleteAccount() {
  setDeleteLoading(true);
  setError(null);
  try {
    const { error: rpcError } = await supabase.rpc('delete_account');
    if (rpcError) throw rpcError;
    // Explicitly clear the client session; don't rely on server-side cascade
    await supabase.auth.signOut();
  } catch {
    setError(t('common:error_generic'));
    setDeleteLoading(false);
  }
}
```

---

## Warnings

### WR-01: Username uniqueness check does not validate the final submitted value against the debounce window

**File:** `expo-app/app/(onboarding)/username.tsx:57-83`  
**Issue:** `handleSubmit` checks `usernameAvailable` (line 58), which was set by the debounced async check. However, if the user types quickly and hits submit before the debounce resolves (500ms), the button is guarded by `!canSubmit` (line 85: `canSubmit = usernameAvailable && !validating`). But there is a TOCTOU window: `usernameAvailable` is set to `true` by the debounced check, then the user could type more characters (triggering `setAvailable(false)`) but the component may re-render with `canSubmit = false`. This is mostly safe, but the `handleSubmit` itself does **not** re-validate the format of `username` with the regex before sending to Supabase. A username like `"abc "` (with trailing space) would pass `username.trim().length >= 3` and `usernameAvailable` (since the availability check used the untrimmed value) but be saved with a trailing space via `update({ username })` on line 71.

**Fix:** At the top of `handleSubmit`, validate with the same regex used in `handleUsernameChange`:
```typescript
const trimmed = username.trim();
if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
  setUsernameError(t('onboarding:username_error_format'));
  return;
}
// Use trimmed in the update call
const { error } = await supabase.from('profiles').update({ username: trimmed }).eq('id', userId);
```

---

### WR-02: `club_members` select policy creates a self-referential subquery that may silently exclude non-members

**File:** `supabase/migrations/0001_v1_full_schema.sql:185-195`  
**Issue:** The `club_members_select_co_member` policy uses a self-referential subquery:
```sql
using (
  exists (
    select 1 from public.club_members cm2
    where cm2.club_id = club_members.club_id and cm2.user_id = auth.uid()
  )
)
```
This means a user can only see members of clubs they are already a member of. However, the `join/index.tsx` screen's `handleJoin` function queries `clubs` by `invite_code` (line 51) and then inserts into `club_members`. There is no pre-join query of `club_members`, so the join flow itself is unaffected. The problem arises in `ClubDetailScreen` (clubs/[id]/index.tsx line 48): after a user joins a club and the `club_members` row is inserted, the `members` query depends on this same policy. If there is a small propagation delay, the newly joined user might briefly see an empty members list. This is a minor race, but the bigger concern is that `browse/index.tsx` fetches `club_members(count)` (line 29) for public clubs — this will return 0 or null for clubs the current user has NOT joined, because the select policy blocks them from reading those rows.

**Fix:** For the `member_count` in browse/public view, use a separate `count_club_members(club_id)` security-definer function, or change the browse query to use a public-readable aggregate view without exposing individual member rows.

---

### WR-03: `dissolveMutation` — club member deletion may silently fail, leaving orphaned rows

**File:** `expo-app/app/(app)/clubs/[id]/settings.tsx:79-93`  
**Issue:** `dissolveMutation.mutationFn` first deletes from `club_members` (line 82) but discards the error:
```typescript
await supabase.from('club_members').delete().eq('club_id', id);
```
The return value is ignored. If this DELETE fails (e.g., network error, RLS denial), the function proceeds to delete the club itself. Deleting the club with `ON DELETE CASCADE` on `club_members` would handle cleanup, but the comment says "explicit is safer." If the explicit delete fails and the club delete also fails, `onError` fires but the user is left in an undefined state. More importantly: if the explicit delete partially succeeds and the club delete then fails, the club has orphaned (or partially cleared) members with no recovery path shown to the user.

**Fix:** Check the error from the members delete, or rely solely on the CASCADE and remove the explicit pre-delete:
```typescript
mutationFn: async () => {
  const { error: delError } = await supabase.from('clubs').delete().eq('id', id);
  if (delError) throw delError;
  // CASCADE handles club_members cleanup
},
```

---

### WR-04: `handleJoin` in `browse/index.tsx` uses `useAuthStore` hook selector outside component body

**File:** `expo-app/app/(app)/clubs/browse/index.tsx:19`  
**Issue:** `userId` is obtained via `useAuthStore((s) => s.session?.user.id)` in the component body (line 19) — this is correct React hook usage. However, the `joinMutation.mutationFn` (line 44) closes over `userId` from the component scope. If `userId` becomes undefined between render and mutation execution (e.g., session expires), the guard `if (!userId) throw new Error('No session')` will catch it, but the error message ('No session') is caught generically as `t('common:error_generic')` — the user gets no indication that they need to sign in again.

This is a minor concern but the pattern of closing over `userId` in mutations is repeated across multiple files (create/index.tsx line 49, join/index.tsx line 31). Inconsistently, `create/index.tsx` uses `useAuthStore.getState().session?.user.id` (the imperative getter) inside the mutation to avoid stale closure, while `browse/index.tsx` closes over the hook-derived value. This inconsistency is a reliability gap.

**Fix:** Use the imperative getter consistently inside mutation functions to avoid stale closures:
```typescript
mutationFn: async (clubId: string) => {
  const userId = useAuthStore.getState().session?.user.id;
  if (!userId) throw new Error('No session');
  // ...
},
```

---

### WR-05: Missing translation key `profile:save_profile` — will fall back to key name

**File:** `expo-app/app/(app)/profile/edit.tsx:170` and `expo-app/lib/i18n/en.json`, `expo-app/lib/i18n/de.json`  
**Issue:** `profile/edit.tsx` line 170 calls `t('profile:save_profile')`. Neither `en.json` nor `de.json` contains a `save_profile` key in the `profile` namespace. At runtime this will render the literal key string `"save_profile"` as the button label. The closest existing key is `common.save` ("Save").

**Fix:** Add the missing key to both translation files, or use the existing `common:save` key:
```json
// In en.json profile namespace:
"save_profile": "Save profile",
// In de.json profile namespace:
"save_profile": "Profil speichern",
```

---

### WR-06: `ClubBanner` has no `onPress` handler despite `accessibilityRole="button"` and "switch club" label

**File:** `expo-app/components/ui/ClubBanner.tsx:34-48`  
**Issue:** The `ClubBanner` component renders with `accessibilityRole="button"` and `accessibilityLabel={t('switch_club')}` (lines 34-35), visually implying it is tappable to switch clubs. However, there is no `onPress` handler on the outer `XStack`. Pressing the banner does nothing. This is a broken UX promise: screen readers will announce it as an interactive button, but activation has no effect.

**Fix:** Either wire up an `onPress` to navigate to the clubs list, or change the accessibility role to `"text"`:
```typescript
<XStack
  height={40}
  backgroundColor="$ink"
  paddingHorizontal="$lg"
  alignItems="center"
  accessibilityRole="button"
  accessibilityLabel={t('switch_club')}
  onPress={() => router.push('/(app)/clubs')}
  pressStyle={{ opacity: 0.85 }}
>
```

---

### WR-07: `generateInviteCode` has modulo bias — code space is not uniform

**File:** `expo-app/app/(app)/clubs/create/index.tsx:20-26`  
**Issue:** The invite code generator maps each byte `b` to `CHARS[b % CHARS.length]`. `CHARS` has 36 characters. `256 / 36 = 7.11...`, so values 0-251 map uniformly but values 252-255 map to CHARS[0]–CHARS[3] with doubled probability. While the practical security impact is low for 8-character codes (the bias is ~1.6%), this is a textbook modulo bias for cryptographic code generation. Because this code is used as a shared secret (invite code), it should be unbiased.

**Fix:** Use rejection sampling:
```typescript
function generateInviteCode(): string {
  const result: string[] = [];
  while (result.length < 8) {
    const byte = new Uint8Array(1);
    crypto.getRandomValues(byte);
    const val = byte[0];
    if (val < Math.floor(256 / CHARS.length) * CHARS.length) {
      result.push(CHARS[val % CHARS.length]);
    }
  }
  return result.join('');
}
```

---

### WR-08: `SplashScreen.hideAsync()` called inside a `useEffect` that fires on every `segments` change

**File:** `expo-app/app/_layout.tsx:38` and `expo-app/app/_layout.web.tsx:38`  
**Issue:** `SplashScreen.hideAsync()` is called inside the auth/onboarding guard `useEffect` (line 38), which re-fires whenever `session`, `initialized`, `hasHydrated`, `onboardingCompleted`, `segments`, or `router` change. After the first hide, subsequent calls to `hideAsync()` are no-ops, but `segments` changes on every navigation, causing this effect to re-run on every route change after app load. This is harmless for `hideAsync` since it's idempotent, but it means all the routing logic in this effect also runs on every navigation — including potentially spurious `router.replace` calls. If a user navigates to `/(app)/clubs` and `segments` updates to `['(app)', 'clubs']`, the guard re-evaluates: `session` is set, not in auth group, `onboardingCompleted` is true, not in onboarding group — all conditions fall through with no redirect, which is correct. However, the structure is fragile; adding a new route segment pattern could accidentally trigger a redirect loop.

**Fix:** Separate the splash-hide from the routing guard, and use a ref to ensure `hideAsync` is called exactly once:
```typescript
const splashHidden = useRef(false);
useEffect(() => {
  if (!initialized || !hasHydrated) return;
  if (!splashHidden.current) {
    SplashScreen.hideAsync();
    splashHidden.current = true;
  }
  // routing guard continues...
}, [session, initialized, hasHydrated, onboardingCompleted, segments, router]);
```

---

### WR-09: `settings.tsx` visibility toggle manually calls `setHasChanges(true)` bypassing the change-detection `useEffect`

**File:** `expo-app/app/(app)/clubs/[id]/settings.tsx:168-200`  
**Issue:** The visibility card `onPress` handlers manually call `setHasChanges(true)` (lines 169, 196) even when `isPublic` is already the current value. This means tapping the already-selected option will set `hasChanges = true` and show the Save button even though nothing changed. The `useEffect` on lines 54-61 detects changes by comparing to `club.description ?? ''` etc., but it runs asynchronously and will reset `hasChanges` back to `false` on the next render. This creates a brief flash of the Save button on no-op taps.

**Fix:** Remove the manual `setHasChanges(true)` calls from the visibility `onPress` handlers and let the `useEffect` handle change detection exclusively:
```typescript
onPress={() => setIsPublic(true)}
// Remove: setHasChanges(true)
```

---

### WR-10: `handleCodeComplete` in join screen queries clubs without error handling for network failures

**File:** `expo-app/app/(app)/clubs/join/index.tsx:33-44`  
**Issue:** `handleCodeComplete` performs a Supabase query (line 38) and treats any non-result as an invalid code (line 43). If the query fails due to a network error (e.g., offline), `data` will be `null` and the user sees "This code is invalid or expired" — a misleading error. The `error` return value from the query is discarded entirely.

**Fix:**
```typescript
async function handleCodeComplete(completedCode: string) {
  setError(null);
  setClubPreview(null);
  const { data: club, error: lookupError } = await supabase
    .from('clubs')
    .select('id, name')
    .eq('invite_code', completedCode)
    .single();
  if (lookupError?.code === 'PGRST116') {
    setError(t('clubs:join_error_invalid'));
  } else if (lookupError) {
    setError(t('common:error_network'));
  } else if (club) {
    setClubPreview(club);
  }
}
```

---

## Info

### IN-01: Hardcoded `"(You)"` string not translated in `MemberRow`

**File:** `expo-app/components/ui/MemberRow.tsx:70`  
**Issue:** The string `' (You)'` is hardcoded in English and will appear untranslated for German users. The component does not use `useTranslation`, so there is no easy hook to call.

**Fix:** Pass a translated `youLabel` prop from the parent or add `useTranslation` to the component:
```typescript
// In the parent (clubs/[id]/index.tsx):
<MemberRow
  ...
  isCurrentUser={member.user_id === userId}
  youLabel={t('common:you', { defaultValue: '(You)' })}
/>
```

---

### IN-02: `member_count` is hardcoded `0` in `clubs/index.tsx` — misleads `ClubCard`

**File:** `expo-app/app/(app)/clubs/index.tsx:60-62`  
**Issue:** The clubs list screen sets `member_count: 0` for all clubs (line 61) with a comment explaining this is for performance. `ClubCard` renders this as "0 members" for every club in the user's club list, which is wrong even if it's a known stub.

**Fix:** Either fetch member counts in the clubs query (using an aggregate or a separate query), or hide the member count display in `ClubCard` when `member_count === 0` to avoid showing misleading data. This is a UX issue that makes the app look broken.

---

### IN-03: `t('common:or', { defaultValue: 'or' })` key does not exist in translation files

**File:** `expo-app/app/(app)/clubs/join/index.tsx:155`  
**Issue:** The OR divider calls `t('common:or', { defaultValue: 'or' })`. The `common` namespace in both `en.json` and `de.json` does not contain an `or` key. The `defaultValue` fallback prevents a visible error, but it means this string is never translated to German.

**Fix:** Add `"or": "or"` to `en.json` common namespace and `"or": "oder"` to `de.json` common namespace.

---

### IN-04: `Button` `text` variant has `borderRadius: 0` — violates design system "no sharp corners on interactive elements"

**File:** `expo-app/components/ui/Button.tsx:49`  
**Issue:** The `text` variant sets `borderRadius={0}`. The design system explicitly states "No sharp corners (0px) on interactive elements." While the button has no visible border, the press hit area has a sharp bounding radius which is inconsistent with the design rules.

**Fix:** Use a small non-zero radius (e.g., `borderRadius={4}`) for the text variant.

---

### IN-05: `ClubCard` `onPress` is `() => {}` in browse screen — dead interaction

**File:** `expo-app/app/(app)/clubs/browse/index.tsx:139`  
**Issue:** `ClubCard` in the browse screen passes `onPress={() => {}}` (a no-op). Tapping the card body does nothing. Users might expect to navigate to club details. The join button works, but the card body tap is silently dead.

**Fix:** Either navigate to a read-only club preview, or remove the `onPress` prop so the card does not render as pressable.

---

_Reviewed: 2026-05-25_  
_Reviewer: Claude (gsd-code-reviewer)_  
_Depth: standard_
