<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Store and zones Implementation Plan

- **Plan**: context/changes/store-and-zones/plan.md
- **Scope**: Phase 1 of 4
- **Reviewed phases**: 1
- **Date**: 2026-11-21
- **Verdict**: APPROVED
- **Findings**: 0 critical, 0 warnings, 5 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | PASS |
| Safety & Quality | PASS |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | PASS |

Drift check: 41 contract items MATCH; adaptations (hand-written timestamp, `position default 0`, position re-read after the lock, default constraint names) preserve intent; extras (null-direction check, named errcodes, comments) are harmless. Automated criteria re-run on 2026-11-21: anon REST 401 on `stores`, `zones`, `rpc/move_zone`; types contain the new tables and function; `tsc` and 59/59 tests pass. Manual 1.5 and 1.6 confirmed by the user (backup present; grants table pasted). Any fix below lands in a new follow-up migration — `20261121120000` is already on the hosted project.

## Findings

### F1 — move_zone "zone not found" surfaces as HTTP 500

- **Severity**: 🔍 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: supabase/migrations/20261121120000_create_store_and_zones.sql:136-139,146-149
- **Detail**: `errcode = 'no_data_found'` is SQLSTATE P0002; PostgREST maps P0001 to 400 and other P0xxx codes to 500. Reachable with two devices (one deletes a zone, the other presses ↑/↓). The client maps it to `error` either way; the cost is a server-error entry in Supabase logs.
- **Fix**: In a follow-up migration, `create or replace function public.move_zone` raising `errcode = 'PT404'` (PostgREST returns 404).
- **Decision**: FIXED — follow-up migration `20261121130000_harden_store_and_zones.sql` (pushed 2026-11-21)

### F2 — Update grants cover every column (and allow probing another store's zone names by UUID)

- **Severity**: 🔍 OBSERVATION
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: supabase/migrations/20261121120000_create_store_and_zones.sql:40,87,99
- **Detail**: `authenticated` may update every column: `stores.id`, `zones.store_id`/`user_id`/`position`, so a client can bypass `move_zone` and write arbitrary positions (constraints still keep data valid and RLS + composite FKs keep accounts apart). Inserting or moving a zone to another account's `store_id` returns 23505 vs 23503 depending on whether that store has a zone with the same name — a name probe that needs the victim's random, never-exposed store UUID.
- **Fix**: Follow-up migration: `revoke update` then `grant update (name) on public.stores` and `grant update (name, position) on public.zones` to `authenticated` (column UPDATE privilege still satisfies the `for update` lock; `position` stays for the security-invoker `move_zone`), and raise in `zones_set_position` when the store row is not found.
  - Strength: The database alone owns ordering and store membership, matching the plan's "the database owns the rules" approach; closes the probe on both insert and update paths.
  - Tradeoff: One more migration for the user to dump/dry-run/push before Phase 2; Phase 2 must not update other columns (it does not plan to).
  - Confidence: HIGH — column-level UPDATE grants are standard Postgres and are enough for `SELECT … FOR UPDATE`.
  - Blind spot: Not yet exercised against the hosted project; verify with the Phase 3 manual flows.
- **Decision**: FIXED — follow-up migration `20261121130000_harden_store_and_zones.sql` (pushed 2026-11-21)

### F3 — `for update` store lock blocks FK checks more than needed

- **Severity**: 🔍 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: supabase/migrations/20261121120000_create_store_and_zones.sql:99,142
- **Detail**: `FOR UPDATE` conflicts with the `FOR KEY SHARE` lock that FK checks on `zones`/`shopping_lists` take, so creating a list waits while a zone is added or moved (milliseconds; no deadlock path).
- **Fix**: Use `for no key update` in both functions (same serialization of appends and moves).
- **Decision**: FIXED — follow-up migration `20261121130000_harden_store_and_zones.sql` (pushed 2026-11-21)

### F4 — Foreign keys without a supporting index

- **Severity**: 🔍 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: supabase/migrations/20261121120000_create_store_and_zones.sql:48,186-187
- **Detail**: `zones.user_id` (cascade on account delete) and `shopping_lists (store_id, user_id)` (set null on store delete) have no index; only account deletion uses those paths, at tens of rows per user. Supabase's "unindexed foreign keys" advisor may flag them.
- **Fix**: No action now; add `zones (user_id)` and `shopping_lists (store_id)` indexes if the advisor noise matters.
- **Decision**: FIXED — follow-up migration `20261121130000_harden_store_and_zones.sql` (pushed 2026-11-21)

### F5 — Names are not trimmed in the database

- **Severity**: 🔍 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: supabase/migrations/20261121120000_create_store_and_zones.sql:11,49
- **Detail**: A whitespace-only name passes `char_length between 1 and 80`, and " Dairy" differs from "Dairy" for the unique index. Trimming is client-side by plan, same as S-02's list names.
- **Fix**: Optionally add `check (btrim(name) = name)` alongside the length checks.
- **Decision**: FIXED — follow-up migration `20261121130000_harden_store_and_zones.sql` (pushed 2026-11-21)
