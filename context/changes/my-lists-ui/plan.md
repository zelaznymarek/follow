# My lists UI — design-system contract Implementation Plan

## Overview

Give the app a small, complete design-system contract and apply it to the My lists view
(`src/app/(app)/(lists)/index.tsx`): a Teal accent and role tokens for radius and interaction
opacity in `src/constants/theme.ts`, the navigation header themed from the same tokens, a
`secondary` Button variant, and one shared `Card` used by the three screens that copy the row
card. The view's states are shown side by side on a dev-only kitchen-sink page and checked with
screenshots. A rule in `CLAUDE.md` and a Jest scan keep later agents on the tokens.

Started via `/10x-ui`; charges C1–C5 come from `context/changes/my-lists-ui/research.md`.

## Current State Analysis

- Tokens live in `src/constants/theme.ts`; 9 of 13 route files read them and all 13 use
  `@/components/` (research, Summary). The token set lacks roles: no accent, no radius, no
  opacity (`theme.ts:10-25, 56-64`).
- `Button` fills with `theme.text` (`src/components/button.tsx:36`) — one variant only. Every
  button in the app inherits this.
- The only accent is the literal `#3c87f7` in `ThemedText` `linkPrimary`
  (`src/components/themed-text.tsx:47-51`), used by `sign-in.tsx:98` and `register.tsx:103`.
- The header and back arrow use react-navigation's `DefaultTheme`/`DarkTheme`
  (`src/app/_layout.tsx:16`; values in
  `node_modules/expo-router/build/react-navigation/native/theming/DefaultTheme.js:15-20`,
  `DarkTheme.js:15-20`) — a second palette; in dark mode `card rgb(18,18,18)` ≠ app `#000000`.
- Radius reuses `Spacing` (`index.tsx:119`, `button.tsx:58`, `account.tsx:73`,
  `store/index.tsx:450` = 16; `text-field.tsx:59` = 8); opacity literals at `index.tsx:122`,
  `button.tsx:61, 64`, `store/index.tsx:462`.
- The row card is hand-built three times: `index.tsx:72-85`, `account.tsx:36` (+`:69-74`),
  `store/index.tsx:290` (+`:443-451`).
- My lists renders its states from `useShoppingLists()` (`index.tsx:24`), so they cannot be shown
  side by side without separating presentation from data.
- Web is not a product target (`context/foundation/infrastructure.md:23`); Android is.

## Desired End State

- `Colors` has `primary` and `onPrimary` (Radix Teal, contrast-checked); `Radius` and `Opacity`
  exist; no `borderRadius`/`opacity` literal or colour literal remains in the touched views and
  components.
- Header, back arrow and content share one palette in both color schemes.
- "New list" is a Teal button; helper actions (Retry, Cancel, ↑/↓) are a neutral `secondary`
  button.
- My lists, Account and Store render their cards through `Card`.
- `/kitchen-sink` (dev builds only) shows My lists in loading, ready, empty, offline and error,
  plus Button and Card states; screenshots per phase live in
  `context/changes/my-lists-ui/screenshots/`.
- Loading shows skeleton cards in the list's own layout, so nothing jumps when data arrives.
- `CLAUDE.md` names the tokens, components and kitchen sink; a Jest test fails on new colour,
  radius or opacity literals in `src/app/` and `src/components/`.

### Key Discoveries:

- The existing grays are **Radix Slate**, not Gray as `research.md` inferred: `#F0F0F3` slate-3,
  `#E0E1E6` slate-5, `#60646C` slate-11, dark `#212225`/`#2E3135`/`#B0B4BA` (checked against
  `@radix-ui/colors@3.0.0/slate.css` and `slate-dark.css`). Teal is a matching Radix scale.
- Contrast (WCAG, computed): white on teal-9 `#12a594` = 3.07 (fails for 14 px bold labels);
  white on teal-11 `#008573` = 4.56; `#0d1514` on `#12a594` = 6.03; `#12a594` on `#000000` = 6.84;
  `#008573` on `#ffffff` = 4.56.
- react-native-web's `Pressable` passes `hovered`/`focused` at runtime, but RN types declare only
  `pressed` (research, 7-state matrix) — not needed since hover/focus are N/A here.
- Tests find buttons by role and name (`__tests__/lists-screen-test.tsx:65, 78`) and have no style
  assertions (research, Tests), so restyling should not break them.

## What We're NOT Doing

