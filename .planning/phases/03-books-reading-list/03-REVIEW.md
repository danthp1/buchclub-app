---
phase: "03"
phase_name: "books-reading-list"
depth: standard
files_reviewed: 11
status: issues_found
findings:
  critical: 0
  warning: 3
  info: 4
  total: 7
reviewed_at: "2026-05-26"
---

# Code Review: Phase 03 — Books & Reading List

**Depth:** Standard  
**Files reviewed:** 11  
**Findings:** 0 Critical, 3 Warning, 4 Info

---

## Files Reviewed

1. `supabase/functions/google-books-search/index.ts`
2. `expo-app/lib/hooks/useDebounce.ts`
3. `expo-app/lib/i18n/en.json`
4. `expo-app/lib/i18n/de.json`
5. `expo-app/lib/i18n/index.ts`
6. `expo-app/components/ui/BookCard.tsx`
7. `expo-app/app/(app)/books/_layout.tsx`
8. `expo-app/app/(app)/books/index.tsx`
9. `expo-app/app/(app)/books/search.tsx`
10. `expo-app/app/(app)/books/[id].tsx`
11. `expo-app/components/ui/Alert.tsx`

---

## Findings

### WR-01 — Edge Function: No auth validation on the proxy

**File:** `supabase/functions/google-books-search/index.ts`  
**Severity:** Warning  
**Category:** Security

The edge function is called with a `Bearer` token from the client (`Authorization: Bearer ${supabaseKey}`) but the function itself never validates that header. Anyone with the Supabase project URL can hit the proxy without authentication, consuming the 1,000 req/day Google Books quota unauthenticated. The `verify_jwt` option in deployment config defaults to `true` for Supabase Edge Functions, but the function code does not explicitly guard against missing/invalid tokens.

