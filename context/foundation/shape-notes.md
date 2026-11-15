---
project: "Follow"
context_type: greenfield
created: 2026-11-08
updated: 2026-11-10
checkpoint:
  current_phase: 8
  phases_completed: [1, 2, 3, 4, 5, 6, 7]
  gray_areas_resolved:
    - topic: "pain category"
      decision: "workflow friction + data trapped on paper + missing feature in generic apps"
    - topic: "insight / why build it"
      decision: "no market gap; existing tools solve it. Motivation is ownership and personal fit"
    - topic: "primary persona scope / list sharing"
      decision: "two-person household, lists shared between both adults"
    - topic: "auth strategy"
      decision: "per-person accounts grouped into a household; join by invitation"
    - topic: "ownership of zones / stores / assignments"
      decision: "household-owned, one truth; revises the user's pre-locked user-owned stance"
    - topic: "role separation"
      decision: "flat - all household members have equal rights"
    - topic: "MVP scope vs timeline"
      decision: "scoped down from 6 weeks/48h to 3 weeks; cut households, multi-store, drag-reorder"
    - topic: "swipe gestures in v1"
      decision: "both directions kept - right green bought, left red unavailable"
    - topic: "multi-store in v1"
      decision: "deferred to v2; v1 supports a single store"
    - topic: "guardrails"
      decision: "no item lost; usable on weak connectivity; list opens fast"
    - topic: "new zone not yet in the store route"
      decision: "appended to the end of the route; the unsorted-list state is eliminated"
    - topic: "unassigned product behaviour"
      decision: "cannot occur - zone assignment is mandatory when a product is first added"
    - topic: "remembered-product selection"
      decision: "typeahead search, not a scrollable dictionary"
    - topic: "in-store view"
      decision: "whole list grouped under zone headings, in route order"
    - topic: "domain rule"
      decision: "route-order sorting plus permanent product-to-zone memory that compounds"
    - topic: "offline guardrail strength"
      decision: "an open list stays readable and markable offline; marks sync on reconnect"
    - topic: "list open time"
      decision: "under one second from tap to sorted contents"
    - topic: "privacy commitment"
      decision: "none - declined deliberately; private project, no external users"
    - topic: "product surface"
      decision: "mobile app"
    - topic: "scale at launch"
      decision: "a handful of people; rule is unaffected by scale - zones are local by nature"
    - topic: "hard deadline"
      decision: "2026-12-31, with a 3-week target; the slack is a buffer, not extra scope"
    - topic: "multi-store in v1 (revisited)"
      decision: "briefly pulled into v1, then reverted - non-goal; added later if time allows"
    - topic: "recovery on a new device"
      decision: "store, zones, route order and remembered products return; lists do not"
    - topic: "offline marks across app restarts"
      decision: "marks are kept on the device and sent later; offline non-goal reworded to match"
    - topic: "visibility of pending marks"
      decision: "none - sending is silent and retries on reconnect; recorded as a non-goal"
    - topic: "supported devices and OS versions"
      decision: "iOS: current major version plus the one before; Android: 14+ (revised 2026-11-15 - household Pixel 5 tops out at Android 14)"
  frs_drafted: 23
  quality_check_status: accepted
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

# Shape notes

## Seed idea (verbatim, user-supplied)

> Aplikacja do list zakupów sortująca listę zgodnie z trasą przejścia przez wybrany sklep.
> Wiele list na użytkownika; oznaczanie kupionego przesunięciem w prawo.

### Decisions the user brought into the session (pre-locked)

- MVP bez graficznego edytora rzutu — sklep jako uporządkowana lista stref.
- Strefy i przypisania produktów do stref należą do użytkownika; sklep jest tylko
  uporządkowaniem tych stref, z możliwością nadpisania przypisania dla konkretnego sklepu.
- Przypisania robi użytkownik — bez słownika startowego i bez klasyfikacji modelem.
- Przypisanie następuje leniwie: przy pierwszym pojawieniu się produktu na liście;
  produkt zostaje zapamiętany i jest wybieralny przy kolejnych listach.

