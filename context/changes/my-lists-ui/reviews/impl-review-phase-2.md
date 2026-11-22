<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: My lists UI — design-system contract

- **Plan**: context/changes/my-lists-ui/plan.md
- **Scope**: Phase 2 of 4
- **Reviewed phases**: 2
- **Date**: 2026-11-22
- **Verdict**: APPROVED
- **Findings**: 0 critical, 2 warnings, 3 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | PASS |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | WARNING |

Notes: the extra secondary buttons (store/name.tsx Retry ×2, Delete zone, Delete list) are user decisions recorded in change.md "Phase 2 notes". The TextField radius change 8 → 12 is planned (Phase 2 item 5). Remaining `Spacing.three` radius / `0.7` opacity in rows are Phase 3 scope (criterion 3.4).

## Findings

### F1 — Secondary button shape barely visible on the page

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/components/button.tsx:29 (secondary fill `backgroundSelected`)
- **Detail**: Secondary fill vs page is 1.31:1 (light `#E0E1E6` on `#ffffff`) and 1.61:1 (dark `#2E3135` on `#000000`). The label is highly readable (16.08:1 / 13.07:1), but the control's boundary is below the 3:1 WCAG 1.4.11 non-text contrast guideline.
- **Fix A ⭐ Recommended**: Accept; the label identifies the button.
  - Strength: Matches Radix "soft" buttons and the screenshots the user approved; no new token.
  - Tradeoff: Shape is faint, especially in bright light on a phone.
  - Confidence: MED — common pattern, but strictly below 1.4.11.
  - Blind spot: Not checked on the real Android screen.
- **Fix B**: Add a 1 px border to the secondary variant using a `border` token: light slate-9 `#8b8d98` (3.30:1 on white), dark slate-8 `#5a6169` (3.35:1 on black).
  - Strength: Meets 3:1 boundary contrast; buttons read as buttons.
  - Tradeoff: New token and a slightly heavier look; screenshots re-taken.
  - Confidence: HIGH — ratios computed.
  - Blind spot: Visual taste not yet checked.
- **Decision**: FIXED via Fix A (accepted: label identifies the button; matches approved screenshots)

### F2 — No tests for Button variant, linkPrimary and header theme

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: __tests__/ (no coverage)
- **Detail**: Nothing asserts that `variant="secondary"` uses `backgroundSelected` + `text` (default primary), that `linkPrimary` uses `primary` and an explicit `themeColor` overrides it, or that the navigation theme keeps `fonts`/`dark` and maps the six colours.
- **Fix**: Add three small tests in Phase 4 next to the planned design-tokens scan test.
- **Decision**: FIXED — queued for Phase 4 in follow-ups/review-fixes.md

### F3 — tokens.md gaps

- **Severity**: 🔍 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: context/changes/my-lists-ui/tokens.md
- **Detail**: Light `primary` on `backgroundElement` (`#F0F0F3`) is 4.01:1, so `primary` should not be used as text on cards. The `error` colours are marked "not re-checked" against Radix Red.
- **Fix**: Add a usage note for primary-on-card and verify/record the `error` Radix steps.
- **Decision**: FIXED — tokens.md: primary-on-card note, error steps verified (light red-11; dark #FF6369 not Radix, kept), 4 contrast rows added

### F4 — Button variant could use a typed map

- **Severity**: 🔍 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/components/button.tsx:29-30
- **Detail**: The ternaries map any non-primary variant to secondary; a third variant would silently fall through.
- **Fix**: Optional — a `VARIANTS` map typed with `satisfies Record<…, { fill: ThemeColor; content: ThemeColor }>`.
- **Decision**: ACCEPTED

### F5 — Row radius/opacity literals remain

- **Severity**: 🔍 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: src/components/my-lists-view.tsx:122,125; src/app/(app)/store/index.tsx:452,464
- **Detail**: Still `borderRadius: Spacing.three` and `opacity: 0.7`; `Radius.card` is not used yet.
- **Fix**: None now — Phase 3 (Card adoption, criterion 3.4).
- **Decision**: ACCEPTED — Phase 3 scope (criterion 3.4)
