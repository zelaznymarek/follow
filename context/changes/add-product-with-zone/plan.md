# Add a product with its zone (S-04) Implementation Plan

## Overview

Roadmap slice S-04 (US-02, FR-010, FR-011, FR-012, FR-013, FR-020, FR-024): the user adds a product
to a list by name, with an optional free-text quantity. A product they have used before is added with
its remembered zone. A new product needs a zone: either an existing one picked from chips or a new
one typed inline, which goes to the end of the route. The user can change an item's quantity on the
list and remove an item after confirming. Products are remembered in their own user-owned table, so
later lists (S-07), the route view (S-06) and a new device (S-08) build on them.

## Current State Analysis

- No product or list-item storage exists: the migrations define `shopping_lists`, `stores` and `zones`
  only, and the list screen shows the placeholder "No products yet"
  (`src/app/(app)/(lists)/lists/[id].tsx:123`).
- Inline zone creation already works in the database: a plain insert into `zones` is appended to the
  end of the route by `zones_set_position`, which locks the store row
  (`supabase/migrations/20261121130000_harden_store_and_zones.sql:15-36`).
- Children reference owners through composite FKs on `(id, user_id)`, but only `stores` has
  `unique (id, user_id)` (`supabase/migrations/20261121120000_create_store_and_zones.sql:16`).
- `request.ts` maps only `23505` (to `duplicate`); a foreign-key violation (`23503`) falls through to
  a logged `error` (`src/lib/request.ts:23, 47-55`).
- `authenticated` still has table-wide UPDATE on `shopping_lists`; the recorded follow-up says the
  next migration touching that table narrows it (`context/deployment/deploy-plan.md:225`). The app
  updates no `shopping_lists` column today (`src/lib/shopping-lists.ts`).
- Building blocks: `useStore` (focus reload, `refresh()` keeps data, `src/hooks/use-store.ts`),
  `AddZoneForm` patterns (field error, assertive alert, `submitting` guard, refresh on duplicate,
  `src/app/(app)/store/index.tsx:315-406`), `Card`, `Button`, `TextField`, `confirmDelete`
  (`src/lib/confirm-delete.ts`). No chip or picker component exists. Tokens (`Radius.control`,
  `Radius.card`, `Opacity`) live in `src/constants/theme.ts:72-80`; `__tests__/design-tokens-test.ts`
  fails on colour, radius or opacity literals in views; every state of a new view goes on
  `/kitchen-sink` (`CLAUDE.md`).

## Desired End State

On a list, the user types a product name (and optionally a quantity such as `2` or `300g`) and
presses Add:

- A name matching a remembered product ignoring case (`milk` vs `Milk`) is added at once with that
  product's zone; the form shows that zone as a hint while typing.
- A new name reveals the store's zones as chips in route order plus a "New zone" field. Choosing a chip
  or typing a new zone (appended to the end of the route; a name matching an existing zone ignoring
  case reuses that zone) and pressing Add saves zone, product and item in one database call.
- A product already on the list is refused with "Milk is already on this list."
- Items show in the order they were added, each with its quantity (if any) and zone name. The quantity
  can be set, changed or cleared on the row. Remove asks "Remove Milk from this list?" first.
- With no store, the form is replaced by a prompt and a button to the Store tab.
- Deleting a zone that products use is refused with a message on the zone screen.

Verify via the automated checks below, the kitchen-sink states, and the manual checks on the web dev
server and the emulator/Pixel 5.

### Key Discoveries:

- The append trigger and its store lock already serialise zone appends, so the add function only has
  to insert into `zones` (`20261121130000_harden_store_and_zones.sql:15-36`).
- `move_zone` is the RPC template: `security invoker`, `set search_path = ''`, `PT404` for a missing or
  invisible row, `revoke … from public` then an explicit grant
  (`20261121130000_harden_store_and_zones.sql:41-103`).
- `runUnique` turns a `23505` into `duplicate` without logging (`src/lib/request.ts:80-90`), so the add
  function must let only the "already on this list" case surface as `23505`.
