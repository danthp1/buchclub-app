---
status: partial
phase: 02-clubs-onboarding
source: [02-VERIFICATION.md]
started: 2026-05-25T12:00:00Z
updated: 2026-05-25T12:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Onboarding gate blocks access to (app)/ on first login
expected: After first login with a new account, the app routes to (onboarding)/username and NOT to (app)/clubs
result: [pending]

### 2. Profile edit save button label renders correctly
expected: The save button in profile/edit.tsx shows "Save profile" (EN) or "Profil speichern" (DE), not blank or undefined
result: [pending]
note: profile/edit.tsx calls t('profile:save_profile') but key is missing from both en.json and de.json — needs fix OR runtime fallback verification

### 3. Multi-device member update visibility
expected: After admin promotes/removes a member on device A, device B sees the update without manual refresh
result: [pending]
note: No Supabase Realtime subscriptions in Phase 2 — cross-device live updates are Phase 4 scope; this test may be acknowledged as intentional limitation

### 4. Browse search debounce behavior
expected: Typing in browse search fires one query per 300–500ms pause, not per keystroke
result: [pending]
note: search state used directly as queryKey without debounce — every keystroke fires a Supabase request

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
