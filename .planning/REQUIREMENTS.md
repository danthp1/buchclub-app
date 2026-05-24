# Requirements: Buchclub App

**Defined:** 2026-05-24
**Core Value:** Members stay engaged and aligned because the next book they read together is decided democratically and visible to everyone in real time.

## v1 Requirements

### Authentication

- [x] **AUTH-01**: User can register with email and password
- [x] **AUTH-02**: User can log in with email and password and session persists across app restarts
- [x] **AUTH-03**: User can reset password via email link
- [x] **AUTH-04**: User can log in via OAuth (Google and at minimum one other social provider) via Supabase Auth
- [x] **AUTH-05**: User can log out from any screen

### Onboarding

- [ ] **ONBRD-01**: After first login, user is prompted to either create a new club or join an existing one
- [ ] **ONBRD-02**: User can create a new club (auto-generates unique invite code, user becomes admin)
- [ ] **ONBRD-03**: User can join a club by entering an invite code
- [ ] **ONBRD-04**: User can browse and join publicly listed clubs

### Profiles

- [ ] **PROF-01**: User can set a username and optional avatar during or after onboarding
- [ ] **PROF-02**: User can view and edit their profile (username, avatar)
- [ ] **PROF-03**: User can delete their account (removes auth record and profile data)

### Club Management

- [ ] **CLUB-01**: Admin can view club details (name, invite code, member list)
- [ ] **CLUB-02**: Admin can promote any member to admin role
- [ ] **CLUB-03**: Admin can remove a member from the club
- [ ] **CLUB-04**: Admin can toggle whether the club is publicly listed
- [ ] **CLUB-05**: Any member can leave a club
- [ ] **CLUB-06**: User can be a member of multiple clubs

### Personal Reading List

- [ ] **LIST-01**: User can search for books by title, author, or ISBN via Google Books API
- [ ] **LIST-02**: Search results display cover image, title, and author
- [ ] **LIST-03**: User can save a book to their personal reading list (stores title, author, cover URL, ISBN)
- [ ] **LIST-04**: User can set and update a book's status: planned, reading, completed
- [ ] **LIST-05**: User can view their personal reading list with cover images displayed
- [ ] **LIST-06**: User can delete a book from their personal reading list

### Club Book Pool

- [ ] **POOL-01**: User can propose a book from their personal reading list into their club's pool
- [ ] **POOL-02**: Club members can view all books in the pool with cover images
- [ ] **POOL-03**: Admin can remove a book from the club pool

### Voting

- [ ] **VOTE-01**: Any club member can upvote any number of books in the club pool
- [ ] **VOTE-02**: Vote increments are atomic (via Postgres RPC) — no race conditions on concurrent votes
- [ ] **VOTE-03**: Vote counts update in real time for all club members via Supabase Realtime
- [ ] **VOTE-04**: Each member can only vote once per book (duplicate votes prevented at DB level)

### Meetings

- [ ] **MEET-01**: Admin can create a meeting with title, date/time, and location or video link
- [ ] **MEET-02**: Meeting automatically shows the current top-voted book from the club pool (live, not locked)
- [ ] **MEET-03**: Admin can manually confirm/lock a specific book for a meeting at any time
- [ ] **MEET-04**: Admin can change the confirmed book on a meeting after it has been locked
- [ ] **MEET-05**: All club members can view upcoming and past meetings with the associated book

### Internationalization

- [x] **I18N-01**: All UI text is available in German and English
- [x] **I18N-02**: App detects device language on first launch and applies it automatically
- [ ] **I18N-03**: User can manually switch language in settings (persists across sessions)

## v2 Requirements

### Notifications

- **NOTF-01**: Push notification when a new book is proposed to the club pool
- **NOTF-02**: Push notification when a new meeting is created
- **NOTF-03**: In-app notification center

### Social / Discovery

- **DISC-01**: Public club directory with search by name or topic
- **DISC-02**: User profile page visible to other club members

### Moderation

- **MODR-01**: Member can report a book proposal
- **MODR-02**: Admin can ban a user from the club

### Reading Experience

- **READ-01**: User can write private notes on books in their reading list
- **READ-02**: User can rate a completed book (1–5 stars)