- `useStore` refreshes on focus, so zones added on the Store tab appear when the user returns to a
  list (`src/hooks/use-store.ts:47-51`).
- Kitchen-sink pattern: presentational components fed sample data (`src/app/kitchen-sink.tsx`,
  `src/components/my-lists-view.tsx`).

## What We're NOT Doing

- Partial-name search over remembered products, and changing a product's zone (S-07: FR-014, FR-022).
- Grouping items under zone headings in route order (S-06); S-04 lists items in the order added.
- Marks, swipes and offline writes (S-05). Adding, editing and removing need a connection.
- −/+ quantity buttons; quantity is free text only.
- Renaming or deleting remembered products; a typo creates a new product (fixable in a later slice).
- Attaching lists with `store_id = null` to the store: items reach their zones through products, so
  such lists work unchanged.
- An undo notice after removal (confirmation instead).
- Any `package.json` script or dependency change.

## Implementation Approach

The database owns the add: one `security invoker` function `add_list_item` resolves or creates the
product (and, for a new product, the zone), then inserts the item, all in one transaction. A dropped
connection therefore never leaves a zone or product without its item, and the only error the user can
cause by repeating an add is the item's own unique violation, which `runUnique` already reports as
`duplicate`. The screen loads the user's products to decide whether to show the zone step; the
function stays authoritative if that list is out of date. Removal of zones is guarded by the products
FK, surfaced through a new `inUse` reason. The screen is built from presentational components so every
state can be shown on `/kitchen-sink`.

## Critical Implementation Details

**FK actions.** Use the default `NO ACTION` (not `RESTRICT`) for `products → zones` and
`list_items → products`. Both refuse deleting a referenced row, but `NO ACTION` is checked at the end
of the statement, so deleting an account (which cascades to zones, products and items in one
statement) still works; `RESTRICT` would fail it.

**Race-safe upserts inside the function.** A concurrent add of the same new product or new zone name
(two devices, or a timed-out retry) must not raise `23505` from `products` or `zones`, because the
client would show "already on this list". Insert both with `on conflict … do nothing` against their
case-insensitive unique indexes and then select the row.

**Name matching.** The client matches with trimmed `toLocaleLowerCase()`, the database with
`lower(btrim(…))`. They agree for the household's languages; when they disagree the function wins
(an unexpected known product is simply reused, and a missing zone is reported as an error).

## Phase 1: Schema and add function

### Overview

Products and list items exist in Supabase with RLS, explicit grants and the composite-FK ownership
pattern; `add_list_item` adds an item in one call; the `shopping_lists` UPDATE grant is revoked. The
migration is pushed to the hosted project with approval and the types are regenerated.

### Changes Required:

#### 1. Migration

**File**: `supabase/migrations/<timestamp>_create_products_and_list_items.sql` (created with
`npx supabase migration new create_products_and_list_items`)

**Intent**: Store remembered products and the items on each list, owned by the user like every other
table, and add them through one database function.

**Contract**:

- `zones`, `shopping_lists`: add `unique (id, user_id)` (composite-FK targets).
- `products`: `id uuid pk default gen_random_uuid()`, `user_id` (default `auth.uid()`, references
  `auth.users` on delete cascade), `zone_id uuid not null`, `name text not null` (1..80,
  `btrim(name) = name`), `created_at`; `foreign key (zone_id, user_id) references zones (id, user_id)`
  (default `NO ACTION`); `unique (id, user_id)`; unique index `(user_id, lower(name))`; index on
  `zone_id`. RLS with select and insert policies `(select auth.uid()) = user_id` for `authenticated`;
  grant `select, insert` to `authenticated`, `all` to `service_role`. No update or delete in S-04.
- `list_items`: `id uuid pk default gen_random_uuid()` (clients may supply ids later for S-05),
  `user_id` as above, `list_id uuid not null`, `product_id uuid not null`, `quantity text null`
  (null, or 1..20 characters with `btrim(quantity) = quantity`), `created_at`;
  `foreign key (list_id, user_id) references shopping_lists (id, user_id) on delete cascade`;
  `foreign key (product_id, user_id) references products (id, user_id)` (default `NO ACTION`);
  `unique (list_id, product_id)`; indexes on `product_id` and `user_id`. RLS with four policies;
  grant `select, insert, delete` and `update (quantity)` to `authenticated`, `all` to `service_role`.
