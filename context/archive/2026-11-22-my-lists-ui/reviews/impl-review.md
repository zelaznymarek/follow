<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: My lists UI — design-system contract

- **Plan**: context/changes/my-lists-ui/plan.md
- **Scope**: Full plan
- **Reviewed phases**: 1, 2, 3, 4
- **Date**: 2026-11-22
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical, 4 warnings, 5 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | WARNING |
| Scope Discipline | PASS |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | WARNING |

Notes: every planned change in phases 1–4 matches its contract; "What We're NOT Doing" boundaries held (no `package.json`/`app.json`/`biome.json` diff, splash and native tab bar untouched). Deviations recorded in `change.md` as user decisions were not re-reported. Automated criteria re-run: lint, tsc, `npm test` (154/154), the Phase 2 and Phase 3 greps — all pass.

## Findings

### F1 — Offline/error alert role not exposed on iOS and in tests

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/components/my-lists-view.tsx:103-106
- **Detail**: `accessibilityRole="alert"` and `accessibilityLiveRegion` moved from the message `ThemedText` (accessible by default) to a wrapper `View` without `accessible`. React Native exposes the role only on accessible elements: `queryAllByRole('alert')` returns 0 for the offline state, and iOS VoiceOver ignores it. Web and Android still announce. Regression against the Phase 4 contract "`accessibilityRole="alert"` stays on offline and error".
- **Fix**: Add `accessible={announce}` to the wrapper so heading and line are read as one alert.
- **Decision**: FIXED — `accessible={announce}` on the wrapper

### F2 — No tests for My lists states (loading skeleton, alerts)

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: __tests__/ (no `my-lists-view-test.tsx`); context/changes/my-lists-ui/reviews/impl-review-phase-1.md:71
- **Detail**: Phase 1 review F5 was accepted as "loading-state test to be added in Phase 4"; it was not added. Nothing asserts the `progressbar` named "Loading lists", that offline/error are announced as `alert` while empty is not, or the new headings. F1 slipped through for this reason.
- **Fix**: Add `__tests__/my-lists-view-test.tsx` with one case per state (loading, ready, empty, offline, error) asserting roles, names and texts.
- **Decision**: FIXED — `__tests__/my-lists-view-test.tsx` (5 cases); goes red without the F1 fix and with a wrong progressbar label

### F3 — Literal scan misses common variants

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Success Criteria
- **Location**: __tests__/design-tokens-test.ts:12
- **Detail**: The plan's four regexes miss `borderTopLeftRadius: 8` (per-corner radii), `borderRadius: Spacing.three` (the exact misuse this change removed), `shadowOpacity: 0.3` (case-sensitive), `opacity: pressed ? 0.7 : 1`, and `hsl(`/`oklch(`. Whole-file allowlist hides new literals in `animated-icon*.tsx`; `src/hooks` is not scanned.
- **Fix**: Widen to `/\b(border\w*Radius|\w*[Oo]pacity)\s*:\s*[-.\d]/`, add `/borderRadius:\s*Spacing\./` and `/\bhsla?\(|oklch\(/`, and scan `src/hooks` too.
  - Strength: Closes the gaps the guard was written for, including the one this change fixed by hand.
  - Tradeoff: New matches may surface (e.g. `opacity: 1` style resets) that need tokens or a per-line allow comment.
  - Confidence: MED — patterns tested directly by the reviewer; full-repo hit count not yet run.
  - Blind spot: Named colours (`'white'`) still not covered.
- **Decision**: FIXED — patterns widened (per-corner radius, `Spacing` as radius, `*Opacity` incl. conditions, `hsl`/`oklch`), `src/hooks` scanned; the 2 new hits in `app-tabs.web.tsx` (pill radii from `Spacing`) allowlisted by user decision; each new form verified to fail the test

### F4 — Scan test depends on transitive @types/node

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: __tests__/design-tokens-test.ts:1
- **Detail**: `/// <reference types="node" />` pulls Node types into the whole tsc program; `@types/node` is not a direct devDependency (arrives via jest/expo CLI), so a dependency bump can break `npx tsc --noEmit`.
- **Fix A ⭐ Recommended**: Add `@types/node` as a devDependency (no `scripts` change).
  - Strength: Makes the type source explicit; tsc no longer relies on hoisting.
  - Tradeoff: Touches `package.json` / lockfile in a UI change.
  - Confidence: MED — type-only package, no native code.
  - Blind spot: Not checked whether the EAS fingerprint hashes devDependencies.
- **Fix B**: Accept and note in `change.md` as a follow-up.
  - Strength: No dependency change now.
  - Tradeoff: Latent `tsc` break on a future upgrade.
  - Confidence: HIGH — works today.
  - Blind spot: When it breaks, the error points at app code, not the test.
- **Decision**: FIXED via Fix A — `@types/node` `^24.19.2` (matches Node 24 in `.nvmrc`; transitive copy was 26.x) added to devDependencies; tsc and the scan pass

### F5 — Skeleton heights copied from Button and ThemedText

- **Severity**: 🔍 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Architecture
- **Location**: src/components/my-lists-view.tsx:163-170
- **Detail**: `minHeight: 44` and `height: 20` duplicate Button's height and `small` line height; changing Button silently breaks "no jump".
- **Fix**: Export a shared `ControlHeight` constant from `theme.ts` and use it in both places.
- **Decision**: SKIPPED

### F6 — Navigation theme test is partly circular

- **Severity**: 🔍 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: __tests__/navigation-theme-test.ts:19
- **Detail**: `expect(theme).toEqual(navigationTheme(base, colors))` compares the function with itself; the useful checks are `fonts`/`dark` and the explicit colour map.
- **Fix**: Drop the circular assertion.
- **Decision**: FIXED — circular assertion and unused import removed

### F7 — Kitchen-sink dates can mismatch SSR (dev only)

- **Severity**: 🔍 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/app/kitchen-sink.tsx:15-19
- **Detail**: Ready sample formats dates with the runtime locale/timezone during SSR; a Node vs browser difference gives a hydration warning on `/kitchen-sink`. Real My lists renders `loading` on the server, so it is safe.
- **Fix**: Use fixed sample titles/dates that don't depend on locale.
- **Decision**: SKIPPED

### F8 — Two state patterns side by side

- **Severity**: 🔍 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/components/my-lists-view.tsx:96; store/index.tsx:73-90, store/name.tsx:56-72, lists/[id].tsx:94-112
- **Detail**: My lists uses skeleton + local `StateMessage`; other screens keep `ActivityIndicator` + alert text. Expected for a one-view change.
- **Fix**: Move `StateMessage` to `src/components/` when the next screen adopts it (S-04 list screen), and list it in CLAUDE.md.
- **Decision**: ACCEPTED — follow-up queued in follow-ups/review-fixes.md (move StateMessage to src/components/ when S-04 adopts it)

### F9 — Small undocumented deviations

- **Severity**: 🔍 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Scope Discipline
- **Location**: context/foundation/lessons.md (92c299d); context/changes/my-lists-ui/tokens.md:68-69
- **Detail**: `lessons.md` (commit-message rule) shipped in the Phase 4 commit without a note; the hover/focus N/A reason says "touch-only (PRD: iOS and Android)" while the plan says "Android only". Same conclusion, different reason.
- **Fix**: Add both as one line each to `change.md` Phase 4 notes.
- **Decision**: SKIPPED
