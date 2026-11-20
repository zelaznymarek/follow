<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Account Sign-In Implementation Plan

- **Plan**: context/changes/account-sign-in/plan.md
- **Scope**: Phase 2 of 3
- **Reviewed phases**: 2
- **Date**: 2026-11-18
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical, 2 warnings, 4 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | PASS |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | PASS |

Reviewed the staged, uncommitted Phase 2 diff. All five planned changes MATCH (root Stack + `Stack.Protected`, `(app)` group with moved routes, `TextField`/`Button` + error token, sign-in/register screens, screen tests); no "not doing" violations; screens use only `useSession`. Extra `src/lib/auth-validation.ts` is justified (keeps screen tests free of the Supabase client). Automated criteria 2.1 (10/10) and 2.2 (`/verify`, Jest 20/20) pass; manual 2.3–2.5 pending.

## Findings

### F1 — Cold start with an expired token holds the splash for ~30 s offline

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/providers/session-provider.tsx:101-120 (Phase 1 code; Phase 2 makes the splash wait on it)
- **Detail**: `resolveStartupState` awaits `getSession()`, which refreshes an expired access token over the network. auth-js retries retryable failures with exponential backoff while attempts fit in `AUTO_REFRESH_TICK_DURATION_MS` = 30 s (`GoTrueClient.ts:4841-4866`), and each fetch has no timeout. In airplane mode the splash therefore stays ~25–30 s before the offline rule kicks in; on a stalled network it can hang longer. This hits the in-store cold start S-05 relies on and contradicts the plan's Performance note ("reads local storage only").
- **Fix A ⭐ Recommended**: Race the start-up `getSession()` against a short timeout (~3 s); on timeout fall back to `readStoredSession()`, and let a later `TOKEN_REFRESHED` / `SIGNED_OUT` event correct the status
  - Strength: Bounded splash on any network; keeps the offline rule and server-rejection path intact.
  - Tradeoff: A revoked session may show the app for a moment before `SIGNED_OUT` arrives.
  - Confidence: HIGH — retry window verified in the auth-js source.
  - Blind spot: Whether the late refresh emits `SIGNED_OUT` reliably when the server rejects the token after the timeout.
- **Fix B**: Decide start-up from the stored session only (no `getSession()` await); rely on auth events for everything after
  - Strength: Splash never waits on the network.
  - Tradeoff: Shows the app even for sessions the server already revoked until the first refresh fails; diverges further from the documented API.
  - Confidence: MED — simpler, but loses the immediate server verdict when online.
  - Blind spot: Event ordering on first launch after install.
- **Decision**: FIXED via Fix A — 3 s start-up limit (`STARTUP_TIMEOUT_MS`) with stored-session fallback; 2 fake-timer tests; break-check red at 30 s

### F2 — Web shows the sign-in form while the session loads; cold deep links fall back to Home

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/app/_layout.tsx:34-48
- **Detail**: While `status === 'loading'` only sign-in is reachable. Native hides this under the splash, but on web `AnimatedSplashOverlay` is a no-op, so a signed-in user sees a working sign-in form flash on every load. A cold-start deep link to a protected route (e.g. `/explore`) lands on `/` after the gate opens. Web is not a PRD requirement.
- **Fix**: While `loading`, render a full-screen themed blank view above the Stack (web), and accept the deep-link fallback for the MVP.
- **Decision**: FIXED — web shows a themed full-screen cover while loading (`SplashController`); deep-link fallback accepted for the MVP

### F3 — Submit handlers lack an in-flight guard and a `finally`

- **Severity**: ℹ️ OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/app/sign-in.tsx:24, src/app/register.tsx:24
- **Detail**: `handleSubmit` relies on the re-render that disables the button; a fast tap plus the keyboard return key can fire it twice. If the session action ever threw, `submitting` would stay true (today the provider always returns a result).
- **Fix**: Add `if (submitting) return` and reset `submitting` in `finally`.
- **Decision**: FIXED — early return + `finally` in both screens; sign-in test asserts a single call (the disabled button already blocks the second press, so the guard itself is defence in depth)

### F4 — Field and form errors are not announced on Android

- **Severity**: ℹ️ OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/components/text-field.tsx:43-47, src/app/sign-in.tsx:77, src/app/register.tsx:86
- **Detail**: Field errors are visual only; the form error uses `accessibilityRole="alert"`, which Android does not announce.
- **Fix**: Add `accessibilityLiveRegion="polite"` to field errors and `"assertive"` to the form error.
- **Decision**: FIXED — `accessibilityLiveRegion` polite on field errors, assertive on form errors

### F5 — The root gate itself is untested

- **Severity**: ℹ️ OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: __tests__/
- **Detail**: Screen tests cover validation, but nothing pins `Stack.Protected` + `SplashController`: loading shows no app screen, signed-out lands on sign-in, signed-in shows the tabs.
- **Fix**: Add a root-layout test with `expo-router/testing-library` `renderRouter` and a mocked `useSession` for each status.
- **Decision**: FIXED — `__tests__/root-layout-test.tsx` renders the real `src/app` tree with `renderRouter` (3 statuses); swapping the guards turns all 3 red

### F6 — Weak-password message duplicated in two modules

- **Severity**: ℹ️ OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/lib/auth-validation.ts:7, src/providers/session-provider.tsx:37
- **Detail**: `VALIDATION_MESSAGES.passwordWeak` copies `AUTH_MESSAGES.weakPassword` (deliberately, to keep tests free of the Supabase client); the copies can drift.
- **Fix**: Move the shared string into `auth-validation.ts` and import it from the provider (the dependency then points provider → validation, which needs no client).
- **Decision**: FIXED — `AUTH_MESSAGES.weakPassword` now references `VALIDATION_MESSAGES.passwordWeak`