- **Hover and focus-visible styles** — N/A with reason: the PRD targets Android only
  (`infrastructure.md:23`); the web build keeps browser defaults. Accessible names and pressed
  feedback stay.
- **Offline data on My lists (C5)** — deferred to S-05 (`offline-marking`): what is readable
  offline is an open user decision there (roadmap S-05 Unknowns; PRD `prd.md:325-329`).
- **`lists/[id].tsx` redesign** — rebuilt by S-04–S-06; it inherits tokens and Button changes.
- **Destructive Button variant** ("Delete list") — not on this view; follow-up.
- **Native tab bar accent** (`src/components/app-tabs.tsx`) and the splash/animated icon gradient
  (`src/components/animated-icon.tsx:136, 143`, `animated-icon.module.css`) — unchanged; the icon
  files are allowlisted in the literal scan with that reason.
- **Typography scale changes** — `ThemedText` sizes stay.
- No new dependencies, no `package.json` script changes (EAS fingerprint, `CLAUDE.md` Tooling).

## Implementation Approach

Follow the `/10x-ui` order: environment (kitchen sink + baseline) → token values → view (shared
Card) → states, then the guardrail. Tokens are added by role in the existing `theme.ts` and
consumed through `useTheme()` and the shared components, so one edit restyles every screen.
Raw token values and their source are recorded in `context/changes/my-lists-ui/tokens.md`.

## Critical Implementation Details

- **Screenshots need a running web server.** `npx expo start --web` binds a local port; ask the
  user before leaving the sandbox or suggest `sandbox.network.allowLocalBinding: true`
  (`CLAUDE.md` Hard rules). Desktop width 1280 and mobile width 390; light scheme always, dark
  once per phase by switching the system appearance (the app follows it,
  `src/hooks/use-color-scheme.web.ts`).
- **`web.output` is `"server"`.** The kitchen-sink route must render the same on server and first
  client render; read the color scheme only via `@/hooks/use-color-scheme` / `useTheme`.

## Phase 1: Kitchen sink and baseline screenshots

### Overview

Make My lists renderable in any state without the network, add a dev-only page showing all
states, and capture "before" screenshots.

### Changes Required:

#### 1. Presentational My lists view

**File**: `src/components/my-lists-view.tsx` (new), `src/app/(app)/(lists)/index.tsx`

**Intent**: Move the rendering (states, `FlatList`, `ListRow`, styles, messages) out of the route
into a component driven by props; the route keeps `useShoppingLists()` and navigation and renders
the component. No visual change in this phase.

**Contract**: `export function MyListsView(props: { state: ShoppingListsState; lists:
ShoppingList[]; onRetry: () => void; onNewList: () => void })`. Route default export unchanged
(`MyListsScreen`). Existing `__tests__/lists-screen-test.tsx` passes unmodified.

#### 2. Kitchen-sink route

**File**: `src/app/kitchen-sink.tsx` (new)

**Intent**: One page that renders `MyListsView` in loading, ready (3 sample lists), empty,
offline and error side by side (fixed-height labelled columns, wrapping on narrow screens), plus a
row of `Button` states (default, disabled, loading). Dev only.

**Contract**: Route `/kitchen-sink`, default export. When `__DEV__` is false it renders
`<Redirect href="/" />`. Callbacks are no-ops. Outside the `(app)` group, so it needs no sign-in
and adds no tab.

#### 3. Baseline screenshots

**File**: `context/changes/my-lists-ui/screenshots/` (new)

**Intent**: Record the starting point for comparison.

**Contract**: `phase-1-kitchen-sink-desktop.png`, `phase-1-kitchen-sink-mobile.png`,
`phase-1-kitchen-sink-dark-desktop.png`; also note in the phase commit whether the web build
shows a default focus outline on rows (research Open Question 3).

### Success Criteria:

#### Automated Verification:

- Lint passes: `npm run lint`
- Type check passes: `npx tsc --noEmit`
- Tests pass: `npm test`

#### Manual Verification:

- `/kitchen-sink` shows all five My lists states and the Button states, matching today's look
- Baseline screenshots saved (desktop, mobile, dark desktop)

**Implementation Note**: After automated verification passes, pause for the human to confirm the
manual checks before the next phase.

---

## Phase 2: Tokens and Button

### Overview

Add the missing roles to the token source, theme the header from them and give `Button` a
primary and a secondary look.

### Changes Required:

#### 1. Token roles

