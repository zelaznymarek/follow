<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Shopping Lists Implementation Plan

- **Plan**: context/changes/shopping-lists/plan.md
- **Scope**: Phase 2 of 3
- **Reviewed phases**: 2
- **Date**: 2026-11-21
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical, 3 warnings, 4 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | PASS |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | WARNING |
| Success Criteria | PASS |

The commit reviewed is `e3f3fc6`, with files read at HEAD. Phase 3 changed only the Account icon in `app-tabs.tsx`.

- **Matches the plan:**
  - The data module contract: ordering `created_at desc, id desc`; names trimmed, empty → `null`; `status: 0` → offline; `getSupabase()` only inside functions.
  - `listTitle`, including the Phase 1 review amendment (whitespace-only names count as unnamed).
  - URLs and both tab triggers, all user-facing texts, native and web delete confirmation, and every test case in Phase 2 §5.
- **Adaptations, reasonable and documented in the implementation report:**
  - `TextField` `maxLength`;
  - the web tab bar moved into the normal layout;
  - the post-delete fallback to `/`;
  - extra error messages;
  - title in both header and body, and the date twice on unnamed rows. The user chose to keep both.
- **Checked and fine:**
  - No `getSupabase()` call during render (SSR-safe).
  - Stale-response guards in both screens.
  - Create and delete in-flight guards.
  - No `user_id` sent from the client.
  - No auth session changes.
- **Criteria re-run on 2026-11-21:** 2.1 passes (27/27); 2.2 passes (tsc, Biome with no errors, 57/57). 2.3–2.5 were confirmed by the user.

## Findings

### F1 — Offline loads wait at least 7 s (longer with an expired token)

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/lib/shopping-lists.ts:51-71 (`fetchLists`, `fetchList`)
- **Detail**:
  - postgrest-js retries an idempotent GET up to 3 times when `fetch` rejects, waiting 1 s, 2 s and 4 s (`node_modules/@supabase/postgrest-js/src/fetchWithRetry.ts:66-127`), and only then returns `status: 0`. So My lists and the List screen show a spinner for at least 7 s before "You're offline", and each Retry waits again.
  - With an expired access token, supabase-js first awaits `auth.getSession()`, whose refresh retries for about 25 s offline.
  - The session provider bounds the same wait at start-up with `STARTUP_TIMEOUT_MS`. These screens have no bound.
- **Fix A ⭐ Recommended**: `.retry(false)` on both reads, plus a deadline race in `run()` (e.g. `LOAD_TIMEOUT_MS = 5000` → `offline`, same pattern as `STARTUP_TIMEOUT_MS`), with fake-timer tests.
  - Strength: Bounds every offline load at about 5 s, whatever the token state; reuses a pattern already in the codebase.
  - Tradeoff: On a slow connection a load slower than 5 s shows "offline" with Retry, though the request may still finish in the background.
  - Confidence: HIGH — the retry policy and `.retry()` are in the installed source; the race pattern is already tested in the session provider.
  - Blind spot: The 5 s value is not measured on a slow mobile network.
- **Fix B**: `.retry(false)` only.
  - Strength: One-line change; offline with a valid token is near-instant.
  - Tradeoff: With an expired token the about 25 s auth refresh wait remains.
  - Confidence: HIGH — documented API.
  - Blind spot: How often users open lists offline with an expired token (after more than 1 h away).
- **Decision**: FIXED via Fix A (`.retry(false)` on both reads; `LOAD_TIMEOUT_MS` 5 s deadline in `run()` → offline; tests for both, break-checked)

### F2 — Programming errors can be reported as "offline" and are not logged

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/lib/shopping-lists.ts:39-44; __tests__/shopping-lists-test.ts:80-86
- **Detail**:
  - With `throwOnError` off, postgrest-js never rejects; every fetch failure becomes `status: 0`. The `catch (TypeError) → offline` branch therefore only catches bugs, such as `map()` running on unexpected data inside the `try`. Those show as "offline" with no `console.warn`.
  - A test locks in this path, which does not happen in real use.
- **Fix**: Move the `map` call out of the `try`, drop the `TypeError` special case so every thrown error is logged and maps to `error`, and replace the test with one for that behaviour.
- **Decision**: FIXED (`TypeError` special case removed; every thrown error, including from `map`, is logged and returns `error`; `map` stays inside the `try` so screens never hang on a rejection; test replaced, break-checked)

### F3 — Offline, error and missing-list messages are not announced

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/app/(app)/(lists)/index.tsx:39; src/app/(app)/(lists)/lists/[id].tsx:119
- **Detail**: The spinner turns into a status message with no `accessibilityRole="alert"` or `accessibilityLiveRegion`, unlike `deleteError` and `formError` in the same commit and `sign-in.tsx:83-86`. A screen reader says nothing.
- **Fix**: Add `accessibilityRole="alert"` and `accessibilityLiveRegion="polite"` to those messages.
- **Decision**: FIXED (`accessibilityRole="alert"` + `accessibilityLiveRegion="polite"` on the My lists and List status messages; New list already used the alert pattern)

### F4 — No `initialRouteName` in the Lists stack

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Architecture
- **Location**: src/app/(app)/(lists)/_layout.tsx
- **Detail**: A deep link or a web reload on `/lists/[id]` has no My lists screen underneath, so the header shows no back button. Delete already falls back to `router.replace('/')`.
- **Fix**: Export `unstable_settings = { initialRouteName: 'index' }`.
- **Decision**: FIXED (`unstable_settings = { anchor: 'index' }`: SDK 58 deprecates `initialRouteName` in favour of `anchor`)

### F5 — `useCallback` in the List screen lacks its justification

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/app/(app)/(lists)/lists/[id].tsx:52-72
- **Detail**: CLAUDE.md forbids manual `useCallback` for performance. `use-shopping-lists.ts:20-21` explains why it is needed there; the List screen's local hook does not.
- **Fix**: Copy the correctness comment from `use-shopping-lists.ts:20-21`.
- **Decision**: FIXED (correctness comment on the List screen `useCallback`)

### F6 — Test gaps on the List and New list error paths

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: __tests__/list-screen-test.tsx, __tests__/new-list-screen-test.tsx
- **Detail**: Not covered: the List screen offline state plus Retry, the New list error and offline messages, and the `window.confirm` branch (covered manually by 2.3).
- **Fix**: Add List offline plus Retry, and New list offline, tests.
- **Decision**: FIXED (List offline + Retry test, break-checked; the New list offline test now also asserts no navigation)

### F7 — A failed focus refresh hides lists already on screen

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/hooks/use-shopping-lists.ts:32-33
- **Detail**: When a refresh after regaining focus fails offline, My lists replaces the loaded rows with the offline message, although `lists` still holds them. This belongs to the offline-read design decided for S-05.
- **Fix**: Queue it for S-05 `offline-marking` in `follow-ups/review-fixes.md`, with no code change now.
- **Decision**: FIXED (queued for S-05 in `follow-ups/review-fixes.md`)
