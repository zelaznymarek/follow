# Shopping Lists Implementation Plan

## Overview

Roadmap S-02 (`shopping-lists`; FR-002, FR-003, FR-004, FR-005, FR-021). The signed-in user can create a shopping list, see all their lists on one screen, keep several at once, reopen one, and delete one. The lists are the first user data stored in the Supabase account. The starter Home becomes a **Lists** tab. The free Supabase project gets a keep-alive so it does not pause after 7 idle days. Starter leftovers queued by S-01 are cleaned up. S-02 changes no native modules, so it reaches the phones as an OTA update on `preview`.

## Current State Analysis

From `context/changes/shopping-lists/research.md` (2026-11-20, commit `01e574a`):

- **Routing.** Every route under `src/app/(app)/` sits behind the S-01 gate `Stack.Protected guard={signedIn}` (`src/app/_layout.tsx:44-54`). `(app)/_layout.tsx` renders `AppTabs`. The tabs are platform-split:
  - native: `NativeTabs.Trigger name="index"` (Home, `home.png`) and `name="account"` (reuses `explore.png`), `src/components/app-tabs.tsx:15-29`;
  - web: `TabTrigger name="home" href="/"` and `name="account" href="/account"`, `app-tabs.web.tsx:25-30`; the starter brand "Expo Starter" (`:63-65`) and a "Docs" link (`:69-78`) remain.
- **Home.** `src/app/(app)/index.tsx` is still the Expo starter. Its stale hints are at `:49` and `:54`. Two tests assert its "Welcome to" text: `__tests__/home-screen-test.tsx` and `__tests__/root-layout-test.tsx`.
- **Session.** The context exposes `status` and `email` but no user id (`src/providers/session-provider.tsx:16-22`).
- **Clients.**
  - Native: created at module level (`src/lib/supabase.ts:1-39`).
  - Web: lazy, and throws during SSR (`src/lib/supabase.web.ts:12-16`). Queries must run in effects or handlers, because `web.output` is `"server"`.
  - Both are typed as an untyped `SupabaseClient`.
- **No data layer.** There is no data-fetching library, no `src/types/` and no generated database types.
- **UI kit.** `ThemedText`, `ThemedView`, `Button` (`title`, `onPress`, `disabled`, `loading`; single filled style) and `TextField`. Tokens come from `src/constants/theme.ts`. There is no row, empty-state or destructive-button component.
- **Biome.** `files.includes` is `["**", "!context", "!.claude", "!assets"]` (`biome.json:8-11`). The `noReactNativeRawText` skip list is at `biome.json:26`.
- **Supabase backend.**
  - No `supabase/migrations/` yet. The hosted project `skudzowkkurdbevxwnht` runs Postgres 17 and is linked. CLI 3.2.0 uses `--remote` for hosted targets.
  - Since 2026-10-30, new `public` tables on existing hosted projects get **no** Data API grants automatically (Supabase changelog 45329).
- **Environment** (checked 2026-11-20).
  - Docker is installed but not running. `db dump` runs `pg_dump` in a container (`--network-id` flag in `npx supabase db dump --help`).
  - The `gh` token is invalid.
- **Leftovers queued for S-02** (`context/archive/2026-11-18-account-sign-in/follow-ups/review-fixes.md`):
  - F2: Account tab icon;
  - F3: delete `src/components/ui/collapsible.tsx`, `assets/images/tutorial-web.png`, `assets/images/react-logo*.png`, and the Home hint.
  - The starter Home also brings `hint-row.tsx`, `web-badge.tsx` and `expo-badge*.png`, plus the `expo-device` import.

## Desired End State

- **Database.** A `public.shopping_lists` table in the hosted project:
  - columns `id`, `user_id`, `name` (nullable), `created_at`;
  - each signed-in user can select, insert and delete only their own rows (RLS plus `authenticated` grants);
  - `anon` has no access to the table, but may execute a `public.ping()` function used by the keep-alive.
