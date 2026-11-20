---
date: 2026-11-20T19:25:48Z
researcher: Claude (Opus 5.5)
git_commit: 01e574a
branch: feat/account-sign-in
repository: follow
topic: "S-02 shopping-lists: requirements, code seams and the Supabase workflow for the first user-data table"
tags: [research, shopping-lists, supabase, rls, expo-router, keep-alive]
status: complete
last_updated: 2026-11-20
last_updated_by: Claude (Opus 5.5)
---

# Research: S-02 shopping-lists

**Date**: 2026-11-20T19:25:48Z
**Researcher**: Claude (Opus 5.5)
**Git Commit**: 01e574a
**Branch**: feat/account-sign-in
**Repository**: follow

## Research Question

What does roadmap slice S-02 `shopping-lists` (FR-002, FR-003, FR-004, FR-005, FR-021) require? What existing code does it plug into? How should the first user-owned Supabase table be added: RLS, grants, generated types and the free-tier keep-alive? Which decisions are still open for `/10x-plan`?

## Summary

- **Requirements.**
  - The PRD requires five abilities: see all lists on one screen, create a list, keep several, reopen one later, and delete a whole list (`context/foundation/prd.md:137-145`).
  - It is silent on a list name, a date, ordering on the screen, explicit vs automatic save, delete confirmation, the empty state, and how a list becomes "completed". FR-004 does say that "a completed list is retained as a record of that shop" (`prd.md:141-143`).
- **Where lists live.**
  - Decided: lists belong to the account (`prd.md:262-266`), and creating a list requires connectivity (`prd.md:325-326`).
  - Open: whether lists may appear on a new device (`roadmap.md:204`, against FR-025 "Lists are not restored", `prd.md:127-129`).
  - Open: whether every list, or only one opened earlier, must be readable offline. This is assigned to S-05 (`roadmap.md:167`).
- **Code seams.**
  - Every S-02 route belongs under `src/app/(app)/`, so the existing `Stack.Protected` gate covers it (`src/app/_layout.tsx:44-54`).
  - The starter Home at `src/app/(app)/index.tsx` is the natural place for the lists screen.
  - Tabs are declared in two files that must change together (`src/components/app-tabs.tsx:15-29`, `src/components/app-tabs.web.tsx:25-30`).
  - The session context exposes `email` but no user id (`src/providers/session-provider.tsx:16-22`).
  - The project has no data-fetching library (`package.json:5-31`).
- **Supabase.**
  - No migrations exist yet: there is no `supabase/migrations/`. The tracked files are `config.toml` and `.gitignore`.
  - Since 2026-10-30, new tables in `public` on existing hosted projects get **no Data API grants automatically** (Supabase changelog 45329, verified 2026-11-20). The first migration must therefore contain explicit `grant … to authenticated` alongside RLS and its policies, or supabase-js requests fail with permission denied.
  - CLI v3 uses `--remote` for hosted targets (local `--help`, CLI 3.2.0).
- **Keep-alive.**
  - The free tier pauses a project after low activity over 7 days.
  - The risk register proposes a weekly GitHub Actions cron or the Pro plan (`context/foundation/infrastructure.md:97`) and places it in S-02 (`roadmap.md:130`). The repo has no `.github/workflows/`.
  - Under the new grant default, an `anon` ping with the publishable key against a user table would be denied. The ping needs a target `anon` is granted.

## Detailed Findings

### Product requirements and semantics

- FR-002/003/004/005/021 are must-have (`prd.md:137-145`).
- **Two states are implied but not specified.**
  - FR-004 implies active vs completed lists: "A completed list is retained as a record of that shop while a new one starts separately, so lists necessarily coexist even when only one is active" (`prd.md:141-143`).
  - No FR defines a "complete" action or field.
  - FR-025 calls a list "single-use" (`prd.md:131-134`).
- **Intended flow (shape-notes sketch).**
  - Sign in → "My lists" screen → "Add new list" (green plus) → list-creation view with a store selector at the top (`context/foundation/shape-notes.md:186-192`).
  - The store auto-selects on the new list (`shape-notes.md:191`). The MVP has one store (`prd.md:117-118`).
- **Not stated in the PRD** (checked `prd.md` in full and `shape-notes.md` by grep):
  - list name or title
  - creation date shown
  - ordering of lists on the screen
  - explicit "save" vs immediate persistence (FR-005 says "save a list and reopen it later")
  - delete confirmation or undo
  - empty-state content

### Where lists live and offline expectations

