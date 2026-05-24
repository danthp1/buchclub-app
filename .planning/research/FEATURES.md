# Feature Landscape

**Domain:** Book club management — multi-club SaaS, universal mobile + web
**Researched:** 2026-05-24
**Confidence:** MEDIUM-HIGH (competitor analysis limited by SPA rendering; core feature set confirmed via StoryGraph, Bookclubs.com, and domain expertise cross-referenced with PROJECT.md)

---

## Table Stakes

Features users expect in any book club app. Missing one of these causes abandonment or "why does this exist?" complaints.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Email + password registration / login | Every app has auth; users won't tolerate no sign-in | Low | Supabase `signUp` / `signInWithPassword` is a one-call implementation. Email confirmation should be enabled in production but can be disabled during dev. |
| Onboarding fork: create club OR join club | First action after login defines the user's role; without this, new users hit a blank state with no guidance | Low-Med | Two clear CTAs at the post-login screen. Club creation generates a UUID-based invite code immediately. |
| Invite code to join a club | The dominant pattern for private clubs everywhere (Discord, Slack, fitness apps). Users know this UX. | Low | Generate short (8-char) alphanumeric code on club creation. Store in `clubs` table. Deep-link compatible: `buchclub://join?code=XXXXXXXX`. |
| Public club discovery / listing | Reduces friction for clubs that don't want to pass codes around. Confirmed by Bookclubs.com and StoryGraph as expected. | Low | Boolean `is_public` flag on club. Simple search/browse screen. |
| Book search (title, author, ISBN) | No club can pick a book without finding it. Google Books API is the industry standard free source. | Low | Google Books `/volumes?q=` endpoint. Debounced input. Display cover thumbnail, title, author, year. |
| Book cover display | Users are visually oriented about books; a list without covers feels broken | Low | Store URL string in DB. Google Books provides `imageLinks.thumbnail`. Fallback to Open Library Covers API (`https://covers.openlibrary.org/b/isbn/{ISBN}-M.jpg`). Render with a grey placeholder while loading. |
| Personal reading list with status tracking | This is the minimum viable "reading life" tracking that every Goodreads/StoryGraph user expects | Low-Med | Three statuses: `planned`, `reading`, `completed`. One table (`user_books`), FK to book and user. Status change is a single update. |
| Propose book to club pool from personal list | The bridge between personal reading and club decision-making — core to the value proposition | Low | Insert into `club_book_proposals`, FK to `user_books`. RLS: club members only. |
| Club member list + basic roles | Users need to know who else is in the club, and admins need a way to manage the group | Low-Med | Two roles: `member` and `admin`. Club creator starts as admin. Role stored in `club_members` join table. Promote/demote via admin action. |
| Upvote books in club pool | The democratic selection mechanic. This is the core differentiator of this app, but the mechanic itself is expected by anyone comparing it to polling apps (Doodle, etc.) | Med | Multi-select upvote (users can vote for any number). Atomic increment via Postgres RPC. No downvote (keeps it positive). |
| Live vote count display | Votes must update in real time or users will reload constantly. Supabase Realtime makes this table stakes. | Med | Subscribe to `postgres_changes` on `club_votes` table filtered by club. Display sorted by vote count descending. |
| Meeting creation (title, date/time, location or video link) | Book clubs exist to meet; without meeting coordination the app is just a reading list | Low-Med | Admin-only create. Fields: title, datetime, optional location text, optional URL. Display in club view sorted by date. |
| Selected book shown on meeting | The live top-voted book should be visible on the meeting entry until admin locks it | Med | Derived from votes at render time (for live) or stored FK (after admin lock). Admin can override at any time. |
| German + English UI from day one | Two-language support was a launch requirement. Users whose device is German must see German; English everywhere else. | Med | `expo-localization` to detect device locale. `i18next` + `react-i18next` for translation keys. Namespace per feature area. Fallback to English if key missing. |

---

## Differentiators