### Flagged by the user for resolution in this session

- Zasady nadpisania przypisania per sklep.
- Zachowanie, gdy sklep nie ma danej strefy w trasie.
- Zachowanie dla produktu nieprzypisanego.
- Czy listy są współdzielone między użytkownikami.

### Optional, explicitly NOT approved by the user

- Graficzny edytor rzutu sklepu.
- Podpowiadanie strefy na podstawie innych sklepów użytkownika.

---

## Vision & Problem Statement

A person doing the household's larger grocery run arrives with a complete list written
in arbitrary order — typically on paper, accumulated over 2–3 days. Because the list's
order bears no relation to the store's physical layout, the shopper must re-scan the
entire list at every section to find what belongs there. This manual mapping fails
regularly: halfway through or near the end of the trip, an item from an already-passed
section surfaces, and the shopper walks back across the store. The cost is time and
irritation on every larger shop, and it recurs because paper cannot remember the route.

The insight is not a market gap. Shopping-list apps with section sorting exist and work;
the user's stated motivation for building this is owning the solution and fitting it to
their own habits rather than filling an unserved need. What generic list apps do lack is
knowledge of the route through a *specific* store: they sort by a universal category
dictionary (dairy, bakery, chemicals) that does not match the physical order of zones in
any particular shop. Follow's position is that the zones and the route are the user's
data, not the vendor's — the user defines their own zones, orders them per store, and
assigns products to them. No starter dictionary, no model-based classification.

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
household (the user and their spouse). Either adult may be the one shopping; both add items
to the same list over the days preceding a trip. They reach for the product at two distinct
moments: (1) during the 2–3 days when items accumulate and someone remembers something, and
(2) in the store, walking the route, needing the list to be already ordered so no section is
left behind.