- **Typed client.** Generated types in `src/lib/database.types.ts`; both clients are `SupabaseClient<Database>`.
- **Lists tab** (replaces Home on native and web), with a stack of three screens:
  - **My lists** (`/`): all the user's lists, newest first; an empty state; a "New list" action.
  - **New list** (`/lists/new`): an optional name field and a Create button; on success it opens the new list.
  - **List** (`/lists/[id]`): the list title, the "No products yet" placeholder, and Delete behind a confirmation dialog; after deleting, it returns to My lists.
  - A list without a name is titled with its creation date.
  - With no connection, the lists screen shows an offline message instead of an error. The user stays signed in, and creating or deleting needs a connection.
- **Keep-alive.** `.github/workflows/supabase-keep-alive.yml` calls `ping()` every 2 days and on demand, using 2 repository secrets.
- **Cleanup.** Starter leftovers removed; the Account tab has its own icon.
- **Rollout.** The change is on the phones through an OTA update on `preview`, on the same runtime as the S-01 APK.

Verification: the per-phase Success Criteria. The end state is reached when every row in `## Progress` is checked.

### Key Discoveries:

- **No automatic grants.** New tables are not reachable through the Data API without explicit grants (changelog 45329, verified 2026-11-20). Without `grant … to authenticated` every supabase-js call fails with permission denied.
- **Offline detection.** When `fetch` fails, postgrest-js returns `{ data: null, error: { message: 'TypeError: …', code: '' }, status: 0 }` instead of throwing (`node_modules/@supabase/postgrest-js/src/PostgrestBuilder.ts:345-356`). `status === 0` is the reliable offline signal.
- **Inserts need no user id.** With `user_id default auth.uid()`, the client never sends `user_id`, and the session context does not need to expose it.
- **Tab icons.** `NativeTabs.Trigger.Icon` accepts `sf` (iOS), `drawable` (Android native resource) or `src` (image) (`node_modules/expo-router/build/native-tabs/types.d.ts:204-230`). A new `src` PNG ships over OTA; a `drawable` would need a native build.
- **OTA safety.** Removing a native dependency (e.g. `expo-device`) changes the runtime fingerprint and would force a new APK. S-02 keeps `package.json` dependencies unchanged so it can ship over OTA.

### Review addendum (Phase 1 review, 2026-11-20)

Corrections from `reviews/impl-review-phase-1.md`. The phase blocks below are kept as written.

- **Grants (supersedes "No automatic grants").** This project still applied Supabase's old default privileges, so `anon` and `authenticated` received grants on `shopping_lists` automatically. Phase 1 therefore has three migrations:
  - `20261120204123_create_shopping_lists.sql`;
  - `20261120205749_revoke_anon_shopping_lists.sql` (revoke `anon`);
  - `20261120211932_tighten_default_privileges.sql`: `public` default privileges stop granting to `anon` and `authenticated`, `authenticated` keeps only DML on `shopping_lists`, and `service_role` is granted explicitly.
  - New functions still need `revoke execute … from public` (rule added to CLAUDE.md).
- **Phase 1 §2, as executed.** The schema backup is at `~/follow-backups/2026-11-20-pre-s02-schema.sql`, not `$TMPDIR`. The user ran the dump, the dry run, the push and `migration list --remote`, because Docker and the database login are not reachable from the agent sandbox. Only `gen types --remote` and the REST checks ran in the sandbox.
- **Desired End State.** Signed-in users can select, insert, update and delete only their own rows. S-02's UI uses select, insert and delete.
- **Phase 2 §2 amendment (`listTitle`).** A name that is empty after trimming counts as unnamed and gets the date title, because the database check accepts whitespace-only names written directly over REST. Add a test case: `'   '` gives the date title.
- **`gen:types`.** Writes to a temporary file and moves it into place only on success, so a failed run cannot leave an empty types file.
- **Phase 3 correction (2026-11-20): types script.** Type generation moved from the `gen:types` npm script to `scripts/gen-types.sh`. The EAS fingerprint hashes `package.json` `scripts`, so the new npm script changed the runtime to `1b822e8b…`, and the first S-02 OTA (`5a48d52a`) went out on a runtime no APK has. Without it the fingerprint is `7c659def…` again.
- **Phase 2 review (2026-11-21).** Reads use `.retry(false)`, and every list call is bounded by `LOAD_TIMEOUT_MS` (5 s) → offline. Without that, postgrest-js retries a failed GET 3 times (1/2/4 s), and an expired token adds about 25 s of auth refresh. Thrown errors are logged and reported as `error`, not offline. The Lists stack uses `unstable_settings = { anchor: 'index' }`.
- **Phase 3 correction (2026-11-20): web Account icon.** Web tabs are text-only, so the web Account trigger got no icon. The person icon is native-only (`assets/images/tabIcons/account*.png`). `external-link.tsx` was also deleted, since nothing referenced it after Phase 2.

