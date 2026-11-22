# My lists UI — design-system contract — Plan Brief

> Full plan: `context/changes/my-lists-ui/plan.md`
> Research: `context/changes/my-lists-ui/research.md`

## What & Why

The app was built feature by feature on the Expo starter theme: it has grays but no accent, no
radius or opacity tokens, a header coloured by a different palette, and a list card copied three
times. This change completes the design-system contract and applies it to My lists — the screen
seen right after sign-in — so every current and future screen inherits one look.

## Starting Point

Tokens in `src/constants/theme.ts` are already used by most screens (Radix Slate grays, `Spacing`,
`error`). `Button` fills with the text colour; the only accent is a literal blue link; the header
uses react-navigation's default palette; cards are hand-built in My lists, Account and Store.

## Desired End State

Main actions are Teal, helper actions are neutral, header and content share one palette in light
and dark, and all cards come from one `Card` component. My lists loads without a layout jump and
its states can be seen together on a dev-only `/kitchen-sink` page. `CLAUDE.md` and a Jest scan
stop new colour/radius/opacity literals.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| View for this change | My lists (`(lists)/index.tsx`), not `lists/[id].tsx` | `[id]` is a placeholder until S-04–S-06 rebuild it. | Research |
| Contract variant | Extend the existing token file + components, no new dependency | The repo already has a working, used system. | Research |
| Accent colour | Radix Teal: light `#008573` (teal-11) + white, dark `#12a594` (teal-9) + `#0d1514` | User's choice; steps picked for ≥ 4.5 contrast (teal-9 + white is only 3.07). | Plan (user) |
| Hover / focus-visible | N/A with reason | PRD targets Android only; web is a dev convenience. | Plan (user) |
| Card adoption | My lists, Account and Store in this change | Fits the "whole project, least effort" goal; swaps are small. | Plan (user) |
| Helper buttons | New `Button variant="secondary"` for Retry, Cancel, ↑/↓ | Otherwise every button turns Teal and the Store screen gets noisy. | Plan |
| Radius / opacity | `Radius { control 12, card 16 }`, `Opacity { pressed 0.7, disabled 0.5 }` | Named by role; unifies input (was 8) and button corners. | Plan |
| Header palette | Navigation theme built from `Colors` | Removes the second palette and the dark-mode seam. | Research → Plan |
| Offline data on My lists (C5) | Deferred to S-05 | Data decision, open in the roadmap; not visual. | Research |
| Visual gate | Dev-only `/kitchen-sink` + screenshots per phase | Cheapest gate; no test-runner install. | Plan |

## Scope

**In scope:** token roles in `theme.ts`, navigation theme, `Button` variants, link colour, input
radius, `Card` in three screens, My lists loading/empty/error states, kitchen sink, screenshots,
`CLAUDE.md` rule, Jest literal scan.

**Out of scope:** hover/focus styles, offline data, `lists/[id]` redesign, destructive button,
tab-bar accent, splash icon colours, typography scale.

## Architecture / Approach

Values live only in `src/constants/theme.ts` (raw values and sources in `tokens.md`); screens read
them through `useTheme()`, `Button`, `Card`, `ThemedText`, `ThemedView`. My lists is split into a
data route and a props-driven `MyListsView`, which the kitchen sink renders in every state.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Kitchen sink + baseline | `MyListsView`, `/kitchen-sink`, "before" screenshots | Web server needs sandbox permission |
| 2. Tokens + Button | Teal accent, `Radius`, `Opacity`, header theme, secondary variant | Every screen changes at once — check sign-in and Store too |
| 3. Shared Card | `Card` in My lists, Account, Store | Store row padding/fit at 390 px |
| 4. States + guardrail | Skeleton loading, message states, 7-state record, `CLAUDE.md` rule, Jest scan | Scan false positives (splash icon allowlisted) |

**Prerequisites:** permission to run `npx expo start --web` for screenshots; dark-mode shots need
the system appearance switched once per phase.
**Estimated effort:** ~2–3 sessions across 4 phases.

## Open Risks & Assumptions

- Teal values are copied from Radix Colors 3.0.0; contrast was computed, not checked on device.
- Screenshots are from the web build; one Android look at the end confirms the native result.

## Success Criteria (Summary)

- My lists, Account and Store look like one app: Teal main action, same cards and corners, header
  matching content in light and dark.
- All My lists states are visible on `/kitchen-sink` and loading does not jump.
- A new literal colour/radius/opacity in a view fails `npm test`.
