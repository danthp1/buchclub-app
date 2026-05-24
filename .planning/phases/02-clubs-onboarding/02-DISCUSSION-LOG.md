# Phase 2: Clubs & Onboarding - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-24
**Phase:** 2-Clubs & Onboarding
**Areas discussed:** Onboarding gate, Club creation & joining UX, Profile setup timing, Active club context

---

## Onboarding Gate

| Option | Description | Selected |
|--------|-------------|----------|
| Separate onboarding route group | `(onboarding)/` group, auth guard redirects if flag unset | ✓ |
| Blocking modal over app tabs | Modal over loaded app shell | |
| Clubs tab acts as gate | Stuck on Clubs tab | |

**User's choice:** Separate onboarding route group

| Option | Description | Selected |
|--------|-------------|----------|
| Every launch: check membership | Live DB query on each launch | |
| One-time flag after first completion | Local flag set once, no repeat check | ✓ |

**User's choice:** One-time local flag

| Option | Description | Selected |
|--------|-------------|----------|
| profiles.onboarding_completed column | DB column, survives reinstall | |
| Local flag in Zustand/storage | expo-sqlite, fast, lost on reinstall | ✓ |

**User's choice:** Local flag in Zustand + expo-sqlite

---

## Club Creation & Joining UX

| Option | Description | Selected |
|--------|-------------|----------|
| Choice screen → dedicated sub-screens | Two-button screen, navigate to sub-flows | |
| Tabbed single screen | Create/Join as tabs | |
| Create-first with join link | Create form with join link below | |
| Bottom sheet (user freetext) | Bottom drawer with two options | ✓ |

**User's choice:** Bottom sheet / drawer presenting the two options

| Option | Description | Selected |
|--------|-------------|----------|
| Name + description → instant create | Minimal, fast | |
| Multi-step wizard | Name → description → public/private → confirm | ✓ |

**User's choice:** Multi-step wizard

| Option | Description | Selected |
|--------|-------------|----------|
| Code input with inline error | Text input, submit, inline error | |
| QR code scanner + manual | Camera + manual fallback | |
| Shareable link + QR code (user freetext) | Deep link share + QR scanner + manual fallback | ✓ |

**User's choice:** Shareable join link (primary) + QR code scanner + manual code input (fallback)
**Notes:** User specifically mentioned "joining link would be best" — deep link via existing expo-linking setup.

| Option | Description | Selected |
|--------|-------------|----------|
| Simple list of public clubs | No search | |
| List with search | Search bar + list | ✓ |
| Browse only after onboarding | Not in onboarding | |

**User's choice:** List with search bar

---

## Profile Setup Timing

| Option | Description | Selected |
|--------|-------------|----------|
| Username required before club join | Blocking, before create/join | ✓ |
| Optional with nudge | Skippable, badge nudge later | |
| Auto-generated, rename anytime | No blocking step | |

**User's choice:** Username required before club join

| Option | Description | Selected |
|--------|-------------|----------|
| Avatar optional, initials fallback | Always optional | |
| Avatar offered during onboarding (skippable) | Offered but skippable | ✓ |

**User's choice:** Offered during onboarding, skippable

| Option | Description | Selected |
|--------|-------------|----------|
| Upload to Supabase Storage | Real photo, storage bucket | |
| Preset avatar illustrations | In-app assets, no permissions | ✓ |

**User's choice:** Preset avatar illustrations (8–12 options, B&W lineart style)

---

## Active Club Context

| Option | Description | Selected |
|--------|-------------|----------|
| Header club picker (Zustand) | Picker in app header | |
| Club list as root screen | Club list = root of Clubs tab | ✓ |
| Defer multi-club switching | Handle later | |

**User's choice:** Club list as root screen of the Clubs tab

| Option | Description | Selected |
|--------|-------------|----------|
| Club ID in Zustand, detail per club | Runtime only | |
| Persisted across restarts (expo-sqlite) | Survives restarts | ✓ |

**User's choice:** Active club ID persisted via expo-sqlite

| Option | Description | Selected |
|--------|-------------|----------|
| All tabs scope to active club | All tabs show club banner | ✓ |
| Only Clubs tab uses active club in Phase 2 | Other tabs generic until Phase 3+ | |

**User's choice:** All tabs scope to active club with club name banner

---

## Claude's Discretion

- Exact avatar illustration filenames and art (consistent with design system B&W lineart style)
- Invite code deep link URL scheme (use existing app scheme from `app.json`)
- Exact wizard step layout (follow existing Input/Button patterns and design screens)

## Deferred Ideas

- QR code *generation* for sharing (not just scanning) — v1 uses link sharing + scan-to-join
- Club discovery by category/genre — list+search sufficient for v1
- Club avatar/cover image — no visual club identity in Phase 2
