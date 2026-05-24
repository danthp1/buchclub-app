# Phase 2: Clubs & Onboarding - Context

**Gathered:** 2026-05-24
**Status:** Ready for planning

<domain>
## Phase Boundary

A newly authenticated user is guided through onboarding: set username → optionally pick avatar → create or join a club. After completing onboarding they reach the main app, where a Club list screen is the root of the Clubs tab. All club-level data (clubs, club_members, profiles) is persisted in Supabase with RLS. Users can belong to multiple clubs; the active club is persisted locally and scopes all tabs.

</domain>

<decisions>
## Implementation Decisions

### Onboarding Gate
- **D-01:** Onboarding lives in a dedicated route group `(onboarding)/` — separate from `(auth)/` and `(app)/`. The auth guard in `InitialLayout` checks a local onboarding flag; if not set, redirects to `(onboarding)/` before allowing access to `(app)/`.
- **D-02:** The onboarding gate is a **one-time local flag** stored in Zustand + expo-sqlite (not a DB column). It is set to `true` after the user successfully joins or creates their first club. Fast to check; survives app restarts but not reinstalls (acceptable for v1).
- **D-03:** Onboarding flow order: `username screen` → `avatar picker (skippable)` → `create-or-join sheet` → `app`.

### Club Creation & Joining UX
- **D-04:** The create-or-join choice is presented as a **bottom sheet** (not a dedicated screen). The sheet has two options: "Create a club" and "Join a club". Tapping either navigates to the appropriate screen.
- **D-05:** Club creation is a **multi-step wizard**: Step 1 — name; Step 2 — description (optional); Step 3 — public/private toggle; Step 4 — confirm. Invite code is auto-generated (8 chars, uppercased) and displayed on the confirmation/success screen.
- **D-06:** Joining uses a **shareable deep link + QR code** as the primary UX. Deep links use the existing expo-linking setup in `_layout.tsx`. A QR code scanner (requires `expo-barcode-scanner` or `expo-camera`) handles in-person sharing. Manual 8-character code input is the fallback.
- **D-07:** Browsing public clubs shows a **list with a search bar** — club name, member count, "Join" button. Available during onboarding and from the Clubs tab afterward.

### Profile Setup
- **D-08:** **Username is required** before the create/join step. Cannot be skipped. Must be unique (validated against `profiles.username`).
- **D-09:** **Avatar is offered during onboarding but skippable.** Uses **preset avatar illustrations** (8–12 in-app image assets, no file upload, no camera permissions). Selected avatar index/identifier stored in `profiles.avatar_url` as a string key (e.g. `"preset:01"`). Default shown for users who skip.
- **D-10:** Avatar can be changed at any time from the Profile tab.

### Active Club Context
- **D-11:** The **Club list screen is the root of the Clubs tab** (not a header picker). Tapping a club pushes to a Club Detail screen with sub-navigation (Members, Settings). Other phases (Books, Meetings) scope to the active club.
- **D-12:** The **active club ID is persisted via expo-sqlite** (survives app restarts). Stored in Zustand for runtime access. Last-visited club is restored on next launch.
- **D-13:** **All tabs scope to the active club** in Phase 2. A club name banner/header is shown at the top of each tab indicating the current club. Other tabs (Books, Meetings) show a placeholder until Phase 3+.

### Claude's Discretion
- Exact avatar illustration art / filenames — planner/executor chooses consistent with the design system (B&W lineart, matches existing illustration style).
- Invite code deep link URL scheme — use the existing app scheme from `app.json`.
- Exact wizard step layout — follow existing Input/Button component patterns and design screen references.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Database Schema
- `supabase/migrations/0001_v1_full_schema.sql` — Full schema for all phases. Phase 2 tables: `profiles`, `clubs`, `club_members`. RLS policies already defined. Do NOT create new migrations for these tables — schema is complete.

