# Store and zones — Plan Brief

> Full plan: `context/changes/store-and-zones/plan.md`
> Research: `context/changes/store-and-zones/research.md`

## What & Why

Roadmap slice S-03 (FR-006, FR-007, FR-008): the user names their one store, defines its zones and
sets their order with up/down controls on a view that shows zone names only. The order is the route
every later list will be sorted by; S-04 appends inline-created zones to it (FR-024), and S-08 must find
it on a new device (FR-025), so it lives in the Supabase account.

## Starting Point

Nothing store- or zone-related exists. S-02 shipped the patterns to copy: an owner-scoped table with
RLS and explicit grants, a data module returning `ok | offline | error` with a 5 s deadline, a
focus-reloading hook, Stack screens, and OTA delivery to the installed APK.

## Desired End State

A **Store** tab (between Lists and Account) shows a "Name your store" form until a store exists, then
the store name, its zones in route order with ↑/↓ buttons, and an "Add zone" field that appends to
the end. Tapping a zone renames or deletes it; the store name is renamable. Case-insensitive duplicate
zone names are refused. New lists record their store. Everything persists across restarts and devices.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Store naming | Explicit on the Store tab; S-04 sends the user there if no store | Meets FR-006 as written and keeps S-03 self-contained | Plan |
| Adding zones | Yes, on the Store screen, appended to the end | S-03 is testable alone and builds the append rule S-04 reuses | Plan |
| Zone names | Trimmed, 1–40 chars, unique per store ignoring case, renamable | The S-04 picker and route headings are never ambiguous; typos fixable | Plan |
| Zone delete | Allowed after confirmation; S-04's product FK will refuse used zones | Fixes mistakes without ever orphaning a product (`prd.md:84-86`) | Plan |
| Navigation | New Store tab on both platforms (`src/app/(app)/store/`) | One tap away for reordering; a plain folder avoids a second `/` index | Plan |
| Zone ownership | `zones(store_id, name, position)`, one store per user | Fewest tables and simplest queries; multi-store later migrates | Plan |
| `store_id` on lists | Added now, nullable, filled by a trigger on insert | Schema ready for a store selector without touching `createList` | Plan |
| Ordering rules | Append trigger + `move_zone` RPC swapping with the real neighbour, store row locked | Atomic under concurrency; S-04 inherits the append | Plan |
| Request contract | Shared `src/lib/request.ts` with a new `duplicate` reason (`23505`) | Reuses S-02's settled offline/error mapping | Research |
| Delivery | OTA on `preview`, runtime `7c659def…`, no dependency changes | Same path as S-02; no build needed | Research |

## Scope

**In scope:**
- `stores`, `zones`, append trigger, `move_zone`, `shopping_lists.store_id` + fill trigger
- Shared request wrapper, `src/lib/store.ts`, `use-store` hook
- Store tab + icon, store / store-name / zone screens, `Button` accessible label, shared delete confirm
- Unit and screen tests, OTA rollout, deploy-plan and roadmap records

**Out of scope:**
- Multiple stores, store selector, store deletion, per-store overrides
- Products, inline zone creation, product → zone FK (S-04)
- Drag-and-drop, offline caching of the store, backfilling `store_id` on old lists

## Architecture / Approach

The database owns every rule that must hold under concurrency: `unique (user_id)` on stores, a
case-insensitive unique index on zone names, a `before insert` trigger that appends the zone after the
store's highest position, a security-invoker `move_zone(zone, 'up'|'down')` that swaps positions under a
deferrable unique constraint, and a trigger that stamps new lists with the user's store. Composite FKs
`(store_id, user_id)` keep every reference inside one account. The client is a thin data module plus a
focus-reloading hook; screens refresh after each successful change.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Database and types | Migration pushed by the user, types regenerated, anon refused over REST | Trigger/RPC grants wrong (`revoke … from public` rule) |
| 2. Data layer | `request.ts`, `store.ts`, `use-store` with unit tests | Moving `run()` changes S-02 behaviour |
| 3. Store tab and screens | Tab + icon on both platforms, three screens, screen tests | Tab icon asset; typed routes for the new folder |
| 4. Rollout | OTA on `preview`, device checks, records | Runtime mismatch would need a build |

**Prerequisites:** S-01 done; user available for backup, dry run and push; Pixel 5 with the S-01/S-02 APK.
**Estimated effort:** ~3–4 sessions across 4 phases.

## Open Risks & Assumptions

- The tab icon is generated without new dependencies; if that fails the user supplies a PNG.
- Zone deletion is unguarded until S-04 adds the product FK — acceptable because no products exist yet.
- Zones owned by the store mean a later multi-store change migrates to user-level zones + per-store order.

## Success Criteria (Summary)

- On the Pixel 5 the user names the store, builds and reorders zones, and the order survives restarts and shows up on the emulator for the same account.
- Duplicate zone names are refused, deletes need confirmation, and offline shows a message instead of an error.
- New lists carry the store, so S-04 can start without schema work on lists.