**File**: `src/constants/theme.ts`

**Intent**: Add the accent and the radius/opacity roles; update the file's header comment to name
Radix Slate + Teal as the value source.

**Contract**:
- `Colors.light.primary = '#008573'` (teal-11), `Colors.light.onPrimary = '#ffffff'`;
  `Colors.dark.primary = '#12a594'` (teal-9), `Colors.dark.onPrimary = '#0d1514'` (teal-1 dark).
- `export const Radius = { control: 12, card: 16 } as const;` — `control` for buttons and inputs,
  `card` for cards.
- `export const Opacity = { pressed: 0.7, disabled: 0.5 } as const;`

#### 2. Token record

**File**: `context/changes/my-lists-ui/tokens.md` (new)

**Intent**: Keep the raw values, their Radix step names, source URL and the contrast numbers from
Key Discoveries in the repo.

**Contract**: One table per role group (colours light/dark, radius, opacity).

#### 3. Navigation theme from tokens

**File**: `src/app/_layout.tsx`

**Intent**: Build the `ThemeProvider` value from `Colors` so the header, title and back arrow use
the app palette.

**Contract**: Spread `DefaultTheme`/`DarkTheme` and override `colors`: `primary ← primary`,
`background ← background`, `card ← background`, `text ← text`, `border ← backgroundSelected`,
`notification ← error`.

#### 4. Button variants

**File**: `src/components/button.tsx`

**Intent**: Primary fill becomes the accent; add a neutral variant for helper actions; use the
new radius and opacity tokens.

**Contract**: New prop `variant?: 'primary' | 'secondary'` (default `'primary'`). Primary: fill
`primary`, label and spinner `onPrimary`. Secondary: fill `backgroundSelected`, label and spinner
`text`. `borderRadius: Radius.control`; pressed `Opacity.pressed`; inactive `Opacity.disabled`.

#### 5. Link colour and input radius

**File**: `src/components/themed-text.tsx`, `src/components/text-field.tsx`

**Intent**: Remove the `#3c87f7` literal; align input corners with buttons.

**Contract**: `type="linkPrimary"` takes its colour from `theme.primary` (applied in the
component, not the static stylesheet). `TextField` input `borderRadius: Radius.control`.

#### 6. Secondary actions

**File**: `src/components/my-lists-view.tsx`, `src/app/(app)/store/index.tsx`,
`src/app/(app)/(lists)/lists/[id].tsx`, `src/app/(app)/store/zones/[id].tsx` (only where a Retry
or Cancel button exists)

**Intent**: Keep one Teal action per screen area; helper actions go neutral.

**Contract**: `variant="secondary"` on Retry, Cancel and the ↑/↓ zone buttons. Primary actions
(New list, Add, Save, Sign in, Sign out, Delete list) stay default.

#### 7. Kitchen sink

**File**: `src/app/kitchen-sink.tsx`

**Intent**: Show both Button variants in default, disabled and loading.

**Contract**: Button row extended with `variant="secondary"` cases.

### Success Criteria:

#### Automated Verification:

- Lint passes: `npm run lint`
- Type check passes: `npx tsc --noEmit`
- Tests pass: `npm test`
- No colour literal left in `src/components/themed-text.tsx`:
  `grep -nE '#[0-9a-fA-F]{3,8}\b' src/components/themed-text.tsx` prints nothing

#### Manual Verification:

- Kitchen sink, sign-in and Store screenshots (desktop, mobile, dark desktop) show Teal primary,
  neutral secondary buttons, and a header the same colour as the content in both schemes
- Button labels are readable on both variants in both schemes

**Implementation Note**: After automated verification passes, pause for the human to confirm the
manual checks before the next phase.

---

## Phase 3: Shared Card

### Overview

Replace the three hand-built cards with one component.

### Changes Required:

#### 1. Card component

**File**: `src/components/card.tsx` (new)

**Intent**: The one surface for grouped content and list rows.

**Contract**: `export function Card({ style, ...rest }: ViewProps)` renders
`ThemedView type="backgroundElement"` with `padding: Spacing.three`,
`borderRadius: Radius.card`; caller `style` is applied last (layout such as `flexDirection`, or a
padding override). Renders element children only, so no `biome.json` skip-list entry is needed.

#### 2. Adopt Card

**File**: `src/components/my-lists-view.tsx`, `src/app/(app)/account.tsx`,
`src/app/(app)/store/index.tsx`