Features that go beyond the baseline. Not expected by users at first contact, but create retention, word-of-mouth, and switching costs when discovered.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Live vote leaderboard with real-time animation | Watching the leaderboard shift as members vote is inherently engaging — turns a dry utility into a social moment | Med | Sorted, animated list re-ordering when new votes arrive via Realtime. A small detail that feels "alive." |
| Admin vote lock (confirms winner, ends voting) | Gives the admin a satisfying "gavel moment" — clear signal that democracy has spoken and the decision is final | Low | Admin taps "Lock book" on meeting. Stores `confirmed_book_id` on the meeting row. Voting UI changes to "closed" state. |
| Manual admin override on confirmed book | Recognizes that real book clubs sometimes change plans. Admins trust the app more when it doesn't fight them. | Low | Admin can change `confirmed_book_id` even after lock. Surfaces as "overridden" to members. |
| Multiple admins per club | Real clubs have co-organizers. Single-admin apps create bottlenecks and abandoned clubs when the founder goes dark. | Low | Promote any member to admin. Permission check on all admin actions via RLS (role = 'admin'). |
| Reading list as proposal source (not free-text) | Forcing proposals to come from the user's own reading list signals intent ("I actually want to read this") and reduces noise from books no one is serious about | Low | This is a UX constraint, not a technical feature. The proposal UI shows only books from the user's `user_books` list. |
| Cover fallback chain (Google Books → Open Library) | Eliminates the broken-image experience that plagues reading apps that rely on a single source | Low | Two-step URL resolution at save time, not render time. Store the resolved URL. No runtime fallback needed. |
| In-app language switcher (override device locale) | Users in multilingual households or testing want to switch language without changing OS settings | Low | Persist choice to AsyncStorage / Supabase user metadata. Expose in settings screen. |
| Per-club meeting history | Provides continuity — "what did we read last time?" is a common question at real meetings | Low | `meetings` table with `status: upcoming | past`. Auto-archive past meetings by date. Show previous book decisions. |
| Empty-state guidance (zero-state UX) | New clubs feel broken without it. Telling users "Invite members and propose a book to get started" is trivially cheap but dramatically reduces day-1 churn. | Low | Conditional empty-state component with CTA. One per major screen (reading list, club pool, meetings). |

---

## Anti-Features

Features to deliberately NOT build in v1. Each one has a reason — building them would cost more than they return.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| In-app messaging / chat | High complexity (moderation, threading, read receipts, notifications), low differentiation (WhatsApp and Telegram already do this better), and book clubs already have existing chat channels they won't abandon | Provide a "meeting link" field that can hold a WhatsApp group link, Zoom URL, or Discord invite |
| Book reviews / star ratings beyond voting | Adds a competing engagement pattern (Goodreads already does this), fragments attention away from the club voting flow, and requires more data model complexity | The upvote IS the opinion signal. Post-meeting notes can go in external chat. |
| OAuth / social login (Google, Apple, GitHub) | Adds native module complexity (Expo + Apple Sign In = mandatory for App Store if offered), review friction, and per-platform credentials to manage. Email/password is sufficient for a personal app. | Email + password only for v1. Add OAuth as a v2 enhancement after the auth flow is validated. |
| Native push notifications | Requires APNs + FCM credentials, a notification service, and user permission prompts. High implementation cost, low reward when the app's core value is async (users check it when voting). | Rely on Supabase Realtime for in-app updates. Notifications deferred to v2. |
| Payment / subscription tiers | This is explicitly a free personal app. Monetization architecture (Stripe, paywalls, entitlement checks) would dominate the codebase for no user value. | Keep it free. |
| File uploads (cover images, PDFs) | Supabase Storage adds surface area. Cover images are already handled via URL strings. No use case for PDF uploads in a book selection app. | Store cover URLs as strings. Use Google Books / Open Library for all cover images. |
| Video posts / reading progress media | Social reading apps like Fable do this but it requires CDN, transcoding, and significant mobile storage/bandwidth. Out of scope for a club coordination tool. | Text-only interaction model. |
| Admin-only book pool (blocking member proposals) | Some competing apps restrict who can add books. This kills democratic engagement — the value of the app is collective participation, not admin curation. | All club members can propose books from their reading lists. |
| Infinite scroll / "discover books" feed | This is a reading recommendation engine problem (StoryGraph, Goodreads solve it). The book search covers the need. A feed competes with the club focus. | Search-on-demand is sufficient. No algorithmic content. |
| Per-book discussion threads | Increases scope to forum/social product territory. Real book clubs discuss at meetings, not in-app. | Out of scope. Reference the meeting link field for discussion coordination. |

---

## Feature Dependencies

The following graph shows which features must exist before others can be built.

