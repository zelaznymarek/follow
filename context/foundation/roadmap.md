---
project: Follow
version: 1
status: draft                    # draft | active | locked
created: 2026-11-15
updated: 2026-11-15
prd_version: 1
main_goal: speed
top_blocker: time
milestone_id: first-single-pass-shop
milestone_seq: 1
milestone_status: open           # open | done
---

# Roadmap: Follow

> Derived from `context/foundation/prd.md` (v1) + auto-researched codebase baseline.
> Edit-in-place; the next milestone continues this file. Archive only when an independent roadmap replaces it.
> Slices below are listed in dependency order. The "At a glance" table is the index.

## Milestone

**M-01: First single-pass shop** — Status: open

- **Intent:** One shopper can build shopping lists on their own phone over the days before a trip, then walk one store in a single pass with the list grouped in route order, marking items even without signal. This is the PRD's full MVP scope.
- **Source materials:** `context/foundation/prd.md` (v1)
- **Done when:** every F-NN and S-NN below is `done`. An iOS build is not required to close M-01 (user decision, 2026-11-15).
- **Scope anchors:** all 23 must-have FRs — FR-001 to FR-008, FR-010 to FR-015, FR-018 to FR-026 (FR-009, FR-016 and FR-017 were merged or removed in the PRD); US-01 to US-03; the PRD's non-functional requirements (offline read/mark, list opens in under one second, Android 14+ — iOS deferred past M-01, no item ever absent from the list view).

## Vision recap

A household shopper arrives at the store with a list written in arbitrary order, so they re-scan the whole list at every section and still walk back for items from sections already passed. Follow orders the list by the user's own zones, walked in the user's own route order through their store; each product's zone is asked once, the first time it appears, and remembered for every later list. There is no starter category dictionary and no automatic classification — the zones and the route are the user's data.

## North star

**S-05: user can mark items bought or unavailable by swiping, and keep marking an open list with no connection** — chosen as the first proof because "no item is ever lost" is the PRD's hardest guarantee and the one most likely to fail technically; with speed as the sequencing goal, the riskiest slice goes as early as its prerequisites allow so a failure surfaces while there is still slack before 2026-12-31.

> "North star" here means the smallest end-to-end slice whose successful delivery proves the product can be trusted in the store — placed as early as its prerequisites allow, because the rest only matters if this works.

## At a glance

| ID   | Change ID              | Outcome (user can …)                                                                 | Prerequisites | PRD refs                                                   | Status   |
| ---- | ---------------------- | ------------------------------------------------------------------------------------ | ------------- | ---------------------------------------------------------- | -------- |
| F-01 | first-android-deploy   | (foundation) app installs on Android phones from a preview build; backend project linked | —             | NFR: platforms, FR-001                                     | ready    |
| F-02 | play-internal-testing  | (foundation) app ships to the household through the Play internal-testing track      | F-01, Google Play verification cleared | NFR: platforms                    | proposed |
| S-01 | account-sign-in        | register, sign in and stay signed in                                                 | F-01          | FR-001                                                     | proposed |
| S-02 | shopping-lists         | create, see, keep several, reopen and delete lists                                   | S-01          | FR-002, FR-003, FR-004, FR-005, FR-021                     | proposed |
| S-03 | store-and-zones        | name the store, define its zones and reorder them                                    | S-01          | FR-006, FR-007, FR-008                                     | proposed |
| S-04 | add-product-with-zone  | add a product to a list, giving it a zone the first time; remove a product           | S-02, S-03    | US-02, FR-010, FR-011, FR-012, FR-013, FR-020, FR-024      | proposed |
| S-05 | offline-marking        | swipe to mark bought/unavailable, undo, and keep marking with no connection          | S-04          | US-03, FR-018, FR-019, FR-023, FR-026, NFR: offline        | proposed |
| S-06 | route-ordered-list     | see the list grouped under zone headings in route order, fast                        | S-04          | US-01, FR-015, NFR: list opens < 1 s                       | proposed |
| S-07 | product-memory-search  | find a remembered product by part of its name; change a product's zone               | S-04          | FR-014, FR-022                                             | proposed |
| S-08 | new-device-restore     | sign in on a new device and find store, zones, order and remembered products         | S-03, S-04    | FR-025                                                     | proposed |

## Streams

Navigation aid — groups items that share a Prerequisites chain. Canonical ordering still lives in the dependency graph below; this table is the proposed reading order across parallel tracks.

