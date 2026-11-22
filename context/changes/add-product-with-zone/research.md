---
date: 2026-11-22T19:46:21+01:00
researcher: Claude (Opus 5.5) for Marek Żelazny
git_commit: af820fc02bd2060fe6e62f52a790f12ae6511cbb
branch: ui-improvements
repository: follow
topic: "S-04 add-product-with-zone: current data layer, UI plug-in points and recorded constraints"
tags: [research, codebase, s-04, products, list-items, zones, supabase, lists-screen]
status: complete
last_updated: 2026-11-22
last_updated_by: Claude (Opus 5.5)
---

# Research: S-04 add-product-with-zone

**Date**: 2026-11-22T19:46:21+01:00
**Researcher**: Claude (Opus 5.5) for Marek Żelazny
**Git Commit**: af820fc02bd2060fe6e62f52a790f12ae6511cbb (branch `ui-improvements`, my-lists-ui Phases 1–2 committed; uncommitted my-lists-ui review docs in the working tree)
**Branch**: ui-improvements
**Repository**: follow

## Research Question

Roadmap slice S-04 (`context/foundation/roadmap.md`, "S-04: Add a product with its zone"; PRD refs
US-02, FR-010, FR-011, FR-012, FR-013, FR-020, FR-024): the user can add a product to a list by
name, choosing an existing zone or creating one inline the first time the product appears (an
inline zone goes to the end of the route), and can remove a product from a list. What exists
today, where does the work plug in, and which recorded decisions and constraints shape it?

Method: three read-only workers in parallel (data layer; UI/hooks/tests; prior decisions in
`context/`), then the decisive anchors were re-checked locally (migrations, roadmap line 142,
store-and-zones brief, deploy plan line 225, `request.ts`).

## Summary

- **No product or list-item storage exists.** The migrations define `shopping_lists`, `stores`
  and `zones` only (`supabase/migrations/`, five files); `src/lib/database.types.ts` has no
  products/items types; the list screen shows the placeholder "No products yet"
  (`src/app/(app)/(lists)/lists/[id].tsx:123`). S-04 needs a migration, regenerated types and a
  new `src/lib` module.
- **Inline zone creation is already solved.** A plain insert into `zones` is appended to the end
  of the route by the `zones_set_position` BEFORE INSERT trigger, which locks the store row
  (`supabase/migrations/20261121120000_create_store_and_zones.sql:90-114`, hardened in
  `20261121130000_harden_store_and_zones.sql:15-36`). `addZone(storeId, name)` in
  `src/lib/store.ts:99-111` returns `RequestResult<Zone, 'duplicate'>` and can be reused as is.
  The store-and-zones brief records this as built for S-04
  (`context/archive/2026-11-21-store-and-zones/plan-brief.md:31,37`).
- **Recorded forward decisions for S-04:** with no store, send the user to the Store tab
  (`context/foundation/roadmap.md:142`); a product → zone foreign key will refuse deleting a used
  zone (`plan-brief.md:33,78`); the next migration touching `shopping_lists` narrows its UPDATE
  grant to the columns the app writes (`context/deployment/deploy-plan.md:225`).
- **Later slices shape the model:** S-08 restores remembered products (not lists), so products
  need their own user-owned table; S-07 searches products and changes a product's zone, which
  argues for list items referencing `product_id` rather than copying name and zone; S-05 adds
  marks that survive offline, which argues for client-generated item ids.
- **UI plug-in point:** `lists/[id].tsx:121-139` (replace the placeholder with items, an add form
  and a remove action). There is no picker/chip/sheet component for choosing a zone.
- **Open product decisions for the user** are listed at the end (exact-name reuse in S-04 vs
  S-07, duplicates on one list, confirmation on remove, product name rules, lists without a
  store, zone-picker shape).

## Detailed Findings

### Data layer (migrations and `src/lib`)

- Tables and conventions (from the migrations):
  - `shopping_lists`: `user_id default auth.uid()`, `name` 1..80 nullable, four RLS policies
    `(select auth.uid()) = user_id` for `authenticated`, grants s/i/u/d
    (`20261120204123_create_shopping_lists.sql:4-39`). `store_id` nullable with composite FK
    `on delete set null` and a trigger that fills it on insert
    (`20261121120000_create_store_and_zones.sql:184-210`).
  - `stores`: one per user (`unique (user_id)`) and `unique (id, user_id)` as the composite-FK
    target (`20261121120000_create_store_and_zones.sql:14-16`).
  - `zones`: `name` 1..40, unique per store ignoring case via
    `zones_store_id_name_key on (store_id, lower(name))` (`:61-62`), `position` with a deferrable
    unique `(store_id, position)` (`:50-56`), composite FK to `stores(id, user_id)`. In the five
    migration files, `unique (id, user_id)` occurs once, on `stores` (`:16`), so `zones` and
    `shopping_lists` lack the target a composite FK from products/items would need.
  - Hardening: column-level UPDATE grants on `stores(name)` and `zones(name, position)`,
    `btrim(name) = name` checks, `user_id` indexes (`20261121130000_harden_store_and_zones.sql:7-11,106-111`).
  - Default privileges no longer grant to anon/authenticated, but `PUBLIC` still gets execute on
    new functions, so each function needs `revoke execute … from public` (`20261120211932_tighten_default_privileges.sql:4-14`; `CLAUDE.md` Tooling).
  - RPC style: `move_zone` is `security invoker`, `set search_path = ''`, raises `PT404` for a
    missing/invisible row and takes the store lock (`20261121130000_harden_store_and_zones.sql:41-103`).
