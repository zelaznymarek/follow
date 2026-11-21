---
date: 2026-11-21T11:28:49+01:00
researcher: Claude (Opus 5.5) for Marek Żelazny
git_commit: c3e33e5367e7a854b86d7a8600ff7ef8034b5e4a
branch: feat/store-and-zones
repository: follow
topic: "What S-03 store-and-zones builds on: existing data/UI patterns, prior decisions, and open choices"
tags: [research, codebase, supabase, migrations, store, zones, route-order, expo-router, tabs]
status: complete
last_updated: 2026-11-21
last_updated_by: Claude (Opus 5.5)
---

# Research: What S-03 store-and-zones builds on

**Date**: 2026-11-21T11:28:49+01:00
**Researcher**: Claude (Opus 5.5) for Marek Żelazny
**Git Commit**: c3e33e5367e7a854b86d7a8600ff7ef8034b5e4a
**Branch**: feat/store-and-zones
**Repository**: follow

## Research Question

For roadmap slice S-03 `store-and-zones` (FR-006 name a store, FR-007 define its zones, FR-008 set and
change the zone order in a view showing zone names only — `context/foundation/roadmap.md:133-144`):
which existing code patterns, conventions and prior decisions should the plan build on, and which
product/design choices are still open?

## Summary

- **Nothing store/zone-related exists yet.** A case-insensitive search of `*.ts, *.tsx, *.sql, *.sh,
  *.toml, *.json` (excluding node_modules, .git, ios, android, dist) for store(s), zone(s), position,
  sort_order, rank and ordinal found no table, column, type or module; the S-02 plan explicitly
  deferred stores, zones and `store_id` on lists (`context/archive/2026-11-20-shopping-lists/plan.md:82`).
- **S-02 is the template to copy**, end to end: one migration with RLS + four owner policies +
  explicit grants (`supabase/migrations/20261120204123_create_shopping_lists.sql:4-39`), a data module
  returning `ok | offline | error` that never throws (`src/lib/shopping-lists.ts:8,42-64`), a
  focus-reloading `useState` hook (`src/hooks/use-shopping-lists.ts:15-49`), and screens in an
  expo-router Stack group (`src/app/(app)/(lists)/_layout.tsx`).
- **Product scope is settled:** one store (`context/foundation/prd.md:316-321`), a store is only an
  ordered list of zone names (`prd.md:303-306`), reordering with up/down controls, not drag-and-drop
  (`context/foundation/shape-notes.md:218`), data must live in the account so S-08 can restore it
  (`prd.md:127-134`, `roadmap.md:205`), and creating stores or zones needs connectivity
  (`prd.md:325-329`).
- **Not decided anywhere in `context/`:** when the store gets named, zone uniqueness/rename/delete,
  store rename/delete, how order is stored, user-level vs per-store zones, `store_id` on lists, and
  where the screen lives in navigation. These are listed under Open Questions for `/10x-plan`.

## Detailed Findings

### Database pattern (S-02)

- Table shape in `20261120204123_create_shopping_lists.sql:4-9`: `id uuid pk default gen_random_uuid()`,
  `user_id uuid not null default auth.uid() references auth.users (id) on delete cascade`, a checked
  `name` (`char_length between 1 and 80`), `created_at`. The client never sends `user_id`; the default
  and RLS scope every row. No `updated_at`, trigger or position column exists on this table.
- RLS enabled (`:16`), four policies `to authenticated` using `(select auth.uid()) = user_id` (`:18-37`),
  `grant select, insert, update, delete … to authenticated` (`:39`).
- Default privileges were tightened project-wide
  (`supabase/migrations/20261120211932_tighten_default_privileges.sql:7-14`), so a new table gets no
  grants until a migration adds them; S-02 also granted `all` to `service_role` and revoked
  `truncate, references, trigger` from `authenticated` (`:17-18`). New functions still need
  `revoke execute … from public` (`:4-5`; `CLAUDE.md` Tooling rules).
- An earlier migration had to revoke anon explicitly (`20261120205749_revoke_anon_shopping_lists.sql:5`);
  the S-02 rollout verified with REST checks that anonymous GET returns 401 (reported from
  `context/deployment/deploy-plan.md:169-183`, not re-read).