| Stream | Theme                    | Chain                                          | Note                                                                                              |
| ------ | ------------------------ | ---------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| A      | Path to the north star   | `F-01` → `S-01` → `S-02` → `S-04` → `S-05`     | Shortest chain of required work to the riskiest slice — the speed goal applied.                   |
| B      | Store route              | `S-03` → `S-08`                                | Joins Stream A at `S-01` (needs sign-in); feeds `S-04`; `S-08` also needs `S-04`.                 |
| C      | Route-ordered view       | `S-06`                                         | Branches from Stream A at `S-04`; runs alongside `S-05`; delivers the primary success criterion.  |
| D      | Product memory           | `S-07`                                         | Branches from Stream A at `S-04`; eases the mandatory-zone friction on later lists.               |
| E      | Store release            | `F-02`                                         | Branches from Stream A at `F-01`; runs whenever Play verification clears — expected around `S-03`; no slice waits on it. |

## Baseline

What's already in place in the codebase as of `2026-11-15` (auto-researched + user-confirmed).
Foundations below assume these are present and do NOT re-scaffold them.

- **Frontend:** partial — Expo SDK 58 starter with file-based routing and demo tabs (`src/app/index.tsx`, `src/app/explore.tsx`), themed components, gesture and animation libraries installed; no product screens.
- **Backend / API:** absent by design — no own API tier; per `tech-stack.md` a managed backend (Supabase) serves the app directly, not yet added.
- **Data:** absent — no backend client, schema or migrations; no on-device storage.
- **Auth:** absent — per `tech-stack.md` the managed backend's auth will be used; nothing wired.
- **Deploy / infra:** absent — no build/submit config, no Android package id, no backend project link, no CI; `context/deployment/deploy-plan.md` is written; Expo and Supabase accounts exist, Google Play Console account awaits identity verification (updated 2026-11-15).
- **Observability:** absent — no logging or error tracking (Jest + Biome provide local verification only).

## Foundations

### F-01: First Android deployment with the backend project linked

- **Outcome:** (foundation) the app installs on a physical Android phone from a preview build, over-the-air updates reach it, and the backend project exists and is linked to the repo with its connection settings in the build environment (deploy plan Phases 1–3).
- **Change ID:** first-android-deploy
- **PRD refs:** NFR: platforms (Android 14+ in M-01; iOS parked), FR-001 (accounts need a backend project), NFR: offline read/mark (needs a real-device verification path)
- **Unlocks:** S-01 (sign-in needs the backend project); verification path for S-05 — marking with no connection is tested on the household Pixel 5 (Android 14) in airplane mode; every later slice reaches the phone through preview builds or over-the-air updates.
- **Prerequisites:** —
- **Parallel with:** —
- **Blockers:** — (Expo and Supabase accounts exist; Google Play is not needed here — see F-02)
- **Unknowns:** —
- **Risk:** Sequenced first because the north star can only be proven on a real phone without signal; the plan already exists in `context/deployment/deploy-plan.md`, so this is execution, not design. The Play release was split out into F-02 so waiting for Play verification does not hold up the slices.
- **Status:** ready

### F-02: Release to the Play internal-testing track

- **Outcome:** (foundation) a production build reaches the Google Play internal-testing track and the household installs and updates the app from Play instead of a sideloaded preview build (deploy plan Phase 4).
- **Change ID:** play-internal-testing
- **PRD refs:** NFR: platforms (Android 14+ in M-01)
- **Unlocks:** verification path for S-05 — the final in-store check of offline marking runs on the build installed the way the household will actually use it.
- **Prerequisites:** F-01, Google Play verification cleared
- **Parallel with:** S-01, S-02, S-03, S-04, S-05, S-06, S-07, S-08
- **Blockers:** Google Play Console identity verification (pending since 2026-11-15; can take days); the store listing also needs a privacy-policy URL and the Data safety form (infrastructure.md).
- **Unknowns:** —
- **Risk:** Split out of F-01 so the external wait runs in the background — expected to land around S-03, but no slice depends on it; the application id becomes permanent on first upload, so it must match F-01's.
- **Status:** proposed

## Slices

### S-01: Account

- **Outcome:** user can register, sign in, and stay signed in on their phone.
- **Change ID:** account-sign-in
- **PRD refs:** FR-001
- **Prerequisites:** F-01
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Comes before any data because everything the user creates belongs to the account (PRD §Access Control) — adding accounts later would mean migrating device-only data; sign-in redirect configuration is the kind of native change that burns preview builds (infrastructure.md risk register).
- **Status:** proposed

