# Phase 3: Books & Reading List — Research

**Researched:** 2026-05-26
**Domain:** Supabase Edge Functions (CORS proxy), Google Books API, Expo SDK 56, TanStack Query v5, Tamagui 2.x Sheets
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Book search lives in a dedicated screen at `(app)/books/search` — not inline in the Books tab. A '+' / FAB button on the Books tab navigates to this screen.
- **D-02:** Search triggers with **300ms debounce, 2-character minimum**. Live-as-you-type; no manual submit required.
- **D-03:** Results are **paginated**: first 10 results shown, with a "Load more" button/trigger to fetch the next 10.
- **D-04:** When search returns no results, show the **empty state illustration + message**.
- **D-05:** There is a **dedicated Book Detail screen** (separate route). Tapping a search result navigates to it.
- **D-06:** The detail screen shows: **large cover image, title, author, publication year, and description** (up to ~3 lines with expandable "Read more").
- **D-07:** The detail screen is accessible from **both search results and the reading list**.
- **D-08:** The "Add to my list" action lives on the detail screen — a status picker (planned / reading / completed) + confirm button.
- **D-09:** Books are displayed as **portrait cover cards** — full-width card with cover image prominent, title + author + status badge below.
- **D-10:** The Books tab has **three tabs / a segmented control** at the top: "Reading" / "Planned" / "Done".
- **D-11:** Status badges use design token colors: Planned → `#1A4FE0` (blue), Reading → `#E85D1F` (orange), Completed → `#2A7A3A` (green).
- **D-12:** Status can be changed from (1) the Book Detail screen and (2) via long-press on a list card (bottom sheet).
- **D-13:** Delete is **only available from the Book Detail screen** — a "Remove from list" button at the bottom.
- **D-14:** Deletion is **immediate with a slide-out card animation** — no confirmation dialog.

### Claude's Discretion

- Route path for book detail (e.g. `(app)/books/[id]` or `(app)/books/search/[id]`)
- Exact layout of the "Add to list" button vs. the status picker on the detail screen
- Google Books Edge Function name and caching strategy

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| LIST-01 | User can search for books by title, author, or ISBN via Google Books API | Google Books REST: `GET https://www.googleapis.com/books/v1/volumes?q={query}&maxResults=10&startIndex={offset}` — free, no API key required. CORS-safe via Edge Function proxy. |
| LIST-02 | Search results display cover image, title, and author | `volumeInfo.imageLinks.thumbnail` (HTTPS, replace `http://` prefix); `volumeInfo.title`; `volumeInfo.authors[0]`. |
| LIST-03 | User can save a book to their personal reading list (stores title, author, cover URL, ISBN) | Two-step: INSERT into `public.books` (upsert on `google_books_id`), then INSERT into `public.personal_books`. |
| LIST-04 | User can set and update a book's status: planned, reading, completed | `UPDATE public.personal_books SET status = '{status}'` WHERE user_id = auth.uid() AND id = '{id}'. RLS `personal_books_update_self` policy permits this. |
| LIST-05 | User can view their personal reading list with cover images displayed | TanStack Query join: `personal_books.select('*, books(title, author, cover_url, isbn)')` filtered by `user_id`. |
| LIST-06 | User can delete a book from their personal reading list | `DELETE FROM public.personal_books WHERE id = '{id}' AND user_id = auth.uid()`. RLS `personal_books_delete_self` policy permits this. Cascade delete on `books` row is NOT correct — books are a shared cache. Only delete the `personal_books` row. |

</phase_requirements>

---

## Research Findings

### 1. Supabase Edge Function — Google Books Proxy

**Problem:** The Google Books API is accessed via `https://www.googleapis.com/books/v1/volumes`, which does not send CORS headers allowing browser origins. On native (iOS/Android) this is irrelevant; on web this causes a blocked request. The project decision (STATE.md blocker note) mandates routing all Google Books calls through a Supabase Edge Function proxy.

**Implementation pattern** (Deno / Supabase Edge Function):