## What We're NOT Doing

- **Offline reads.** No device-side copy of lists; offline reading and the mark queue are designed in S-05 (`roadmap.md:167`).
- **List states and editing.** No completed/active state or "finish shopping" action (S-05). No renaming a list.
- **Later slices.** No products, items or `store_id` on lists (S-03/S-04). No stores or zones.
- **Device scoping.** Lists are not hidden from a newly signed-in device. FR-025 is read as "restoring lists is not required" (decision recorded in Phase 3).
- **Native changes.** No new APK; no `expo-device` uninstall or other dependency removal (queued for the next change that needs a native build); no `expo-dev-client`.
- **Libraries.** No data-fetching or state library (React Query, Zustand); plain hooks and effects.
- **Paid plan.** No Supabase Pro upgrade.
- **Auth.** No changes, including the check-3.7 follow-up, which belongs to the next auth-touching change.

## Implementation Approach

The three phases follow the data path:

1. The schema and its typed client go first, verified directly against the hosted project over REST, so no UI work starts on an unverified permission model.
2. The screens and a small data module come next. The data module turns every Supabase response into a typed result (`ok`, `offline` or `error`), so the screens never inspect raw errors.
3. Last come the out-of-app pieces (keep-alive workflow, recorded decision), the cleanup, and the OTA rollout with device checks.

The user runs every step that touches credentials or production data: `db push --remote --yes`, the GitHub secrets, and the merge that activates the schedule. This follows the approval boundaries in `infrastructure.md:89` and CLAUDE.md.

## Critical Implementation Details

- **Docker before the push.** `npx supabase db dump --remote` needs a running Docker daemon. The user starts Docker Desktop before Phase 1 §2.
- **Schedules run from `main`.** GitHub runs scheduled workflows only from the default branch. The cron starts after the PR merges into `main`. Before that, the workflow can only be checked on its file contents and, after the merge, with a manual `workflow_dispatch` run.
- **Tab trigger names.** With a nested stack, the native tab trigger `name` must equal the tab's route group name (`(lists)`), and the web trigger keeps `href="/"`. A mismatch shows an empty or duplicate tab. Check both platforms in Phase 2's manual checks.

## Phase 1: Database and typed client

### Overview

Create the `shopping_lists` table with RLS, grants and the keep-alive `ping()` function in the hosted project through a reviewed migration. Then generate types and type both clients. No UI change.

### Changes Required:

#### 1. Migration

**File**: `supabase/migrations/<timestamp>_create_shopping_lists.sql` (new, via `npx supabase migration new create_shopping_lists`)

**Intent**: Add the first user-owned table, protected by RLS, reachable by signed-in users only, plus a trivial function the keep-alive may call anonymously.

**Contract**:
- **Table** `public.shopping_lists`:
  - `id uuid primary key default gen_random_uuid()`;
  - `user_id uuid not null default auth.uid() references auth.users(id) on delete cascade`;
  - `name text null check (name is null or char_length(name) between 1 and 80)`;
  - `created_at timestamptz not null default now()`.
- **Index** on `(user_id, created_at desc)`.
- **RLS** enabled, with four policies `to authenticated` (select, insert, update, delete), each on `(select auth.uid()) = user_id`. Insert uses `with check`; update uses `using` and `with check`, so a future rename does not need a policy migration.
- **Grants**: `select, insert, update, delete` to `authenticated` only. No grants to `anon`.
- **`public.ping()`**: returns `integer` (1), `language sql`, `stable`, `security invoker`. Revoke execute from `public`, then grant execute to `anon` and `authenticated`.