### Design
- `design/design.md` — Design guidelines: colors, typography, spacing, component specs. All UI must follow this.
- `design/screen-splash.png` — Welcome/splash screen reference
- `design/screen-login.png` — Login screen reference
- `design/screen-registration.png` — Registration screen reference
- `design/screen-home.png` — Home Feed reference (shows club banner pattern)
- `design/screen-profile.png` — Profile screen reference
- `design/screen-empty-books.png` — Empty state reference (pattern for empty club list)
- `design/screen-success.png` — Success state reference (after club creation)

### Phase 1 Artifacts (established patterns)
- `.planning/phases/01-foundation/01-UI-SPEC.md` — UI spec with Tamagui component patterns, animation presets, token usage
- `.planning/phases/01-foundation/01-PATTERNS.md` — Code patterns established in Phase 1

### Requirements
- `.planning/REQUIREMENTS.md` — ONBRD-01..04, PROF-01..03, CLUB-01..06 are Phase 2 requirements

### Existing Auth Code (integration points)
- `expo-app/app/_layout.tsx` — InitialLayout auth guard — extend here to add onboarding gate check
- `expo-app/store/auth.store.ts` — Zustand auth store — add `onboardingCompleted` flag here
- `expo-app/lib/supabase.ts` — Supabase client — use for all DB calls

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `expo-app/src/components/ui/Button.tsx` — Primary/secondary button, height 52px, radius-md. Use for all CTAs.
- `expo-app/src/components/ui/Input.tsx` — Input field, height 52px, border 1.5px. Use for username, code entry, club name fields.
- `expo-app/src/components/ui/Alert.tsx` — Error/success messaging. Use for validation feedback.
- `expo-app/app/(app)/clubs/index.tsx` — Phase 2 stub, replace entirely.
- `expo-app/app/(app)/profile/index.tsx` — Phase 2 stub with sign-out. Extend with profile edit UI.

### Established Patterns
- **Auth guard pattern:** `InitialLayout` in `app/_layout.tsx` checks Zustand state + redirects. Extend this exact pattern for the onboarding gate check.
- **`useDidFinishSSR()` guard:** Required on all web-rendered screens that access Zustand or i18next. Copy from `profile/index.tsx`.
- **i18next translations:** Add new namespace `onboarding` for onboarding strings; extend `nav` and `common` namespaces as needed. Both DE and EN required.
- **Tamagui animations:** Passed via `TamaguiProvider animations` prop (not in config). Use existing `fast`/`medium`/`slow` presets.
- **Supabase calls:** Direct client calls from components/hooks — no abstraction layer yet. Keep consistent with Phase 1.

### Integration Points
- `app/_layout.tsx` `InitialLayout` — add `onboardingCompleted` check after `initialized` check
- `store/auth.store.ts` — add `onboardingCompleted: boolean` + `setOnboardingCompleted()` action
- `app/(app)/_layout.tsx` and `_layout.native.tsx` — add club context provider or pass active club via Zustand
- New route group: `app/(onboarding)/` with its own `_layout.tsx`
- Deep link handler in `app/_layout.tsx` already set up for password reset — extend for invite code links

</code_context>

<specifics>
## Specific Ideas

- Join via **shareable link** is the preferred UX (user mentioned "joining link would be best") — the invite URL should be shareable via native share sheet. QR code for in-person scenarios.
- Avatar picker uses **preset illustrations** — no photo upload, no permissions friction. Consistent with the app's B&W lineart illustration system.
- Active club persists across restarts — user lands where they left off.

</specifics>

<deferred>
## Deferred Ideas

- **QR code generation** for sharing (not just scanning) — the invite link/code is sufficient for v1 sharing; QR generation is a nice-to-have for later.
- **Club discovery by category/genre** — list+search is sufficient for v1; faceted filtering is Phase 4+.
- **Club avatar/cover image** — clubs have no visual identity in Phase 2; deferred to after core flows are stable.

</deferred>

---

*Phase: 2-Clubs & Onboarding*
*Context gathered: 2026-05-24*