**Intent**: Remove the local `row`/`card` surface styles; keep only layout differences.

**Contract**: My lists `ListRow` → `Card` inside the existing `Pressable`, pressed style
`Opacity.pressed`. Account "Signed in as" → `Card`. Store `ZoneRow` → `Card` with row layout and
its tighter padding (`paddingRight`/`paddingVertical: Spacing.two`) passed via `style`; its pressed
style uses `Opacity.pressed`.

#### 3. Kitchen sink

**File**: `src/app/kitchen-sink.tsx`

**Intent**: Show `Card` alone (text content) next to the Button row.

**Contract**: One extra labelled cell.

### Success Criteria:

#### Automated Verification:

- Lint passes: `npm run lint`
- Type check passes: `npx tsc --noEmit`
- Tests pass: `npm test`
- No `borderRadius` or `opacity` number literal in the three screens:
  `grep -nE 'borderRadius: [0-9]|opacity: [0-9]|borderRadius: Spacing' "src/app/(app)/account.tsx" "src/app/(app)/store/index.tsx" src/components/my-lists-view.tsx`
  prints nothing

#### Manual Verification:

- My lists, Account and Store screenshots (desktop, mobile) show identical card corners and
  surface colour
- Store zone rows still fit the name and both arrow buttons at 390 px width

**Implementation Note**: After automated verification passes, pause for the human to confirm the
manual checks before the next phase.

---

## Phase 4: States and guardrail

### Overview

Finish the 7-state matrix for My lists and leave the rule and check that keep the contract.

### Changes Required:

#### 1. Loading without a jump

**File**: `src/components/my-lists-view.tsx`

**Intent**: Replace the centred spinner with three placeholder `Card`s laid out like real rows in
the same content container, so arriving data does not move the layout.

**Contract**: Placeholder container has `accessibilityLabel="Loading lists"` and
`accessibilityRole="progressbar"`; placeholders contain no text and use `backgroundElement`.

#### 2. Empty, offline and error messages

**File**: `src/components/my-lists-view.tsx`

**Intent**: Make the message states read as states, not stray text: a short heading plus one
line of explanation and the action, inside the same content width as the list. Error uses the
`error` token for the heading; offline stays neutral (it is not the user's fault). Copy stays in
English, same as today.

**Contract**: Existing texts stay findable by the current tests ("No lists yet", the offline and
error messages, "Retry" and "New list" buttons); `accessibilityRole="alert"` stays on offline and
error.

#### 3. 7-state matrix record

**File**: `context/changes/my-lists-ui/research.md` is not edited; record the matrix in
`context/changes/my-lists-ui/tokens.md` under `## States`.

**Intent**: Each of default, hover, focus-visible, disabled, error, empty, loading is "shown in
kitchen sink (cell name)" or "N/A — reason" (hover and focus-visible: Android-only product;
disabled: no disabled control on My lists, shown on Button row).

**Contract**: One table, seven rows.

#### 4. Agent rule

**File**: `CLAUDE.md` (in `## Code conventions`, outside the
`<!-- BEGIN @przeprogramowani/10x-cli -->` … `<!-- END … -->` block)

**Intent**: Tell the next agent where tokens and components are and how to check states.

**Contract**: Extend the existing "Style with `StyleSheet.create` plus tokens…" bullet or add one
short bullet group: tokens are `Colors` (incl. `primary`/`onPrimary`), `Spacing`, `Radius`,
`Opacity` in `@/constants/theme` — no colour, radius or opacity literals in views; check
`src/components/` (`Button` with `variant`, `Card`, `TextField`, `ThemedText`, `ThemedView`)
before creating a component; show new view states on `/kitchen-sink` (dev only).

#### 5. Literal scan test

**File**: `__tests__/design-tokens-test.ts` (new)

**Intent**: Fail CI when a colour, radius or opacity literal is added outside the token source.

**Contract**: Reads every `.ts`/`.tsx` under `src/app/` and `src/components/` with `fs`, and
fails listing `file:line` for matches of `#[0-9a-fA-F]{3,8}\b`, `rgba?\(`,
`borderRadius: [0-9]`, `opacity: [0-9]`. Excludes `src/constants/theme.ts` and allowlists
`src/components/animated-icon.tsx` (splash gradient, out of scope) with that reason in a comment.

### Success Criteria:

#### Automated Verification:

- Lint passes: `npm run lint`
- Type check passes: `npx tsc --noEmit`
- Tests pass, including the new scan: `npm test`
- Scan test fails when a `#ff0000` literal is temporarily added to `src/components/card.tsx`
  (then reverted)

#### Manual Verification:

- Kitchen-sink screenshots (desktop, mobile, dark desktop) show all five My lists states;
  loading → ready causes no visible jump on the real screen
- `tokens.md` 7-state table has every row shown or N/A with reason
- Checklist in `.claude/skills/10x-ui/references/ui-quality-checklist.md` walked for My lists

**Implementation Note**: After automated verification passes, pause for the human to confirm the
manual checks, then run `/10x-impl-review my-lists-ui`.

---

## Testing Strategy

### Unit Tests:

- Existing screen tests (`__tests__/lists-screen-test.tsx`, `account-screen-test.tsx`,
  `store-screen-test.tsx`, `sign-in-screen-test.tsx`, `register-screen-test.tsx`) must pass
  unmodified after each phase — they guard behaviour while the look changes.
- `__tests__/design-tokens-test.ts` (Phase 4) guards the contract.

### Integration Tests:

- None added; the visual gate is the kitchen sink plus screenshots.

### Manual Testing Steps:

1. `npx expo start --web`, open `/kitchen-sink`, compare with the previous phase's screenshots.
2. Sign in, open My lists, pull data in → no layout jump; open a list → header and back arrow in
   Teal.
3. Switch the system to dark mode → header and content share the same background.
4. Once at the end: open the app on the Android device/emulator and look at My lists and Store.

## Performance Considerations

None; static styles only.

## Migration Notes

None; no data or API changes. Ships with the next OTA update (no `package.json` change).

## References

- Research: `context/changes/my-lists-ui/research.md`
- Skill contract: `.claude/skills/10x-ui/SKILL.md`, checklist
  `.claude/skills/10x-ui/references/ui-quality-checklist.md`
- Radix scales: `https://unpkg.com/@radix-ui/colors@3.0.0/teal.css`, `teal-dark.css`,
  `slate.css`, `slate-dark.css`
- Button pattern origin: `context/archive/2026-11-18-account-sign-in/plan.md:168-172`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Kitchen sink and baseline screenshots

#### Automated

- [x] 1.1 Lint passes: `npm run lint` — 3f0dc46
- [x] 1.2 Type check passes: `npx tsc --noEmit` — 3f0dc46
- [x] 1.3 Tests pass: `npm test` — 3f0dc46

#### Manual

- [x] 1.4 `/kitchen-sink` shows all five My lists states and the Button states, matching today's look — 3f0dc46
- [x] 1.5 Baseline screenshots saved (desktop, mobile, dark desktop) — 3f0dc46

### Phase 2: Tokens and Button

#### Automated

- [x] 2.1 Lint passes: `npm run lint`
- [x] 2.2 Type check passes: `npx tsc --noEmit`
- [x] 2.3 Tests pass: `npm test`
- [x] 2.4 No colour literal left in `src/components/themed-text.tsx`

#### Manual

- [x] 2.5 Kitchen sink, sign-in and Store screenshots show Teal primary, neutral secondary buttons, and a header the same colour as the content in both schemes
- [x] 2.6 Button labels are readable on both variants in both schemes

### Phase 3: Shared Card

#### Automated

- [ ] 3.1 Lint passes: `npm run lint`
- [ ] 3.2 Type check passes: `npx tsc --noEmit`
- [ ] 3.3 Tests pass: `npm test`
- [ ] 3.4 No `borderRadius` or `opacity` number literal in the three screens

#### Manual

- [ ] 3.5 My lists, Account and Store screenshots show identical card corners and surface colour
- [ ] 3.6 Store zone rows still fit the name and both arrow buttons at 390 px width

### Phase 4: States and guardrail

#### Automated

- [ ] 4.1 Lint passes: `npm run lint`
- [ ] 4.2 Type check passes: `npx tsc --noEmit`
- [ ] 4.3 Tests pass, including the new scan: `npm test`
- [ ] 4.4 Scan test fails when a `#ff0000` literal is temporarily added to `src/components/card.tsx`

#### Manual

- [ ] 4.5 Kitchen-sink screenshots show all five My lists states; loading → ready causes no visible jump
- [ ] 4.6 `tokens.md` 7-state table has every row shown or N/A with reason
- [ ] 4.7 UI quality checklist walked for My lists
