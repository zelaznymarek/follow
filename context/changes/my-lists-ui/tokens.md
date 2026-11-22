# Design tokens — my-lists-ui

Raw values behind `src/constants/theme.ts`. Grays are Radix Slate, the accent is Radix Teal
(Radix Colors 3.0.0).

Sources:

- https://unpkg.com/@radix-ui/colors@3.0.0/slate.css
- https://unpkg.com/@radix-ui/colors@3.0.0/slate-dark.css
- https://unpkg.com/@radix-ui/colors@3.0.0/teal.css
- https://unpkg.com/@radix-ui/colors@3.0.0/teal-dark.css

## Colours

| Role (`Colors.*`)    | Light     | Radix step (light) | Dark      | Radix step (dark) |
| -------------------- | --------- | ------------------ | --------- | ----------------- |
| `text`               | `#000000` | — (black)          | `#ffffff` | — (white)         |
| `background`         | `#ffffff` | — (white)          | `#000000` | — (black)         |
| `backgroundElement`  | `#F0F0F3` | slate-3            | `#212225` | slate-3 (dark)    |
| `backgroundSelected` | `#E0E1E6` | slate-5            | `#2E3135` | slate-5 (dark)    |
| `textSecondary`      | `#60646C` | slate-11           | `#B0B4BA` | slate-11 (dark)   |
| `error`              | `#CE2C31` | red-11             | `#FF6369` | not Radix (¹)     |
| `primary`            | `#008573` | teal-11            | `#12a594` | teal-9 (dark)     |
| `onPrimary`          | `#ffffff` | — (white)          | `#0d1514` | teal-1 (dark)     |

### Contrast (WCAG 2 ratio, computed)

| Foreground | Background | Ratio | Use                                                   |
| ---------- | ---------- | ----- | ----------------------------------------------------- |
| `#ffffff`  | `#12a594`  | 3.07  | rejected: white label on teal-9 fails for 14 px bold  |
| `#ffffff`  | `#008573`  | 4.56  | light primary button label (`onPrimary` on `primary`) |
| `#0d1514`  | `#12a594`  | 6.03  | dark primary button label (`onPrimary` on `primary`)  |
| `#008573`  | `#ffffff`  | 4.56  | light `linkPrimary` text / header tint on background  |
| `#12a594`  | `#000000`  | 6.84  | dark `linkPrimary` text / header tint on background   |
| `#008573`  | `#F0F0F3`  | 4.01  | light `primary` text on a card: below 4.5, avoid      |
| `#12a594`  | `#212225`  | 5.18  | dark `primary` text on a card                         |
| `#CE2C31`  | `#ffffff`  | 5.21  | light `error` text on background                      |
| `#FF6369`  | `#000000`  | 7.24  | dark `error` text on background                       |

(¹) Dark `error` `#FF6369` is not a step of Radix Red dark (red-10 `#ec5d5e`, red-11 `#ff9592`,
per https://unpkg.com/@radix-ui/colors@3.0.0/red-dark.css); it predates this change and passes
contrast, so it is kept.

**Usage:** don't put `primary` as text on `backgroundElement` (cards) in light mode — use `text` or
`textSecondary` there, and keep `primary` for fills, links on the page background and the header.

## Radius

| Role (`Radius.*`) | Value | Use                 |
| ----------------- | ----- | ------------------- |
| `control`         | 12    | buttons and inputs  |
| `card`            | 16    | cards               |

## Opacity

| Role (`Opacity.*`) | Value | Use                                  |
| ------------------ | ----- | ------------------------------------ |
| `pressed`          | 0.7   | pressable while pressed              |
| `disabled`         | 0.5   | disabled or loading control          |

## States

My lists, 7-state matrix. Cells are on `/kitchen-sink` (dev only).

| State         | Where                                                                                                                         |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| default       | Shown in kitchen sink (My lists → Ready)                                                                                      |
| hover         | N/A — touch-only product (PRD: iOS and Android phones); no pointer, so no hover                                               |
| focus-visible | N/A — touch-only product (PRD: iOS and Android phones); no keyboard, so no focus ring                                         |
| disabled      | N/A on My lists — no control there is ever disabled; shown in kitchen sink (Button → Disabled, primary and secondary)         |
| error         | Shown in kitchen sink (My lists → Error, heading in `error`); the neutral offline message is My lists → Offline               |
| empty         | Shown in kitchen sink (My lists → Empty)                                                                                      |
| loading       | Shown in kitchen sink (My lists → Loading: New list placeholder and three placeholder `Card`s in the Ready content container)  |
