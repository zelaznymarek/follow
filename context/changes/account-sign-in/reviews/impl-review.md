<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Account Sign-In Implementation Plan

- **Plan**: context/changes/account-sign-in/plan.md
- **Scope**: Full plan
- **Reviewed phases**: 1, 2, 3
- **Date**: 2026-11-20
- **Verdict**: APPROVED
- **Findings**: 0 critical, 1 warning, 4 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | PASS |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | WARNING |

Plan drift check: every planned change matches the plan. Nothing from "What We're NOT Doing" was built. `src/lib/auth-validation.ts` was added beyond the plan and accepted in the Phase 2 review.

Automated criteria (2026-11-20):

| Criterion | Result |
|---|---|
| 1.2 | PASS: `expo-sqlite` is in `plugins`; both packages are in `package.json` |
| 1.3 / 2.1 / 3.1 | PASS: 26/26 |
| Biome on changed files | PASS: one warning, in starter code in `app-tabs.web.tsx` |
| `tsc` | PASS |
| `npm test` | PASS: 29/29 |
| 3.3 | PASS: checked earlier the same session |
| 1.1 (`supabase config diff`) | Not runnable in the agent sandbox (hangs). The user ran it after the push and confirmed there are no differences. |

## Findings

### F1 — Offline sign-out can wait about 25 s for auth-js

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/providers/session-provider.tsx:209
- **Detail**:
  - `auth.signOut()` first waits for `initializePromise` (auth-js `GoTrueClient.ts:4095`).
  - On an offline cold start with an expired access token, that promise covers the refresh retry loop of about 25 s (`:4843-4866`).
  - Later, outside the 60 s failure cooldown, `_useSession` → `__loadSession` can start another refresh before the session is removed (`:4110-4121`).
  - The session is removed in the end, so no data is at risk. The cost is that the Sign out spinner can stay for about 25 s.
  - The comment at `:211` ("without needing the network") holds only after that wait.
  - This is the second half of check 3.7 ("Sign out in airplane mode returns to sign-in"). It was never seen on the device, because 3.7 was closed by decision.
- **Fix A ⭐ Recommended**: Race `auth.signOut({ scope: 'local' })` against a short timeout (same pattern as `STARTUP_TIMEOUT_MS`). Set the status to signed-out when either one finishes, and let auth-js finish removing the session in the background. Add a fake-timer test.
  - Strength: Reuses the start-up race already in the file; sign-out becomes instant offline, which matches the plan's "Sign-out works offline".
  - Tradeoff: auth-js removes the stored session slightly later than the UI shows. If a refresh succeeds before then, a `TOKEN_REFRESHED` event could briefly sign the user back in until `SIGNED_OUT` arrives.
  - Confidence: MED — the auth-js path is read from source; the delay was not observed on a device.
  - Blind spot: Not measured on the Pixel; whether the race in the tradeoff happens in practice.
- **Fix B**: Accept for now and add it to the check-3.7 follow-up, to be confirmed on the device with the overnight repeat.
  - Strength: No code change on a closed change; it gets verified together with the open 3.7 question.
  - Tradeoff: A user who signs out offline may see a spinner for up to about 25 s until then.
  - Confidence: HIGH — documentation only.
  - Blind spot: None significant.
- **Decision**: FIXED via Fix A (SIGN_OUT_TIMEOUT_MS 2 s race; TOKEN_REFRESHED ignored while sign-out is pending; 2 fake-timer tests, break-checked)

### F2 — Sign-out warning text is misleading

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/providers/session-provider.tsx:214
- **Detail**: With `scope: 'local'`, auth-js removes the local session before it returns a retryable error (`GoTrueClient.ts:4119-4121`). A returned error therefore almost always means the server-side revoke failed, not that "the stored session" was kept.
- **Fix**: Word the `error` branch "Sign-out could not revoke the session on the server:" and keep the current text in the `catch` branch.
- **Decision**: FIXED

### F3 — "Auth event wins over start-up" and `register` error mapping are untested

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: __tests__/session-provider-test.tsx
- **Detail**:
  - Every event test fires after start-up has resolved, so deleting `!eventSeen` (`session-provider.tsx:176`) keeps the suite green.
  - `register()` has no provider test for `emailTaken`, `noSession` or `network`. The screen tests mock these messages instead.
- **Fix**: Add three provider tests:
  - `getSession` pending, then `SIGNED_OUT`, then `getSession` resolves with a session → the status stays `signed-out`;
  - `register` with `user_already_exists` → `emailTaken`;
  - `register` with no session returned → `noSession`.
- **Decision**: FIXED (3 provider tests: event before start-up resolves, register emailTaken, register noSession; removing `!eventSeen` turns the suite red)

### F4 — Check 3.7 is ticked without device evidence of the original scenario

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: context/changes/account-sign-in/plan.md:348
- **Detail**:
  - The overnight offline sign-out of 2026-11-19 was not reproduced.
  - The quick variants with a shifted clock (warm resume, and cold start after Force stop) passed on the Pixel.
  - Sign-out in airplane mode was not observed.
  - The user closed the check by decision, and `follow-ups/review-fixes.md` records it.
- **Fix**: None needed beyond the existing follow-up. Keep it visible when archiving and in the PR description.
- **Decision**: ACCEPTED: closed by user decision 2026-11-20, documented in follow-ups/review-fixes.md; to be named in the PR description

### F5 — Stale text: plan Performance note and Home hint path

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: context/changes/account-sign-in/plan.md:289, src/app/(app)/index.tsx:49
- **Detail**:
  - The plan says the session check "reads local storage only (no network)". The Phase 2 review showed that is wrong and replaced it with the 3 s limit, but the text was never updated.
  - The starter Home hint still names `src/app/index.tsx`.
- **Fix**: Add a one-line correction note under Performance Considerations. Leave the Home hint for S-02, which replaces Home.
- **Decision**: FIXED (correction note in plan Performance Considerations; Home hint queued with follow-up F3 for S-02)
