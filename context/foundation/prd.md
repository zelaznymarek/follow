---
project: "Follow"
version: 1
status: draft
created: 2026-11-10
context_type: greenfield
product_type: mobile
target_scale:
  users: small
  qps: low
  data_volume: small
timeline_budget:
  mvp_weeks: 3
  hard_deadline: 2026-12-31
  after_hours_only: true
---

# Follow — Product Requirements Document

## Vision & Problem Statement

A person doing the household's larger grocery run arrives with a complete list written in
arbitrary order — typically on paper, accumulated over 2–3 days. Because the list's order bears
no relation to the store's physical layout, the shopper must re-scan the entire list at every
section to find what belongs there. This manual mapping fails regularly: halfway through or
near the end of the trip, an item from an already-passed section surfaces, and the shopper
walks back across the store. The cost is time and irritation on every larger shop, and it
recurs because paper cannot remember the route.

The insight is not a market gap. Shopping-list apps with section sorting exist and work; the
user's stated motivation for building this is owning the solution and fitting it to their own
habits rather than filling an unserved need. What generic list apps do lack is knowledge of the
route through a *specific* store: they sort by a universal category dictionary (dairy, bakery,
chemicals) that does not match the physical order of zones in any particular shop. Follow's
position is that the zones and the route are the user's data, not the vendor's — the user
defines their own zones, orders them per store, and assigns products to them. No starter
dictionary, no model-based classification.

> Socrates: "If this is already solved, why build it?" — User's answer, recorded as given:
> existing tools solve it; the motivation is ownership and personal fit, not a market gap.
> Consequence accepted: this project is not justified by differentiation. If distribution
> ever becomes a goal, the insight paragraph must be revisited.

### Pain categories (user-selected)

- Workflow friction — the list is complete, but its order does not match the route; manual
  mapping at every shelf is work the application should do.
- Data trapped on paper — no zones, no ordering, nothing remembered between shopping trips.
- Missing feature in existing tools — generic list apps do not know the route through the
  user's specific store.

## User & Persona

**Primary persona: the household shopper.** Not a role in an organisation — a two-person
household (the user and their spouse). Either adult may be the one shopping; both add items to
the same list over the days preceding a trip. They reach for the product at two distinct
moments: (1) during the 2–3 days when items accumulate and someone remembers something, and
(2) in the store, walking the route, needing the list to be already ordered so no section is
left behind.

Scope decision: **lists are shared within the household** — both people see and edit the same
lists. This was resolved during shaping in the affirmative, scoped to a household rather than
to arbitrary sharing between unrelated users.

Note on the MVP gap: household sharing is a **non-goal for the MVP** (see `## Non-Goals`). The
MVP therefore serves one of the two adults in the persona. This is the largest gap between the
persona and the first version and is tracked as Open Question 4, not treated as resolved.

## Success Criteria

### Primary
- The shopper walks the store in a single pass with no backtracking, because the list is
  already ordered to match the route. No item from an already-passed zone surfaces late.

### Secondary
- The remembered product dictionary makes later lists faster: the second and third lists are
  built mostly by picking already-known products rather than typing them from scratch.
- Adding an item to a list takes seconds from a phone, with no detour into store or zone
  editing — so a list can accumulate over the 2–3 days before a trip.
- Support for more than one store, each with its own zone order. Explicitly v2: the user
  scoped the MVP to a single store.

### Guardrails
- No item is ever lost. A product added to a list never disappears from view — not through
  sorting, not through a gesture, not through having no zone. Losing an item is precisely the
  pain this product exists to remove.
- A list stays usable with weak or absent connectivity. An open list remains readable and
  markable in the store without a connection.
- A list opens fast enough not to stall the shopper at the store entrance: time from tapping a
  list to seeing its sorted contents is short enough to not interrupt walking in.

## User Stories

### US-01: Shopper walks the store in one pass

- **Given** a saved list whose store has an established zone order
- **When** the shopper opens the list in the store
- **Then** items appear grouped and ordered by the store's zone order, so each zone is visited
  once and no item from an already-passed zone surfaces later

### US-02: A product gets its zone the first time it appears

- **Given** a product name the user has never used before
- **When** the user adds it to a list
- **Then** the user is asked for its zone, may pick an existing zone or type a new one, and the
  product is remembered with that zone for all later lists

### US-03: Marking during the shop

- **Given** an open list in the store
- **When** the shopper swipes a row right
- **Then** it turns green as bought and stays on the list; swiping left turns it red as
  unavailable and it also stays; either mark can be undone

## Functional Requirements

Scope: MVP — single user, single store. Household sharing and multiple stores are non-goals for
the MVP (see `## Non-Goals`).

