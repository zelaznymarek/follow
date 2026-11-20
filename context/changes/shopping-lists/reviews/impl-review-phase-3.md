<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Shopping Lists Implementation Plan

- **Plan**: context/changes/shopping-lists/plan.md
- **Scope**: Phase 3 of 3 (staged, uncommitted changes)
- **Reviewed phases**: 3
- **Date**: 2026-11-20
- **Verdict**: APPROVED
- **Findings**: 0 critical, 0 warnings, 3 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | PASS |
| Safety & Quality | PASS |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | PASS |

What was reviewed and checked:

- **Plan match.** The workflow, the deletions, the Account icon (24/48/72 px RGBA, same as `home.png`), the roadmap S-08 resolution and the deploy-plan rollout all match Phase 3.
- **Approved deviations, documented consistently in the plan addendum, `deploy-plan.md` and CLAUDE.md:**
  - type generation moved to `scripts/gen-types.sh`, because `packageJson:scripts` is part of the fingerprint (confirmed in `node_modules/@expo/fingerprint/build/sourcer/Bare.js:142`);
  - `external-link.tsx` deleted, since nothing references it any more;
  - the stray OTA `5a48d52a`.
- **Workflow security.** Secrets reach the step only through `env`; `permissions: {}` at both levels; no third-party actions, no PR or fork triggers; missing secrets make the run fail. The schedule's longest gap is 2 days.
- **Success criteria.** 3.1–3.5 re-run green before staging. 3.6–3.8 were confirmed by the user. 3.9 is correctly open until the merge into `main`.

## Findings

### F1 — `gen-types.sh` depends on a fixed temp path and the current directory

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: scripts/gen-types.sh:8-10
- **Detail**: The temp file has a fixed name. Under the shared `/tmp` fallback that is a theoretical race or symlink risk. The script also assumes it runs from the repo root, so running it elsewhere writes to the wrong path or fails.
- **Fix**: Use `tmp=$(mktemp)` and `cd "$(dirname "$0")/.."` at the top.
- **Decision**: SKIPPED

### F2 — Rollout record misses device checks, the web icon choice and the 60-day schedule rule

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: context/deployment/deploy-plan.md (S-02 rollout section), context/changes/shopping-lists/plan.md (review addendum)
- **Detail**:
  - Checks 3.6–3.8 (Pixel online and offline, the emulator seeing the Pixel's lists) are recorded only as ticks.
  - The plan still says the web Account trigger "uses a matching symbol", but web tabs are text-only, so no web icon was added.
  - GitHub disables schedules in public repos after 60 days without repo activity; this is mentioned only in `plan-brief.md`.
- **Fix**: Add a device-checks row and a 60-day note to the deploy-plan rollout table, and a one-line plan addendum entry for the web icon.
- **Decision**: FIXED (device-checks row and 60-day note in the deploy-plan rollout table; plan addendum line on text-only web tabs)

### F3 — Native dependencies left unused until the next build

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Scope Discipline
- **Location**: package.json (`expo-web-browser`, `expo-device`)
- **Detail**: After the cleanup nothing imports `expo-web-browser` or `expo-device`. Removing them now would change the fingerprint and block the OTA, so they stay on purpose. The same next build is the right moment for a `fingerprint.config.js` that skips `package.json` scripts.
- **Fix**: Queue both (dependency removal plus the fingerprint config) in `follow-ups/review-fixes.md` for the next change that needs a native build (F-02, or the first `expo-dev-client` build).
- **Decision**: FIXED (queued in `follow-ups/review-fixes.md` for the next native build)
