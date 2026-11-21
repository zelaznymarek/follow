<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Store and zones Implementation Plan

- **Plan**: context/changes/store-and-zones/plan.md
- **Scope**: Phase 2 of 4
- **Reviewed phases**: 2
- **Date**: 2026-11-21
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical, 1 warning, 5 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | WARNING |
| Scope Discipline | PASS |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | WARNING |
| Success Criteria | PASS |

Drift check (commit a8829e4): every Phase 2 contract item MATCHES except `ListsResult` (narrowed instead of aliased — intent preserved). Library behaviour verified against installed postgrest-js 2.119.1: 23505 arrives as `error.code` (HTTP 409), PT404 as an error with status 404 (not offline), `order('position', { referencedTable: 'zones' })` emits `zones.order=position.asc`, `maybeSingle()` returns `null` for no store. Payloads send only `name` on update and never `user_id`/`position` on insert. Automated criteria re-run: targeted jest 42/42, full suite 91/91, `tsc` clean, `package.json` unchanged vs `origin/main`.

## Findings

### F1 — `useStore` doc comment misdescribes when `store` is null

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/hooks/use-store.ts:10
- **Detail**: The comment says `store` is `null` "while loading, on failure". After the first successful load, `reload()` and a failed `refresh()`/`reload()` keep the previous store (same as `useShoppingLists`). Phase 3 screens written against the comment could branch on `store === null` and show "Name your store" or stale zones at the wrong time. No test covers a failed refresh.
- **Fix**: Reword to "last successfully loaded store; `null` until a load succeeds or when the user has none; kept during reload and after a failed load", and add a hook test: failed `refresh()` → `offline` with the previous store kept.
- **Decision**: FIXED — comment reworded; test "a failed refresh() reports offline and keeps the last store"

### F2 — Every 23505 becomes `duplicate`; non-unique paths re-map it in two inconsistent places

- **Severity**: 🔍 OBSERVATION
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Pattern Consistency
- **Location**: src/lib/request.ts:53; src/lib/shopping-lists.ts:25-40; src/hooks/use-store.ts:36-37
- **Detail**: `run` maps any 23505 to `duplicate` without logging. For reads, deletes, moves and lists it can only be a bug (e.g. the position constraint if the store lock were bypassed — the exact misreport the plan's lock exists to prevent). `runLists` re-maps it to `error` with a fixed-string warning that drops the PostgREST error; `useStore` re-maps it without logging. Phase 3's move-failure messages would also need a never-used `duplicate` entry.
- **Fix A ⭐ Recommended**: Opt in at the call site — `run` treats 23505 as a logged `error` by default; only `createStore`, `addZone`, `renameZone` opt in to `duplicate` (option flag or a `runUnique` entry point), with `RequestResult<T, Extra extends 'duplicate' = never>`.
  - Strength: Removes `runLists` and the hook branch, keeps the original error in logs, narrows every other result type — and `ListsResult<T>` becomes a plain alias of `RequestResult<T>` as the plan specified (also resolves F3's main item).
  - Tradeoff: Touches the three Phase 2 modules and their tests again before Phase 3.
  - Confidence: HIGH — only three call sites can legitimately see a unique violation (one store per user; zone names per store).
  - Blind spot: None significant; the break-check pattern from Phase 2 re-verifies it.
- **Fix B**: Keep the shape; pass the original error through on the `duplicate` result, log it in `runLists` and in `useStore`.
  - Strength: Smallest diff.
  - Tradeoff: The "duplicate means bug here" mapping stays duplicated, every result type keeps a reason most callers cannot get, and the plan still needs a wording fix.
  - Confidence: MEDIUM — fixes the logging, not the shape.
  - Blind spot: Phase 3 screens still have to handle `duplicate` on moves and deletes.
- **Decision**: FIXED via Fix A — `run` (23505 → logged error) and `runUnique` (23505 → duplicate) in `request.ts`; `runUnique` used by `createStore`, `addZone`, `renameZone`; `ListsResult<T> = RequestResult<T>`; hook duplicate branch removed

### F3 — Plan text out of date for two Phase 2 deviations

- **Severity**: 🔍 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: context/changes/store-and-zones/plan.md (Phase 2 item 1; criterion 2.3)
- **Detail**: The plan says `ListsResult<T>` "stays exported as an alias of `RequestResult<T>`" — the code narrows it (needed because widening broke three S-02 call sites). Criterion 2.3 diffs against `main`, which is stale locally (`ca1e253` vs `origin/main` `c3e33e5`); it was checked against `origin/main`.
- **Fix**: Dated addendum in the plan recording both (the `ListsResult` part becomes moot under F2 Fix A).
- **Decision**: SKIPPED — note: under F2 Fix A `ListsResult` is now the planned alias; the plan still says `run` maps 23505 to duplicate (now `runUnique`)

### F4 — Test gaps around the hook and failure paths

- **Severity**: 🔍 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: __tests__/use-store-test.tsx; __tests__/store-test.ts; __tests__/request-test.ts
- **Detail**: Not covered: hook `error` state, failed `refresh()` (F1), re-focus refetch (push then back — how the Store tab picks up a rename or delete in Phase 3); `addZone` PT404 → `error` (the addendum's insert case); deadline timer cleared on a normal answer.
- **Fix**: Add those five tests.
- **Decision**: SKIPPED

### F5 — Phase 3 heads-up: a duplicate after a timed-out add should refresh

- **Severity**: 🔍 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: context/changes/store-and-zones/plan.md (Phase 3, store screen add-zone contract); src/lib/request.ts:14-15
- **Detail**: A write that times out may still land; retrying `addZone` then returns `duplicate` ("A zone with this name already exists") while the plan refreshes only on success, so the zone the user is told exists stays invisible until re-focus.
- **Fix**: Plan addendum: the store screen calls `refresh()` on `duplicate` from add zone too (as it already does for create store).
- **Decision**: SKIPPED

### F6 — Minor duplication and consistency

- **Severity**: 🔍 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: __tests__/store-test.ts:1-58 vs __tests__/shopping-lists-test.ts:9-49; src/lib/store.ts:24,120
- **Detail**: `fakeQuery`/`respond`/`argsOf`/`OFFLINE_RESPONSE` are copied between the two lib tests; `deleteZone` returns `void` where `deleteList` returns `null` (plan asks for `void`); `toStoreName` types its row with the domain type instead of `Pick<Tables<…>>`.
- **Fix**: No action now; extract a shared fake builder outside `__tests__/` when a third data module arrives.
- **Decision**: SKIPPED
