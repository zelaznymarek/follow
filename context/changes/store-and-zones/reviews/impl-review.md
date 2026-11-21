<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Store and zones

- **Plan**: context/changes/store-and-zones/plan.md
- **Scope**: Full plan
- **Reviewed phases**: 1, 2, 3, 4
- **Date**: 2026-11-21
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical, 3 warnings, 2 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | WARNING |
| Scope Discipline | PASS |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | WARNING |

Automated criteria re-run on 2026-11-21:
- Biome on changed files: no errors. One `useImportType` warning comes from template import lines in `app-tabs.web.tsx` that this branch didn't change.
- `npx tsc --noEmit`: clean.
- `npm test`: 142/142 tests in 16 suites passed.
- `npx jest request store shopping-lists store-screen store-name-screen zone-screen list-screen root-layout`: 103/103 passed.
- `git diff main..HEAD -- package.json biome.json app.json`: empty.
- `database.types.ts` contains `stores`, `zones`, `store_id` and `move_zone`.

Criteria 1.1, 1.3 and 4.3 depend on remote state and are taken from the deploy-plan records.

No code changed after `cac2c70`, so the OTA contains all of S-03.

## Findings

### F1 — A zone add that timed out but landed shows "already exists" while the zone stays hidden

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/app/(app)/store/index.tsx:358-368
- **Detail**: On a slow connection, `addZone` stops waiting after 5 s and the form shows "Adding a zone needs a connection.", but the insert can still land. When the user taps Add again, the unique index rejects it and the form shows "A zone with this name already exists.", yet the list was never refreshed, so the zone only appears after the user leaves the tab and comes back. Create-store refreshes on `duplicate` (index.tsx:93-97) and move refreshes after a failure (index.tsx:222-224); add-zone is the only write that leaves the screen stale. This was raised as a heads-up in Phase 2 review F5 and skipped then; the shipped screen has the gap.
- **Fix**: In `handleAdd`, call `onAdded()` on `duplicate` and `offline` too (keeping the message), plus a test where add returns `duplicate` and the refreshed store shows the zone. Ships with the next OTA.
- **Decision**: FIXED — `handleAdd` refreshes on `duplicate` (index.tsx); test "a duplicate zone name reloads, so a zone that landed after a timeout appears". Not on `offline`: the retry's `duplicate` already refreshes, and refreshing while offline would add a second offline message. Reaches devices with the next OTA

### F2 — Phase 1 records describe the database before the hardening migration

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: context/deployment/deploy-plan.md (S-03 migrations table, "Grants check" row); plan.md:170, :413
- **Detail**: The deploy plan's "Grants check (SQL editor, 2026-11-21)" row says `authenticated` has UPDATE on `stores` and `zones`. That check ran after the first push only. `20261121130000` then revoked the table-level UPDATE and granted `update (name)` on `stores` and `update (name, position)` on `zones` (harden migration lines 7-11), so re-running the `role_table_grants` query would no longer list UPDATE. The row reads as the current state. Criterion 1.1's stated evidence (dry-run output pasted) is also missing; the deploy plan already says so honestly in its "Applied by" row.
- **Fix**: Reword the grants row to "after the first push" and add the column-level UPDATE grants from the hardening migration (`information_schema.column_privileges`), noting they were not re-queried.
- **Decision**: FIXED — grants row now says "after the first push" and names the column-level UPDATE grants from the hardening migration (not re-queried)

### F3 — Plan text never updated for the Phase 2 and Phase 3 changes

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Plan Adherence
- **Location**: context/changes/store-and-zones/plan.md:39, :193-194, :216, :267-271
- **Detail**: The Migration Notes addendum (plan.md:393) covers only the Phase 1 hardening. These approved changes still appear only in the review files:
  - the `run`/`runUnique` split with `RequestResult<T, Extra>`, where the plan still says `run` maps 23505 to `duplicate`;
  - `refresh()` returning `Promise<void>` and the last store being kept on a failed reload;
  - the inline message + Retry when a store is loaded;
  - the add-zone form closed behind a button, with Cancel;
  - `name.tsx` leaving from an effect.

  Phase 2 review F3 skipped this. S-04 will reuse `request.ts` and the store screen, so a planner reading plan.md as the contract would be misled.
- **Fix**: Add a "Phase 2–3 reviews" addendum under Migration Notes (or an "Implementation notes" section) listing these changes with pointers to the review findings.
  - Strength: The plan becomes accurate before it is archived and used as S-04's reference; this matches the existing Phase 1 addendum pattern.
  - Tradeoff: A few lines of writing; the original contract text stays as it was, so a reader must read the addendum too.
  - Confidence: HIGH — the Phase 1 addendum set the precedent in this same plan.
  - Blind spot: None significant.
- **Decision**: FIXED — plan.md Migration Notes: "Addendum 2026-11-21 (Phase 2–3 and full reviews)"

### F4 — Renaming a zone deleted elsewhere fails with a generic error that retrying can't fix

- **Severity**: 🔍 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/app/(app)/store/zones/[id].tsx:139-147; src/lib/store.ts:116-127
- **Detail**: When the zone was deleted on another device, `update().eq('id').select().single()` matches 0 rows, so the save maps to `error`. The screen shows "Couldn't rename the zone. Try again." and logs a warning, and every retry fails the same way. Phase 3 review F6 described this but its fix covered only the move path.
- **Fix**: After a failed rename, re-run `fetchZone`; if it returns `null`, show the existing missing state ("This zone no longer exists."). Ships with the next OTA.
- **Decision**: FIXED — failed rename with `error` re-checks via `fetchZone` and shows the missing state when the zone is gone (zones/[id].tsx); test "renaming a zone deleted elsewhere says it no longer exists". Reaches devices with the next OTA

### F5 — `shopping_lists` keeps a table-wide UPDATE grant, unlike the tightened `stores` and `zones`

- **Severity**: 🔍 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: supabase/migrations/20261120204123_create_shopping_lists.sql:39; 20261121120000_create_store_and_zones.sql:182-186
- **Detail**: `authenticated` can PATCH any column of its own lists, including the new `store_id`. This is not a cross-account hole: RLS pins `user_id`, and the composite FK allows only null or the caller's own store. The only effect is that a user can unlink their own list from their store, which goes against the hardening rationale that ownership columns stay fixed.
- **Fix**: Record a follow-up in the deploy plan: the next migration touching `shopping_lists` (S-04/S-05) revokes table-wide UPDATE and grants only the columns the app updates.
- **Decision**: FIXED — follow-up recorded in deploy-plan.md S-03 Follow-ups for the next `shopping_lists` migration (S-04/S-05)