The grant lines are the non-obvious part:

```sql
grant select, insert, update, delete on public.shopping_lists to authenticated;
revoke execute on function public.ping() from public;
grant execute on function public.ping() to anon, authenticated;
```

#### 2. Backup, review and push (agent + user)

**File**: hosted Supabase project (remote); backup file outside the repo

**Intent**: Apply the migration only after a backup and a reviewed dry run, following CLAUDE.md and `infrastructure.md:88-89`.

**Contract**:
1. The user starts Docker. The agent runs `npx supabase db dump --remote -f "$TMPDIR/follow-pre-s02-schema.sql"`, then `npx supabase db push --remote --dry-run`, and shows the output.
2. The user reviews it and runs `! npx supabase db push --remote --yes`.
3. The agent runs `npx supabase migration list --remote`.
4. If the dump needs the DB password, the user runs that step instead. The password never enters the transcript.

The backup stays out of git. The deploy plan records its date and the migration name.

#### 3. Generated types and typed clients

**File**: `src/lib/database.types.ts` (new, generated), `src/lib/supabase.ts`, `src/lib/supabase.web.ts`, `biome.json`, `package.json`

**Intent**: Give data code compile-time table types and keep the generated file reproducible and outside lint and format.

**Contract**:
- `npx supabase gen types typescript --remote --schema public > src/lib/database.types.ts`, wrapped as an npm script `gen:types`.
- Both clients use `createClient<Database>(…)` and export `getSupabase(): SupabaseClient<Database>`.
- `biome.json` `files.includes` adds `"!src/lib/database.types.ts"`.

#### 4. Deploy record

**File**: `context/deployment/deploy-plan.md`

**Intent**: Record what changed in the hosted project.

**Contract**: A new dated subsection "S-02 `shopping-lists`: first migration" with the migration file name, the backup date, the table, grants and function names, and the `migration list --remote` result.

### Success Criteria:

#### Automated Verification:

- `npx supabase migration list --remote` shows the `create_shopping_lists` migration applied remotely
- Anonymous table access is refused: `curl -s -o /dev/null -w "%{http_code}" "$EXPO_PUBLIC_SUPABASE_URL/rest/v1/shopping_lists?select=id" -H "apikey: $EXPO_PUBLIC_SUPABASE_KEY"` returns `401` (values from `.env.local`, not printed)
- `curl -s -X POST "$EXPO_PUBLIC_SUPABASE_URL/rest/v1/rpc/ping" -H "apikey: $EXPO_PUBLIC_SUPABASE_KEY" -H "Content-Type: application/json"` returns `1`
- `src/lib/database.types.ts` contains `shopping_lists` and `ping`, and `npx tsc --noEmit` passes with the typed clients
- `/verify` passes (Biome, `npx tsc --noEmit`, `npm test`)

#### Manual Verification:

- The user reviewed the `db push --remote --dry-run` output and ran `npx supabase db push --remote --yes`
- In the Supabase dashboard (Table Editor → `shopping_lists`), RLS is shown as enabled with 4 policies

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Lists screens

### Overview

Add the lists data module and the three screens in a stack inside a Lists tab that replaces Home on both platforms. Cover the data rules and screens with tests.

### Changes Required:

#### 1. Lists data module

**File**: `src/lib/shopping-lists.ts` (new)

**Intent**: Keep every Supabase call for lists in one place and translate responses into results the screens can show without inspecting errors.

**Contract**:
- `type ShoppingList = { id: string; name: string | null; createdAt: string }`.
- `type ListsResult<T> = { ok: true; data: T } | { ok: false; reason: 'offline' | 'error' }`.
- Functions:
  - `fetchLists()` → `ListsResult<ShoppingList[]>`, ordered by `created_at desc, id desc`;
  - `fetchList(id)` → `ListsResult<ShoppingList | null>`;
  - `createList(name: string | null)` → `ListsResult<ShoppingList>`; the name is trimmed, and empty becomes `null`;
  - `deleteList(id)` → `ListsResult<null>`.