- `shopping_lists`: `revoke update … from authenticated` (no column is client-writable; follow-up
  from `deploy-plan.md:225`).
- `add_list_item(p_list_id uuid, p_name text, p_quantity text default null, p_zone_id uuid default null, p_new_zone_name text default null) returns uuid`
  (the new item's id), `language plpgsql security invoker set search_path = ''`:
  1. Raise `PT404` when the list is not visible to the caller.
  2. Find the caller's product by `lower(btrim(p_name))`. If found, ignore the zone arguments.
  3. Otherwise resolve the zone: `p_zone_id` (raise `PT404` if not visible), or `p_new_zone_name`
     trimmed: reuse the caller's zone with the same name ignoring case, else insert it into the
     caller's store (the trigger appends it; raise `PT404` with no store). With neither argument,
     raise `invalid_parameter_value` ("zone required").
  4. Insert the product (`on conflict do nothing`, then select it).
  5. Insert the item with `nullif(btrim(p_quantity), '')`; an item already on the list raises `23505`.
  `revoke execute … from public`; `grant execute … to authenticated`.

#### 2. Hosted push and types

**File**: hosted Supabase project; `src/lib/database.types.ts`

**Intent**: Apply the migration to the hosted project following the recorded process, then regenerate
the types the client modules use.

**Contract**: the user runs `npx supabase db dump --remote -f ~/follow-backups/<date>-pre-s04-schema.sql`,
then `npx supabase db push --remote --dry-run` (shows only the new migration); after approval
`npx supabase db push --remote --yes` and `npx supabase migration list --remote`. Then
`sh scripts/gen-types.sh`; the file is never hand-edited.

### Success Criteria:

#### Automated Verification:

- `npx supabase db push --remote --dry-run` output lists only the new `create_products_and_list_items` migration (run by the user, output pasted)
- `sh scripts/gen-types.sh` succeeds and `src/lib/database.types.ts` contains `products`, `list_items` and `add_list_item`
- Type check passes: `npx tsc --noEmit`

#### Manual Verification:

- `npx supabase migration list --remote` shows the migration applied on the hosted project
- A zone with no products can still be deleted from the Store tab (the new foreign key blocks only zones in use)

**Implementation Note**: After completing this phase and all automated verification passes, pause here
for manual confirmation from the human that the manual testing was successful before proceeding to the
next phase.

---

## Phase 2: Data modules

### Overview

Client modules for products and list items, an `inUse` result for refused deletes, and the zone screen
explaining why a used zone cannot be deleted.

### Changes Required:

#### 1. `inUse` reason

**File**: `src/lib/request.ts`

**Intent**: Let a call report a foreign-key refusal (`23503`) as an expected outcome instead of a
logged error.

**Contract**: `RequestResult<T, Extra extends 'duplicate' | 'inUse' = never>`; a new `runInUse(tag,
action, query, map): Promise<RequestResult<U, 'inUse'>>` beside `runUnique`, sharing `execute` (which
takes the Postgres code → reason mapping instead of a single `onUniqueViolation`). `run` and
`runUnique` behave as today.

#### 2. Zone delete in use

**File**: `src/lib/store.ts`, `src/app/(app)/store/zones/[id].tsx`

**Intent**: Deleting a zone that products use is refused by the database; tell the user why.

**Contract**: `deleteZone(id): Promise<RequestResult<void, 'inUse'>>` via `runInUse`;
`DELETE_MESSAGES.inUse = "Products use this zone, so it can't be deleted."`.

#### 3. Products module

**File**: `src/lib/products.ts` (new)

**Intent**: Load the user's remembered products and match a typed name against them.

**Contract**: `PRODUCT_NAME_MAX_LENGTH = 80` (matches the check); `type Product = { id; name; zoneId }`;
`fetchProducts(): Promise<RequestResult<Product[]>>` (`.retry(false)`, ordered by name);
`findProduct(products, name): Product | undefined` (trimmed, case-insensitive with
`toLocaleLowerCase()`). Same module shape as `store.ts` (`*_COLUMNS`, `Pick<Tables<…>>`, mapper,
`run('products', …)`).

#### 4. List items module

**File**: `src/lib/list-items.ts` (new)

**Intent**: Load, add, edit and remove the items on a list.

**Contract**:

- `QUANTITY_MAX_LENGTH = 20`; `type ListItem = { id; quantity: string | null; product: { id; name }; zone: { id; name } }`.
- `fetchListItems(listId): Promise<RequestResult<ListItem[]>>` — embeds product and zone, ordered by
  `created_at` then `id` ascending, `.retry(false)`.
- `type ZoneChoice = { zoneId: string } | { newZoneName: string } | null`;
  `addListItem({ listId, name, quantity, zone }): Promise<RequestResult<string, 'duplicate'>>` via
  `runUnique` and `rpc('add_list_item', …)`; sends `p_zone_id` or `p_new_zone_name` per the choice;
  an empty quantity is sent as `null`.
- `setItemQuantity(id, quantity): Promise<RequestResult<string | null>>` — updates only `quantity`
  (trimmed, empty → `null`).
- `removeListItem(id): Promise<RequestResult<void>>`.

#### 5. Tests

**File**: `__tests__/request-test.ts`, `__tests__/store-test.ts`, `__tests__/zone-screen-test.tsx`,
`__tests__/products-test.ts` (new), `__tests__/list-items-test.ts` (new)

**Intent**: Pin the new mappings and call shapes with the existing mock style.

**Contract**: `23503` → `inUse` only through `runInUse` and not logged; `deleteZone` in use; zone
screen shows the in-use message; `findProduct` ignores case and surrounding spaces; `addListItem`
sends the right RPC arguments for each zone choice and maps `23505` to `duplicate`; `setItemQuantity`
sends `null` for blank input; `fetchListItems` maps the embedded rows.

### Success Criteria:

#### Automated Verification:

- Lint passes: `npm run lint`
- Type check passes: `npx tsc --noEmit`
- Tests pass: `npm test`

#### Manual Verification:

- After adding a product in that zone (via SQL editor or after Phase 3), deleting the zone shows "Products use this zone, so it can't be deleted." and the zone stays

**Implementation Note**: After completing this phase and all automated verification passes, pause here
for manual confirmation from the human that the manual testing was successful before proceeding to the
next phase.

---

## Phase 3: Add products on the list screen

### Overview

The list screen shows its items and an add form with zone chips; with no store it points to the Store
tab. Every state is on `/kitchen-sink`.

### Changes Required:

#### 1. Chip component

**File**: `src/components/chip.tsx` (new), `src/constants/theme.ts`, `context/changes/my-lists-ui/tokens.md` if a token is added

**Intent**: A selectable pill for choosing one zone among several, built from tokens.

**Contract**: `Chip({ label, selected, onPress, disabled })`, `accessibilityRole="radio"` with
`accessibilityState={{ checked: selected }}`, min height 44; selected uses `primary`/`onPrimary`,
unselected `backgroundElement`/`text`. Takes `label` as a prop (not children), so the Biome
`noReactNativeRawText` skip list does not change. Use `Radius.control` or add a `Radius.pill` token.

#### 2. Load hook

**File**: `src/hooks/use-list-items.ts` (new)

**Intent**: Load a list's items and the user's products together, on focus, with the `useStore`
contract.

**Contract**: `useListItems(listId): { state; items: ListItem[] | null; products: Product[] | null; reload(); refresh(): Promise<void> }`
with the same stale-response guard and "kept during reload and after a failed load" semantics as
`useStore`.

#### 3. Add product form

**File**: `src/components/add-product-form.tsx` (new)

**Intent**: The one place a product gets onto a list, including its zone the first time.

**Contract**: props `products`, `zones: Zone[]` (route order), `onAdd(input) => Promise<RequestResult<string, 'duplicate'>>`,
`onAdded()`, optional `initialName` (kitchen sink only). Behaviour:

- Fields "Product" (`PRODUCT_NAME_MAX_LENGTH`) and "Quantity (optional)" (`QUANTITY_MAX_LENGTH`), Add button.
- Known name: hint "Zone: Dairy", no zone step. New non-empty name: "Zone for <name>" with one chip
  per zone and a "New zone" field (`ZONE_NAME_MAX_LENGTH`); choosing a chip clears the field, typing
  clears the chip. With zero zones only the field shows.
- Messages: empty name "Enter a product name."; new product without a zone "Choose a zone or type a
  new one."; duplicate (on the name field) "<Name> is already on this list."; offline "Adding a
  product needs a connection."; error "Couldn't add the product. Try again." (assertive alert).
- After success: clear name, quantity and zone, keep the form open, call `onAdded()`. After
  `duplicate` or `error`, also call `onAdded()` so a stale product or zone list is reloaded.
  `submitting` guard like `AddZoneForm`.

#### 4. Item rows view

**File**: `src/components/list-items-view.tsx` (new)

**Intent**: Presentational list of items for the route and the kitchen sink.

**Contract**: `ListItemsView({ items })` — empty: "No products yet"; otherwise one `Card` row per item
with the name (`smallBold`), the quantity when set, and the zone name (`textSecondary`). Phase 4 adds
row actions.

#### 5. List screen

**File**: `src/app/(app)/(lists)/lists/[id].tsx`

**Intent**: Replace the placeholder with items and the add form, keeping the list load and Delete list.

**Contract**: uses `useList` (unchanged), `useListItems(id)` and `useStore()`. Full-screen
spinner/error only before items first load; afterwards an inline problem with Retry (store screen
pattern). Store states: `ready` with `store === null` → "Set up your store before adding products."
plus a secondary Button "Go to Store" calling `router.navigate('/store')`; store `offline`/`error`
before first load → inline message with Retry in place of the form. `onAdd` calls `addListItem`;
`onAdded` refreshes items and store. Delete list stays at the bottom.

#### 6. Kitchen sink

**File**: `src/app/kitchen-sink.tsx`

**Intent**: Show every new state for screenshots.

**Contract**: sample items/products/zones; sections for items (several, one without quantity, empty),
the form (empty, known name with hint, new name with chips, new name with zero zones), the no-store
prompt, and Chip selected/unselected/disabled.

#### 7. Screen tests

**File**: `__tests__/list-screen-test.tsx`

**Intent**: Cover the add flow end to end on the screen with mocked `@/lib/*` modules (re-exporting
the length constants).

**Contract**: the "No products yet" test keeps passing for an empty list; items render in order with
quantity and zone; a known name (different case) adds without a zone step and sends `zone: null`; a
new name shows chips in route order and refuses Add without a choice; a chip sends `{ zoneId }`; a
typed zone sends `{ newZoneName }`; quantity is passed through; duplicate shows the name-field message
and refreshes; offline shows the assertive alert; no store shows the prompt and navigates to `/store`;
zero zones shows only the new-zone field.

### Success Criteria:

#### Automated Verification:

- Lint passes: `npm run lint`
- Type check passes: `npx tsc --noEmit`
- Tests pass, including the design-token scan: `npm test`

#### Manual Verification:

- On the web dev server and the emulator: add a new product with an existing zone, one with a new zone (it appears last on the Store tab), and a known product in a different case (no zone step, remembered zone shown)
- Adding a product already on the list shows "<Name> is already on this list." and adds nothing
- An account with no store sees the prompt, and "Go to Store" opens the Store tab; after naming the store and adding a zone there, the list offers that zone
- Kitchen-sink screenshots (desktop, mobile 390 px, dark) saved in `context/changes/add-product-with-zone/screenshots/`; chips wrap at 390 px

**Implementation Note**: After completing this phase and all automated verification passes, pause here
for manual confirmation from the human that the manual testing was successful before proceeding to the
next phase.

---

## Phase 4: Edit quantity and remove

### Overview

Each row lets the user set, change or clear the quantity, and remove the item after confirming.

### Changes Required:

#### 1. Confirmation label

**File**: `src/lib/confirm-delete.ts`

**Intent**: Let the destructive button read "Remove" instead of "Delete".

**Contract**: `ConfirmDeleteOptions` gains optional `confirmLabel` (default `'Delete'`); existing
callers unchanged.

#### 2. Row actions

**File**: `src/components/list-items-view.tsx`

**Intent**: Edit the quantity inline and remove an item from the row.

**Contract**: `ListItemsView({ items, onSetQuantity, onRemove })`. Each row shows the quantity (or
"Add quantity") as a pressable with `accessibilityLabel` "Quantity for <name>"; pressing it turns the
row into a "Quantity for <name>" `TextField` (`QUANTITY_MAX_LENGTH`) with Save and Cancel; one row is
edited at a time; Save with blank text clears the quantity. A secondary Button "Remove"
(`accessibilityLabel` "Remove <name>") per row. Errors show on the row: "Changing the quantity needs a
connection." / "Couldn't change the quantity. Try again." and "Removing needs a connection." /
"Couldn't remove the product. Try again.".

#### 3. List screen wiring

**File**: `src/app/(app)/(lists)/lists/[id].tsx`

**Intent**: Connect the row actions to the data module.

**Contract**: `onSetQuantity` → `setItemQuantity` then `refresh()`; `onRemove` →
`confirmDelete({ title: 'Remove <name> from this list?', message: 'You can add it again later.', confirmLabel: 'Remove' })`,
then `removeListItem` and `refresh()`. Busy guards prevent double submits.

#### 4. Kitchen sink and tests

**File**: `src/app/kitchen-sink.tsx`, `__tests__/list-screen-test.tsx`

**Intent**: Show and pin the new row states.

**Contract**: kitchen sink adds a row in quantity-edit mode and a row with an error. Tests: setting,
changing and clearing a quantity (blank → `null`); offline quantity message; Remove → Cancel calls
nothing; Remove → confirm calls `removeListItem` and refreshes; remove offline message.

### Success Criteria:

#### Automated Verification:

- Lint passes: `npm run lint`
- Type check passes: `npx tsc --noEmit`
- Tests pass, including the design-token scan: `npm test`

#### Manual Verification:

- On the emulator: set a quantity of `300g`, change it to `2`, clear it; each survives leaving and reopening the list
- Remove asks for confirmation; Cancel keeps the item, Remove takes it off the list, and the product is still remembered (adding it again skips the zone step)
- Row with a long name, a quantity and Remove fits at 390 px; kitchen-sink screenshots (desktop, mobile, dark) saved
- Airplane mode on the Pixel 5 after an OTA update: add, quantity change and remove each show their offline message and change nothing

**Implementation Note**: After completing this phase and all automated verification passes, pause here
for manual confirmation from the human that the manual testing was successful before proceeding.

---

## Testing Strategy

### Unit Tests:

- `request.ts`: `23503` → `inUse` through `runInUse` only.
- `products.ts`: `findProduct` case and whitespace handling.
- `list-items.ts`: RPC arguments per zone choice, blank quantity → `null`, `23505` → `duplicate`,
  embedded-row mapping and order.
- `store.ts`: `deleteZone` in use.

### Integration Tests:

- `__tests__/list-screen-test.tsx` with `renderRouter` and mocked `@/lib/*`: add flow, zone step,
  no store, duplicates, quantity edit, remove with confirmation.
- `__tests__/zone-screen-test.tsx`: in-use message.
- The database function is not unit-tested (no local database in the test setup); it is exercised by
  the Phase 3 and 4 manual checks against the hosted project.

### Manual Testing Steps:

1. New account: open a list → no-store prompt → Store tab → name store, add "Dairy" → back to the list.
2. Add "Milk" with chip Dairy and quantity `2`; add "Bread" with new zone "Bakery"; check the Store tab
   shows Bakery last.
3. Add "milk" again → refused; on a second list add "MILK" → no zone step, zone Dairy.
4. Change and clear quantities; remove an item (Cancel, then Remove).
5. Try deleting Dairy on the Store tab → refused with the in-use message.

## Performance Considerations

Products and items are small (hundreds of rows at most) and loaded once per focus; the indexes on
`products (user_id, lower(name))`, `list_items (list_id, product_id)` and the FK columns cover the
lookups. The under-one-second list opening target belongs to S-06.

## Migration Notes

The database change ships first and is backward compatible: the installed app does not read the new
tables and never updates `shopping_lists`. The app changes then reach phones by OTA update (no
`package.json` or native change, so the runtime fingerprint stays the same). Existing lists, including
those with `store_id = null`, need no backfill. Rollback: an OTA rollback restores the old screen; the
new tables can stay.

## References

- Related research: `context/changes/add-product-with-zone/research.md`
- Roadmap: `context/foundation/roadmap.md` (S-04; Open Roadmap Question 4)
- PRD: `context/foundation/prd.md` (US-02, FR-010–FR-013, FR-020, FR-024; guardrail "no item is ever lost")
- Store-and-zones decisions: `context/archive/2026-11-21-store-and-zones/plan-brief.md:30-37, 78`
- RPC template: `supabase/migrations/20261121130000_harden_store_and_zones.sql:41-103`
- Form pattern: `src/app/(app)/store/index.tsx:315-406`
- Grant follow-up: `context/deployment/deploy-plan.md:225`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Schema and add function

#### Automated

- [ ] 1.1 `npx supabase db push --remote --dry-run` output lists only the new `create_products_and_list_items` migration (run by the user, output pasted)
- [ ] 1.2 `sh scripts/gen-types.sh` succeeds and `src/lib/database.types.ts` contains `products`, `list_items` and `add_list_item`
- [ ] 1.3 Type check passes: `npx tsc --noEmit`

#### Manual

- [ ] 1.4 `npx supabase migration list --remote` shows the migration applied on the hosted project
- [ ] 1.5 A zone with no products can still be deleted from the Store tab (the new foreign key blocks only zones in use)

### Phase 2: Data modules

#### Automated

- [ ] 2.1 Lint passes: `npm run lint`
- [ ] 2.2 Type check passes: `npx tsc --noEmit`
- [ ] 2.3 Tests pass: `npm test`

#### Manual

- [ ] 2.4 After adding a product in that zone (via SQL editor or after Phase 3), deleting the zone shows "Products use this zone, so it can't be deleted." and the zone stays

### Phase 3: Add products on the list screen

#### Automated

- [ ] 3.1 Lint passes: `npm run lint`
- [ ] 3.2 Type check passes: `npx tsc --noEmit`
- [ ] 3.3 Tests pass, including the design-token scan: `npm test`

#### Manual

- [ ] 3.4 On the web dev server and the emulator: add a new product with an existing zone, one with a new zone (it appears last on the Store tab), and a known product in a different case (no zone step, remembered zone shown)
- [ ] 3.5 Adding a product already on the list shows "<Name> is already on this list." and adds nothing
- [ ] 3.6 An account with no store sees the prompt, and "Go to Store" opens the Store tab; after naming the store and adding a zone there, the list offers that zone
- [ ] 3.7 Kitchen-sink screenshots (desktop, mobile 390 px, dark) saved in `context/changes/add-product-with-zone/screenshots/`; chips wrap at 390 px

### Phase 4: Edit quantity and remove

#### Automated

- [ ] 4.1 Lint passes: `npm run lint`
- [ ] 4.2 Type check passes: `npx tsc --noEmit`
- [ ] 4.3 Tests pass, including the design-token scan: `npm test`

#### Manual

- [ ] 4.4 On the emulator: set a quantity of `300g`, change it to `2`, clear it; each survives leaving and reopening the list
- [ ] 4.5 Remove asks for confirmation; Cancel keeps the item, Remove takes it off the list, and the product is still remembered (adding it again skips the zone step)
- [ ] 4.6 Row with a long name, a quantity and Remove fits at 390 px; kitchen-sink screenshots (desktop, mobile, dark) saved
- [ ] 4.7 Airplane mode on the Pixel 5 after an OTA update: add, quantity change and remove each show their offline message and change nothing
