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
| `error`              | `#CE2C31` | not re-checked     | `#FF6369` | not re-checked    |
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