- `status === 0` or a thrown fetch error maps to `offline`; any other error maps to `error` and is logged with `console.warn`.
- Calls `getSupabase()` only inside the functions, never at module level (web SSR).

#### 2. List title helper

**File**: `src/lib/list-title.ts` (new)

**Intent**: One rule for what a list is called on every screen.

**Contract**: `listTitle(list: ShoppingList, locale?: string): string` returns the trimmed name when set. Otherwise it returns the creation date as day and short month, adding the year only when it differs from the current year. It uses `Intl.DateTimeFormat`. Example for `en-GB`: `2026-11-20T…` becomes "20 Nov".

#### 3. Routing: Lists tab with a nested stack

**File**: `src/app/(app)/index.tsx` (deleted), `src/app/(app)/(lists)/_layout.tsx`, `(lists)/index.tsx`, `(lists)/lists/new.tsx`, `(lists)/lists/[id].tsx` (new), `src/components/app-tabs.tsx`, `src/components/app-tabs.web.tsx`

**Intent**: Replace the starter Home with a Lists tab whose screens push inside the tab, keeping the tab bar visible.

**Contract**:
- `(lists)/_layout.tsx` is a `Stack`. Headers are shown with titles "My lists", "New list" and the list title.
- URLs: `/` (My lists), `/lists/new`, `/lists/[id]`.
- Native trigger `name="(lists)"` with label "Lists", keeping `home.png` until Phase 3 tidies icons. Web trigger `name="lists" href="/"` with label "Lists".
- The web starter brand "Expo Starter" becomes "Follow", and the "Docs" link is removed.
- Typed routes regenerated with `EXPO_OFFLINE=1 CI=1 npx expo customize tsconfig.json` (or `npx expo start`).

#### 4. Screens

**File**: `src/app/(app)/(lists)/index.tsx`, `lists/new.tsx`, `lists/[id].tsx`, `src/hooks/use-shopping-lists.ts` (new)

**Intent**: Implement FR-002, FR-003, FR-004, FR-005 and FR-021 with the decided behaviour.

**Contract**:
- **`useShoppingLists()`**:
  - Loads with `fetchLists()` in an effect, and reloads when the screen regains focus (`useFocusEffect`).
  - Exposes `{ state: 'loading' | 'ready' | 'offline' | 'error'; lists; reload() }`.
- **My lists**:
  - Shows a `FlatList` of rows (title plus creation date) linking to `/lists/[id]`, and a "New list" `Button` linking to `/lists/new`.
  - **Empty state:** "No lists yet" with the same button.
  - **Offline:** "You're offline — lists will load when you're back online." with a Retry button.
  - **Error:** "Couldn't load your lists." with Retry.
- **New list**:
  - Shows a `TextField` "Name (optional)", max 80 characters, and a "Create list" `Button` with an in-flight guard.
  - On success, `router.replace('/lists/[id]')`.
  - When offline, it shows "Creating a list needs a connection."
- **List**:
  - Loads with `fetchList(id)` and shows `listTitle` and "No products yet".
  - A "Delete list" action opens `Alert.alert('Delete this list?', …, [Cancel, Delete (destructive)])`. On web, `window.confirm`, because `Alert.alert` buttons do not run on web.
  - After deleting, the screen calls `router.back()`. When offline it shows "Deleting needs a connection."; a missing list shows "This list no longer exists."
- Any new component that renders text children is added to the Biome `noReactNativeRawText` skip list.

#### 5. Tests

**File**: `__tests__/shopping-lists-test.ts`, `__tests__/list-title-test.ts`, `__tests__/lists-screen-test.tsx`, `__tests__/new-list-screen-test.tsx`, `__tests__/list-screen-test.tsx` (new); `__tests__/home-screen-test.tsx` (deleted); `__tests__/root-layout-test.tsx` (updated)

**Intent**: Pin the data rules and screen behaviour with `@/lib/supabase` and `@/lib/shopping-lists` mocked.