```typescript
// supabase/functions/google-books-search/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const GOOGLE_BOOKS_BASE = "https://www.googleapis.com/books/v1/volumes";

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Authorization, Content-Type",
      },
    });
  }

  const url = new URL(req.url);
  const q = url.searchParams.get("q");
  const maxResults = url.searchParams.get("maxResults") ?? "10";
  const startIndex = url.searchParams.get("startIndex") ?? "0";

  if (!q || q.trim().length < 2) {
    return new Response(JSON.stringify({ items: [], totalItems: 0 }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  const apiUrl = `${GOOGLE_BOOKS_BASE}?q=${encodeURIComponent(q)}&maxResults=${maxResults}&startIndex=${startIndex}&projection=lite`;
  const response = await fetch(apiUrl);
  const data = await response.json();

  return new Response(JSON.stringify(data), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
});
```

**Key points:**
- `verify_jwt: false` — the Edge Function is called from the app's own Supabase project URL; we trust the caller implicitly. Alternatively pass the Supabase anon key in the `Authorization` header and set `verify_jwt: true`. **Recommendation: use `verify_jwt: true` and pass the publishable key** to prevent scraping.
- `projection=lite` reduces payload size — returns only volumeInfo, not accessInfo or saleInfo.
- Deploy with: `supabase functions deploy google-books-search --no-verify-jwt` (if going verify_jwt false) or standard deploy with jwt verification.
- The project does not yet have a `supabase/functions/` directory — it must be created.

**Client call pattern:**

```typescript
import { supabase } from '../lib/supabase';

async function searchBooks(query: string, startIndex = 0) {
  const { data, error } = await supabase.functions.invoke('google-books-search', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: null,
    // Pass params via query string using custom fetch
  });
  // OR: use fetch() directly against the function URL
}
```

**Better client pattern using fetch directly:**

```typescript
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

async function searchBooks(query: string, startIndex = 0) {
  const url = `${SUPABASE_URL}/functions/v1/google-books-search?q=${encodeURIComponent(query)}&maxResults=10&startIndex=${startIndex}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!res.ok) throw new Error(`Search failed: ${res.status}`);
  return res.json() as Promise<GoogleBooksResponse>;
}
```

This pattern is used consistently in the existing codebase (PATTERNS.md confirms direct Supabase client calls without abstraction layers). This is consistent — use `fetch` with the project URL.

---

### 2. Google Books API — Response Shape

```typescript
type GoogleBooksResponse = {
  kind: string;
  totalItems: number;
  items?: GoogleBookItem[];
};

type GoogleBookItem = {
  id: string; // google_books_id
  volumeInfo: {
    title: string;
    authors?: string[];
    publishedDate?: string;
    description?: string;
    imageLinks?: {
      smallThumbnail?: string;
      thumbnail?: string;
    };
    industryIdentifiers?: Array<{
      type: 'ISBN_10' | 'ISBN_13' | 'OTHER';
      identifier: string;
    }>;
  };
};
```

**Cover URL normalization:** Google Books returns `http://` URLs for covers; these break on iOS (ATS). Always replace `http://` with `https://` before storing or displaying. Use `thumbnail` (not `smallThumbnail`) for list view; both are ~128px wide — sufficient for cards.

**ISBN extraction:** Prefer `ISBN_13` > `ISBN_10` > null. The `books.isbn` column stores a single string; extract with:

```typescript
function extractIsbn(identifiers?: GoogleBookItem['volumeInfo']['industryIdentifiers']): string | null {
  if (!identifiers) return null;
  return (
    identifiers.find(i => i.type === 'ISBN_13')?.identifier ??
    identifiers.find(i => i.type === 'ISBN_10')?.identifier ??
    null
  );
}
```

---

### 3. Database Write Pattern (LIST-03: Save Book)

The schema uses a two-table design:
- `public.books` — global cache, append-only. One row per unique `google_books_id`.
- `public.personal_books` — per-user join table with `status`. Has `unique(user_id, book_id)` constraint.

**Upsert pattern for adding a book:**