### S-02: Shopping lists

- **Outcome:** user can create a list, see all their lists on one screen, keep several at once, reopen one later, and delete one.
- **Change ID:** shopping-lists
- **PRD refs:** FR-002, FR-003, FR-004, FR-005, FR-021
- **Prerequisites:** S-01
- **Parallel with:** S-03
- **Blockers:** —
- **Unknowns:** —
- **Risk:** First slice that stores real data in the account; the free backend tier pauses after 7 idle days (infrastructure.md), so its keep-alive mitigation lands here rather than earlier.
- **Status:** proposed

### S-03: Store and zones

- **Outcome:** user can name their store, define its zones, and change the zones' order in a view that shows zone names only.
- **Change ID:** store-and-zones
- **PRD refs:** FR-006, FR-007, FR-008
- **Prerequisites:** S-01
- **Parallel with:** S-02
- **Blockers:** —
- **Unknowns:**
  - Does the user name the store explicitly before adding the first product, or is the store name asked for the first time a zone is needed? — Owner: user. Block: no.
- **Risk:** Must land before S-04 because zones created inline are appended to this store's route (FR-024); reordering uses up/down controls rather than drag-and-drop (shape-notes, Forward: tech-stack).
- **Status:** proposed

### S-04: Add a product with its zone

- **Outcome:** user can add a product to a list by name, choosing an existing zone or creating a new one inline the first time the product appears (a new zone goes to the end of the route), and can remove a product from a list.
- **Change ID:** add-product-with-zone
- **PRD refs:** US-02, FR-010, FR-011, FR-012, FR-013, FR-020, FR-024
- **Prerequisites:** S-02, S-03
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** The only way items get onto a list, so every later slice waits on it; it also carries the product's main friction — a mandatory zone on first use works against "adding takes seconds" (Open Roadmap Question 4).
- **Status:** proposed

### S-05: Mark items in the store, even offline

- **Outcome:** user can swipe a row right to mark it bought (green) or left to mark it unavailable (red), undo either mark, and keep reading and marking an open list with no connection; marks reach the account once connectivity returns, including after the app is closed and reopened.
- **Change ID:** offline-marking
- **PRD refs:** US-03, FR-018, FR-019, FR-023, FR-026, NFR: offline read/mark, NFR: no item absent from the list view
- **Prerequisites:** S-04
- **Parallel with:** S-06, S-07, S-08
- **Blockers:** —
- **Unknowns:**
  - Must every list be readable offline, or only a list already opened on this device while online? — Owner: user. Block: no.
- **Risk:** Highest technical risk in the PRD — marks kept on the device must survive app restarts, over-the-air updates and an expired session while offline (infrastructure.md risk register); placed straight after the first slice that puts items on a list so a failure surfaces while there is still slack.
- **Status:** proposed

### S-06: Route-ordered list view

- **Outcome:** user can open a list and see every item grouped under zone-name headings in the store's route order, within one second in the typical case.
- **Change ID:** route-ordered-list
- **PRD refs:** US-01, FR-015, NFR: list opens in under one second
- **Prerequisites:** S-04
- **Parallel with:** S-05, S-07, S-08
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Delivers the primary success criterion; runs alongside the north star rather than after it because both need only items on a list — whichever lands second must keep marks and grouping working together without hiding any item.
- **Status:** proposed

### S-07: Remembered products

- **Outcome:** user can find a previously used product by typing part of its name and add it with its remembered zone, and can change a product's zone assignment later.
- **Change ID:** product-memory-search
- **PRD refs:** FR-014, FR-022
- **Prerequisites:** S-04
- **Parallel with:** S-05, S-06, S-08
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Makes the second and third lists fast (secondary success criterion) and is the main relief for the mandatory-zone friction; changing a zone must re-sort open lists without losing any item.
- **Status:** proposed

### S-08: Restore on a new device

- **Outcome:** user can sign in on a new device and find the store, its zones and their order, and the remembered products with their zones already in place; lists are not restored.
- **Change ID:** new-device-restore
- **PRD refs:** FR-025
- **Prerequisites:** S-03, S-04
- **Parallel with:** S-05, S-06, S-07
- **Blockers:** —
- **Unknowns:**
  - Does "lists are not restored" mean lists must not appear on a new device, or only that restoring them is not required? — Owner: user. Block: no.
- **Risk:** Mostly proves nothing the user built lives only on the old phone; if S-05 lands first, its on-device copy must not become the source of truth for store, zones or remembered products.
- **Status:** proposed