**Contract**:
- **Data module:**
  - `fetchLists` orders newest first;
  - a `status: 0` response returns `{ ok: false, reason: 'offline' }`;
  - an RLS or permission error returns `reason: 'error'`;
  - `createList('  ')` sends `name: null`;
  - `createList` with a name sends the trimmed name.
- **Title:** a named list returns its name; an unnamed list from this year gives "20 Nov" for `en-GB`; a list from another year includes the year.
- **Screens:**
  - lists render newest first;
  - the empty and offline states show their text;
  - Create calls `createList` once even with two quick presses, then replaces to the new list;
  - Delete calls `deleteList` only after the confirmation is accepted.
- **Root layout:** a signed-in user lands on "My lists" instead of the starter text.

### Success Criteria:

#### Automated Verification:

- `npx jest shopping-lists list-title lists-screen new-list-screen list-screen root-layout` passes
- `/verify` passes (Biome, `npx tsc --noEmit`, `npm test`)

#### Manual Verification:

- Web (`npx expo start --web`):
  - sign in → My lists shows the empty state;
  - create one list with a name and one without → both appear newest first, the unnamed one titled with today's date;
  - open a list, go back, reload → lists persist;
  - delete with Cancel keeps the list, delete with confirm removes it
- Emulator (`npx expo start`, dev server): the same flow works, the Lists tab keeps the tab bar on all three screens, and the Account tab still works
- Supabase dashboard (Table Editor → `shopping_lists`): the created rows belong to the signed-in user's id, and a second test account sees none of the first account's lists

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Keep-alive, cleanup and rollout

### Overview

Add the GitHub Actions keep-alive and remove the starter leftovers. Give the Account tab its own icon and record the new-device decision. Then ship the change to the phones over OTA and verify it on devices.

### Changes Required:

#### 1. Keep-alive workflow

**File**: `.github/workflows/supabase-keep-alive.yml` (new)

**Intent**: Keep the free project active by calling `ping()` every 2 days, independent of app use.

**Contract**:
- Triggers: `schedule` (`cron: '17 6 */2 * *'`, UTC) and `workflow_dispatch`.
- One job on `ubuntu-latest` with `permissions: {}` and a 2-minute timeout.
- It calls `curl --fail-with-body -sS -X POST "$SUPABASE_URL/rest/v1/rpc/ping"` with the `apikey` header, reading `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` from `secrets`. It fails the run on any non-2xx response.
- No third-party actions.

#### 2. Repository secrets (user)

**File**: GitHub repository settings (remote)

**Intent**: Give the workflow the project URL and publishable key without committing them.

**Contract**:
- The user adds `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` in GitHub → Settings → Secrets and variables → Actions.
- Alternatively: `! gh auth login`, then `gh secret set`.
- The `service_role` key is never used.

#### 3. Starter cleanup and Account icon

**File**:
- delete: `src/components/ui/collapsible.tsx`, `src/components/hint-row.tsx`, `src/components/web-badge.tsx`, `assets/images/tutorial-web.png`, `assets/images/react-logo*.png`, `assets/images/expo-badge*.png`
- new: `assets/images/tabIcons/account.png` (plus `@2x`/`@3x` if the existing icons have them)
- edit: `src/components/app-tabs.tsx`, `src/components/app-tabs.web.tsx`

**Intent**: Close S-01 follow-ups F2 and F3 without changing native dependencies.

**Contract**:
- Grep confirms that nothing references a file before it is deleted. `animated-icon*.tsx`, `external-link.tsx`, `expo-logo.png`, `logo-glow.png`, `home.png` and `explore.png` stay where still referenced.
- The Account icon is a simple person silhouette PNG matching `home.png`'s size, colour and transparency, referenced by the native Account trigger; the web Account trigger uses a matching symbol.
- `explore.png` is deleted if nothing references it after the switch.
- `package.json` dependencies stay unchanged.

#### 4. Recorded decisions

**File**: `context/foundation/roadmap.md`, `context/deployment/deploy-plan.md`

**Intent**: Resolve the roadmap unknown on lists and new devices, and record the rollout.

