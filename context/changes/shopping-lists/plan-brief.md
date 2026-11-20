# Shopping Lists — Plan Brief

> Full plan: `context/changes/shopping-lists/plan.md`
> Research: `context/changes/shopping-lists/research.md`

## What & Why

Roadmap S-02 (FR-002, FR-003, FR-004, FR-005, FR-021): a signed-in user can create shopping lists, see them all on one screen, keep several, reopen one and delete one. They are the first real data stored in the Supabase account, and every later slice (products, marking, route order) hangs off them. The free Supabase project starts holding data now, so S-02 also adds the keep-alive that stops it pausing after 7 idle days.

## Starting Point

S-01 left a sign-in gate around `(app)`, with the Expo starter Home and an Account tab. The hosted Supabase project has auth configured but no tables, no migrations and no generated types. There is no data layer in the app.

## Desired End State

- **Lists tab.** The Home tab becomes **Lists**, with three screens: My lists (newest first, an empty state), New list (an optional name) and a list's detail screen (Delete with a confirmation dialog). An unnamed list is titled with its creation date, e.g. "20 Nov".
- **Without a connection** the user stays signed in and sees "You're offline" instead of an error.
- **Storage.** Lists live in a `shopping_lists` table that each user can read and change only for their own rows.
- **Keep-alive.** A GitHub Actions job pings the project every 2 days.
- **Rollout.** The phones get it all as an OTA update.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| List name | Optional; untitled lists show their creation date | Creating a list stays one tap, matching the "Add new list" flow, while lists stay distinguishable | Plan |
| Completed state | Deferred to S-05 | A list with no products has nothing to complete; decide it when marking exists | Plan |
| Ordering | Newest first (`created_at desc`, then id) | The list about to be shopped is on top, in a stable order | Plan |
| Delete | Confirmation dialog | Prevents losing a list by a mis-tap at the cost of one tap | Plan |
| Offline | Online reads now; device copy in S-05 | One offline design instead of two; S-05 owns which lists must be readable offline | Plan |
| New device | Account lists appear | The account is the source of truth; FR-025 means restoring lists is not required | Plan |
| Keep-alive | GitHub Actions cron calling `ping()` every 2 days | Free, independent of use, matches the risk register | Plan |
| Grants | Explicit `authenticated` grants plus RLS; `anon` only on `ping()` | Since 2026-10-30, new tables get no automatic Data API grants | Research |
| Offline signal | postgrest `status: 0` means offline | postgrest-js returns status 0 when `fetch` fails instead of throwing | Research |
| Native changes | None; ship via OTA | Same runtime as the S-01 APK; dependency removals wait for the next build | Plan |

## Scope

**In scope:**
- the first migration: `shopping_lists`, RLS, grants, `ping()`;
- generated types and typed clients;
- the lists data module and three screens;
- tests;
- the keep-alive workflow;
- starter cleanup and an Account icon;
- recording the new-device decision;
- the OTA rollout and device checks.

**Out of scope:**
- an offline device copy and the mark queue (S-05);
- completed lists;
- renaming;
- products and `store_id` (S-03/S-04);
- the Pro plan;
- data libraries;
- native dependency changes and a new APK;
- auth changes.

## Architecture / Approach

Data path: Postgres table (RLS on `user_id = auth.uid()`, `authenticated` grants) → typed supabase-js client (`SupabaseClient<Database>`) → `src/lib/shopping-lists.ts`, which returns `ok`, `offline` or `error` results → `useShoppingLists()` and the screens in a `Stack` nested in the Lists tab. Both tab files (native and web) change. Outside the app, a GitHub Actions cron calls `rpc/ping` with the publishable key.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Database and typed client | Table with RLS, grants and `ping()`, applied after a dump and a dry run; generated types | Missing grants (permission denied) or a wrong policy; checked over REST before any UI |
| 2. Lists screens | Data module, Lists tab stack, My lists / New list / List screens, tests | Native tab trigger name vs route group mismatch; `Alert` on web |
| 3. Keep-alive, cleanup and rollout | Cron workflow, cleanup, Account icon, decision record, OTA, device checks | A runtime change slipping in (forces a build); the schedule only starts after the merge into `main` |

**Prerequisites:**
- Docker running for `db dump --remote`;
- the user runs `db push --remote --yes`;
- the user adds 2 GitHub secrets (web UI, or after `gh auth login`);
- the S-01 APK installed on the Pixel 5.

**Estimated effort:** about 3 sessions, one per phase.

## Open Risks & Assumptions

- **Pausing threshold.** Supabase does not define "activity" precisely. A `ping()` call every 2 days is assumed to count; the warning email is the fallback signal.
- **Inactive repo.** GitHub may disable scheduled workflows after 60 days without repo activity; ongoing work before the 2026-12-31 deadline keeps it active.
- **Hosted grants.** The actual default privileges on the hosted project are inferred from the changelog. The Phase 1 REST checks confirm the real behaviour.

## Success Criteria (Summary)

- On the Pixel 5, the user creates, reopens and deletes lists (named and dated), and the lists are the same on the emulator with the same account.
- With no signal the app stays signed in and shows an offline message, never an error.
- Another account cannot see the lists, anonymous access to the table is refused, and the keep-alive run is green.