- **Ownership.** "Everything the user creates — lists, zones, the store and its route, and remembered product assignments — belongs to that one account" (`prd.md:262-266`). The roadmap calls S-02 the "First slice that stores real data in the account" (`roadmap.md:130`).
- **Connectivity.** "Creating lists, zones or stores requires connectivity. Marking an open list is the exception" (`prd.md:325-326`).
- **Open question 1.** "Does 'lists are not restored' mean lists must not appear on a new device, or only that restoring them is not required?" (`roadmap.md:204`, owner user, not blocking).
- **Open question 2.** "Must every list be readable offline, or only a list already opened on this device while online?" (`roadmap.md:167`, S-05 unknown, not blocking).
- **Mitigation already in the risk register.** "Keep cached lists readable and markable regardless of session state" (`infrastructure.md:105`). This implies a device-local copy, at the latest by S-05.

### Constraints later slices put on S-02's data model (inferred)

These are inferences from the cited sources, not stated requirements.

- **S-04** (products on a list, `roadmap.md:148`): list items will reference a list id, and the list needs stable ownership for RLS.
  - A `store_id` on the list is suggested by the store selector in the sketch (`shape-notes.md:189-191`).
  - The stores table arrives with S-03. Whether S-02 adds the column now or S-03/S-04 adds it later is open.
- **S-05** (offline marks that survive restarts, OTA updates and an expired session: `prd.md:210-218`, `roadmap.md:168`, `infrastructure.md:100,105`):
  - Client-generated UUIDs and an `updated_at` column would make queued writes and later reconciliation simpler.
  - A hard delete of a list with queued marks needs a rule: soft delete, or drop orphaned marks.
- **S-06** (list opens in under 1 s, `prd.md:224-225`): favours reading from a local copy.
- **Households later** (`prd.md:270-297`): a `user_id` owner is enough for the MVP. `household_id` is not required now.

### Routing and screens

- **Root gate.** `src/app/_layout.tsx:44-54` is a `Stack` with `Stack.Protected guard={signedIn}` around `(app)`. New routes under `src/app/(app)/` need no change to the root layout.
- **Current screens.**
  - `src/app/(app)/_layout.tsx:1-5` renders `<AppTabs />`.
  - Native tabs: `NativeTabs.Trigger name="index"` (Home, `home.png`) and `name="account"` (reuses `explore.png`) (`src/components/app-tabs.tsx:15-29`).
  - Web tabs: `TabTrigger name="home" href="/"` and `name="account" href="/account"` (`app-tabs.web.tsx:25-30`).
  - Web still shows the starter brand "Expo Starter" (`app-tabs.web.tsx:63-65`) and a "Docs" `ExternalLink` (`:69-78`).
- **Nested Stack inside a tab.** SDK 58 native-tabs types describe "the stack nested in the tab" and `disablePopToTop` (`node_modules/expo-router/build/native-tabs/types.d.ts:533-538, 610`). Two placements for a list detail route:
  - (a) a Stack inside the tab, e.g. `(app)/(lists)/_layout.tsx` with `index.tsx` and `[id].tsx`;
  - (b) `(app)/_layout.tsx` becomes a Stack holding a `(tabs)` group plus `lists/[id]`, so the detail screen sits above the tabs.
  - Either way both tab files change (CLAUDE.md platform-split rule).
- **Typed routes.** `.expo/types/router.d.ts:9-11` lists only `/`, `/account`, `/sign-in`, `/register`. The file is generated and gitignored. New typed `href`s fail `tsc` until it is regenerated, as S-01 did with `EXPO_OFFLINE=1 CI=1 npx expo customize tsconfig.json` or `npx expo start`.

### Session and data access

- **No user id in the context.** `SessionContextValue` is `{ status, email, signIn, register, signOut }` (`session-provider.tsx:16-22`), and `AuthState` is `{ status, email }` (`:26`). The offline path `readStoredSession()` returns only the email (`:70-95`).
- **Getting the id.** A data module can read `getSupabase().auth.getSession()`, which is local. Alternatively `AuthState` gains `userId`. With `user_id default auth.uid()`, inserts do not need to send the id.
- **Clients.** The native client is created at module level (`src/lib/supabase.ts:1-39`). The web client is lazy and throws during SSR (`src/lib/supabase.web.ts:12-16`). Queries must run in effects or event handlers, never during render (`web.output: "server"`, `app.json:24`).
- **Libraries.** No query or state library in `package.json:5-31`. Within `src/`, the one local store is the expo-sqlite `localStorage` used by auth (`src/lib/supabase.ts:1`).

### UI kit and starter leftovers

- **Available UI.**
  - `ThemedText` types (`src/components/themed-text.tsx:7`), `ThemedView` (`themed-view.tsx:12`).
  - `Button` (single filled style; `title`, `onPress`, `disabled`, `loading`; `button.tsx:7-15`).
  - `TextField` (`text-field.tsx:7-21`).
  - Tokens in `src/constants/theme.ts`: colours `:10-27`, `Spacing` `:56-64`, `BottomTabInset` and `MaxContentWidth` `:66-67`.
