<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Store and zones Implementation Plan

- **Plan**: context/changes/store-and-zones/plan.md
- **Scope**: Phase 3 of 4
- **Reviewed phases**: 3
- **Date**: 2026-11-21
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical, 5 warnings, 5 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | PASS |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | WARNING |
| Success Criteria | PASS |

Drift check (commit 5562f1a): every Phase 3 contract item MATCHES; the 11 adaptations (incl. the user-requested closable add-zone form) preserve intent; nothing MISSING; `biome.json`/`package.json` untouched. Automated criteria re-run: targeted jest 34/34, full suite 119/119, `tsc` clean, no diff vs `origin/main`. Manual 3.4–3.7 confirmed by the user. Checked OK: screens branch on `state` before `store`; submit guards; trimmed names never reach the data module blank; tab names/hrefs on both platforms; typed hrefs; no client-only values during web SSR; no hardcoded colors; `confirmDelete` extracted unchanged; `index.tsx` (four private components, 380 lines) is fine by repo convention.

## Findings

### F1 — Store-name redirect stacks a second Store screen

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/app/(app)/store/name.tsx:56-59
- **Detail**: With the anchored store Stack, opening `/store/name` without a store gives `[index, name]`; `<Redirect href="/store" />` replaces it into `[index, index]` — a Store screen whose back button leads to another Store screen (reproduced by the reviewer with the real `_layout`). The test uses a plain `<Stack />`, so it misses this.
- **Fix**: Leave like `zones/[id].tsx` does (`back()` when possible, else `replace('/store')`) from an effect, and test it under the real layout with its `unstable_settings`.
- **Decision**: FIXED

### F2 — A failed refresh blanks the whole Store screen

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/app/(app)/store/index.tsx:63-77; src/app/(app)/store/name.tsx:40-54
- **Detail**: Any failed reload — after a successful move/add/create, or on re-focus — swaps the screen for the full-screen "You're offline — your store will load…" state, unmounting the add-zone form (typed text lost) and the move error; after a write that succeeded the message is misleading. S-02's lists screen behaves the same and that gap is queued for S-05 (`context/archive/2026-11-20-shopping-lists/follow-ups/review-fixes.md`).
- **Fix**: When a store is already loaded, keep it on screen with an inline offline/error message and Retry above it; use the full-screen state only when nothing has loaded.
  - Strength: Uses the `useStore` contract fixed in the Phase 2 review exactly for this; no data lost on flaky connections in the store.
  - Tradeoff: A second message layout on two screens plus tests; S-02 lists keep the old behaviour until S-05.
  - Confidence: HIGH — the hook already keeps the last store.
  - Blind spot: Not yet tried on a device with a flaky connection.
- **Decision**: FIXED

### F3 — Move buttons re-enable before the new order arrives

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/app/(app)/store/index.tsx:161-177
- **Detail**: `moving` resets right after the un-awaited `refresh()`, so for up to 5 s the arrows act on the old order: after moving Bakery up, "Move Dairy down" on the still-first Dairy swaps it with Produce instead. Data stays consistent (server re-reads under the lock); the move is not the one the user meant.
- **Fix**: Let `refresh()` return its promise and keep `moving` until it settles (update the test at `store-screen-test.tsx:145-147`).
- **Decision**: FIXED

### F4 — Request failures shown as polite field errors

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/app/(app)/store/index.tsx:136,298; name.tsx:90; zones/[id].tsx:140
- **Detail**: Offline/error results of create, add and rename go into `TextField`'s polite error. S-02 (`lists/new.tsx:56-63`, sign-in, register) keeps field errors for validation and shows request failures as an assertive alert — as this change already does for move and delete failures.
- **Fix**: Keep `empty`/`duplicate` as field errors; show `offline`/`error` as an assertive alert.
- **Decision**: FIXED

### F5 — Test gaps on failure paths

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: __tests__/store-screen-test.tsx; __tests__/store-name-screen-test.tsx; __tests__/zone-screen-test.tsx
- **Detail**: Not covered: create/add returning offline or error; a failed refresh after a mutation (F2); name screen Retry, error state, `replace('/store')` fallback and the anchored redirect (F1); zone rename offline/error, delete failure alert, error state, replace fallback. `store-screen-test` chains `mockResolvedValueOnce` per fetch, so one extra focus load would make `load` throw on `undefined`.
- **Fix**: Add those cases; use a default `mockResolvedValue` and override per test.
- **Decision**: FIXED

### F6 — A zone deleted elsewhere keeps failing instead of disappearing

- **Severity**: 🔍 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/app/(app)/store/index.tsx:168-173; src/app/(app)/store/zones/[id].tsx:124-144
- **Detail**: A move of a zone deleted on another device returns `error` without a reload, so the row stays and "Couldn't move the zone" repeats; renaming it fails as a generic error that retrying cannot fix.
- **Fix**: Call `refresh()` after a failed move too.
- **Decision**: FIXED

### F7 — "This account already has a store." never clears

- **Severity**: 🔍 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/app/(app)/store/index.tsx:53,79-83,89-93
- **Detail**: The tab stays mounted, so the notice sits above the store for the whole session; after a timed-out create that actually landed it also blames the user's own store.
- **Fix**: Clear it once the store shows (or on the next action) and word it neutrally.
- **Decision**: FIXED

### F8 — Keyboard can cover the add-zone field; Enter drops focus

- **Severity**: 🔍 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/app/(app)/store/index.tsx:304-321; src/components/text-field.tsx
- **Detail**: The field sits below a growing list with no keyboard inset handling (iOS is the TestFlight target), and submitting with Enter closes the keyboard, which works against "several zones one after another".
- **Fix**: `automaticallyAdjustKeyboardInsets` on the ScrollView and pass `submitBehavior="submit"` through `TextField`; confirm on a device.
- **Decision**: SKIPPED

### F9 — Repeated limits and messages, uneven error clearing

- **Severity**: 🔍 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: store/index.tsx:21-23,40; store/name.tsx:15; store/zones/[id].tsx:15,30; store/index.tsx:185-188
- **Detail**: Name limits 80/40 defined in three files; "A zone with this name already exists" duplicated and missing the final period; load messages copied between two screens; only the add-zone form clears its error while typing; explicit `accessibilityRole="link"` on one `Link` child although expo-router already sets it.
- **Fix**: Export the limits from `src/lib/store.ts`, add the period, clear errors on typing in every name form, drop the redundant role.
- **Decision**: FIXED

### F10 — Criterion 3.3 (and 2.3) diff against a stale local `main`

- **Severity**: 🔍 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: context/changes/store-and-zones/plan.md (criteria 2.3, 3.3, 4.2)
- **Detail**: `git diff main` is false as written because local `main` (`ca1e253`) predates S-01/S-02; both checks were run against `origin/main` (and `git diff 6bcce2a^ HEAD` is empty for both files).
- **Fix**: Fast-forward local `main` to `origin/main` before Phase 4 so 4.2 runs as written.
- **Decision**: FIXED — local `main` fast-forwarded to `origin/main` (`c3e33e5`)
