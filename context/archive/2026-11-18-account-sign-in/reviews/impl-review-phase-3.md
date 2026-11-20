<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Account Sign-In Implementation Plan

- **Plan**: context/changes/account-sign-in/plan.md
- **Scope**: Phase 3 of 3 (code, commit d33ca71; preview build and device checks 3.3–3.9 pending)
- **Reviewed phases**: 3
- **Date**: 2026-11-18
- **Verdict**: APPROVED
- **Findings**: 0 critical, 0 warnings, 4 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | PASS |
| Safety & Quality | PASS |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | PASS |

All three code items MATCH: `src/app/(app)/account.tsx` shows the email and signs out through `useSession` (local scope, provider sets signed-out in `finally`); Account replaces Explore in both tab files; the account test fails without the `signOut` call or the email. No `/explore` route references remain; `/account` sits inside the protected `(app)` group. Automated 3.1 and 3.2 pass; 3.3–3.9 pending (build and devices).

## Findings

### F1 — A failed local sign-out is silent

- **Severity**: ℹ️ OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/app/(app)/account.tsx:20-28, src/providers/session-provider.tsx (signOut)
- **Detail**: The screen swallows a `signOut` rejection; the provider still flips to signed-out, so the UI never sticks, but if clearing local storage itself failed the session could return on the next launch with no trace.
- **Fix**: Log the error in the provider's `signOut` (`console.warn`) so a failed local clear is visible in device logs.
- **Decision**: FIXED — provider `signOut` logs a failed local clear (`console.warn`) instead of re-throwing; status still flips to signed-out

### F2 — Account tab reuses the Explore icon

- **Severity**: ℹ️ OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/components/app-tabs.tsx:26
- **Detail**: Only home and explore tab icons exist in `assets/images/tabIcons/`; the plan allowed reuse.
- **Fix**: Add a person icon when the starter visuals are replaced (S-02 or later).
- **Decision**: FIXED — queued for S-02 in follow-ups/review-fixes.md

### F3 — Dead starter code after removing Explore

- **Severity**: ℹ️ OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Scope Discipline
- **Location**: src/components/ui/collapsible.tsx; assets/images/tutorial-web.png, react-logo*.png
- **Detail**: No longer referenced anywhere; removal was outside the plan.
- **Fix**: Remove in the starter cleanup when S-02 replaces Home.
- **Decision**: FIXED — queued for S-02 in follow-ups/review-fixes.md

### F4 — Account test misses the in-flight and failure paths

- **Severity**: ℹ️ OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: __tests__/account-screen-test.tsx
- **Detail**: Unlike the sign-in test, nothing checks that the button is disabled while sign-out is in flight, that a second press is ignored, or that a rejected `signOut` does not crash.
- **Fix**: Add a test with a never-resolving `signOut` (disabled + single call) and one with a rejected `signOut`.
- **Decision**: FIXED — in-flight (disabled + single call) and rejected-sign-out tests; break-check red without the in-flight state