- **Missing UI.** No list row, empty-state or destructive-button component exists.
- **Lint skip list.** `noReactNativeRawText` skip is `ThemedText`, `TabButton`, `NativeTabs.Trigger.Label` (`biome.json:26`). A new text-children component must be added there.
- **Leftovers, by grep across `src`, `__tests__` and `app.json`.**
  - Unreferenced now: `src/components/ui/collapsible.tsx`, `assets/images/tutorial-web.png`, `assets/images/react-logo{,@2x,@3x}.png`.
  - Referenced only by the starter Home: `hint-row.tsx`, `web-badge.tsx` (+ `expo-badge*.png`), `AnimatedIcon` on Home, `expo-device`. The stale hint is at `src/app/(app)/index.tsx:49`, the `reset-project` hint at `:54`.
  - Must stay: `animated-icon*.tsx` (`AnimatedSplashOverlay`, `src/app/_layout.tsx:5,36`), `external-link.tsx` (`app-tabs.web.tsx:15`), and the tab icons `home.png` and `explore.png`. No account icon asset exists.

### Tests

- **Mocking.** `@/hooks/use-session` is mocked with partial objects (`__tests__/account-screen-test.tsx:7-9`, `root-layout-test.tsx:8-16`). `@/lib/supabase` is mocked as `{ SUPABASE_STORAGE_KEY, getSupabase: () => ({ auth: mockAuth }) }` (`session-provider-test.tsx:29-32`). A lists module needs `from(...)` chain mocks.
- **Home assertions.** `root-layout-test.tsx` (`renderRouter('./src/app')`) and `home-screen-test.tsx` assert the starter text "Welcome to". Both must change when Home is replaced.
- **SQLite.** jest-expo stubs `ExpoSQLite` (`node_modules/jest-expo/src/preset/moduleMocks/expoModules.js:790,1602`), so a real SQLite-backed cache cannot run in Jest.

### Supabase backend state and workflow

- **Repo state.**
  - No `supabase/migrations/`, no `seed.sql`. `config.toml` has `[db] major_version = 17` (`:45`), `[db.migrations] enabled = true` (`:64-69`) and `[db.seed] enabled = false` (`:71-76`).
  - The project is linked (`supabase/.temp/project-ref`, gitignored by `supabase/.gitignore:3`).
  - `package.json` pins the CLI to `3.2.0` and has no Supabase or typegen script.
- **CLI v3 (local `--help` for 3.2.0, plus the v3 migration guide supabase.com/docs/guides/local-development/cli/migrating-to-v3).**
  - Commands target the local stack unless `--remote` is given. `--linked`, `--project-ref` and `--db-url` are deprecated.
  - Sequence:
    - `npx supabase migration new <name>` (local);
    - `npx supabase db dump --remote -f <file>` (backup first; the free plan has no backups, `infrastructure.md:88,98`);
    - `npx supabase db push --remote --dry-run`, then the human runs `--yes` (`infrastructure.md:89`, CLAUDE.md);
    - `npx supabase migration list --remote`.
  - A non-TTY run needs `--yes` or a shell-exported `SUPABASE_YES=1`.
- **Grants (breaking change, verified).** Changelog 45329, posted 2026-04-28 (supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically):
  - "New tables in the public schema will no longer be exposed to the Data API automatically."
  - This became the default for new projects on 2026-05-30 and was "applied to all existing projects" on 2026-10-30.
  - The post's example grants `select` to `anon` and all four DML privileges to `authenticated` and `service_role`. It recommends enabling RLS and adding policies in the same migration.
  - The local `config.toml:23-27` comment ("matching the cloud default … falls back to `true`") describes the local stack and contradicts the hosted behaviour.
  - Not verified: the hosted project's actual default privileges. Check after the push with `has_table_privilege`.
- **RLS pattern** (supabase.com/docs/guides/database/postgres/row-level-security; page undated):
  - `alter table … enable row level security`;
  - one policy per operation `to authenticated` with `(select auth.uid()) = user_id`: `using` for select and delete, `with check` for insert, both for update (update also needs a select policy);
  - an index on `user_id`;
  - `user_id uuid not null default auth.uid() references auth.users on delete cascade`.
  - For this app, granting `anon` is unnecessary.
- **Typed client.**
  - `npx supabase gen types typescript --remote --schema public > <file>` (CLI 3.2.0 help; `--project-id` deprecated).
  - Usage is `createClient<Database>(...)` (supabase.com/docs/guides/api/rest/generating-types).
  - Both clients use `createClient(...)` typed as `SupabaseClient` (`src/lib/supabase.ts:18,37`, `src/lib/supabase.web.ts:12,27`). Generated output may need a Biome exclusion.
