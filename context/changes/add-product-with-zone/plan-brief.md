# Add a product with its zone (S-04) — Plan Brief

> Full plan: `context/changes/add-product-with-zone/plan.md`
> Research: `context/changes/add-product-with-zone/research.md`

## What & Why

The user can put products on a list by name, with an optional quantity, giving each new product a zone
once and having it remembered for every later list (US-02). S-04 is the only way items reach a list,
so S-05 (offline marking), S-06 (route-ordered view), S-07 (search) and S-08 (restore) all wait on it.

## Starting Point

Lists, the store and its ordered zones exist in Supabase; inserting a zone already appends it to the
end of the route. There is no product or item storage, and the list screen shows "No products yet".

## Desired End State

On a list, typing a remembered name (any case) adds it at once with its zone. A new name shows the
store's zones as chips plus a "New zone" field; a new zone goes to the end of the route. Items show in
the order added with quantity and zone; the quantity is editable on the row, and Remove asks first.
Without a store the list points to the Store tab; a zone that products use cannot be deleted.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Remembered name typed again | Reuse the product and its zone, no zone step | US-02 "remembered for all later lists" works from the second list; S-07 adds partial search. | Plan |
| Same product twice on a list | Refused: "Milk is already on this list." | One row per product keeps S-05 marks and S-06 grouping simple. | Plan |
| Removing an item | Confirmation first (`confirmDelete`, "Remove") | An accidental tap must not lose an item (PRD guardrail). | Plan |
| Zone picker | Inline chips in route order + "New zone" field on the list screen | Known products add in one step without leaving the list. | Plan |
| Quantity | Optional free text (`2`, `300g`), max 20, set when adding and editable on the row; no −/+ | User decision; covers counts and weights in one field. | Plan |
| Data model | `products` (user-owned, unique name ignoring case, zone FK) + `list_items` (list, product, quantity) | S-07 changes a product's zone once; S-08 restores products without lists. | Research |
| Add path | One `add_list_item` RPC: product, optional new zone and item in one transaction | A dropped connection never leaves a zone or product without its item. | Plan |
| Zone in use | Products FK refuses deleting a used zone; zone screen explains | Recorded in the store-and-zones brief. | Research |
| FK action | Default `NO ACTION`, not `RESTRICT` | Account deletion cascades still work. | Plan |
| `shopping_lists` UPDATE grant | Revoked | Recorded follow-up; the app writes no list column. | Research |
| Lists without a store | Left as they are | Items reach zones through products, so nothing needs attaching. | Plan |
| No store | Prompt + "Go to Store" button | Recorded in the roadmap for S-04. | Research |
| Item order before S-06 | Order added | S-06 replaces it with zone grouping. | Plan |

## Scope

**In scope:**

- Migration: `products`, `list_items`, composite keys, `add_list_item`, grant fix; hosted push with approval
- `products.ts`, `list-items.ts`, `inUse` result for refused deletes
- List screen: items, add form with chips, no-store prompt, quantity edit, remove with confirmation
- `Chip` component, kitchen-sink states, unit and screen tests, screenshots

**Out of scope:**

- Partial-name search and changing a product's zone (S-07); zone grouping (S-06); marks and offline writes (S-05)
- −/+ quantity buttons, renaming or deleting products, undo after removal
- Attaching old lists to the store; any `package.json` change

## Architecture / Approach

The database owns the add: `add_list_item` (security invoker, empty `search_path`) resolves or creates
the product and, for a new product, the zone (the existing trigger appends it), then inserts the item.
Only "already on this list" surfaces as a unique violation, which `runUnique` reports as `duplicate`.
The screen loads items, products and the store on focus; it uses the product list to decide whether to
show the zone step, and the function stays authoritative. UI is built from presentational components
(`AddProductForm`, `ListItemsView`, `Chip`) so every state shows on `/kitchen-sink`.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Schema and add function | Tables, RLS, grants, RPC on the hosted project; regenerated types | Race-safe upserts so a repeated add never reports a false duplicate |
| 2. Data modules | `products.ts`, `list-items.ts`, `inUse`, zone-in-use message | Keeping `run`/`runUnique` behaviour unchanged while generalising `execute` |
| 3. Add products on the list screen | Items, add form with chips, no-store prompt, kitchen sink | A busy screen at 390 px; chips must wrap |
| 4. Edit quantity and remove | Inline quantity edit, confirmed Remove | Rows crowded by name, quantity and Remove |

**Prerequisites:** S-02 and S-03 done (they are); user available to run the dump, dry-run and push; my-lists-ui tokens and `Card` in place (in the working tree).
**Estimated effort:** ~3–4 sessions across 4 phases.

## Open Risks & Assumptions

- Mandatory zone vs "adding takes seconds" stays open (Open Roadmap Question 4); revisit after S-04 and S-07 are in daily use.
- A typo creates a separate remembered product, and its zone can't be deleted while it uses it, until a later slice adds product editing.
- Client name matching (`toLocaleLowerCase`) and the database's `lower()` could differ for rare characters; the function wins.
- The RPC has no automated test (no local database in the test setup); manual checks against the hosted project cover it.

## Success Criteria (Summary)

- A second list built from remembered products needs no zone choices; new products get their zone in the same form.
- No item disappears except by a confirmed Remove; duplicates are refused with a clear message.
- Lint, type check and tests (including the design-token scan) pass; kitchen-sink screenshots show every state.