## Backlog Handoff

| Roadmap ID | Change ID             | Suggested issue title                                         | Ready for `/10x-plan` | Notes |
| ---------- | --------------------- | ------------------------------------------------------------- | --------------------- | ----- |
| F-01       | first-android-deploy  | First Android deployment with backend project linked          | yes                   | Run `/10x-plan first-android-deploy`; reuse Phases 1–3 of `context/deployment/deploy-plan.md`. |
| F-02       | play-internal-testing | Release Follow to the Play internal-testing track             | no                    | Waits on F-01 and Google Play verification |
| S-01       | account-sign-in       | User can register and sign in                                 | no                    | Waits on F-01 |
| S-02       | shopping-lists        | User can create, see, reopen and delete shopping lists        | no                    | Waits on S-01 |
| S-03       | store-and-zones       | User can name the store and order its zones                   | no                    | Waits on S-01 |
| S-04       | add-product-with-zone | User can add a product to a list with its zone                | no                    | Waits on S-02, S-03 |
| S-05       | offline-marking       | User can mark items by swipe, including offline               | no                    | Waits on S-04; north star |
| S-06       | route-ordered-list    | User sees the list grouped in route order                     | no                    | Waits on S-04 |
| S-07       | product-memory-search | User can find remembered products and change their zone       | no                    | Waits on S-04 |
| S-08       | new-device-restore    | User finds store, zones and products on a new device          | no                    | Waits on S-03, S-04 |

This table is the clean handoff to Jira/Linear or any MCP-backed backlog. Include one row for every `F-NN` and `S-NN`. It should be compact enough to copy into issues, but it must not duplicate the detailed roadmap body.

## Open Roadmap Questions

1. **What are the rules for overriding a product's zone assignment for a specific store?** — Owner: user. Block: none in M-01 (multiple stores are parked); blocks the multi-store work.
2. **What happens when a store's route does not contain a product's zone?** — Owner: user. Block: none in M-01 (FR-024 makes the case impossible with one store); blocks the multi-store work.
3. **How does a second person join a household, and what happens when both edit a list at once?** — Owner: user. Block: none in M-01 (household sharing is parked); blocks the sharing work.
4. **Unresolved tension: mandatory zone assignment vs fast adding.** FR-011 requires a zone before a product can be added; the secondary criterion requires adding to take seconds. — Owner: user. Block: none; revisit once S-04 and S-07 are in daily use.
5. **No market-gap insight.** Existing tools already solve this; the motivation is ownership and personal fit. — Owner: user. Block: none (private project); must be rewritten before any distribution.

## Parked

- **Graphical store-layout editor** — Why parked: PRD §Non-Goals; a store is only an ordered list of zone names.
- **Zone suggestion of any kind** — Why parked: PRD §Non-Goals; every assignment is made by the user.
- **Household list sharing (per-person accounts, invitations, shared lists)** — Why parked: PRD §Non-Goals, cut to fit three weeks; see Open Roadmap Question 3.
- **Multiple stores and per-store assignment overrides** — Why parked: PRD §Non-Goals and Success Criteria (explicitly v2); see Open Roadmap Questions 1–2.
- **Full offline mode (creating lists, zones or stores without connectivity)** — Why parked: PRD §Non-Goals; only marking works offline (S-05).
- **Indicator that marks are waiting to be sent** — Why parked: PRD §Non-Goals; the in-store view stays clean.
- **Privacy or compliance commitment** — Why parked: PRD §Non-Goals; the stores' privacy-policy URL requirement is handled inside F-02.
- **Auto-collapsing visited zones** — Why parked: offered and declined in FR-015.
- **Carrying unavailable (red) items onto the next list** — Why parked: offered and declined in FR-019.
- **Drag-and-drop zone reordering** — Why parked: shape-notes fix up/down controls for v1.
- **iOS distribution (TestFlight build)** — Why parked: user decision 2026-11-15 — not part of M-01's done-condition; the PRD's iOS requirement (current major + previous) stays and returns in a later milestone.
- **Error tracking and observability** — Why parked: baseline absent and no PRD requirement asks for it; deferred under the speed goal and the time constraint.

## Milestone History

(Append-only. Carried forward verbatim into each successor milestone's roadmap. Empty on the first milestone.)

## Done

(Empty on first generation. `/10x-archive` appends an entry here — and flips that item's `Status` to `done` — when a change whose `Change ID` matches the item is archived.)