**Contract**:
- Roadmap S-08 "Unknowns" line (`roadmap.md:204`): add "Resolved in S-02 (2026-11-20): lists stored in the account appear on a new device; FR-025 means restoring lists is not required."
- Deploy plan: an S-02 subsection with the OTA update group, branch `preview`, runtime, and the keep-alive workflow name and schedule.

#### 5. OTA rollout (agent)

**File**: EAS (remote)

**Intent**: Deliver S-02 to the S-01 APK without a new build.

**Contract**:
- `eas update --branch preview --message "S-02 shopping lists" --environment preview --platform android --non-interactive`.
- The reported runtime version must equal `7c659defc2f12bd944574fbecaffd57cb2956734`. If it differs, stop: a native change slipped in and needs a build.

### Success Criteria:

#### Automated Verification:

- `/verify` passes (Biome, `npx tsc --noEmit`, `npm test`)
- `grep -rn "collapsible\|hint-row\|web-badge\|react-logo\|tutorial-web\|expo-badge" src __tests__ app.json` returns nothing, and `git diff main -- package.json` shows no dependency changes
- `.github/workflows/supabase-keep-alive.yml` exists with `schedule` and `workflow_dispatch` triggers and references only `secrets.SUPABASE_URL` and `secrets.SUPABASE_PUBLISHABLE_KEY`
- `eas update` publishes to branch `preview` with runtime `7c659defc2f12bd944574fbecaffd57cb2956734`
- `context/foundation/roadmap.md` and `context/deployment/deploy-plan.md` contain the S-02 decision and rollout entries

#### Manual Verification:

- Pixel 5, online: after two app restarts the OTA is active. Then:
  - sign in;
  - create a named and an unnamed list → newest first, the unnamed one titled with today's date;
  - reopen one, delete one with confirmation;
  - the Account tab shows its new icon;
  - check light and dark mode
- Pixel 5, airplane mode, app opened: the user stays signed in, and My lists shows the offline message instead of an error; Retry after reconnecting loads the lists
- Emulator: the lists created on the Pixel 5 appear after signing in with the same account (account-stored lists on another device)
- After the PR merges into `main`, the user adds the two secrets and runs the workflow once with "Run workflow" → the run is green

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Testing Strategy

### Unit Tests:

- **Data module:** ordering, trimming and empty name to `null`, offline (`status: 0`) vs error mapping, with `@/lib/supabase` mocked as a `from(...)` chain.
- **Title helper:** named, unnamed this year, unnamed another year.
- **Screens with mocked data functions:**
  - ordering and the empty, offline and error states;
  - create in-flight guard and navigation;
  - delete only after confirmation.

### Integration Tests:

- None automated against the hosted project. RLS and grants are verified by the Phase 1 REST checks (anonymous refused, `ping()` allowed) and by the second-account check in Phase 2.

### Manual Testing Steps:

1. Web: empty state → create named and unnamed lists → newest first → reopen → reload → delete with Cancel and with confirm.
2. Emulator (dev server): same flow; the tab bar stays visible inside the Lists stack.
3. Second account: sees none of the first account's lists.
4. Pixel 5 over OTA: the full flow, light and dark mode, the Account icon, the airplane-mode offline message.
5. GitHub: a manual workflow run after the merge is green.

## Performance Considerations

- The lists query is filtered by RLS on `user_id` and ordered by `created_at desc`, both served by the `(user_id, created_at desc)` index.
- A household has tens of lists, so no pagination is needed in the MVP (`[api] max_rows = 1000`).
- Opening a list in under 1 s offline (S-06) depends on the S-05 device copy and is out of scope here.

## Migration Notes

- **Schema.** The first schema migration adds an empty table and a function, so there is no data to migrate.
- **Rollback.** A follow-up migration that drops `public.shopping_lists` and `public.ping()`. The pre-push schema dump is kept in `$TMPDIR` until the change is archived.
- **App.** The S-01 APK receives S-02 over OTA (same runtime). Older APKs (F-01, runtime `fd1fcb12…`) do not.

## References

