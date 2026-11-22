---
date: 2026-11-22T17:14:29+01:00
researcher: Claude (Opus 5.5) for Marek Żelazny
git_commit: 8c35dccad3e0961be51744323d4c6e6df6673d17
branch: feat/store-and-zones
repository: follow
topic: "Two-way UI audit of the My lists view against the design-system contract (/10x-ui)"
tags: [research, ui, design-tokens, my-lists, button, themed-view, pressable]
status: complete
last_updated: 2026-11-22
last_updated_by: Claude (Opus 5.5)
---

# Research: Two-way UI audit of the My lists view

**Date**: 2026-11-22T17:14:29+01:00
**Researcher**: Claude (Opus 5.5) for Marek Żelazny
**Git Commit**: 8c35dccad3e0961be51744323d4c6e6df6673d17 (working tree has uncommitted changes outside `src/`)
**Branch**: feat/store-and-zones
**Repository**: follow

## Research Question

Two-way UI audit (per `/10x-ui`) of the My lists view, `src/app/(app)/(lists)/index.tsx`. Token
source: `src/constants/theme.ts`; components: `src/components/`. Verify five pre-audit charges
and record them under `## Charges` with file:line and user impact; assess whether the offline
charge is deferred to S-05/S-06; walk the 7-state matrix for this view.

Scope note: the scope is one view, four shared components and the two screens that copy its row
pattern, so it was researched locally (no sub-agents). Source files were read in full; library
behaviour was checked in the installed `node_modules` (react-native 0.88.1,
react-native-web 0.21.4) rather than from memory.

## Summary

The token file is live, not dead: all 13 route files under `src/app/` import from
`@/components/`, and 9 of them import `@/constants/theme` or `useTheme`. The view itself has no
colour literals. The problems are **missing roles** in the token set, not unused tokens:

- There is no accent/`primary` colour. The one filled `Button` paints itself with the **text**
  colour (`button.tsx:36`), the only accent is a literal `#3c87f7` (`themed-text.tsx:50`), and the
  header, back button and tab chrome take colours from a **second palette** — the react-navigation
  defaults passed in at `src/app/_layout.tsx:16`.
- There are no radius or interaction-opacity tokens; `Spacing` is reused as a radius in 5 places
  and the same opacity literals repeat.
- The list row card is hand-built in this view and copied (with different padding) in two others.
- No control in `src/` has a hover or focus-visible style.

Five charges are recorded below; four map to the plan, one (offline) is **deferred** to S-05/S-06
with reason. The variant is **existing design system, extend it** — no new dependency is needed.

## Charges

| # | Category | Evidence (file:line) | User impact | Disposition |
| --- | --- | --- | --- | --- |
| C1 | Missing tokens | `src/components/button.tsx:36` (`backgroundColor: theme.text`), `:40-41` (label/spinner in `background`); `src/components/themed-text.tsx:47-51` (`linkPrimary` = literal `#3c87f7`); `src/constants/theme.ts:10-25` (no `primary`/accent/`border` role); `src/app/_layout.tsx:16` (`DefaultTheme`/`DarkTheme` → `primary rgb(0,122,255)`, `card rgb(18,18,18)` in dark, per `node_modules/expo-router/build/react-navigation/native/theming/DefaultTheme.js:15-20`, `DarkTheme.js:15-20`) | "New list" — the main action on this screen — is a black (light) / white (dark) slab with the same weight as text; header/back-button colours come from a different palette than the content, and in dark mode the header (`rgb(18,18,18)`) and the content (`#000000`) are visibly different blacks. | Plan — token phase |
| C2 | Missing tokens | radius: `src/app/(app)/(lists)/index.tsx:119`, `src/components/button.tsx:58`, `src/app/(app)/account.tsx:73`, `src/app/(app)/store/index.tsx:450` all `borderRadius: Spacing.three` (16); `src/components/text-field.tsx:59` `borderRadius: Spacing.two` (8). opacity: `index.tsx:122`, `button.tsx:61`, `store/index.tsx:462` `0.7` (pressed); `button.tsx:64` `0.5` (disabled) | Corners differ between the input (8) and the cards/buttons (16) on screens that show both; changing the "softness" of the app or the pressed feedback means editing every file. | Plan — token phase |
| C3 | Missing shared component | `ListRow` `src/app/(app)/(lists)/index.tsx:72-85` (+ styles `:115-123`); same `ThemedView type="backgroundElement"` card in `src/app/(app)/account.tsx:36` (+ `:69-74`) and `src/app/(app)/store/index.tsx:290` (+ `:443-451`), each with its own padding (`three/three`, `three/three`, `three|two/two`) | The three tabs' lists look slightly different; any card restyle is three edits and the next screen (S-04 products) will copy a fourth variant. | Plan — component phase (extract a card/row component; adopt in this view; other two screens may adopt in the same phase or be listed as follow-up) |
| C4 | States (accidental architecture) | No `hovered`/`focused` style anywhere in `src/` (searched `src/` for `focus` and `hovered`: 3 hits, all `useFocusEffect` comments — `store/index.tsx:53`, `use-shopping-lists.ts:14`, `use-store.ts:24`). Row: `index.tsx:75` styles only `pressed`; `Button`: `button.tsx:34-39` only `pressed`/`inactive`. | On web, a mouse gives no hover feedback on list rows or buttons, and a keyboard user cannot see which list or button is focused (depends on whatever react-native-web/browser default applies — not verified, see Open Questions). | Plan — states phase |
| C5 | Accidental architecture | `src/app/(app)/(lists)/index.tsx:35-49`: `offline` and `error` replace the whole screen with a message + Retry; `src/hooks/use-shopping-lists.ts:29-34` keeps the last `lists` in state but the view does not render them in those states. | Offline, the user sees no lists at all instead of the last known ones. | **Deferred** — reason below |