### Account
- FR-001: User can register and sign in. Priority: must-have
  > Socrates: Counter-argument considered: "the MVP is single-user and single-store, so accounts
  > are a whole layer serving nothing." Resolution: kept. Introducing accounts later would mean
  > moving lists that had only ever existed on one phone into a newly created account; paying
  > for accounts up front is cheaper even though the MVP itself gains nothing from them.

- FR-025: User can sign in on a new device and find the store with its zones and their order,
  and the remembered products with their zone assignments, already in place. Lists are not
  restored. Priority: must-have
  > Socrates: Counter-argument considered: "restoring everything is the most expensive thing in
  > the MVP -- more work than all the screens together, and a real risk to the 2026-12-31
  > deadline." Resolution: narrowed. What returns is the accumulation of months -- the store,
  > its zones, the route order, and the remembered assignments. Lists do not return: a list is
  > single-use and loses its meaning once the shop is done.

### Lists
- FR-002: User can see all their shopping lists on one screen. Priority: must-have
- FR-003: User can create a new shopping list. Priority: must-have
- FR-004: User can keep multiple lists at the same time. Priority: must-have
  > Socrates: Counter-argument considered: "one rolling list fits the 2-3 day accumulation
  > habit; simultaneous lists are a feature with no use in the MVP." Resolution: kept. A
  > completed list is retained as a record of that shop while a new one starts separately, so
  > lists necessarily coexist even when only one is active.
- FR-005: User can save a list and reopen it later. Priority: must-have
- FR-021: User can delete a whole list. Priority: must-have

### Store and zones
- FR-006: User can create a store by giving it a name. Priority: must-have
- FR-007: User can define zones for the store. Priority: must-have
- FR-008: User can set and change the order of the store's zones in a view that shows zone
  names only. Priority: must-have
  > Socrates: Counter-argument considered: "if zones must be ordered anyway, enter them in
  > route order at store creation and drop the separate ordering step." Resolution: kept as a
  > separate step. Zones are created ad hoc while adding products, in whatever order products
  > are remembered, so ordering has to be a distinct action performed afterwards.
  > FR-009 (change the order later by editing the store) was merged into this FR: once new
  > zones are appended to the route automatically (FR-024), there is no "establish the order"
  > action distinct from "change the order" — only reordering exists.

### Products
- FR-010: User can add a product to a list by name. Priority: must-have
- FR-011: User must assign a zone to a product when it first appears on a list; a product
  cannot be added without one. Priority: must-have
  > Socrates: Counter-argument considered: "adding milk from the sofa in the evening is the
  > worst moment to think about store geography, and it contradicts the secondary criterion
  > that adding an item takes seconds." Resolution: made mandatory anyway. Guaranteeing every
  > list is sortable was judged worth the friction. Tension recorded, not resolved: this FR
  > works against the "adding takes seconds" secondary criterion. It also means an unassigned
  > product state never exists, which answers the user's own open question about unassigned
  > products — by eliminating the case rather than handling it.
- FR-012: User can create a new zone inline while adding a product. Priority: must-have
- FR-013: User can pick an existing zone when assigning a product. Priority: must-have
- FR-014: User can find a previously used product by typing part of its name and picking it,
  with its remembered zone, when building a later list. Priority: must-have
  > Socrates: Counter-argument considered: "after a year the dictionary holds hundreds of
  > entries and scrolling it is slower than typing 'milk'." Resolution: changed. Selection from
  > a full list was replaced by search-as-you-type over remembered products, which scales
  > regardless of dictionary size.
- FR-020: User can remove a product from a list. Priority: must-have
- FR-022: User can change a product's zone assignment after it was first set. Priority: must-have

### Route view and marking
- FR-015: User sees the whole list grouped into zones under zone-name headings, ordered by the
  store's zone order. Priority: must-have
  > Socrates: Counter-argument considered: "showing one zone at a time removes any chance of
  > overlooking an item in the current section." Resolution: whole list kept. Seeing everything
  > at once preserves the ability to look ahead and judge how much is left — it is the paper
  > list's one virtue, now in the right order. Auto-collapsing visited zones was offered and
  > declined as extra logic for the MVP.
- FR-024: A zone created inline while adding a product is appended to the end of the store's
  route, so the list remains sorted at all times. Priority: must-have
  > Socrates: This FR replaced FR-016 and FR-017. The original sketch warned the user that
  > sorting needed a zone order and let a list be saved unsorted until the order existed. That
  > made the first list anyone ever creates unsorted — the product's entire point absent on
  > first use. Appending new zones to the end of the route removes the unsorted state
  > altogether: the list is always sortable, at the cost of one zone sitting in the wrong place
  > in the route until the user reorders it (FR-008). Placing the zone interactively at
  > creation time was offered and declined as too much friction on top of mandatory assignment.
  > Consequence: FR-016 and FR-017 are removed as moot, and the dead end in the originally
  > sketched flow is resolved.