- Research: `context/changes/shopping-lists/research.md`
- Roadmap: `context/foundation/roadmap.md` — S-02 (`:121-131`), S-05 offline unknown (`:167`), S-08 new-device unknown (`:204`)
- PRD: `context/foundation/prd.md` — FR-002 to FR-005 and FR-021 (`:137-145`), Access Control (`:262-266`), connectivity rule (`:325-326`)
- Infrastructure: `context/foundation/infrastructure.md:88-89,97` — backups, approval boundary, keep-alive risk
- S-01 follow-ups: `context/archive/2026-11-18-account-sign-in/follow-ups/review-fixes.md` — F2, F3
- Supabase: changelog 45329 (grants), docs `database/postgres/row-level-security`, `api/rest/generating-types`, `platform/free-project-pausing`, CLI v3 migration guide
- Code: `src/app/_layout.tsx:44-54`, `src/components/app-tabs.tsx:15-29`, `src/components/app-tabs.web.tsx:25-30`, `src/lib/supabase.ts`, `src/lib/supabase.web.ts:12-16`, `node_modules/@supabase/postgrest-js/src/PostgrestBuilder.ts:345-356`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Database and typed client

#### Automated

- [x] 1.1 `npx supabase migration list --remote` shows the `create_shopping_lists` migration applied remotely — 36634fa
- [x] 1.2 Anonymous table access is refused: `curl` on `/rest/v1/shopping_lists?select=id` with the publishable key returns `401` — 36634fa
- [x] 1.3 `curl -X POST …/rest/v1/rpc/ping` with the publishable key returns `1` — 36634fa
- [x] 1.4 `src/lib/database.types.ts` contains `shopping_lists` and `ping`, and `npx tsc --noEmit` passes with the typed clients — 36634fa
- [x] 1.5 `/verify` passes (Biome, `npx tsc --noEmit`, `npm test`) — 36634fa

#### Manual

- [x] 1.6 The user reviewed the `db push --remote --dry-run` output and ran `npx supabase db push --remote --yes` — 36634fa
- [x] 1.7 In the Supabase dashboard (Table Editor → `shopping_lists`), RLS is shown as enabled with 4 policies — 36634fa

### Phase 2: Lists screens

#### Automated

- [x] 2.1 `npx jest shopping-lists list-title lists-screen new-list-screen list-screen root-layout` passes — e3f3fc6
- [x] 2.2 `/verify` passes (Biome, `npx tsc --noEmit`, `npm test`) — e3f3fc6

#### Manual

- [x] 2.3 Web: empty state → create named and unnamed lists → newest first with a date title → reopen, reload → delete with Cancel and with confirm — e3f3fc6
- [x] 2.4 Emulator (dev server): the same flow works, the tab bar stays on all three Lists screens, and the Account tab still works — e3f3fc6
- [x] 2.5 Supabase dashboard: created rows belong to the signed-in user, and a second test account sees none of them — e3f3fc6

### Phase 3: Keep-alive, cleanup and rollout

#### Automated

- [x] 3.1 `/verify` passes (Biome, `npx tsc --noEmit`, `npm test`) — f28186b
- [x] 3.2 The starter-leftover grep returns nothing, and `git diff main -- package.json` shows no dependency changes — f28186b
- [x] 3.3 `.github/workflows/supabase-keep-alive.yml` exists with `schedule` and `workflow_dispatch` and references only the two secrets — f28186b
- [x] 3.4 `eas update` publishes to branch `preview` with runtime `7c659defc2f12bd944574fbecaffd57cb2956734` — f28186b
- [x] 3.5 `roadmap.md` and `deploy-plan.md` contain the S-02 decision and rollout entries — f28186b

#### Manual

- [x] 3.6 Pixel 5 online over OTA: create named and unnamed lists, reopen, delete with confirmation, the Account icon, light and dark mode — f28186b
- [x] 3.7 Pixel 5 in airplane mode: still signed in, and My lists shows the offline message; Retry after reconnecting loads the lists — f28186b
- [x] 3.8 Emulator: the lists created on the Pixel 5 appear for the same account — f28186b
- [x] 3.9 After the merge into `main`, the user adds the two secrets and a manual workflow run is green — 9dd1956