### C5 deferral reason

The PRD's non-functional requirement is "No full offline mode. Creating lists, zones or stores
requires connectivity. Marking an open list is the exception" (`context/foundation/prd.md:325-329`).
What must be readable offline, and whether every list or only an already-opened one, is an open
unknown owned by the user in S-05 (`context/foundation/roadmap.md`, S-05 "Unknowns"). Changing
which data this screen shows offline is a data/caching decision for S-05 (offline-marking), not a
visual change; this change only restyles the existing offline/error message state (C4/matrix).

## 7-state matrix — My lists (`src/app/(app)/(lists)/index.tsx`)

| State | Current behaviour (file:line) | Verdict |
| --- | --- | --- |
| default | Rows: `ThemedView type="backgroundElement"` + `ThemedText` (`:76-80`), all colours from tokens; radius/opacity literals per C2; header `Button` uses text colour (C1). | Fails C1, C2 |
| hover | Not implemented (`:75`, `button.tsx:34-39`). Web only; on native (Android touch target per PRD) N/A. | Missing (web) |
| focus-visible | Not implemented in `src/`. react-native-web's `Pressable` computes `hovered` and `focused` and passes them to the style callback (`node_modules/react-native-web/dist/exports/Pressable/index.js:48-52, 82-83`), but react-native's own type declares only `pressed` (`node_modules/react-native/Libraries/Components/Pressable/Pressable.js:35-40`; `types_generated/.../Pressable.d.ts:25`). | Missing (web); typing needs a decision (Open Questions) |
| disabled | No disabled control on this view. `Button` supports it via opacity `0.5` (`button.tsx:25, 63-65`). | N/A for this view (component behaviour covered by C2) |
| error | `:35-49`: message in default text colour + Retry, same layout for `offline` and `error`; `error` token (`theme.ts:16, 24`) not used here. Message has `accessibilityRole="alert"` (`:40`). | Works; visual weight to be decided in plan |
| empty | `:60-65`: "No lists yet" + "New list" button — a real empty state, not a blank frame. | Pass (copy/visual can improve) |
| loading | `:27-33`: centred `ActivityIndicator` (`color={theme.text}`), then the screen swaps to a top-aligned `FlatList` (`:53-67`) — content jumps from centre to top when data arrives. | Layout jump; plan should decide skeleton vs accept |

## Detailed Findings

### Token source → views

- `src/constants/theme.ts:10-25`: `Colors.light/dark` have six roles: `text`, `background`,
  `backgroundElement`, `backgroundSelected`, `textSecondary`, `error`. No `primary`, `onPrimary`,
  `border`, `focus`/`ring`, radius or opacity tokens. The grays match Radix Gray steps (e.g.
  `#F0F0F3`, `#E0E1E6`, `#60646C`) — inference from the values, not from a comment in the file.
- `Spacing` (`theme.ts:56-64`) is the only scale; it is used for both spacing and radius (C2).
- `useTheme()` (`src/hooks/use-theme.ts:9-14`) picks `Colors.light|dark` by color scheme; the
  view reads colours only through it and the themed components.
- Navigation chrome is themed separately: `ThemeProvider value={DarkTheme|DefaultTheme}`
  (`src/app/_layout.tsx:16`); `app-tabs.tsx:8-13` does map `Colors` onto native tabs
  (`backgroundColor`, `indicatorColor`), so tabs and header use different sources.

### Shared components

- `Button` (`src/components/button.tsx`): one filled variant; text colour as fill; pressed 0.7 /
  inactive 0.5; `minHeight: 44`. No secondary/destructive variant (also noted in
  `context/archive/2026-11-20-shopping-lists/plan.md:21`).