- FR-018: User can mark a product bought by swiping right; it turns green and stays on the
  list. Priority: must-have
- FR-019: User can mark a product unavailable by swiping left; it turns red and stays on the
  list. Priority: must-have
  > Socrates: Counter-argument considered: "nothing in the MVP consumes the red state — it is a
  > colour with no consequence." Resolution: kept. The value is in reading it after the trip to
  > see what still needs buying elsewhere; no automation required. Carrying red items onto the
  > next list automatically was offered and declined for the MVP.
- FR-023: User can undo a green or red mark. Priority: must-have
- FR-026: Marks made without a connection are not lost: they reach the user's account once
  connectivity returns, including when the app is closed and reopened in between.
  Priority: must-have
  > Socrates: Counter-argument considered: "marks that survive the app closing are a slice of
  > the full offline mode that was cut as too expensive -- it re-enters through the back door."
  > Resolution: kept, and the offline non-goal was reworded instead. The non-goal no longer
  > limits the exception to an already-open list; it now says creating lists, zones and stores
  > requires connectivity while marks wait and arrive later. This is the reading consistent
  > with the "no item is ever lost" guardrail.

## Non-Functional Requirements

- An open list remains readable, and items on it remain markable, with no network connection.
  Marks made while there is no connection reach the user's account once connectivity returns.
- Time from tapping a list to seeing its sorted, grouped contents is under one second in the
  typical case.
- The product runs on iOS at the current major version and the one before it, and on Android 14
  or later. The Android floor is 14 because a household phone (Pixel 5) cannot upgrade past it. Revised 2026-11-15; previously "current major version of each and the one
  before it" on both platforms.
- No item added to a list is ever absent from the list view, whatever its zone, its position in
  the sort, or its mark state.
- Privacy: no commitment. The user was offered a binary commitment that list contents never
  leave the user's account and declined it, on the grounds that this is a private project with
  no external users or regulator. Recorded as a deliberate absence, not an oversight.

## Business Logic

Follow orders the items on a list by the order in which the chosen store's zones are walked,
using the zone assigned to each product, and remembers that assignment permanently so every
later list arranges itself without any up-front setup.

The rule consumes two user-supplied inputs: the zone the user attaches to a product the first
time that product appears on any list, and the order the user gives the store's zones. Nothing
else feeds it — no starter dictionary of products or categories, and no model-based guessing at
where a product belongs. The output is the sequence and grouping of the list the shopper reads
while walking the store.

The user meets the rule at two moments. While building a list, every new product costs one
extra decision (its zone) and every product already known costs none, so the rule's input
accumulates as a by-product of normal use rather than as configuration. In the store, the
rule's output is the entire list grouped under zone headings in route order, which is what
removes the backtracking: each zone is read once, while standing in it.

The rule compounds rather than degrades. The first list demands a zone for nearly every item;
by the third or fourth list most items are already known, and the ordering arrives for free.
This is the property that distinguishes Follow from sorting by a generic category dictionary,
which is right on average and wrong for any particular store.

## Access Control

### MVP

A single user with an account: register and sign in (FR-001). Everything the user creates —
lists, zones, the store and its route, and remembered product assignments — belongs to that one
account. Accounts were kept despite the MVP having no sharing, so that introducing households
later does not require moving lists that had only ever existed on one phone into a newly
created account.

### Intended end state (post-MVP)

Multi-user with per-person accounts, grouped into a **household**. Each adult signs in with
their own credentials and belongs to one household; the household is the unit that owns all
shared data. A second person joins an existing household by invitation.

**Role model: flat.** Every household member has equal rights: create and edit lists, define
zones, order zones into a store route, assign products to zones, and mark items bought. No
owner/member split, no permission matrix. This is the smallest access model that still makes a
shared-list product useful.

**Ownership of zones, stores and assignments: the household, not the individual.** One truth
per household — a shared list therefore sorts identically for both people, and a lazy
assignment made by whoever first adds a product applies to both from then on.

> Revision of a pre-locked decision: the user entered shaping with "zones and product-to-zone
> assignments belong to the user". Because lists are shared within a household, per-person zone
> ownership would make the same shared list sort differently for each person and would leave
> "whose assignment wins on first lazy assignment" undefined. The decision was therefore
> changed to household ownership. Per-person store routes (same zones, different walking order)
> were offered and declined as unnecessary complexity.