```
Auth (register / login)
  └─► Onboarding fork
        ├─► Create club → generates invite code
        │     └─► Member management (roles)
        │           └─► Admin actions (create meeting, lock vote, override)
        └─► Join club via invite code
              └─► Club pool view

Book search + cover display
  └─► Personal reading list (add book with status)
        └─► Propose book to club pool
              └─► Upvote mechanic (club pool voting)
                    └─► Live vote leaderboard (Realtime)
                          └─► Admin vote lock → confirmed book on meeting

Meeting creation
  └─► Selected book display on meeting (live or confirmed)
        └─► Meeting history (past meetings)

i18n architecture
  └─► All UI screens (must be in place before any screen is built to avoid retrofit)
```

Key dependency insight: i18n must be scaffolded in Phase 1, before any UI is built. Retrofitting string extraction across a completed codebase is painful and error-prone. Every screen written without translation keys creates technical debt.

---

## MVP Recommendation

The minimum viable product is a working democratic book-selection loop for one club.

**Prioritize (must ship together as atomic value unit):**
1. Auth (register, login, logout)
2. Onboarding (create club or join via code)
3. Book search + personal reading list with status
4. Propose book to club pool
5. Upvote with live real-time vote display
6. Meeting creation with live top-voted book shown
7. Admin vote lock
8. German + English i18n (from day one per constraints)

**Defer after MVP is working:**
- Public club discovery (useful but not needed for day-1 private clubs)
- Meeting history (useful but past meetings are cosmetic until the club has history)
- In-app language switcher (device locale detection is sufficient for launch)
- Per-club meeting archive / history view
- Multiple admins (creator-as-admin covers launch; promotion can come in v1.1)
- Empty-state guidance (high value but not blocking functionality)

**Never build (confirmed out of scope):**
- Chat, reviews, push notifications, social login, payments, file uploads

---

## i18n Considerations (German / English)

This section is elevated because it is a cross-cutting constraint, not a single feature.

**What is required from day one:**
- `expo-localization` to read the device locale (`getLocales()[0].languageCode`)
- `i18next` + `react-i18next` for translation key lookup (confirmed HIGH confidence from Context7 docs)
- Fallback locale: `en` (if key missing or locale unsupported, show English)
- Namespaces organized by feature area: `common`, `auth`, `club`, `reading`, `meetings`, `voting`
- `supportedLocales` declared in `app.json` for iOS and Android per-app language settings (Expo supports this natively)

**German-specific concerns:**
- German nouns are gendered — translation strings must not assume English word order or count (e.g., "1 Abstimmung" vs "2 Abstimmungen" requires plural rules)
- i18next plural handling (`count` parameter) must be used for all countable strings (votes, members, books, meetings)
- German strings are typically 20–30% longer than English equivalents — UI components must use dynamic width, not fixed pixel widths for text containers

**What is NOT required:**
- RTL support (German and English are both LTR)
- Server-side locale routing (mobile app, not SSR)
- Auto-translation tooling (two languages are manageable manually)

---

## Sources

- StoryGraph homepage (https://www.thestorygraph.com) — confirmed: reading status tracking, book voting for clubs, meeting organization, goal tracking [MEDIUM confidence — text extracted from production site, 2026-05-24]
- Bookclubs.com club activity (https://bookclubs.com) — confirmed: club polling for book selection, message boards, meeting scheduling, virtual club events [MEDIUM confidence — 2026-05-24]
- Google Books API developer docs (https://developers.google.com/books/docs/v1/using) — confirmed: public search requires API key, search by title/author/ISBN via `q=` param [HIGH confidence — official docs]
- Supabase Auth docs via Context7 (/supabase/supabase) — confirmed: `signUp`, `signInWithPassword`, email confirmation flow [HIGH confidence — official source]
- Supabase Realtime docs via Context7 (/supabase/supabase) — confirmed: `postgres_changes` subscription, broadcast, presence, channel configuration [HIGH confidence — official source]
- Supabase RPC docs via Context7 — confirmed: atomic Postgres functions callable via `supabase.rpc()` for race-condition-safe vote increments [HIGH confidence — official source]
- Expo localization docs via Context7 (/expo/expo) — confirmed: `expo-localization` `getLocales()`, `supportedLocales` in app.json, i18n-js integration [HIGH confidence — official source]
- react-i18next docs via Context7 (/i18next/react-i18next) — confirmed: `initReactI18next`, namespace support, plural rules, `fallbackLng`, language switcher pattern [HIGH confidence — official source]
- Expo deep linking docs via Context7 (/expo/expo) — confirmed: custom `scheme` in app.json for invite code deep links, universal links [HIGH confidence — official source]
- PROJECT.md (this repo) — authoritative source for scope, out-of-scope decisions, and constraints [HIGH confidence]