- Client modules:
  - `src/lib/request.ts`: `RequestResult<T, Extra extends 'duplicate' = never>` with reasons
    `offline | error | Extra` (`:7-9`), `LOAD_TIMEOUT_MS = 5000` (`:17`); `runUnique` maps Postgres
    `23505` to `duplicate` (`:23, :80-90`). A foreign-key violation (`23503`) is not mapped and
    falls through to `error` (inference from the `request.ts` mapping: only `23505` is named).
  - `src/lib/store.ts`: `ZONE_NAME_MAX_LENGTH = 40` (`:7-11`), `*_COLUMNS` + `Pick<Tables<…>>`
    + camelCase mapper + per-module `runStore` (`:34-40`); GETs use `.retry(false)` (`:53`);
    `fetchStore` embeds zones ordered by `position` (`:43-56`).
  - User-facing messages live in screens as `*_MESSAGES` maps keyed by reason
    (`src/app/(app)/store/index.tsx:36-41`).
  - Types are regenerated with `sh scripts/gen-types.sh` (`--remote`, writes
    `src/lib/database.types.ts`); deliberately not an npm script (EAS fingerprint, `CLAUDE.md`).

### UI, hooks and tests

- Plug-in point: `src/app/(app)/(lists)/lists/[id].tsx:121-139` — title and placeholder today;
  header title set at `:119`. `useList` (`:30-59`) loads once per id with a stale-response guard
  and a `missing` state, without a `refresh` that keeps content on screen.
- Patterns to reuse:
  - `useStore` (`src/hooks/use-store.ts:8-63`): `state` union, `store: Store | null`, `reload()`
    (spinner) vs `refresh()` (keeps data), focus reload with stale-response guard. Calling it on
    the list screen gives the zones and refreshes them on return from the Store tab.
  - `AddZoneForm` (`src/app/(app)/store/index.tsx:315-406`): closed by default, stays open after
    an add, field error on empty input, assertive alert on request failure, `submitting` guard,
    refresh on `duplicate` (`:366-371`).
  - Partial-failure layout: full-screen spinner/error only before first data; afterwards an
    inline problem with Retry (`store/index.tsx:67-118`).
  - Delete flow: `confirmDelete` (`src/lib/confirm-delete.ts`) + `lists/[id].tsx:68-89`.
- No store yet: the list screen has no handling. The signal used elsewhere is
  `state === 'ready' && store === null` (`src/app/(app)/store/name.tsx:40`). A link from the lists
  stack to `/store` has not been used before (existing: `app-tabs.web.tsx:25`, `store/name.tsx:29-35`).
  A store with zero zones is a second case (only inline creation possible).
- Missing building blocks: no picker/chip/select/modal/sheet; `Button` stretches full width
  (`src/components/button.tsx`, `alignSelf: 'stretch'`); the row card is still hand-built
  (`store/index.tsx:443-462`, `my-lists-view.tsx:115-125`) until my-lists-ui Phase 3 adds `Card`.
  New text-rendering components go on the `noReactNativeRawText` skip list (`biome.json:26`).
- Tests: `__tests__/*-test.tsx` with `renderRouter`, typed `jest.fn` mocks of `@/lib/*` that also
  re-export constants (`__tests__/store-screen-test.tsx:12-24`), `userEvent`, helpers
  `answerConfirmation` (`__tests__/list-screen-test.tsx:31-35`) and `expectAssertiveAlert`
  (`store-screen-test.tsx:55-68`). `list-screen-test.tsx:46-92` asserts on "No products yet" and
  will need updating; a screen that calls `useStore` needs `@/lib/store` mocked.

### Recorded requirements and decisions (from `context/`)

- Mandatory zone, no unassigned state (`context/foundation/prd.md:162-170`); inline zone appended,
  interactive placement declined (`prd.md:190-200`); no zone suggestions or starter dictionary
  (`prd.md:307-311`); no item ever absent from the list view (`prd.md:84-86`); creating needs a
  connection, only marking is offline (`prd.md:325-329`).
- Products are remembered with their zone "for all later lists" (US-02, `prd.md:101-106`); S-08
  restores remembered products, not lists (`prd.md:127-134`).