**Recommendation:** Rely on `verify_jwt: true` at deploy time (Supabase's built-in JWT verification) OR add an explicit auth check in the function body:

```ts
const authHeader = req.headers.get('Authorization');
if (!authHeader?.startsWith('Bearer ')) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}
```

Confirm `verify_jwt: true` is set in the deployment configuration.

---

### WR-02 — `[id].tsx`: `addMutation.onSuccess` calls `router.back()` even when `alreadyInList` is true

**File:** `expo-app/app/(app)/books/[id].tsx`  
**Severity:** Warning  
**Category:** Bug / UX

In the `addMutation.onSuccess` callback:

```ts
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['personal_books', userId] });
  if (!alreadyInList) {
    setTimeout(() => router.back(), 800);
  }
},
```

The `alreadyInList` state is set *inside* `mutationFn` (before `onSuccess` fires), so the guard `if (!alreadyInList)` reads the state set during the same mutation call. However, React state updates are asynchronous — `setAlreadyInList(true)` inside `mutationFn` may not have flushed to the component when `onSuccess` runs synchronously. If `alreadyInList` is still `false` at the time `onSuccess` executes, `router.back()` will be called even when the book is already in the list, popping the screen and hiding the "already in list" info banner from the user.

**Recommendation:** Return a sentinel value from `mutationFn` instead of relying on state read in `onSuccess`:

```ts
mutationFn: async (status: BookStatus): Promise<{ alreadyInList: boolean }> => {
  // ...
  if (personalError.code === '23505') {
    return { alreadyInList: true };
  }
  return { alreadyInList: false };
},
onSuccess: (result) => {
  queryClient.invalidateQueries({ queryKey: ['personal_books', userId] });
  if (!result.alreadyInList) {
    setTimeout(() => router.back(), 800);
  } else {
    setAlreadyInList(true);
  }
},
```

---

### WR-03 — `search.tsx`: Description text truncated at 500 chars without ellipsis indicator

**File:** `expo-app/app/(app)/books/search.tsx`  
**Severity:** Warning  
**Category:** UX / Data integrity

When navigating to the detail screen from search results, the description is truncated:

```ts
if (item.volumeInfo.description) {
  queryParts.push(`description=${encodeURIComponent(item.volumeInfo.description.substring(0, 500))}`);
}
```

The detail screen's "Read more" toggle expands to show the full description, but users will see at most 500 characters with no indicator that the text was truncated. This is also a URL length concern — encoding 500 chars into a URL query param can produce a long URL that may cause issues on some platforms.

**Recommendation:** Either store descriptions in the `books` table on upsert (so the detail screen can fetch the full description), or increase the limit and add a truncation indicator. A conservative fix is to add a trailing `…` when truncating:

```ts
const desc = item.volumeInfo.description;
const truncated = desc.length > 500 ? desc.substring(0, 497) + '…' : desc;
queryParts.push(`description=${encodeURIComponent(truncated)}`);
```

---

### INFO-01 — `useDebounce.ts`: `delay` parameter not guarded against negative values

**File:** `expo-app/lib/hooks/useDebounce.ts`  
**Severity:** Info  
**Category:** Robustness

`setTimeout` with a negative delay falls back to 0ms, effectively removing the debounce. Not a current issue (all call sites pass 300), but worth guarding:

```ts
const safeDelay = Math.max(0, delay);
const timer = setTimeout(() => setDebouncedValue(value), safeDelay);
```

---

### INFO-02 — `Alert.tsx`: `$success` / `$destructive` tokens removed, hardcoded RGBA values used

**File:** `expo-app/components/ui/Alert.tsx`  
**Severity:** Info  
**Category:** Maintainability

The refactored Alert component uses hardcoded RGBA values (`rgba(42, 122, 58, 0.12)`, etc.) instead of Tamagui theme tokens. This means the alert colors won't respond to theme changes (dark mode). The original implementation used `$success` and `$destructive` tokens which would adapt to the active theme.

No action required for v1 (dark mode not yet supported), but track this for Phase 5 (Settings & i18n Completion, which may add theme switching).

---

### INFO-03 — `[id].tsx`: Status button group `onPress` fires status update immediately without loading guard

**File:** `expo-app/app/(app)/books/[id].tsx`  
**Severity:** Info  
**Category:** UX

When `source=list`, tapping a status button immediately calls `updateStatusMutation.mutate(s)`. If the user taps rapidly between statuses, multiple in-flight mutations can be queued. TanStack Query serializes mutations but the UI may appear to flicker. Consider disabling the button group while `updateStatusMutation.isPending`:

```tsx
onPress={() => {
  if (isFromSearch) {
    setSelectedStatus(s);
  } else if (!updateStatusMutation.isPending) {
    updateStatusMutation.mutate(s);
  }
}}
```

---

### INFO-04 — `google-books-search/index.ts`: `maxResults` and `startIndex` URL params not validated

**File:** `supabase/functions/google-books-search/index.ts`  
**Severity:** Info  
**Category:** Robustness / Security

The `maxResults` and `startIndex` params are passed directly from the client request URL to the Google Books API URL without validation. A malicious caller could pass non-numeric values or negative numbers, causing unexpected Google API errors. Add basic integer validation:

```ts
const maxResultsRaw = url.searchParams.get("maxResults") ?? "10";
const startIndexRaw = url.searchParams.get("startIndex") ?? "0";
const maxResults = Math.min(40, Math.max(1, parseInt(maxResultsRaw) || 10));
const startIndex = Math.max(0, parseInt(startIndexRaw) || 0);
```

---

## Summary

No critical issues. The three warnings should be addressed before production:

- **WR-01** (Security): Confirm `verify_jwt: true` on Edge Function deployment or add explicit auth guard.
- **WR-02** (Bug): Fix the `alreadyInList` race condition in `addMutation` — use mutation return value instead of reading state in `onSuccess`.
- **WR-03** (UX/Data): Add truncation indicator for description text passed as URL param.

The four info findings are non-blocking for v1. Track INFO-02 (dark mode theming) for Phase 5.

## Self-Check: PASSED
