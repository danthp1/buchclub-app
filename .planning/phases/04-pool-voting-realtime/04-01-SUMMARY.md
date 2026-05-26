---
plan: "04-01"
phase: 4
title: "DB migration (toggle_book_vote RPC) and pool i18n namespace"
status: complete
completed: "2026-05-26"
---

# Plan 04-01 Summary

## What Was Built

Infrastructure for Phase 4 pool voting:

1. **`decrement_book_vote` RPC** (`supabase/migrations/0003_toggle_book_vote_rpc.sql`) — atomic vote removal using SECURITY DEFINER, mirrors `increment_book_vote`. Uses `greatest(vote_count - 1, 0)` floor guard to prevent negative counts. Grants EXECUTE to `authenticated` role. Applied to Supabase via MCP.

2. **pool i18n namespace** — added to `expo-app/lib/i18n/en.json` and `expo-app/lib/i18n/de.json` with all 18 keys for tabs, proposal flows, voting actions, empty state, and success/error toasts. Registered in `expo-app/lib/i18n/index.ts` resources and `ns` array.

## Key Files

### Created
- `supabase/migrations/0003_toggle_book_vote_rpc.sql`

### Modified
- `expo-app/lib/i18n/en.json` — added `pool` namespace
- `expo-app/lib/i18n/de.json` — added `pool` namespace  
- `expo-app/lib/i18n/index.ts` — registered `pool` in resources and `ns`

## Self-Check: PASSED

All 7 verification checks pass:
1. Migration file exists
2. SECURITY DEFINER present
3. Floor guard (greatest) present
4. EN pool namespace present
5. DE pool namespace present
6. `pool:` in i18next resources
7. `'pool'` in ns array
