# Review fixes — my-lists-ui

Queued from `reviews/impl-review-phase-2.md`.

- [x] **F2 (Phase 4):** add three small tests next to `__tests__/design-tokens-test.ts`:
  - `Button` with `variant="secondary"` uses `backgroundSelected` fill and `text` label; the default variant uses `primary` / `onPrimary`.
  - `ThemedText type="linkPrimary"` uses `primary`; an explicit `themeColor` overrides it.
  - The navigation theme keeps the base `fonts` and `dark` and maps `primary`, `background`, `card`, `text`, `border`, `notification` from `Colors` (export or move `navigationTheme` out of `src/app/_layout.tsx` so it can be tested).

Queued from `reviews/impl-review.md` (full-plan review).

- [ ] **F8 (S-04 `add-product-with-zone`):** when the list screen gets loading/empty/error states, move `StateMessage` (and the skeleton approach) from `src/components/my-lists-view.tsx` to `src/components/state-message.tsx`, use it there, and add it to the component list in `CLAUDE.md`.