## Out of Scope

| Feature | Reason |
|---------|--------|
| In-app chat / messaging | High complexity, not core to club value |
| Video/file uploads | Storage/bandwidth costs; not needed for v1 |
| Native push notifications | Deferred to v2; adds significant infrastructure complexity |
| Book reviews / ratings | Deferred to v2 |
| Payment / subscriptions | App is free; no monetization in v1 |
| Web-only SSR (Next.js-style) | Expo Metro static web export is sufficient for v1 |
| Custom email templates | Supabase default emails are sufficient for v1 |

## Traceability

Updated during roadmap creation.

| Requirement | Phase | Phase Name | Status |
|-------------|-------|------------|--------|
| AUTH-01 | Phase 1 | Foundation | Pending |
| AUTH-02 | Phase 1 | Foundation | Pending |
| AUTH-03 | Phase 1 | Foundation | Pending |
| AUTH-04 | Phase 1 | Foundation | Pending |
| AUTH-05 | Phase 1 | Foundation | Pending |
| I18N-01 | Phase 1 | Foundation | Pending |
| I18N-02 | Phase 1 | Foundation | Pending |
| ONBRD-01 | Phase 2 | Clubs & Onboarding | Pending |
| ONBRD-02 | Phase 2 | Clubs & Onboarding | Pending |
| ONBRD-03 | Phase 2 | Clubs & Onboarding | Pending |
| ONBRD-04 | Phase 2 | Clubs & Onboarding | Pending |
| PROF-01 | Phase 2 | Clubs & Onboarding | Pending |
| PROF-02 | Phase 2 | Clubs & Onboarding | Pending |
| PROF-03 | Phase 2 | Clubs & Onboarding | Pending |
| CLUB-01 | Phase 2 | Clubs & Onboarding | Pending |
| CLUB-02 | Phase 2 | Clubs & Onboarding | Pending |
| CLUB-03 | Phase 2 | Clubs & Onboarding | Pending |
| CLUB-04 | Phase 2 | Clubs & Onboarding | Pending |
| CLUB-05 | Phase 2 | Clubs & Onboarding | Pending |
| CLUB-06 | Phase 2 | Clubs & Onboarding | Pending |
| LIST-01 | Phase 3 | Books & Reading List | Pending |
| LIST-02 | Phase 3 | Books & Reading List | Pending |
| LIST-03 | Phase 3 | Books & Reading List | Pending |
| LIST-04 | Phase 3 | Books & Reading List | Pending |
| LIST-05 | Phase 3 | Books & Reading List | Pending |
| LIST-06 | Phase 3 | Books & Reading List | Pending |
| POOL-01 | Phase 4 | Pool, Voting & Realtime | Pending |
| POOL-02 | Phase 4 | Pool, Voting & Realtime | Pending |
| POOL-03 | Phase 4 | Pool, Voting & Realtime | Pending |
| VOTE-01 | Phase 4 | Pool, Voting & Realtime | Pending |
| VOTE-02 | Phase 4 | Pool, Voting & Realtime | Pending |
| VOTE-03 | Phase 4 | Pool, Voting & Realtime | Pending |
| VOTE-04 | Phase 4 | Pool, Voting & Realtime | Pending |
| MEET-01 | Phase 5 | Meetings, Settings & i18n Completion | Pending |
| MEET-02 | Phase 5 | Meetings, Settings & i18n Completion | Pending |
| MEET-03 | Phase 5 | Meetings, Settings & i18n Completion | Pending |
| MEET-04 | Phase 5 | Meetings, Settings & i18n Completion | Pending |
| MEET-05 | Phase 5 | Meetings, Settings & i18n Completion | Pending |
| I18N-03 | Phase 5 | Meetings, Settings & i18n Completion | Pending |

**Coverage:**
- v1 requirements: 39 total
- Mapped to phases: 39
- Unmapped: 0 ✓

---
*Requirements defined: 2026-05-24*
*Last updated: 2026-05-24 — traceability updated after roadmap creation; corrected count from 37 to 39; added Phase Name column; flagged AUTH-04 conflict*