- The tension "mandatory zone vs adding takes seconds" is an open user-owned question, revisited
  after S-04 and S-07 are in use (`roadmap.md:232`; `prd.md:358-361`).
- Process: `npx supabase db dump` before any push; `db push --remote --dry-run`, human approval,
  then `--yes`; RLS + explicit grants on every table; `revoke … from public` on every function
  (`CLAUDE.md` Tooling). Rollout by OTA update; no `package.json` script or dependency changes
  (`CLAUDE.md`; `context/deployment/deploy-plan.md`).

## Code References

- `supabase/migrations/20261121120000_create_store_and_zones.sql:14-16, 45-62, 90-114, 184-210` — stores/zones keys, name index, append trigger, list `store_id`
- `supabase/migrations/20261121130000_harden_store_and_zones.sql:7-11, 15-36, 41-103, 106-111` — column grants, hardened trigger, `move_zone`, checks
- `src/lib/request.ts:7-9, 17, 23, 80-90` — result union, timeout, `runUnique`
- `src/lib/store.ts:7-11, 34-56, 99-111` — limits, module shape, `fetchStore`, `addZone`
- `src/hooks/use-store.ts:8-63` — load hook contract
- `src/app/(app)/(lists)/lists/[id].tsx:30-59, 68-89, 119-139` — list load, delete flow, plug-in point
- `src/app/(app)/store/index.tsx:36-41, 67-118, 315-406` — messages, partial-failure layout, AddZoneForm
- `__tests__/list-screen-test.tsx:20-35, 46-92`, `__tests__/store-screen-test.tsx:12-24, 55-68` — test conventions
- `context/foundation/roadmap.md:142, 232` — no-store decision, open tension
- `context/archive/2026-11-21-store-and-zones/plan-brief.md:30-37, 78` — S-04 forward decisions
- `context/deployment/deploy-plan.md:225` — `shopping_lists` UPDATE-grant follow-up

## Architecture Insights

- Ownership pattern: every table carries `user_id default auth.uid()` with the four
  `(select auth.uid()) = user_id` policies; children reference parents through composite FKs on
  `(id, user_id)`. Following it for products/items means adding `unique (id, user_id)` to `zones`
  and `shopping_lists` (inference).
- A data shape consistent with S-05..S-08 (inference, to be decided in the plan):
  `products(id, user_id, zone_id → zones on delete restrict, name, created_at)` unique per user
  on `lower(name)`; `list_items(id client-supplied, user_id, list_id → shopping_lists on delete
  cascade, product_id → products, created_at)`, with mark state added in S-05. Items reference
  products so S-07's zone change re-sorts open lists and S-08 restores products without lists.
- A zone that is in use cannot be deleted once the product FK exists (recorded decision); the zone
  screen (`store/zones/[id].tsx`) then needs a "zone in use" message, because `23503` currently
  surfaces as a generic error.
- "Add product with a new zone" is two writes (zone, then product + item) unless wrapped in one
  RPC; the `move_zone` style (invoker, empty search_path, PT404, store lock) is the template.

## Historical Context (from prior changes)

- `context/archive/2026-11-21-store-and-zones/plan-brief.md:30` — store named on the Store tab;
  S-04 sends the user there (supported; also `roadmap.md:142`).
- `plan-brief.md:31,37` — append trigger built for S-04 to reuse (supported by the migrations).
- `plan-brief.md:33,78` — zone delete allowed until S-04's product FK refuses used zones
  (supported: no FK exists yet, so the guard is still pending).
- `context/archive/2026-11-20-shopping-lists/research.md:86-88` — client-generated UUIDs and
  `updated_at` suggested for queued offline writes (still a suggestion; S-05 decides).
- `context/changes/my-lists-ui/` — in progress on `ui-improvements`; Phases 3–4 add `Card`, a
  `CLAUDE.md` UI rule and a Jest literal scan that the S-04 screen should follow.

## Related Research

- `context/archive/2026-11-21-store-and-zones/research.md`
- `context/archive/2026-11-20-shopping-lists/research.md`
- `context/changes/my-lists-ui/research.md`

## Open Questions

User-owned product decisions (none is answered in `context/`):

1. **Exact-name reuse in S-04.** When the typed name matches a remembered product (ignoring case),
   does S-04 reuse it and skip the zone step, or is all reuse S-07's search? (US-02 says the
   product is "remembered with that zone for all later lists".)
2. **Same product twice on one list** — allowed, refused, or merged?
3. **Quantity or note on an item** — out of scope for the MVP or not?
4. **Product name rules** — length limit, trimming, uniqueness per user ignoring case.
5. **Remove a product** — confirm first, undo, or remove immediately?
6. **Lists with `store_id` null** (created before the store existed) — attach to the store on
   first add, or block adding?
7. **Zone choice UI** — inline on the list screen (chips/list) or a separate screen/sheet.

Sequencing: whether S-04 starts before or after my-lists-ui Phases 3–4 merge (they add `Card` and
the UI rule the new list screen should use).