- The `ping()` RPC (`20261120204123_create_shopping_lists.sql:42-53`) is the only function; the
  keep-alive workflow (`.github/workflows/supabase-keep-alive.yml`) already covers the project, so S-03
  needs no new keep-alive.
- `supabase/config.toml`: `[db.seed] enabled = false` and no `seed.sql` exists (data-layer worker
  inspection; `config.toml:73,76`).

### Data access and screen state (S-02)

- `src/lib/supabase.ts:20-39` exports `getSupabase()`; the web variant creates the client lazily and
  throws during SSR (`src/lib/supabase.web.ts:14-41`), so it is called only inside functions.
- `src/lib/shopping-lists.ts`:
  - result type `ListsResult<T>` (`:8`), domain mapping from snake_case (`:17-19`);
  - `run()` races each query against `LOAD_TIMEOUT_MS = 5000` (`:27,42-64`); a timeout or
    `status === 0` → `offline`, `response.error` or a throw → `error` with `console.warn` (`:50-60`);
  - reads call `.retry(false)`; the module exports `fetchLists`, `fetchList`, `createList` and
    `deleteList` and no update function (worker's read of `:67-107`).
- `src/hooks/use-shopping-lists.ts:15-49` — states `loading | ready | offline | error`, loads in
  `useFocusEffect`, discards stale responses with a `latestRequest` ref, `useCallback` justified by a
  correctness comment (`:20-21`). No react-query, data context, cache or optimistic updates exist in
  `src/` (worker inspection of `src/lib`, `src/hooks`, `src/providers`).
- Mutations are awaited behind a `submitting`/`deleting` flag, then branch on `result.ok`
  (`src/app/(app)/(lists)/lists/new.tsx:25-41`, `lists/[id].tsx:86-107`).
- Offline storage: `expo-sqlite` is used only as the auth-session `localStorage` (`src/lib/supabase.ts:1,22`);
  no app data is cached on the device.

### UI building blocks

- Routes: root `Stack.Protected` gates `(app)` behind sign-in (`src/app/_layout.tsx:45-53`), so any route
  under `src/app/(app)/` is gated without extra code. `(lists)` is a Stack group with
  `unstable_settings = { anchor: 'index' }` (`src/app/(app)/(lists)/_layout.tsx:5`); `account.tsx` is a
  flat tab screen without a Stack header.
- Tabs: native `NativeTabs.Trigger name="(lists)"` / `name="account"` with a PNG template icon
  (`src/components/app-tabs.tsx:15-29`); web `TabTrigger name/href` text buttons
  (`src/components/app-tabs.web.tsx:22-27`). Only `home` and `account` icons exist in
  `assets/images/tabIcons/`, so a third tab needs a new icon asset.
- Components: `Button` has a single filled style and no `accessibilityLabel` prop
  (`src/components/button.tsx:7-37`); `TextField` uses its `label` as the accessibility label and shows
  an `error` line (`src/components/text-field.tsx:7-50`). No icon/icon-button component, and no
  `@expo/vector-icons`/`expo-symbols` usage in `src/`.
- No up/down reorder UI or move helper exists (worker search of `src/`, `__tests__/`, `supabase/` for
  moveItem, moveUp, moveDown, reorder, arrayMove, chevron, sort_order, swap).
- States: loading = centred `ActivityIndicator` with an accessibility label; load failure = `ThemedText`
  with `accessibilityRole="alert"`, `accessibilityLiveRegion="polite"` + Retry
  (`src/app/(app)/(lists)/index.tsx:27-49`); action failure uses `"assertive"`
  (`lists/new.tsx:56-63`). Messages live in a per-screen `MESSAGES` map.
- Delete confirmation `confirmDelete()` — `window.confirm` on web, `Alert.alert` with a destructive
  button on native — is local to `src/app/(app)/(lists)/lists/[id].tsx:29-45`, not shared.
- Biome `noReactNativeRawText.skip` is `["ThemedText", "TabButton", "NativeTabs.Trigger.Label"]`
  (`biome.json:26`); any new text-rendering component must be added.

### Tests

- Screen tests mock the lib module with typed `jest.fn`s forwarded through closures
  (`__tests__/lists-screen-test.tsx:9-13`) and render with `renderRouter` from
  `expo-router/testing-library` and an inline route map (`:28-35`).
- The lib test fakes a chainable PostgREST builder whose recorded methods are `select, insert, delete,
  eq, order, single, maybeSingle, retry` (`__tests__/shopping-lists-test.ts:12-27`); a module that calls
  `update`, `upsert` or `rpc` needs those added to the fake.
- Order is asserted by mapping `findAllByText(regex)` children (`__tests__/lists-screen-test.tsx:46-48`),
  which fits checking zone order after up/down presses. `Alert.alert` is driven via
  `jest.spyOn(Alert, 'alert').mockImplementationOnce` (`__tests__/list-screen-test.tsx:31-35`). testIDs
  are not used; queries go by role, text and label. Up/down buttons per zone therefore need unique
  accessible names (e.g. "Move Dairy up"), which `Button` cannot express today.

### Product constraints that bind S-03

- One store in the MVP; multi-store and per-store overrides are v2 (`prd.md:316-321`, Open Questions
  1-2 at `prd.md:341-347`, non-blocking per `roadmap.md:229-230`).
- "A store is only an ordered list of zone names"; no layout editor (`prd.md:303-306`).
- Zones belong to the user and a store is an ordering of them — the stated architecture claim
  (`prd.md:318-320`, `shape-notes.md:84-86`), versus FR-007/FR-008 wording "zones for the store" /
  "the store's zones" (`prd.md:149-150`). With one store the two models behave identically.
- Only reordering exists — no separate "establish the order" step (FR-009 merged into FR-008,
  `prd.md:152-158`); zones arise ad hoc while adding products, so ordering happens afterwards.
- FR-024 (S-04) appends inline-created zones to the end of the route (`prd.md:190-200`); S-03's order
  representation must make that append cheap (`roadmap.md:143`).
- No item is ever lost, "not through having no zone" (`prd.md:84-86`), and no item is absent from the
  list view "whatever its zone" (`prd.md:229-230`). Deleting a zone that products use would violate
  this once S-04 exists.
- Offline: creating lists, zones or stores requires connectivity (`prd.md:325-329`); the offline-read
  NFR names open lists only (`prd.md:222-223`). Backend-unreachable must read as offline, not error
  (`context/foundation/infrastructure.md:97`, as reported by the worker).
- FR-025 / S-08: store, zones and order must come back on a new device (`prd.md:127-134`); any
  on-device copy must not become their source of truth (`roadmap.md:205`). Supabase was chosen because
  zones, route order and assignments are relational (`context/foundation/tech-stack.md:34-38`).
- The list-open < 1 s NFR belongs to S-06 (`prd.md:224-225`, `roadmap.md:173`), so zone order should be
  cheap to fetch alongside a list later; zone counts are small (handful of users, `prd.md:8-11`).

## Code References

- `supabase/migrations/20261120204123_create_shopping_lists.sql:4-53` — table, RLS, grants, `ping()`
- `supabase/migrations/20261120211932_tighten_default_privileges.sql:4-18` — default privileges, service_role grant
- `src/lib/shopping-lists.ts:6-64` — domain type, result type, timeout, `run()` error mapping
- `src/hooks/use-shopping-lists.ts:15-49` — focus reload + stale-response guard
- `src/app/(app)/(lists)/_layout.tsx:5` — Stack group with `anchor: 'index'`
- `src/app/(app)/(lists)/lists/[id].tsx:29-45,86-107` — confirm dialog and guarded delete
- `src/app/(app)/(lists)/lists/new.tsx:25-63` — guarded create, action-error alert
- `src/components/app-tabs.tsx:15-29`, `src/components/app-tabs.web.tsx:22-27` — tab declarations
- `src/components/button.tsx:7-37`, `src/components/text-field.tsx:7-50` — form building blocks
- `biome.json:26` — raw-text skip list
- `__tests__/shopping-lists-test.ts:12-27` — fake PostgREST builder (method list to extend)
- `__tests__/lists-screen-test.tsx:9-48`, `__tests__/list-screen-test.tsx:31-35` — screen test patterns
- `scripts/gen-types.sh:8-10` — type regeneration (not an npm script, by design)

## Architecture Insights

- Ownership by `user_id default auth.uid()` + RLS means the client never handles user ids; a `stores` or
  `zones` table can follow the same shape. Child tables (e.g. zones under a store) would need RLS that
  either repeats `user_id` or checks ownership through the parent — S-02 has no precedent for a child
  table.
- Reordering is the first multi-row write in the app. With PostgREST a reorder is either several
  `update` calls (not atomic) or one RPC (atomic; needs `revoke execute … from public` + explicit grant
  and a builder fake for `rpc` in tests). Integer positions with an "append = max + 1" rule fit FR-024;
  fractional ranks avoid renumbering but are not discussed in any doc. This is a design choice for the
  plan, not an established fact.
- `Button` lacks an accessible-name override and an icon style; per-row up/down controls need either a
  new prop or a new component (biome skip list applies if it renders text).
- Expo-router: two groups cannot both own `index` at `/`, so a store tab group would need a named path
  (e.g. `(store)/store.tsx`); whether a non-index group works cleanly as a `NativeTabs.Trigger name` was
  not verified.

## Historical Context (from prior changes)

- `context/archive/2026-11-20-shopping-lists/plan.md:82` — stores, zones and `store_id` deferred to S-03/S-04 (supported).
- `context/archive/2026-11-20-shopping-lists/research.md:84-90,217` — `store_id` on lists left open; client-generated UUIDs and `updated_at` suggested for S-05; `user_id` ownership sufficient, no `household_id` (supported; still open).
- `context/archive/2026-11-20-shopping-lists/plan.md:89-97` — phase order: DB + types verified over REST before UI, then data module and screens, then rollout (reported by worker).
- `context/archive/2026-11-20-shopping-lists/reviews/impl-review-phase-2.md:44-76` — findings F1-F5 that became conventions: offline mapping, `.retry(false)`, alert live regions, `anchor: 'index'`, justified `useCallback` (reported by worker).
- `context/archive/2026-11-20-shopping-lists/follow-ups/review-fixes.md:5-14` — items queued for the next native build and for S-05 (keep showing data when an offline refresh fails); not S-03 work unless S-03 needs a build (reported by worker).
- `context/deployment/deploy-plan.md:168-191` — the user runs `db dump`, dry-run and `db push --remote` (they hang in the agent sandbox); npm-script changes alter the EAS fingerprint (reported by worker; aligns with `CLAUDE.md` Tooling rules).
- `shape-notes.md:188-191` — original sketch: store selector on list creation, "first run: create the store — name, optionally zones, optionally their order", store auto-selected on a new list. Partly superseded by the FR-008 reasoning that zones arise ad hoc (`prd.md:152-155`).

## Related Research

- `context/archive/2026-11-20-shopping-lists/research.md`
- No `context/foundation/lessons.md` or `docs/reference/contract-surfaces.md` exists at this commit.

## Open Questions

Product choices for the user (none is answered in `context/`):

1. **When is the store named?** Up front from a store screen, or on first need of a zone (S-04)? (`roadmap.md:142`, non-blocking.)
2. **Can S-03 add zones from the store screen** (FR-007), or do zones arrive only inline in S-04 — which would leave S-03's ordering view empty until S-04 ships?
3. **Zone names:** uniqueness (case-insensitive?), length limit, trimming; rename allowed?
4. **Zone delete:** allowed? If so, what happens to products assigned to it once S-04 exists (the no-lost-item rule, `prd.md:84-86`)?
5. **Store rename / delete** — needed in the MVP?
6. **Navigation:** a new third tab (needs an icon), an entry under Account, or a screen reached from the Lists tab?

Design choices for `/10x-plan`:

7. User-level `zones` + per-store order vs zones owned by the store with a `position` column (`prd.md:318-320` vs `:149-150`).
8. Order storage (integer positions vs fractional rank) and whether reorder is an atomic RPC or per-row updates.
9. `store_id` on `shopping_lists` now or in S-04 (`context/archive/2026-11-20-shopping-lists/research.md:217`).
10. Whether to add `updated_at` / client-generated ids now to ease S-05/S-08.
11. Whether the store/zones screen shows anything offline (no requirement says it must; `prd.md:222-223`).

Documentation drift noticed (not S-03 scope): `CLAUDE.md` still calls Supabase "planned, not yet
added"; `roadmap.md:143` cites "Forward: tech-stack" for up/down controls but the source is
`shape-notes.md:218`.