Scope decision: **lists are shared within the household** — both people see and edit the same
lists. This resolves the open question the user flagged at session start ("czy listy są
współdzielone między użytkownikami") in the affirmative, scoped to a household rather than to
arbitrary sharing between unrelated users. Cost acknowledged: shared lists require accounts
and an access model in the MVP; see `## Access Control` and `## Success Criteria`.

## Access Control

Multi-user with per-person accounts, grouped into a **household**. Each adult signs in with
their own credentials and belongs to one household; the household is the unit that owns all
shared data. A second person joins an existing household by invitation — this implies an
invite capability in the MVP (see Functional Requirements).

**Role model: flat.** Every household member has equal rights: create and edit lists, define
zones, order zones into a store route, assign products to zones, and mark items bought. No
owner/member split, no permission matrix. This is the smallest access model that still makes
the shared-list MVP useful.

**Ownership of zones, stores and assignments: the household, not the individual.** One truth
per household — a shared list therefore sorts identically for both people, and a lazy
assignment made by whoever first adds a product applies to both from then on.

> Revision of a pre-locked decision: the user entered this session with "strefy i przypisania
> produktów do stref należą do użytkownika". Because lists are shared within a household,
> per-person zone ownership would make the same shared list sort differently for each person
> and would leave "whose assignment wins on first lazy assignment" undefined. The decision was
> therefore changed to household ownership. Per-person store routes (same zones, different
> walking order) were offered and declined as unnecessary complexity for the MVP.

> Socrates: "What is the smallest access model that still makes the MVP useful?" — A single
> shared household account would have been cheaper (no invite flow, no membership model). The
> user chose per-person accounts anyway, accepting the cost of an invitation flow in exchange
> for attribution and separate devices. Cost carried forward into the timeline budget.

## MVP flow (user-sketched, scoped down)

The user's original sketch had 13 distinct steps before value was delivered, estimated at
6 weeks x 8h = 48 hours after-hours. Both scope-cost thresholds tripped; the user chose to
scope down. Recorded sketch, after cuts:

```
1. Sign in
2. "My lists" screen -> "Add new list" (green plus)
3. List-creation view; store selector at the top
4. First run: create the store -- name, optionally zones, optionally their order
5. The store auto-selects on the new list
6. "Add product" (green plus) -> name + pick an existing zone, or type a new zone inline
7. Repeat for several products; zones typed inline are immediately selectable
8. If the store has no zone order yet, a notice says sorting requires one
9. The list can be saved regardless, and stays unsorted until the order exists
10. Edit the store -> set zone order (zone names only, no layout drawing)
11. Back on the list -> it now renders sorted by route
12. In the store: swipe right = green (bought; the row stays on the list)
13. In the store: swipe left = red (the product was not available)
```

### Known flaw in the sketched happy path (surfaced, not yet resolved)

Steps 8-11 are a dead end on the main path. On the very first list a user creates, the store
will usually have no zone order, because zones were being typed inline while adding products.
The default first experience is therefore "list created, list unsorted, go elsewhere to fix
it" -- the one feature that is the entire point of the product does not work on first use.
RESOLVED in the Socratic round (see FR-024): a zone created inline is appended to the end of
the store's route, so a list is always sorted and the unsorted state no longer exists. FR-016
and FR-017, which existed to manage that state, were removed.

### Scope cuts taken (v1)

- Cut: households, per-person accounts, invitations, shared lists. v1 is single-user.
  This reverses the Phase 2 decisions for v1 and turns household sharing into an explicit
  MVP non-goal rather than a forgotten feature.
- Cut: multiple stores. v1 knows one store.
- Replaced: zone ordering uses up/down controls, not drag-and-drop reordering.
- Kept: both swipe directions. The user declined cutting them -- swipe-right is in the seed
  idea and is the product's signature interaction; cutting gestures saved the least and cost
  the most in product identity.

## Success Criteria

### Primary
- The shopper walks the store in a single pass with no backtracking, because the list is
  already ordered to match the route. No item from an already-passed zone surfaces late.

### Secondary
- The remembered product dictionary makes later lists faster: the second and third lists are
  built mostly by picking already-known products rather than typing them from scratch.
- Adding an item to a list takes seconds from a phone, with no detour into store or zone
  editing -- so a list can accumulate over the 2-3 days before a trip.
- Support for more than one store, each with its own zone order. Explicitly v2: the user
  scoped v1 to a single store.

### Guardrails
- No item is ever lost. A product added to a list never disappears from view -- not through
  sorting, not through a gesture, not through having no zone. Losing an item is precisely the
  pain this product exists to remove.
- A list stays usable with weak or absent connectivity. An open list remains readable and
  markable in the store without a connection. (Cost flagged: this is the most expensive
  guardrail chosen; its exact strength is pinned down in Non-Functional Requirements.)
- A list opens fast enough not to stall the shopper at the store entrance: time from tapping
  a list to seeing its sorted contents is short enough to not interrupt walking in.

## Functional Requirements

Scope: v1 -- single user, single store. Household sharing and multiple stores are non-goals
for the MVP (see `## Non-Goals`).

### Account
- FR-001: User can register and sign in. Priority: must-have
  > Socrates: Counter-argument considered: "v1 is single-user and single-store, so accounts
  > are a whole layer serving nothing." Resolution: kept. Adding accounts later would require
  > migrating on-device data into an account; doing it up front is cheaper even though v1
  > itself gains nothing from it.

- FR-025: User can sign in on a new device and recover the store with its zones and their
  order, and the remembered products with their zone assignments. Lists are not recovered.
  Priority: must-have
  > Socrates: Counter-argument considered: "full recovery is the most expensive thing in the
  > MVP -- every object needs a consistent state on the account side, which is more work than
  > all the screens together and a real risk to the 2026-12-31 deadline." Resolution: narrowed.
  > Recovery covers the store, its zones, the route order, and the remembered products with
  > their assignments -- the accumulation of months that the product exists to build. Lists are
  > not recovered: a list is single-use and loses its meaning once the shop is done.

### Lists
- FR-002: User can see all their shopping lists on one screen. Priority: must-have
- FR-003: User can create a new shopping list. Priority: must-have
- FR-004: User can keep multiple lists at the same time. Priority: must-have
  > Socrates: Counter-argument considered: "one rolling list fits the 2-3 day accumulation
  > habit; simultaneous lists are a feature with no use in v1." Resolution: kept. A completed
  > list is retained as a record of that shop while a new one starts separately, so lists
  > necessarily coexist even when only one is active.
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
  > action distinct from "change the order" -- only reordering exists.

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
  > products -- by eliminating the case rather than handling it.
- FR-012: User can create a new zone inline while adding a product. Priority: must-have
- FR-013: User can pick an existing zone when assigning a product. Priority: must-have
- FR-014: User can find a previously used product by typing part of its name and picking it,
  with its remembered zone, when building a later list. Priority: must-have
  > Socrates: Counter-argument considered: "after a year the dictionary holds hundreds of
  > entries and scrolling it is slower than typing 'milk'." Resolution: changed. Selection
  > from a full list was replaced by typeahead search over remembered products, which scales
  > regardless of dictionary size.
- FR-020: User can remove a product from a list. Priority: must-have
- FR-022: User can change a product's zone assignment after it was first set. Priority: must-have

### Route view and marking
- FR-015: User sees the whole list grouped into zones under zone-name headings, ordered by
  the store's zone order. Priority: must-have
  > Socrates: Counter-argument considered: "showing one zone at a time removes any chance of
  > overlooking an item in the current section." Resolution: whole list kept. Seeing
  > everything at once preserves the ability to look ahead and judge how much is left -- it is
  > the paper list's one virtue, now in the right order. Auto-collapsing visited zones was
  > offered and declined as extra logic for v1.
- FR-024: A zone created inline while adding a product is appended to the end of the store's
  route, so the list remains sorted at all times. Priority: must-have
  > Socrates: This FR replaced FR-016 and FR-017. The original sketch warned the user that
  > sorting needed a zone order and let a list be saved unsorted until the order existed. That
  > made the first list anyone ever creates unsorted -- the product's entire point absent on
  > first use. Appending new zones to the end of the route removes the unsorted state
  > altogether: the list is always sortable, at the cost of one zone sitting in the wrong place
  > in the route until the user reorders it (FR-008). Placing the zone interactively at
  > creation time was offered and declined as too much friction on top of mandatory assignment.
  > Consequence: FR-016 and FR-017 are removed as moot, and the dead end in steps 8-11 of the
  > sketched flow is resolved.
- FR-018: User can mark a product bought by swiping right; it turns green and stays on the list. Priority: must-have
- FR-019: User can mark a product unavailable by swiping left; it turns red and stays on the
  list. Priority: must-have
  > Socrates: Counter-argument considered: "nothing in v1 consumes the red state -- it is a
  > colour with no consequence." Resolution: kept. The value is in reading it after the trip
  > to see what still needs buying elsewhere; no automation required. Carrying red items onto
  > the next list automatically was offered and declined for v1.
- FR-023: User can undo a green or red mark. Priority: must-have
- FR-026: Marks made without a connection are kept on the device and reach the account when
  connectivity returns, including after the app has been closed and reopened. Priority: must-have
  > Socrates: Counter-argument considered: "keeping marks across app restarts means holding
  > state on the device, which is the full offline mode that was cut as too expensive -- it
  > re-enters through the back door." Resolution: kept, and the offline non-goal was reworded
  > instead. The non-goal no longer limits the exception to "an already-open list"; it now says
  > creating lists, zones and stores requires connectivity while marks wait and are sent later.
  > This is the reading consistent with the "no item is ever lost" guardrail.

## User Stories

### US-01: Shopper walks the store in one pass

- **Given** a saved list whose store has an established zone order
- **When** the shopper opens the list in the store
- **Then** items appear grouped and ordered by the store's zone order, so each zone is
  visited once and no item from an already-passed zone surfaces later

### US-02: A product gets its zone the first time it appears

- **Given** a product name the user has never used before
- **When** the user adds it to a list
- **Then** the user is asked for its zone, may pick an existing zone or type a new one, and
  the product is remembered with that zone for all later lists

### US-03: Marking during the shop

- **Given** an open list in the store
- **When** the shopper swipes a row right
- **Then** it turns green as bought and stays on the list; swiping left turns it red as
  unavailable and it also stays; either mark can be undone

## Business Logic

Follow orders the items on a list by the order in which the chosen store's zones are walked,
using the zone assigned to each product, and remembers that assignment permanently so every
later list arranges itself without any up-front setup.

The rule consumes two user-supplied inputs: the zone the user attaches to a product the first
time that product appears on any list, and the order the user gives the store's zones. Nothing
else feeds it -- no starter dictionary of products or categories, and no model-based guessing
at where a product belongs. The output is the sequence and grouping of the list the shopper
reads while walking the store.

The user meets the rule at two moments. While building a list, every new product costs one
extra decision (its zone) and every product already known costs none, so the rule's input
accumulates as a by-product of normal use rather than as configuration. In the store, the
rule's output is the entire list grouped under zone headings in route order, which is what
removes the backtracking: each zone is read once, while standing in it.

The rule compounds rather than degrades. The first list demands a zone for nearly every item;
by the third or fourth list most items are already known, and the ordering arrives for free.
This is the property that distinguishes Follow from sorting by a generic category dictionary,
which is right on average and wrong for any particular store.

## Non-Functional Requirements

- An open list remains readable, and items on it remain markable, with no network connection.
  Marks made without a connection reach the user's account once connectivity returns.
- Time from tapping a list to seeing its sorted, grouped contents is under one second in the
  typical case.
- The app runs on iOS, supporting the current major version and the one before it, and on
  Android 14 or later (Android 14 covers a household Pixel 5; revised
  2026-11-15).
- No item added to a list is ever absent from the list view, whatever its zone, its position
  in the sort, or its mark state.
- Privacy: no commitment. The user was offered a binary commitment that list contents never
  leave the user's account and declined it, on the grounds that this is a private project with
  no external users or regulator. Recorded as a deliberate absence, not an oversight.

## Access Control (v1 reality)

The Phase 2 decisions above describe the intended end state. The Phase 3 scope cut means v1
ships only part of it:

- **In v1**: a single user with an account (register and sign in, FR-001). Accounts were kept
  despite v1 having no sharing, so that adding households in v2 does not require migrating
  on-device data into an account.
- **Not in v1**: households, per-person membership, invitations, shared lists, and therefore
  the flat role model, which has nothing to apply to while there is one user. Household
  ownership of zones and assignments is likewise unexercised: with one user, user-owned and
  household-owned are the same thing.

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
  are deferred to v2, even though the primary persona is a two-person household. Cut in Phase 3
  to fit three weeks. This is the largest gap between the persona and the MVP and is recorded
  as such, not glossed over.
- **No multiple stores, and therefore no per-store assignment overrides.** v1 knows one store.
  The user reconsidered mid-session, briefly pulled multi-store into v1, then reverted: one
  store is enough for the MVP, with multi-store added later if time allows. Consequence: the
  architecture's core claim -- that zones belong to the user and a store is merely an ordering
  of them -- is not exercised or validated in v1, and the two rules that depend on it stay open
  (see Open Questions 1 and 2).

### Non-functional

- **No full offline mode.** Creating lists, zones or stores requires connectivity. Marking an
  open list is the exception: marks are kept on the device and reach the account later
  (FR-026). The user was offered full offline and chose this weaker guarantee after being shown
  its cost in a three-week budget.
  > Reworded on 2026-11-10. The earlier phrasing scoped the exception to "an already-open list",
  > which contradicted FR-026: marks now survive the app being closed. The non-goal was the side
  > that gave way; see the Socratic block under FR-026.
- **No visible indication that marks are waiting to be sent.** Sending happens silently and
  retries once connectivity returns; nothing in the list view shows a pending state. The user
  was offered a visible pending indicator and declined it to keep the in-store view clean. Cost
  accepted: a sync that stalls is not surfaced to the user.
- **No privacy or compliance commitment.** The user was offered a binary commitment that list
  contents never leave their account and declined, on the grounds that this is a private project
  with no external users or regulator. If the user count ever moves past a handful, this must be
  revisited.

## Forward: tech-stack

No stack content was volunteered or asked for in this session, by design. For the downstream
stack-selection step, the product-level constraints captured here that bear on it are: a mobile
app is the target surface, running on iOS at the current major version plus the one before
and on Android 14 or later; an open list must stay readable and markable without connectivity, with
marks kept on the device and reconciled later even if the app is closed in between, and with
no pending-state indicator shown; signing in on a new device must restore the store, its
zones, the route order and the remembered product assignments, but not the lists; swipe
gestures in both directions are a required interaction, not a nice-to-have; and zone
reordering uses up/down controls rather than drag-and-drop in v1.

## Open Questions

1. **What are the rules for overriding a product's zone assignment for a specific store?** —
   Owner: user. Unresolved. Moot in v1 (single store); blocking for the multi-store work in v2.
   The user raised this at session start and it was not closed, because the scope that gives it
   meaning was cut.
2. **What happens when a store's route does not contain a product's zone?** — Owner: user.
   Unresolved for the multi-store case. v1 sidesteps it: FR-024 appends any new zone to the end
   of the single store's route, so the case cannot arise. Blocking for v2.
3. **Which devices and OS versions must the mobile app support?** — RESOLVED on 2026-11-10,
   revised 2026-11-15: iOS at the current major version plus the one before it; Android 14 or
   later (Android 14 covers a household Pixel 5, whose last available version it
   is). Captured as a non-functional requirement. Raised originally because it constrains the stack-selection step.
4. **How does a second person join a household, and what happens when both edit a list at
   once?** — Owner: user. Deferred to v2 along with sharing. The Phase 2 decisions (per-person
   accounts, flat roles, household-owned zones and assignments) are recorded but unexercised in
   v1, so they are decisions on paper only.
5. **Unresolved tension: mandatory zone assignment vs fast adding.** FR-011 requires a zone
   before a product can be added; the secondary criterion requires adding an item to take
   seconds from a phone. The user chose mandatory assignment knowing this. If adding proves too
   slow in use, one of the two has to give.
6. **No market-gap insight.** The user's own answer is that existing tools already solve this
   and the motivation is ownership and personal fit. Acceptable for a private project at the
   stated scale; it would have to be rewritten before any attempt at distribution.

## Quality cross-check

Re-run on 2026-11-10 after Phases 4 and 5 were revisited. All gates present; status
`accepted`. Original run on 2026-11-08 also recorded `accepted`.

| Check | Result |
| --- | --- |
| Access Control | present |
| Business Logic (one-sentence rule) | present |
| Project artifacts | present |
| Timeline-cost acknowledged | present (mvp_weeks 3, at target) |
| Non-Goals | present (4 functional, 3 non-functional) |
| Preserved behavior | n/a (greenfield) |

No gate gaps. The substantive weaknesses are recorded as Open Questions rather than as gate
failures, and `/10x-prd` should mirror them into its `## Open Questions`. Open Question 3 is now
resolved and carries its answer inline; the remaining five stay open. The three worth watching:
the persona is a two-person household while the MVP is single-user (OQ 4); mandatory zone
assignment works against the "adding takes seconds" criterion (OQ 5); and a single-store v1
leaves the core architecture claim unvalidated (OQ 1 and 2).

Changes in the 2026-11-10 pass: FR-025 (recovery on a new device, narrowed to the store, its
zones, the route order and the remembered assignments) and FR-026 (offline marks survive the app
closing) were added with Socratic blocks; a supported-devices requirement was added; the offline
non-goal was reworded because it contradicted FR-026; a non-goal recording the absence of any
pending-sync indicator was added; and Open Question 3 was closed.
