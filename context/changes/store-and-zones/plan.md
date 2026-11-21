# Store and zones Implementation Plan

## Overview

Roadmap slice S-03 (FR-006, FR-007, FR-008): the signed-in user names their one store, adds zones to
it, renames or deletes them, and changes the route order with up/down controls on a new Store tab
that shows zone names only. Lists start recording their store. The data lives in the Supabase
account so S-04 can append inline-created zones to this route (FR-024) and S-08 can restore it on a
new device (FR-025). Ships over OTA like S-02.

## Current State Analysis

- No store, zone or ordering code exists; S-02 deferred stores, zones and `store_id` on lists
  (`context/archive/2026-11-20-shopping-lists/plan.md:82`; research summary).
- S-02 is the template:
  - migration with `user_id default auth.uid()`, RLS with four owner policies, explicit grants
    (`supabase/migrations/20261120204123_create_shopping_lists.sql:4-39`); project default privileges no
    longer grant to `anon`/`authenticated`, but new functions still need `revoke execute … from public`
    (`supabase/migrations/20261120211932_tighten_default_privileges.sql:4-18`);
  - data module returning `ok | offline | error`, never throwing, with a 5 s deadline
    (`src/lib/shopping-lists.ts:8,27,42-64`) — `run()` is private to that module today;
  - focus-reloading hook with a stale-response guard (`src/hooks/use-shopping-lists.ts:15-49`);
  - Stack screens with `anchor: 'index'` (`src/app/(app)/(lists)/_layout.tsx:5`), guarded submits, a
    local `confirmDelete()` (`src/app/(app)/(lists)/lists/[id].tsx:29-45`).
- `Button` has no `accessibilityLabel` prop (`src/components/button.tsx:7-37`), so per-row up/down
  buttons cannot get distinct accessible names. Tab icons are 24/48/72 px template PNGs
  (`assets/images/tabIcons/`), only `home` and `account` exist.