- **Free-tier pausing** (supabase.com/docs/guides/platform/free-project-pausing; undated):
  - Projects with low activity "over a 7-day period" are paused. "A few user requests to the database each day" is described as typically enough.
  - A warning email arrives first, and a paused project can be restored for up to 1 year.
  - Decided mitigation options: a weekly GitHub Actions cron running a trivial query, or Pro at $25/mo. The app must treat "backend unreachable" as offline (`infrastructure.md:97`).
  - pg_cron cannot prevent pausing, because it does not run while the project is paused.
  - The `gh` token was invalid at F-01 (`context/deployment/deploy-plan.md:29`).

## Code References

- `src/app/_layout.tsx:44-54` - root Stack with `Stack.Protected` gate around `(app)`
- `src/app/(app)/_layout.tsx:1-5` - renders `AppTabs`
- `src/app/(app)/index.tsx` - starter Home (stale hint `:49`, reset-project hint `:54`)
- `src/components/app-tabs.tsx:15-29` - native tab triggers `index`, `account`
- `src/components/app-tabs.web.tsx:25-30` - web tab triggers `home` `/`, `account` `/account`
- `src/providers/session-provider.tsx:16-22,26,70-95` - context shape (no user id), stored-session reader
- `src/lib/supabase.ts:1-39`, `src/lib/supabase.web.ts:12-39` - clients; web is lazy and browser-only
- `biome.json:26` - `noReactNativeRawText` skip list
- `supabase/config.toml:23-27,45,64-76` - local auto-expose comment, Postgres 17, migrations and seed settings
- `__tests__/session-provider-test.tsx:29-32`, `__tests__/root-layout-test.tsx` - mocking patterns; Home assertions to update
- `context/foundation/prd.md:137-145,262-266,325-326` - lists FRs, ownership, connectivity rule
- `context/foundation/roadmap.md:130,167,204` - S-02 risk, open offline and restore questions
- `context/foundation/infrastructure.md:88-89,97-98,105` - backups, approval boundary, keep-alive and offline-auth risks

## Architecture Insights

- **One gate.** Auth gating is in place (`Stack.Protected`), so S-02 adds screens under `(app)` without touching auth.
- **Platform split.** Tabs and the Supabase client are split by platform. Every tab change touches `app-tabs.tsx` and `app-tabs.web.tsx` (CLAUDE.md), and every data call must work with the lazy web client.
- **Offline rule.** The offline rule established in S-01 ("backend unreachable" means offline) extends to data: list reads should degrade without treating a network failure as an error (`infrastructure.md:97`).
- **The decision that shapes S-05/S-06.** Supabase-only, or Supabase plus a local copy. S-02 can stay online-only for creating lists (`prd.md:325-326`). The read path chosen now determines how much S-05 and S-06 must rework.

## Historical Context (from prior changes)

- `context/archive/2026-11-18-account-sign-in/plan.md` ("What We're NOT Doing") - tables, migrations and RLS start in S-02; the keep-alive cron belongs to S-02; Home stays the starter until S-02.
- `context/archive/2026-11-18-account-sign-in/follow-ups/review-fixes.md` - F2 (Account tab icon) and F3 (dead starter code plus the stale Home hint) assigned to S-02. Check 3.7 (one unexplained overnight offline sign-out) is assigned to the next auth-touching change or F-02, not S-02.
- `context/archive/2026-11-15-first-android-deploy/follow-ups/review-fixes.md` - F3 `expo-dev-client` queued for the first change that needs a development build.
- `context/deployment/deploy-plan.md:21` - the keep-alive was deferred from F-01 to the first data feature.

## Related Research

Not applicable: no other `research.md` exists under `context/changes/**` or `context/archive/**`.

## Open Questions

Product decisions for the user, from the gaps above:

1. Does a list have a name? If so, user-entered or defaulted (e.g. the date)?
2. How are lists ordered on the "My lists" screen?
3. Is there an explicit "complete" action and an active/completed state in S-02, or is it deferred?
4. Is "save" an explicit action, or is each change persisted immediately?
5. Does deleting a list ask for confirmation, offer undo, or neither?
6. What does the empty state show?
7. Should lists stored in the account appear on a new device (`roadmap.md:204`)?
8. Must the lists screen render offline from a local copy in S-02, or is that left to S-05 (`roadmap.md:167`)?
9. Keep-alive: GitHub Actions cron (needs `gh` re-auth and a repo secret; which ping target can `anon` reach?), or the Pro plan?
10. Does a list get a `store_id` now, or only when stores exist in S-03/S-04?

Technical questions for the plan:

- Where the list detail route sits: a Stack nested in the tab, or a detail screen above the tabs.
- How the data layer gets the user id: `getSession()` or `userId` in the context.
- Whether to add a data library or keep plain effects.
- Where generated types go and how they are excluded from Biome.
- Whether `db dump --remote` needs Docker on this machine (not confirmed by the CLI help).
