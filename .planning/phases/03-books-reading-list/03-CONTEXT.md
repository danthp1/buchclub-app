# Phase 3: Books & Reading List - Context

**Gathered:** 2026-05-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can search Google Books (via a Supabase Edge Function proxy for CORS), view book details, and build a personal reading list with cover images and status tracking (planned / reading / completed). The list is fully user-scoped — not tied to any specific club. Users can update status inline or from the detail screen, and delete books from their list. This phase delivers LIST-01 through LIST-06 from REQUIREMENTS.md.

</domain>

<decisions>
## Implementation Decisions

### Search UX
- **D-01:** Book search lives in a **dedicated screen** at `(app)/books/search` — not inline in the Books tab. A '+' / FAB button on the Books tab navigates to this screen.
- **D-02:** Search triggers with **300ms debounce, 2-character minimum**. Live-as-you-type; no manual submit required.
- **D-03:** Results are **paginated**: first 10 results shown, with a "Load more" button/trigger to fetch the next 10.
- **D-04:** When search returns no results, show the **empty state illustration + message** (reuse `assets/illustrations/empty-man.png` or the error illustration; copy the empty-state pattern from the Clubs screen).

### Book Detail Screen
- **D-05:** There is a **dedicated Book Detail screen** (separate route). Tapping a search result navigates to it.
- **D-06:** The detail screen shows: **large cover image, title, author, publication year, and description** (up to ~3 lines with expandable "Read more").
- **D-07:** The detail screen is accessible from **both search results and the reading list**. When accessed from the list, it additionally shows the current status and a change-status control.
- **D-08:** The "Add to my list" action lives on the detail screen — a status picker (planned / reading / completed) + confirm button.

### Reading List Layout
- **D-09:** Books are displayed as **portrait cover cards** — full-width card with cover image prominent, title + author + status badge below.
- **D-10:** The Books tab has **three tabs / a segmented control** at the top: "Reading" / "Planned" / "Done". Each tab filters to that status only.
- **D-11:** Status is visually indicated with **color-coded badges** using design token colors:
  - Planned → `#1A4FE0` (blue)
  - Reading → `#E85D1F` (orange)
  - Completed → `#2A7A3A` (green)

### Status Change & Deletion
- **D-12:** Status can be changed in **two ways**:
  1. From the **Book Detail screen** — segmented control or button group showing all three statuses.
  2. Via **long-press on a list card** — opens a bottom sheet with status options.
- **D-13:** **Delete is only available from the Book Detail screen** — a "Remove from list" button at the bottom.
- **D-14:** Deletion is **immediate with a slide-out card animation** — no confirmation dialog.

### Claude's Discretion
- Route path for book detail (e.g. `(app)/books/[id]` or `(app)/books/search/[id]`) — choose what fits the navigation flow naturally.
- Exact layout of the "Add to list" button vs. the status picker on the detail screen — follow established Button/Input component patterns and design screen references.
- Google Books Edge Function name and caching strategy — STATE.md notes the proxy is required for CORS; planner decides whether to also cache results in the `books` table on search or only on explicit save.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Database Schema
- `supabase/migrations/0001_v1_full_schema.sql` — Full schema. Phase 3 tables: `public.books` (global cache, append-only) and `public.personal_books` (user reading list with status). RLS already defined. Do NOT create new migrations for these tables.

### Design
- `design/design.md` — Design guidelines: colors, typography, spacing, component specs. All UI must follow this.
- `design/screen-book-list.png` — Reading list screen reference
- `design/screen-book-detail.png` — Book detail screen reference
- `design/screen-add-book.png` — Add book / search screen reference
- `design/screen-read-books.png` — Read books / completed tab reference
- `design/screen-empty-books.png` — Empty state reference (use pattern for empty reading list tabs)

### Requirements
- `.planning/REQUIREMENTS.md` — LIST-01..LIST-06 are Phase 3 requirements

### Phase 2 Artifacts (established patterns)
- `.planning/phases/02-clubs-onboarding/02-CONTEXT.md` — established Tamagui card pattern, active club context, Zustand + expo-sqlite patterns
- `.planning/phases/01-foundation/01-UI-SPEC.md` — Tamagui component patterns, animation presets, token usage
- `.planning/phases/01-foundation/01-PATTERNS.md` — Code patterns from Phase 1

### Existing Code (integration points)
- `expo-app/app/(app)/books/index.tsx` — Phase 3 stub — replace entirely
- `expo-app/lib/supabase.ts` — Supabase client — use for all DB calls
- `expo-app/store/club.store.ts` — Active club context (may be needed if club scoping added later)
- `expo-app/store/auth.store.ts` — Auth session — `session.user.id` needed for personal_books queries

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `expo-app/components/ui/Button.tsx` — Primary/secondary button, height 52px, radius-md. Use for "Add to list", "Load more", "Remove from list" CTAs.
- `expo-app/components/ui/Input.tsx` — Use for the search input field.
- `expo-app/components/ui/Alert.tsx` — Use for error feedback (search failure, save failure).
- `expo-app/components/ui/ClubCard.tsx` — **Reference pattern** for `BookCard`: `YStack`, `borderRadius={16}`, shadow `0 2px 12px rgba(0,0,0,0.06)`, `animation="fast"`. Build `BookCard` on this exact structure.

### Established Patterns
- **TanStack Query** for all Supabase data fetching (`useQuery` with `queryKey`, `queryFn`). Use for reading list and book detail fetches.
- **`useDidFinishSSR()`** guard from `@tamagui/use-did-finish-ssr` — required on all web-rendered screens accessing Zustand or i18next. Copy from `app/(app)/clubs/index.tsx`.
- **Direct Supabase client calls** from components — no abstraction layer; keep consistent.
- **i18next namespaces** per feature area — create `books` namespace for all Phase 3 strings; both DE and EN required.
- **Empty-state pattern** — illustration + heading + subtext + optional CTA. Established in clubs/index.tsx. Copy for empty reading list tabs.
- **Skeleton loading** — 2–3 placeholder cards while query is loading. Established in clubs/index.tsx.
- **`@ts-expect-error` on `animation` prop** — Tamagui 2.x animation prop requires this comment on animated Tamagui components.

### Integration Points
- `app/(app)/books/index.tsx` — Books tab root; replace with segmented control + filtered list.
- New route: `app/(app)/books/search.tsx` (or `search/index.tsx`) — dedicated search screen.
- New route: `app/(app)/books/[id].tsx` — book detail screen (accessible from both search and list).
- New Supabase Edge Function: Google Books API proxy (required for CORS on web).

</code_context>

<specifics>
## Specific Ideas

- Status change available from **two entry points**: (1) detail screen segmented control, (2) long-press bottom sheet on list card — both update the same `personal_books.status` field.
- Delete is immediate with a slide-out animation — no confirmation dialog — keep it fast.
- Portrait cover cards (not horizontal rows) — the visual cover image is important for a reading app.
- Tabs: "Reading" / "Planned" / "Done" — match these exact label strings for i18n keys.

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope.

</deferred>

---

*Phase: 3-Books & Reading List*
*Context gathered: 2026-05-26*