- The lib test's fake PostgREST builder records `select, insert, delete, eq, order, single,
  maybeSingle, retry` and `getSupabase` returns only `from` (`__tests__/shopping-lists-test.ts:12-34`).
- Hosted Postgres is 17 (`supabase/config.toml:45`). The installed APK runs runtime
  `7c659defc2f12bd944574fbecaffd57cb2956734` (`context/deployment/deploy-plan.md`, S-02 OTA rows).

## Desired End State

On the Pixel 5 (via OTA) and on web, a signed-in user opens the **Store** tab:

- With no store: a "Name your store" form. Saving creates the store.
- With a store: the store name (renamable on a separate screen), the zones in route order with ↑/↓
  buttons (↑ disabled on the first, ↓ on the last), and an "Add zone" field that appends to the end.
- Tapping a zone opens a screen to rename or delete it (delete after confirmation).
- A zone name that matches an existing one ignoring case is refused with a field message.
- Order, names and the store survive app restarts and appear for the same account on another device.
- Lists created after the store exists carry its `store_id`; earlier lists keep `null`.
- Offline, the Store tab shows the offline message with Retry; changes show an offline message.

### Key Discoveries:

- `run()` + `LOAD_TIMEOUT_MS` in `src/lib/shopping-lists.ts:27-64` hold the offline/error contract the
  phase-2 review established (`context/archive/2026-11-20-shopping-lists/reviews/impl-review-phase-2.md`).
- Two route groups cannot both own `index` at `/`; a plain `src/app/(app)/store/` folder gives the route
  name `store` used by `NativeTabs.Trigger name` (same style as `account`).
- postgrest-js supports ordering an embedded resource with `order(col, { referencedTable })`
  (`node_modules/@supabase/postgrest-js/dist/index.d.mts:356`).
- Postgres checks a non-deferrable unique constraint row by row, so a two-row position swap in one
  `UPDATE` needs the constraint `deferrable` (checked at statement end).

## What We're NOT Doing

- Multiple stores, a store selector, store deletion, per-store assignment overrides (PRD §Non-Goals,
  Open Questions 1–2).
- User-level zones with a per-store order table — zones belong to the store (decision); multi-store later
  migrates.
- Products, inline zone creation and the product → zone foreign key (S-04). The "cannot delete a used
  zone" guard arrives with that FK; in S-03 every zone is deletable.
- Drag-and-drop reordering (`shape-notes.md:218`).
- Backfilling `store_id` on lists created before the store; showing the store anywhere on list screens.
- Offline caching of the store or zones (no requirement; `prd.md:222-223,325-329`).
- `updated_at` columns, dependency changes, npm-script changes, the queued native-build follow-ups.

## Implementation Approach

Database first, verified over REST before any client code (S-02 order). The database owns the rules
that must hold under concurrency: one store per user, case-insensitive unique zone names, append-to-end
positions (a trigger, so S-04's inline create reuses it), atomic up/down swaps (an RPC), and filling
`store_id` on new lists (a trigger, so `createList` is untouched). Then a shared request wrapper and a
store data module + hook, then the Store tab and its three screens, then OTA rollout.

## Critical Implementation Details

- **Position concurrency.** The append trigger and `move_zone` both lock the parent store row
  (`select … for update`) before reading positions, so two adds or moves never compute the same
  position. Without the lock a concurrent add would raise 23505 on the position constraint and the
  client would misreport it as a duplicate name.
- **Swap ordering.** `unique (store_id, position)` must be `deferrable initially immediate`; the swap is
  one `UPDATE … SET position = CASE …` over both rows.
- **Defaults before triggers.** Column defaults (`user_id = auth.uid()`) are applied before `BEFORE
  INSERT` triggers fire, so the list trigger can read `new.user_id`.

## Phase 1: Database and types

### Overview

One migration adds `stores`, `zones`, the append trigger, `move_zone`, and `shopping_lists.store_id`
with its fill trigger. The user backs up, reviews the dry run and pushes; types are regenerated and
REST checks confirm nothing is exposed to `anon`.

### Changes Required:

#### 1. Migration

**File**: `supabase/migrations/<timestamp>_create_store_and_zones.sql` (timestamp from `npx supabase migration new create_store_and_zones`)

**Intent**: Model one store per user with ordered, uniquely named zones, enforce the ordering rules in
the database, and link new lists to the store.

**Contract**:
- `public.stores`: `id uuid pk default gen_random_uuid()`, `user_id uuid not null default auth.uid()
  references auth.users (id) on delete cascade`, `name text not null check (char_length(name) between 1
  and 80)`, `created_at timestamptz not null default now()`; `unique (user_id)` (one store per user);
  `unique (id, user_id)` (target for composite FKs). RLS on; owner policies for select, insert, update
  (no delete policy, no delete grant). `grant select, insert, update on public.stores to authenticated;
  grant all … to service_role`.
- `public.zones`: `id uuid pk default gen_random_uuid()`, `store_id uuid not null`, `user_id uuid not
  null default auth.uid() references auth.users (id) on delete cascade`, `name text not null check
  (char_length(name) between 1 and 40)`, `position integer not null`, `created_at timestamptz not null
  default now()`; `foreign key (store_id, user_id) references public.stores (id, user_id) on delete
  cascade`; `constraint zones_store_id_position_key unique (store_id, position) deferrable initially
  immediate`; `create unique index zones_store_id_name_key on public.zones (store_id, lower(name))`.
  RLS on; four owner policies; `grant select, insert, update, delete … to authenticated; grant all … to
  service_role`.
- Trigger `zones_set_position` (`before insert` on `zones`), function `public.zones_set_position()`
  `returns trigger language plpgsql security invoker set search_path = ''`: locks the store row, sets
  `new.position := coalesce(max(position), 0) + 1` for `new.store_id`, ignoring any supplied value.
- `public.move_zone(p_zone_id uuid, p_direction text) returns void language plpgsql security invoker set
  search_path = ''`: rejects a direction other than `'up'`/`'down'` (raise); reads the zone under RLS
  (raise `no_data_found` if not visible); locks its store row; finds the neighbour with the next lower
  (`up`) or higher (`down`) position in the same store; no neighbour → return without change; otherwise
  swaps both positions in one `UPDATE`.
- `alter table public.shopping_lists add column store_id uuid null`, `foreign key (store_id, user_id)
  references public.stores (id, user_id) on delete set null (store_id)`.
- Trigger `shopping_lists_set_store` (`before insert` on `shopping_lists`), function
  `public.shopping_lists_set_store()` (same function attributes): when `new.store_id` is null, sets it
  to the id of the store whose `user_id = new.user_id` (stays null if none).
- Every new function: `revoke execute on function … from public`. `move_zone` additionally `grant
  execute … to authenticated`. Trigger functions get no grant (execute is checked at trigger creation,
  not when it fires).
- `comment on table` for both tables, citing roadmap S-03.

#### 2. Generated types

**File**: `src/lib/database.types.ts`

**Intent**: Pick up `stores`, `zones`, `shopping_lists.store_id` and `Functions.move_zone`.

**Contract**: regenerated with `sh scripts/gen-types.sh` after the push; never hand-edited.

#### 3. Push (user)

**File**: hosted Supabase project

**Intent**: Apply the migration with a backup and an approved dry run (`CLAUDE.md` Tooling).

**Contract**: the user runs `npx supabase db dump --remote -f ~/follow-backups/2026-11-21-pre-s03-schema.sql`,
then `npx supabase db push --remote --dry-run` (shows exactly the new migration), then, after
approval, `npx supabase db push --remote --yes` and `npx supabase migration list --remote`. These hang
in the agent sandbox (`context/deployment/deploy-plan.md`, S-02 deviations).

### Success Criteria:

#### Automated Verification:

- `npx supabase db push --remote --dry-run` output lists only the new `create_store_and_zones` migration (run by the user, output pasted)
- `sh scripts/gen-types.sh` succeeds and `src/lib/database.types.ts` contains `stores`, `zones`, `store_id` on `shopping_lists` and `move_zone`
- Anonymous REST checks with the publishable key: `GET /rest/v1/stores` and `GET /rest/v1/zones` return 401, and `POST /rest/v1/rpc/move_zone` is refused
- `/verify` passes (Biome, `npx tsc --noEmit`, `npm test`)

#### Manual Verification:

- The user confirms the backup file exists in `~/follow-backups/` and the push succeeded (`migration list --remote` shows the migration on remote)
- SQL editor grants query shows `authenticated` and `service_role` on `stores` and `zones`, and no `anon` — query: `select table_name, grantee, privilege_type from information_schema.role_table_grants where table_name in ('stores','zones')`; expected `authenticated` stores SELECT/INSERT/UPDATE, zones SELECT/INSERT/UPDATE/DELETE

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Data layer

### Overview

Move the request wrapper into a shared module, add the store data module and the `use-store` hook,
all covered by unit tests.

### Changes Required:

#### 1. Shared request wrapper

**File**: `src/lib/request.ts` (new), `src/lib/shopping-lists.ts`

**Intent**: Let the store module reuse the exact offline/error contract S-02 settled, and add the
duplicate-name outcome.

**Contract**:
- `export type RequestResult<T> = { ok: true; data: T } | { ok: false; reason: 'offline' | 'error' | 'duplicate' }`.
- `export const LOAD_TIMEOUT_MS = 5000`; `export async function run<T, U>(tag: string, action: string, query, map): Promise<RequestResult<U>>` — behaviour identical to today's `run()` (deadline or `status === 0` → `offline`; `response.error` or a throw → `error` with `console.warn('[<tag>] <action> failed', …)`), plus `response.error.code === '23505'` → `duplicate` without a warning.
- `shopping-lists.ts` imports from `request.ts`; `ListsResult<T>` stays exported as an alias of `RequestResult<T>` and `LOAD_TIMEOUT_MS` stays importable from `@/lib/shopping-lists` (re-export), so S-02 screens and tests compile unchanged and the `[shopping-lists]` log tag is kept.

#### 2. Store data module

**File**: `src/lib/store.ts` (new)

**Intent**: All reads and writes for the store and its zones, mapped to camelCase domain types.

**Contract**:
- Types: `Zone = { id: string; name: string; position: number }`, `Store = { id: string; name: string; zones: Zone[] }`, `MoveDirection = 'up' | 'down'`.
- `fetchStore(): Promise<RequestResult<Store | null>>` — one query `stores.select('id, name, zones(id, name, position)')`, zones ordered by `position` via `referencedTable: 'zones'`, `.maybeSingle().retry(false)`; `null` when the user has no store.
- `fetchZone(id): Promise<RequestResult<Zone | null>>` — `maybeSingle().retry(false)`.
- `createStore(name)`, `renameStore(id, name)` → `RequestResult<{ id; name }>`; `addZone(storeId, name)`, `renameZone(id, name)` → `RequestResult<Zone>`; `deleteZone(id)` → `RequestResult<void>`; `moveZone(id, direction)` → `RequestResult<void>` via `getSupabase().rpc('move_zone', { p_zone_id, p_direction })`.
- Names are trimmed before sending; callers never pass an empty name (screens validate). Inserts never send `user_id` or `position`.

#### 3. Store hook

**File**: `src/hooks/use-store.ts` (new)

**Intent**: Screen state for the Store tab, following `use-shopping-lists.ts`.

**Contract**: returns `{ state: 'loading' | 'ready' | 'offline' | 'error', store: Store | null, reload(), refresh() }`; loads in `useFocusEffect`, discards stale responses with a `latestRequest` ref; `reload()` shows the spinner, `refresh()` keeps the current data visible while refetching (used after a successful change). `useCallback` only where needed for correctness, with the explaining comment.

#### 4. Tests

**File**: `__tests__/request-test.ts`, `__tests__/store-test.ts`, `__tests__/use-store-test.tsx` (new); `__tests__/shopping-lists-test.ts` unchanged in behaviour

**Intent**: Cover the shared mapping and every store function.

**Contract**:
- `request-test`: ok mapping, `status: 0` → offline, deadline → offline (fake timers), error → error with warning, thrown → error, `23505` → duplicate without warning.
- `store-test` (fake builder extended with `update` and a top-level `rpc` mock): `fetchStore` selects the embedded zones with `referencedTable: 'zones'` ordering and returns `null` for no row; trimming; insert payloads contain no `user_id`/`position`; `moveZone` calls `rpc('move_zone', { p_zone_id, p_direction })`; duplicate and offline mapping on `addZone` and `renameZone`.
- `use-store-test`: loading → ready, `refresh()` keeps `store` visible, stale response discarded.

### Success Criteria:

#### Automated Verification:

- `/verify` passes (Biome, `npx tsc --noEmit`, `npm test`)
- `npx jest request store shopping-lists` passes, including the duplicate, offline and `move_zone` cases
- `git diff main -- package.json` shows no changes

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Store tab and screens

### Overview

Add the Store tab on both platforms and its three screens, with the small component changes they need.

### Changes Required:

#### 1. Tabs and icon

**File**: `src/components/app-tabs.tsx`, `src/components/app-tabs.web.tsx`, `assets/images/tabIcons/store.png`, `store@2x.png`, `store@3x.png`

**Intent**: A third tab "Store" between Lists and Account (`CLAUDE.md`: tabs are added to both files).

**Contract**: native `NativeTabs.Trigger name="store"` with label "Store" and `Icon src={require('@/assets/images/tabIcons/store.png')} renderingMode="template"`; web `TabTrigger name="store" href="/store"` with `TabButton` "Store". Icons are a simple storefront pictogram, 24/48/72 px, opaque black on transparent like `home.png`, generated by a throwaway script outside the repo (if no PNG can be produced, ask the user for one rather than adding a dependency).

#### 2. Store routes

**File**: `src/app/(app)/store/_layout.tsx`, `index.tsx`, `name.tsx`, `zones/[id].tsx` (new)

**Intent**: The store screen, the store-rename screen and the zone screen.

**Contract**:
- `_layout.tsx`: `Stack` with `unstable_settings = { anchor: 'index' }`; titles "Store", "Store name", and "" for `zones/[id]` (set from the zone name via `Stack.Screen options`, like `lists/[id].tsx:135`).
- `index.tsx` (`/store`), using `useStore()`:
  - loading / offline / error states as in `(lists)/index.tsx:27-49` (Retry calls `reload()`);
  - no store → `TextField` "Store name" (maxLength 80) + "Save"; empty after trim → field error; success → `refresh()`; `duplicate` (store created elsewhere) → message and `refresh()`;
  - store → store name heading with a "Rename store" link to `/store/name`; zones in `position` order, each row: the name (link to `/store/zones/[id]`), `↑` and `↓` buttons with `accessibilityLabel` "Move <name> up/down", `↑` disabled on the first row and `↓` on the last; while a move is in flight every move button is disabled; success → `refresh()`; failure → assertive alert message from a `MESSAGES` map;
  - no zones → "No zones yet";
  - `TextField` "New zone" (maxLength 40) + "Add zone": empty → field error; `duplicate` → field error "A zone with this name already exists"; success → clear field and `refresh()`.
- `name.tsx` (`/store/name`): loads the store, `TextField` "Store name" prefilled, "Save" → `renameStore` → `router.back()` (or `router.replace('/store')` when it cannot go back); offline/error messages; no store → `router.replace('/store')`.
- `zones/[id].tsx`: loads with `fetchZone`; states loading/ready/missing/offline/error like `lists/[id].tsx:48-131`; `TextField` "Zone name" prefilled + "Save" (`duplicate` → field error); "Delete zone" → shared confirm → `deleteZone` → back. All submits guarded by a flag, as in `lists/new.tsx:25-41`.

#### 3. Shared components

**File**: `src/components/button.tsx`, `src/lib/confirm-delete.ts` (new), `src/app/(app)/(lists)/lists/[id].tsx`

**Intent**: Give icon-like buttons an accessible name and reuse the delete confirmation.

**Contract**:
- `ButtonProps.accessibilityLabel?: string`, passed to the `Pressable`; when absent the title stays the accessible name (existing tests unchanged).
- `confirmDelete({ title, message }): Promise<boolean>` moved from `lists/[id].tsx:29-45` unchanged in behaviour (`window.confirm` on web, `Alert.alert` with Cancel / destructive Delete on native); `lists/[id].tsx` imports it.
- No new component renders text children, so `biome.json` is unchanged; if one is added, add it to the `noReactNativeRawText` skip list.

#### 4. Tests

**File**: `__tests__/store-screen-test.tsx`, `__tests__/store-name-screen-test.tsx`, `__tests__/zone-screen-test.tsx` (new); `__tests__/root-layout-test.tsx` (mock `@/lib/store` if the real tree loads it)

**Intent**: Screen behaviour with the data module mocked, following `lists-screen-test.tsx` and `list-screen-test.tsx`.

**Contract**:
- Store screen: no store → create flow; zones listed in position order; `↑` on the first and `↓` on the last disabled; pressing "Move Bakery up" calls `moveZone(id, 'up')` and the refreshed order is shown; buttons disabled while a move is pending; add zone empty / duplicate / success; offline state with Retry.
- Name screen: prefilled, save navigates back, offline message.
- Zone screen: rename duplicate shows the field error; delete only after confirming (Alert spy), Cancel keeps the zone; missing zone state.

### Success Criteria:

#### Automated Verification:

- `/verify` passes (Biome, `npx tsc --noEmit` with typed routes regenerated, `npm test`)
- `npx jest store-screen store-name-screen zone-screen list-screen root-layout` passes
- `git diff main -- package.json biome.json` shows no changes

#### Manual Verification:

- Web flow: name store, add zones, reorder, reload keeps order, duplicate refused, rename, delete with Cancel and confirm, rename store — dev server: name the store → add Dairy, Bakery, Produce → move Produce up twice → reload, order kept → add "dairy" refused → rename Bakery → delete a zone with Cancel, then confirm → rename the store
- Emulator flow: same, tab bar and Store header visible, icon tinted in light and dark mode
- A list created after the store has `store_id` set; an earlier list stays `null` (checked in the SQL editor)
- A second account sees no store and gets the "Name your store" form

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 4: Rollout

### Overview

Ship to the installed APK over OTA and record the rollout and the resolved roadmap unknown.

### Changes Required:

#### 1. OTA update (agent)

**File**: EAS (remote)

**Intent**: Deliver S-03 without a new build.

**Contract**: `eas update --branch preview --message "S-03 store and zones" --environment preview --platform android --non-interactive`. The reported runtime must equal `7c659defc2f12bd944574fbecaffd57cb2956734`; if it differs, stop — a native or fingerprint change slipped in.

#### 2. Recorded decisions

**File**: `context/deployment/deploy-plan.md`, `context/foundation/roadmap.md`

**Intent**: Record the migration and rollout, and resolve the S-03 unknown.

**Contract**:
- Deploy plan: an "S-03 `store-and-zones`" subsection with the backup path, migration name and contents, REST checks, generated types, the OTA group, branch, runtime, and the device checks.
- Roadmap S-03 Unknowns line (`roadmap.md:142`): append "Resolved in S-03 (2026-11-21): the store is named explicitly on the Store tab; S-04 sends the user there when no store exists." Status fields are left to the lifecycle skills.

### Success Criteria:

#### Automated Verification:

- `/verify` passes
- `git diff main -- package.json` shows no changes
- `eas update` publishes to branch `preview` with runtime `7c659defc2f12bd944574fbecaffd57cb2956734`
- `context/deployment/deploy-plan.md` and `context/foundation/roadmap.md` contain the S-03 entries

#### Manual Verification:

- Pixel 5 over OTA: Store tab with icon, full flow, order kept after reopening the app, light and dark mode — the OTA is active after two restarts; flow: name store → add zones → reorder → rename and delete a zone
- Pixel 5 airplane mode: Store tab offline message, Retry loads after reconnecting; Lists unchanged
- Emulator with the same account: store, zones and order match the Pixel 5

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Testing Strategy

### Unit Tests:

- Request wrapper: ok / offline (status 0, deadline) / error / thrown / duplicate (`23505`).
- Store module: query shape and embedded ordering, payloads without `user_id`/`position`, trimming, `rpc('move_zone')` arguments, result mapping per function.
- Hook: state transitions, `refresh()` keeps data, stale responses dropped.
- Screens with the data module mocked: create store, order display, disabled edge arrows, move in flight, add/rename duplicate, delete confirmation, offline and missing states.

### Integration Tests:

- None automated against the hosted project. Grants and anon refusal are checked over REST in Phase 1; triggers, the RPC and RLS ownership are exercised end to end in the Phase 3 manual flows (including a second account) and on devices in Phase 4.

### Manual Testing Steps:

1. Web: full flow from "Name your store" through reorder, duplicate refusal, rename, delete, rename store; reload keeps order.
2. Emulator: same flow, icon tint in both themes.
3. SQL editor: new list has `store_id`; older list `null`.
4. Second account: no store visible.
5. Pixel 5 over OTA: the flow, restart persistence, airplane-mode offline message.
6. Emulator with the Pixel's account: same store and order.

## Performance Considerations

- The Store tab loads with one request (store with embedded zones); a store holds tens of zones, so no pagination.
- Each move is one RPC plus one refresh; buttons are disabled while it runs, so rapid presses cannot interleave.
- `(store_id, position)` and `(store_id, lower(name))` are covered by the unique constraint and index. S-06's list-open budget will read the zone order alongside a list; nothing here blocks that.

## Migration Notes

- **Schema.** New empty tables, three functions, and one nullable column on `shopping_lists`; existing lists keep `store_id = null`.
- **Rollback.** A follow-up migration that drops the `shopping_lists_set_store` trigger and function, the `store_id` column, `move_zone`, `zones` (with its trigger and function) and `stores`. The pre-push schema dump stays in `~/follow-backups/`.
- **App.** The S-01/S-02 APK (runtime `7c659def…`) receives S-03 over OTA; no build.
- **Addendum 2026-11-21 (Phase 1 review).** `20261121130000_harden_store_and_zones.sql` follows the Phase 1 migration: `authenticated` may update only `stores (name)` and `zones (name, position)`; `zones_set_position` raises `PT404` when the store is not visible; both store-row locks are `for no key update`; `move_zone` raises `PT404` (HTTP 404) for a missing zone; indexes on `zones (user_id)` and `shopping_lists (store_id)`; `btrim(name) = name` checks on both name columns. Phase 2 updates only those columns, and a zone-insert or move error for a missing zone maps to `error`. See `reviews/impl-review-phase-1.md`.

## References

- Research: `context/changes/store-and-zones/research.md`
- Roadmap: `context/foundation/roadmap.md` — S-03 (`:133-144`), S-04 (`:146-156`), S-08 (`:195-205`)
- PRD: `context/foundation/prd.md` — FR-006 to FR-008 (`:148-158`), FR-024 (`:190-200`), FR-025 (`:127-134`), no-lost-item (`:84-86,229-230`), Non-Goals (`:303-329`)
- Shape notes: `context/foundation/shape-notes.md:188-193,218`
- S-02 plan and reviews: `context/archive/2026-11-20-shopping-lists/plan.md`, `reviews/impl-review-phase-2.md`
- Deploy plan: `context/deployment/deploy-plan.md` — S-02 migration and OTA sections
- Code: `supabase/migrations/20261120204123_create_shopping_lists.sql:4-53`, `supabase/migrations/20261120211932_tighten_default_privileges.sql`, `src/lib/shopping-lists.ts:6-107`, `src/hooks/use-shopping-lists.ts:15-49`, `src/app/(app)/(lists)/lists/[id].tsx:29-45,48-131`, `src/app/(app)/(lists)/lists/new.tsx:25-63`, `src/components/button.tsx:7-37`, `src/components/app-tabs.tsx:15-29`, `src/components/app-tabs.web.tsx:22-27`, `__tests__/shopping-lists-test.ts:12-34`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Database and types

#### Automated

- [x] 1.1 `npx supabase db push --remote --dry-run` output lists only the new `create_store_and_zones` migration (run by the user, output pasted) — 6bcce2a
- [x] 1.2 `sh scripts/gen-types.sh` succeeds and `src/lib/database.types.ts` contains `stores`, `zones`, `store_id` on `shopping_lists` and `move_zone` — 6bcce2a
- [x] 1.3 Anonymous REST checks with the publishable key: `GET /rest/v1/stores` and `GET /rest/v1/zones` return 401, and `POST /rest/v1/rpc/move_zone` is refused — 6bcce2a
- [x] 1.4 `/verify` passes (Biome, `npx tsc --noEmit`, `npm test`) — 6bcce2a

#### Manual

- [x] 1.5 The user confirms the backup file exists in `~/follow-backups/` and the push succeeded (`migration list --remote` shows the migration on remote) — 6bcce2a
- [x] 1.6 SQL editor grants query shows `authenticated` and `service_role` on `stores` and `zones`, and no `anon` — 6bcce2a

### Phase 2: Data layer

#### Automated

- [x] 2.1 `/verify` passes (Biome, `npx tsc --noEmit`, `npm test`) — a8829e4
- [x] 2.2 `npx jest request store shopping-lists` passes, including the duplicate, offline and `move_zone` cases — a8829e4
- [x] 2.3 `git diff main -- package.json` shows no changes — a8829e4

### Phase 3: Store tab and screens

#### Automated

- [x] 3.1 `/verify` passes (Biome, `npx tsc --noEmit` with typed routes regenerated, `npm test`) — 5562f1a
- [x] 3.2 `npx jest store-screen store-name-screen zone-screen list-screen root-layout` passes — 5562f1a
- [x] 3.3 `git diff main -- package.json biome.json` shows no changes — 5562f1a

#### Manual

- [x] 3.4 Web flow: name store, add zones, reorder, reload keeps order, duplicate refused, rename, delete with Cancel and confirm, rename store — 5562f1a
- [x] 3.5 Emulator flow: same, tab bar and Store header visible, icon tinted in light and dark mode — 5562f1a
- [x] 3.6 A list created after the store has `store_id` set; an earlier list stays `null` — 5562f1a
- [x] 3.7 A second account sees no store and gets the "Name your store" form — 5562f1a

### Phase 4: Rollout

#### Automated

- [x] 4.1 `/verify` passes
- [x] 4.2 `git diff main -- package.json` shows no changes
- [x] 4.3 `eas update` publishes to branch `preview` with runtime `7c659defc2f12bd944574fbecaffd57cb2956734`
- [x] 4.4 `context/deployment/deploy-plan.md` and `context/foundation/roadmap.md` contain the S-03 entries

#### Manual

- [x] 4.5 Pixel 5 over OTA: Store tab with icon, full flow, order kept after reopening the app, light and dark mode
- [x] 4.6 Pixel 5 airplane mode: Store tab offline message, Retry loads after reconnecting; Lists unchanged
- [x] 4.7 Emulator with the same account: store, zones and order match the Pixel 5