> Socrates: "What is the smallest access model that still makes the product useful?" — A single
> shared household account would have been cheaper (no invite flow, no membership model). The
> user chose per-person accounts anyway, accepting the cost of an invitation flow in exchange
> for attribution and separate devices.

None of the end-state model is exercised in the MVP: with one user, user-owned and
household-owned are the same thing, and a flat role model has nothing to apply to. These are
decisions on paper only until the sharing work lands — see Open Question 4.

## Non-Goals

### Functional

- **No graphical store-layout editor.** No drawing of floor plans, shelves or maps. A store is
  only an ordered list of zone names. This was the user's entering decision and is now binding:
  the layout editor is the single most expensive thing the product could grow, and the ordered
  zone list captures all of the value the route needs.
- **No zone suggestion of any kind.** No starter dictionary of categories, no model-based
  classification, no inference from other stores or other users. Every assignment is made by
  the user. Rationale: the product's whole claim is that only the user knows their own store,
  and a suggestion engine would reintroduce exactly the generic-category problem Follow exists
  to avoid.
- **No household list sharing in the MVP.** Per-person accounts, invitations and shared lists
  are deferred, even though the primary persona is a two-person household. Cut during shaping
  to fit three weeks. This is the largest gap between the persona and the MVP and is recorded
  as such, not glossed over.
- **No multiple stores, and therefore no per-store assignment overrides.** The MVP knows one
  store. The user reconsidered mid-session, briefly pulled multi-store into the MVP, then
  reverted: one store is enough, with multi-store added later if time allows. Consequence: the
  architecture's core claim — that zones belong to the user and a store is merely an ordering
  of them — is not exercised or validated in the MVP, and the two rules that depend on it stay
  open (see Open Questions 1 and 2).

### Non-functional

- **No full offline mode.** Creating lists, zones or stores requires connectivity. Marking an
  open list is the exception: those marks are not lost and reach the account later (FR-026).
  The user was offered full offline and chose this weaker guarantee after being shown its cost
  in a three-week budget. Reworded on 2026-11-10 — the earlier phrasing limited the exception
  to an already-open list, which contradicted FR-026.
- **No indication that marks are waiting to arrive.** Nothing in the list view shows a pending
  state; marks arrive on their own once connectivity returns. The user was offered a visible
  pending state and declined it to keep the in-store view clean. Cost accepted: a hand-off that
  stalls is not surfaced to the user.
- **No privacy or compliance commitment.** The user was offered a binary commitment that list
  contents never leave their account and declined, on the grounds that this is a private
  project with no external users or regulator. If the user count ever moves past a handful,
  this must be revisited.

## Open Questions

1. **What are the rules for overriding a product's zone assignment for a specific store?** —
   Owner: user. Unresolved. Moot in the MVP (single store); blocking for the multi-store work
   that follows. The user raised this at the start of shaping and it was not closed, because
   the scope that gives it meaning was cut.
2. **What happens when a store's route does not contain a product's zone?** — Owner: user.
   Unresolved for the multi-store case. The MVP sidesteps it: FR-024 appends any new zone to
   the end of the single store's route, so the case cannot arise. Blocking for multi-store.
3. **Which devices and OS versions must the mobile app support?** — RESOLVED 2026-11-10, revised
   2026-11-15: iOS at the current major version plus the one before; Android 14 or later
   (Android 14 covers a household Pixel 5, whose last available version it is). Now
   carried as a non-functional requirement. Raised originally because it constrains the step
   that follows.
4. **How does a second person join a household, and what happens when both edit a list at
   once?** — Owner: user. Deferred along with sharing. The end-state access decisions
   (per-person accounts, flat roles, household-owned zones and assignments) are recorded but
   unexercised in the MVP, so they are decisions on paper only. This is also the gap between
   the stated persona (a two-person household) and the MVP (one user).
5. **Unresolved tension: mandatory zone assignment vs fast adding.** FR-011 requires a zone
   before a product can be added; the secondary criterion requires adding an item to take
   seconds from a phone. The user chose mandatory assignment knowing this. If adding proves too
   slow in use, one of the two has to give.
6. **No market-gap insight.** The user's own answer is that existing tools already solve this
   and the motivation is ownership and personal fit. Acceptable for a private project at the
   stated scale; it would have to be rewritten before any attempt at distribution.

> Shaping quality cross-check re-run on 2026-11-10 recorded status `accepted` with no gate
> gaps (the original 2026-11-08 run also recorded `accepted`). Open Question 3 is resolved and
> carries its answer inline; five remain open. The three worth watching are Open Questions 4,
> 5, and 1–2.