```typescript
async function addBook(item: GoogleBookItem, userId: string, status: 'planned' | 'reading' | 'completed') {
  // Step 1: Upsert global book record
  const { data: bookRow, error: bookError } = await supabase
    .from('books')
    .upsert(
      {
        google_books_id: item.id,
        isbn: extractIsbn(item.volumeInfo.industryIdentifiers),
        title: item.volumeInfo.title,
        author: item.volumeInfo.authors?.[0] ?? null,
        cover_url: item.volumeInfo.imageLinks?.thumbnail?.replace('http://', 'https://') ?? null,
      },
      { onConflict: 'google_books_id', ignoreDuplicates: false }
    )
    .select('id')
    .single();
  if (bookError) throw bookError;

  // Step 2: Insert personal_books row
  const { error: personalError } = await supabase
    .from('personal_books')
    .insert({ user_id: userId, book_id: bookRow.id, status });
  if (personalError) throw personalError;
}
```

**RLS note:** The `books` table has `books_insert_authenticated` policy (INSERT for authenticated users). The `personal_books_insert_self` policy checks `user_id = auth.uid()` — the `userId` param in `insert` must match the session user. In practice, use `session.user.id` from `useAuthStore`.

**If already in list:** The `unique(user_id, book_id)` constraint will throw a 23505 (unique violation). The UI must handle this gracefully — show "Already in your list" rather than an error. Check for `error.code === '23505'`.

---

### 4. Reading List Query Pattern (LIST-05)

```typescript
// Fetch reading list with book details
const { data, isLoading } = useQuery({
  queryKey: ['personal_books', userId, status], // status = 'reading' | 'planned' | 'completed' | undefined
  queryFn: async () => {
    let query = supabase
      .from('personal_books')
      .select('id, status, added_at, books(id, google_books_id, title, author, cover_url, isbn)')
      .eq('user_id', userId!)
      .order('added_at', { ascending: false });
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },
  enabled: !!userId,
});
```

**Type casting:** Supabase JS returns nested selects as `unknown` typed. Use `as unknown as BookDetail` cast pattern (established in Phase 2 codebase).

---

### 5. Status Update Pattern (LIST-04)

```typescript
const updateStatusMutation = useMutation({
  mutationFn: async ({ personalBookId, status }: { personalBookId: string; status: 'planned' | 'reading' | 'completed' }) => {
    const { error } = await supabase
      .from('personal_books')
      .update({ status })
      .eq('id', personalBookId)
      .eq('user_id', userId!); // belt-and-suspenders; RLS enforces this too
    if (error) throw error;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['personal_books', userId] });
  },
});
```

---

### 6. Delete Pattern (LIST-06)

```typescript
const deleteMutation = useMutation({
  mutationFn: async (personalBookId: string) => {
    const { error } = await supabase
      .from('personal_books')
      .delete()
      .eq('id', personalBookId)
      .eq('user_id', userId!);
    if (error) throw error;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['personal_books', userId] });
    router.back(); // Navigate back after deletion
  },
});
```

**Important:** Only delete from `personal_books`, NOT from `books`. The `books` table is a shared append-only cache used by pool_books (Phase 4). Deleting a book row would cascade-delete pool entries. Phase 3 must never DELETE from `public.books`.

---

### 7. Tamagui Components for Phase 3

**Segmented control (status tabs):** Tamagui 2.x does not have a native SegmentedControl component. Use `XStack` + `Button` toggling pattern with `variant="primary"` for active and `variant="secondary"` for inactive. Or use `Tabs` from `@tamagui/tabs` if available. The Phase 2 bottom nav used `XStack` with `TouchableOpacity` — follow the same pattern.

**Cover image:** Use Tamagui `Image` with `resizeMode="cover"` and a defined aspect ratio container (`aspectRatio={2/3}` for portrait book covers). Always provide a fallback placeholder (e.g., `assets/illustrations/empty-man.png`) when `cover_url` is null.

**Long-press bottom sheet (D-12):** Use Tamagui `Sheet` (same as the Invite Sheet pattern in `clubs/[id]/index.tsx`):
```tsx
<Sheet
  modal
  open={statusSheetOpen}
  onOpenChange={setStatusSheetOpen}
  snapPoints={[40]}
  dismissOnSnapToBottom
  // @ts-expect-error Tamagui 2.x animation prop requires config registration
  animation="slow"
>
```

**Slide-out animation (D-14):** Use `@tamagui/animations-react-native` with the `"fast"` preset and `exitStyle={{ opacity: 0, x: -100 }}` on the card. This leverages the existing animation config.

---

### 8. Debounce Pattern (D-02: 300ms debounce)

