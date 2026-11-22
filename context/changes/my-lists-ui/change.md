---
change_id: my-lists-ui
title: My lists UI audit and design-system contract
status: implemented
created: 2026-11-22
updated: 2026-11-22
archived_at: null
---

## Notes

UI change started via `/10x-ui`.

- **View (one):** `src/app/(app)/(lists)/index.tsx` (My lists — the screen after sign-in).
- **Token source:** `src/constants/theme.ts` (`Colors`, `Spacing`, `Fonts`); shared components in `src/components/`.
- **Contract variant:** existing design system (Expo starter theme + `Button`, `TextField`, `ThemedText`, `ThemedView`) — extend it, no new dependencies.
- **Why not `lists/[id].tsx`:** it only shows "No products yet" until S-04; S-04–S-06 will rebuild it and inherit the tokens from this change.
- **Screenshots:** `context/changes/my-lists-ui/screenshots/` (desktop + one mobile width per visual phase).
- **Open decision (user):** accent (`primary`) color — to be chosen at `/10x-plan`. Resolved: Radix Teal (see `plan.md`).

### Phase 1 notes

- **Screenshot files:** `phase-1-kitchen-sink-desktop-1.jpg` / `-desktop-2.jpg` (top and bottom of the page), `phase-1-kitchen-sink-mobile-1.png` / `-mobile-2.png`, `phase-1-kitchen-sink-dark-desktop.jpg`, plus `phase-1-focus-outline-desktop.png`. Later phases use the same naming.
- **Widths:** desktop is 1512 px (the Chrome window is maximised and cannot be resized); mobile is a 390 px iframe of `/kitchen-sink`.
- **Focus outline (research Open Question 3):** the web build shows the browser's default blue focus outline on list rows when tabbing, so marking focus-visible N/A leaves keyboard focus visible.

### Phase 2 notes

- **Extra secondary buttons (user decision):** besides the plan's Retry/Cancel/↑↓, the two Retry buttons in `store/name.tsx` and the "Delete zone" / "Delete list" buttons use `variant="secondary"`, so Teal marks only the positive action. A destructive (red) variant remains a follow-up.
- **Back arrow:** on web and Android React Navigation tints the header back button with `text`, not `primary`; only iOS uses the accent. Accepted as the platform convention.
- **Store screenshots** are dark-only (`phase-2-store-dark-desktop.jpg`, `phase-2-zone-dark-desktop.jpg`), taken after the user signed in.

### Phase 3 notes

- **Screenshots** are dark-only (the system was in dark mode): `phase-3-kitchen-sink-dark-desktop-1/-2.jpg`, `phase-3-account-dark-desktop.jpg`, `phase-3-store-dark-desktop.jpg`, `phase-3-store-dark-mobile.jpg`, `phase-3-account-and-lists-dark-mobile.jpg` (Account and kitchen-sink "Ready" side by side at 390 px). The signed-in email was replaced with `user@example.com` in the page before each Account shot.
- **Kitchen sink:** `Card` has its own labelled "Card" section below the Button grid, not a cell inside it.
- **Store rows on web:** the arrows sit right after the zone name instead of at the right edge, although `rowName` has `flex: 1` — same as in `phase-2-store-dark-desktop.jpg`, so not caused by `Card` (likely `Link asChild` on web). Left as is.
- **Android check:** done on the emulator in Expo Go (user confirmed web and mobile look the same). Expo Go failed with "Failed to download remote update" until the emulator clock was fixed (it was a day behind, so the dev manifest's signing certificate was "not yet valid").

### Phase 4 notes

- **Loading skeleton** also has a placeholder for the New list button (Ready shows the button above the rows), so rows don't move when data arrives; at 1512 px and 390 px Loading and Ready line up exactly (`phase-4-kitchen-sink-desktop-1.jpg`, `phase-4-kitchen-sink-mobile.jpg`).
- **Message copy added** (heading + one line): Empty "No lists yet" / "Start one for your next shop."; Offline "No connection" / existing sentence; Error "Something went wrong" (in `error`) / "Couldn't load your lists.".
- **Scan allowlist:** `animated-icon.tsx` (plan) and `animated-icon.web.tsx` (user decision — same splash, keyframe opacity 0→1). `app-tabs.web.tsx` pressed opacity now `Opacity.pressed`.
- **`navigationTheme`** moved to `src/constants/navigation-theme.ts` so it can be tested (F2).
- **`@types/node`** is not a direct devDependency; `__tests__/design-tokens-test.ts` uses `/// <reference types="node" />` and resolves it through jest. Follow-up if it ever breaks.
- **Screenshots:** light desktop 1/2, light mobile (Loading next to Ready), dark desktop 1/2.

#### UI quality checklist (My lists)

- Charges: started from C1–C5 in `research.md`; literal scan in `src/app` + `src/components` is 0 outside the allowlisted splash files; one `Button` and one `Card`; C5 (offline data) deferred to S-05 in plan "What We're NOT Doing".
- Accidental architecture: no data → Empty state seen on the real account; logged out → sign-in (Phase 2 screenshots); opening `/` directly works. Not separately checked: deep link into `/lists/[id]` (out of this view).
- Contract: tokens only; 7-state table in `tokens.md`; desktop + 390 px; control names via role/label (`Loading lists` progressbar, `alert` on offline/error); focus-visible N/A (touch-only), web keeps browser outline; dark mode changed at the token layer and checked in both themes.
- Guard: `CLAUDE.md` names tokens, components and kitchen sink and forbids literals; `__tests__/design-tokens-test.ts` runs in `npm test` (no pre-commit hook in this repo).
- Gate: kitchen sink + screenshots per phase; `/10x-impl-review` still to run after this phase; scope held to My lists + global tokens (Account/Store only adopted `Card`).