- `TextField` (`src/components/text-field.tsx`): border `backgroundSelected`, error border
  `error`, radius `Spacing.two`. Not used on this view.
- `ThemedText` (`src/components/themed-text.tsx`): typography scale lives here (`:17-57`), one
  colour literal (`:50`).
- `ThemedView` (`src/components/themed-view.tsx`): background by `type`; `lightColor`/`darkColor`
  props are accepted but unused (`:7-8, 12`).

### View → source

The view `index.tsx` contains no colour literals (hex/rgb scan: 0 hits). Literal style values:
`borderRadius: Spacing.three` (`:119`) and `opacity: 0.7` (`:122`) — both C2. Every text is
`ThemedText`; every action is `Button`; the row is local (C3).

### Agent rules

`CLAUDE.md` is the only agent rules file (no `AGENTS.md`, `.cursor/`, `.windsurfrules`,
`.github/copilot-instructions.md`). Its Code conventions already say "Style with
`StyleSheet.create` plus tokens from `@/constants/theme` … no hardcoded colors". No rule
encourages one-off values. It does not say where shared components live or to check them first,
and does not cover radius/opacity — the "Utrwal to" rule should extend this section, outside the
`<!-- BEGIN @przeprogramowani/10x-cli -->` block (`CLAUDE.md:39-56`).

### Tests

`__tests__/lists-screen-test.tsx` covers this view; a search of `__tests__/` for `toHaveStyle`,
`toMatchSnapshot`, `opacity` and `backgroundColor` found no style assertions, so restyling should
not break existing tests (behavioural assertions not re-checked here).

## Code References

- `src/app/(app)/(lists)/index.tsx:27-49` — loading, offline/error states
- `src/app/(app)/(lists)/index.tsx:53-67` — list, header button, empty state
- `src/app/(app)/(lists)/index.tsx:72-85, 115-123` — `ListRow` and its styles
- `src/components/button.tsx:27-46, 48-66` — single filled button
- `src/components/themed-text.tsx:47-51` — `linkPrimary` literal colour
- `src/constants/theme.ts:10-25, 56-64` — colours and spacing
- `src/app/_layout.tsx:16` — navigation theme from react-navigation defaults
- `src/components/app-tabs.tsx:8-13` — native tabs mapped to `Colors`
- `src/app/(app)/account.tsx:36, 69-74` — copied card
- `src/app/(app)/store/index.tsx:290-309, 443-462` — copied row + pressed opacity

## Architecture Insights

- Contract variant: **existing design system — extend it.** Values: `src/constants/theme.ts`.
  Components: `src/components/`. Adding `primary`/`onPrimary`/`border`/focus roles plus `Radius`
  and an opacity token in `theme.ts`, then mapping them onto the navigation theme, changes every
  screen at once — that is the "global tokens" half of this change.
- `Button` taking `theme.text` as fill means a new `primary` token changes every button in the app
  (sign-in, register, account, store, lists) in one edit. This is intended for this change but
  should be visible in screenshots of at least one other screen.
- Hover/focus on web is available from react-native-web at runtime; the gap is the type and a
  shared place to apply it (Button + the new row component), not a missing library.

## Historical Context (from prior changes)

- `context/archive/2026-11-18-account-sign-in/plan.md:168-172` — `Button`/`TextField` were
  introduced as "minimal themed input and button" with the "`Pressable` + `pressed` opacity
  pattern" and the `error` colour token. Supported: that is what the files contain today.
- `context/archive/2026-11-20-shopping-lists/plan.md:21` and `research.md:116-121` — "There is no
  row, empty-state or destructive-button component." Still true for row and destructive button
  (C3; destructive is out of this view's scope — "Delete list" is on `lists/[id].tsx`).

## Related Research

- `context/archive/2026-11-20-shopping-lists/research.md` — UI kit inventory at the time this view
  was built.

## Open Questions

1. **Accent colour (user decision).** Which `primary` hue? Suggested shortlist that fits the
   existing Radix grays: Grass, Teal, Jade (or user's own). Needs light + dark values and an
   `onPrimary` text colour with sufficient contrast.
2. **Focus/hover typing (plan decision).** Read `hovered`/`focused` from the RNW style-callback
   state with a local type augmentation, or track focus with `onFocus`/`onBlur` state (works on
   native keyboards too). Not decided here.
3. **Current web focus outline.** Whether react-native-web/browser shows a default focus outline
   on these `Pressable`s today was not verified; check on the first "before" screenshot.
4. **Scope of C3 adoption.** Adopt the new row/card component in `account.tsx` and
   `store/index.tsx` in this change, or only in My lists with the other two listed as follow-up
   (skill rule: one view + global tokens per change).
5. **Loading jump.** Accept the centre→top jump, or add a simple row skeleton.