React Native does not have `lodash.debounce` built-in but it's available via npm. The project uses minimal dependencies — implement a simple `useDebounce` hook:

```typescript
// expo-app/lib/hooks/useDebounce.ts
import { useEffect, useState } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
```

Use with TanStack Query `enabled`:
```typescript
const debouncedQuery = useDebounce(searchText, 300);
const { data } = useQuery({
  queryKey: ['books-search', debouncedQuery],
  queryFn: () => searchBooks(debouncedQuery),
  enabled: debouncedQuery.length >= 2,
});
```

---

### 9. Pagination Pattern (D-03: Load More)

Use TanStack Query `useInfiniteQuery` for load-more behavior:

```typescript
const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
  queryKey: ['books-search', debouncedQuery],
  queryFn: ({ pageParam = 0 }) => searchBooks(debouncedQuery, pageParam),
  getNextPageParam: (lastPage, allPages) => {
    const loaded = allPages.reduce((sum, p) => sum + (p.items?.length ?? 0), 0);
    return loaded < lastPage.totalItems ? loaded : undefined;
  },
  enabled: debouncedQuery.length >= 2,
  initialPageParam: 0,
});
```

Note: `initialPageParam` is required in TanStack Query v5.

---

### 10. Navigation: Book Detail Route

Route path decision (Claude's Discretion): Use `(app)/books/[id].tsx` — a dynamic segment at the books level. The `id` param will be the `personal_books.id` when accessed from the list, or a Google Books `volumeId` when accessed from search results. Since the detail screen serves both use cases, pass a `source` query param:

```typescript
// From search results:
router.push(`/(app)/books/${item.id}?source=search&googleBooksId=${item.id}`);

// From reading list:
router.push(`/(app)/books/${personalBook.id}?source=list`);
```

Use `useLocalSearchParams` to access both `id` and `source`. The detail screen fetches differently based on `source`:
- `source=search`: display Google Books item data passed via params or re-fetch from Edge Function
- `source=list`: fetch `personal_books` row + joined `books` row from Supabase

**Simpler approach (recommended):** Pass all display data as search params for the search→detail flow (title, author, coverUrl, googleBooksId), and use Supabase for the list→detail flow. This avoids a second Edge Function call.

---

### 11. Open Library Cover Fallback

Per CLAUDE.md: `https://covers.openlibrary.org/b/isbn/{ISBN}-M.jpg` as fallback when `cover_url` is absent.

```typescript
function getCoverUrl(coverUrl: string | null, isbn: string | null): string | undefined {
  if (coverUrl) return coverUrl;
  if (isbn) return `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`;
  return undefined; // Show placeholder
}
```

---

### 12. Schema Confirmation — No New Migrations Needed

Phase 3 tables already exist in `supabase/migrations/0001_v1_full_schema.sql`:
- `public.books` (id, google_books_id, isbn, title, author, cover_url, created_at)
- `public.personal_books` (id, user_id, book_id, status CHECK('planned','reading','completed'), added_at)
- RLS policies: `books_select_any`, `books_insert_authenticated`, `personal_books_select_self`, `personal_books_insert_self`, `personal_books_update_self`, `personal_books_delete_self` — all in place.

**No new migrations required for Phase 3.** The only new infrastructure is the Edge Function.

---

### 13. File Structure for Phase 3

New files to create:
```
supabase/functions/google-books-search/index.ts         — Edge Function proxy
expo-app/lib/hooks/useDebounce.ts                       — Debounce hook
expo-app/app/(app)/books/index.tsx                      — REPLACE stub: segmented control + filtered list
expo-app/app/(app)/books/search.tsx                     — New: search screen
expo-app/app/(app)/books/[id].tsx                       — New: book detail screen
expo-app/components/ui/BookCard.tsx                     — New: portrait cover card component
expo-app/lib/i18n/en.json                               — Extend: add 'books' namespace
expo-app/lib/i18n/de.json                               — Extend: add 'books' namespace
```

Modified files:
```
expo-app/lib/i18n/index.ts                              — Register 'books' namespace
```

---

### 14. i18n Namespace — books

New keys needed:

```json
{
  "books": {
    "tab_reading": "Reading",
    "tab_planned": "Planned",
    "tab_done": "Done",
    "add_book_fab": "Add book",
    "search_placeholder": "Title, author or ISBN…",
    "search_heading": "Find a book",
    "search_no_results": "No books found for \"{{query}}\"",
    "search_load_more": "Load more",
    "status_planned": "Planned",
    "status_reading": "Reading",
    "status_completed": "Done",
    "add_to_list_heading": "Add to my list",
    "add_to_list_cta": "Add to list",
    "already_in_list": "Already in your list",
    "change_status_heading": "Change status",
    "remove_from_list": "Remove from list",
    "removed_toast": "Removed from list",
    "cover_alt": "Cover of {{title}}",
    "empty_list_heading": "Your list is empty.",
    "empty_list_subtext": "Search for books and add them to your reading list.",
    "empty_search_cta": "Search books",
    "detail_published": "Published {{year}}",
    "detail_read_more": "Read more",
    "detail_read_less": "Show less",
    "error_search_failed": "Search failed. Please try again."
  }
}
```

German equivalents (de.json):
```json
{
  "books": {
    "tab_reading": "Am Lesen",
    "tab_planned": "Geplant",
    "tab_done": "Gelesen",
    "add_book_fab": "Buch hinzufügen",
    "search_placeholder": "Titel, Autor oder ISBN…",
    "search_heading": "Buch suchen",
    "search_no_results": "Keine Bücher gefunden für \"{{query}}\"",
    "search_load_more": "Mehr laden",
    "status_planned": "Geplant",
    "status_reading": "Am Lesen",
    "status_completed": "Gelesen",
    "add_to_list_heading": "Zu meiner Liste hinzufügen",
    "add_to_list_cta": "Zur Liste hinzufügen",
    "already_in_list": "Bereits in deiner Liste",
    "change_status_heading": "Status ändern",
    "remove_from_list": "Aus Liste entfernen",
    "removed_toast": "Aus Liste entfernt",
    "cover_alt": "Cover von {{title}}",
    "empty_list_heading": "Deine Liste ist leer.",
    "empty_list_subtext": "Suche Bücher und füge sie zu deiner Leseliste hinzu.",
    "empty_search_cta": "Bücher suchen",
    "detail_published": "Erschienen {{year}}",
    "detail_read_more": "Mehr lesen",
    "detail_read_less": "Weniger anzeigen",
    "error_search_failed": "Suche fehlgeschlagen. Bitte erneut versuchen."
  }
}
```

---

### 15. Validation Architecture

**Manual test scenarios (verify during execution):**

1. **Search CORS (web):** Open the app in a browser, type a query — no CORS errors in DevTools console; results appear.
2. **Search debounce:** Type 1 character → no request; type 2nd character → request fires after 300ms pause.
3. **Add book (new):** Add a book not in DB → both `books` and `personal_books` rows created. Cover URL uses `https://`.
4. **Add book (duplicate):** Add same book twice → second attempt shows "Already in your list" (no crash).
5. **Status update:** Change status in detail screen → `personal_books.status` updated in DB; tab filter reflects change.
6. **Long-press status:** Long-press a list card → bottom sheet opens with 3 status options; selecting one updates status.
7. **Delete:** Tap "Remove from list" on detail screen → row deleted from `personal_books` only (books table row intact); UI navigates back; card is gone from list.
8. **Empty state:** All 3 tabs show empty-state illustration when no books match status.
9. **Load more:** Search with common query → 10 results shown; tap "Load more" → next 10 appear.
10. **Cover fallback:** Book with no cover → Open Library cover URL attempted; no crash if also missing.

---

## ## RESEARCH COMPLETE

Phase 3 research finished. Key findings:
- **No new DB migrations** — all tables + RLS are in place from Phase 1.
- **Edge Function required** — deploy `google-books-search` to supabase/functions/ before the app can search on web.
- **Two-step save pattern** — upsert into `books`, then insert into `personal_books`. Never delete from `books`.
- **Cover URL normalization** — always `https://`; use Open Library as fallback.
- **TanStack Query `useInfiniteQuery`** for paginated search; `useQuery` for reading list.
- **Debounce hook** — simple custom hook; no new dependency needed.
- **Sheet pattern** — existing pattern from `clubs/[id]/index.tsx` covers long-press status change.
