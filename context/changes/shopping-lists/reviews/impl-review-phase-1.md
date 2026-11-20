<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Shopping Lists Implementation Plan

- **Plan**: context/changes/shopping-lists/plan.md
- **Scope**: Phase 1 of 3
- **Reviewed phases**: 1
- **Date**: 2026-11-20
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical, 1 warning, 4 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | WARNING |
| Scope Discipline | PASS |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | PASS |

The commit reviewed is `36634fa`.

- **Matches the plan:**
  - The table, check constraint, foreign key, index, RLS, 4 policies, `authenticated` grants and `ping()` all match the Phase 1 contract.
  - Both clients use `createClient<Database>` / `SupabaseClient<Database>`.
  - `gen:types` and the Biome exclusion are in place.
- **Extras:**
  - Approved: the migration `20261120205749_revoke_anon_shopping_lists.sql`, the backup in `~/follow-backups/`, and the user running the commands that hang in the sandbox.
  - Harmless: `set search_path = ''` on `ping()` and the table comment.
- **Criteria re-run on 2026-11-20:** 1.2 → `401`; 1.3 → `1`; 1.4 → types present, `tsc` OK; Biome reports 6 warnings, all in untouched starter files; 34/34 tests pass. 1.1 was confirmed by the user's `migration list --remote` output (both migrations remote); it hangs in the agent sandbox.

## Findings

### F1 — Default privileges still expose future tables and functions

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: supabase/migrations/20261120204123_create_shopping_lists.sql:2, context/deployment/deploy-plan.md:177, CLAUDE.md (Tooling)
- **Detail**:
  - The project still applies Supabase's old default privileges: every new `public` table is granted to `anon` and `authenticated`, and every new function gets EXECUTE for `public`/`anon`.
  - S-02 fixed this only for `shopping_lists`, by revoking per table.
  - A future table created without RLS would be open to the publishable key. A future `security definer` function would be callable by anyone through `/rest/v1/rpc`.
  - The applied migration's comment (line 2) claims the opposite. The correction appears only as a note in `deploy-plan.md`; nothing in CLAUDE.md warns the author of the next migration.
- **Fix A ⭐ Recommended**: A migration that changes the schema's default privileges (`alter default privileges for role postgres in schema public revoke all on tables from anon; … revoke execute on functions from public, anon;`), plus one CLAUDE.md rule: new tables and functions need RLS, explicit grants, and no `anon`/`public` unless intended.
  - Strength: Fixes the cause once for S-03…S-08 and matches what the changelog says the default should be; `ping()` keeps its explicit grant.
  - Tradeoff: One more push that you run; any table that relies on implicit grants (none today) must be granted explicitly.
  - Confidence: MED — the syntax is standard Postgres, but Supabase-managed roles may own some defaults; verify with `\ddp` or a REST probe after the push.
  - Blind spot: Default privileges set for `supabase_admin` (dashboard-created objects) are not covered.
- **Fix B**: The CLAUDE.md rule only; every future migration adds its own `revoke … from anon`.
  - Strength: No remote change now.
  - Tradeoff: Relies on remembering it in every migration; one miss exposes a table.
  - Confidence: HIGH — documentation only.
  - Blind spot: Functions are easy to forget.
- **Decision**: FIXED via Fix A (migration `20261120211932_tighten_default_privileges.sql` pushed by the user; CLAUDE.md rule added; `pg_default_acl` for `postgres` shows no anon/authenticated)

### F2 — `authenticated` probably holds more than the four DML privileges

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: supabase/migrations/20261120204123_create_shopping_lists.sql:39
- **Detail**:
  - The old defaults grant ALL, so `authenticated` likely also has TRUNCATE (which bypasses RLS), REFERENCES and TRIGGER on `shopping_lists`. The Data API cannot issue these, so nothing is exploitable today, but it exceeds the planned "DML only" contract.
  - `service_role` works only through the implicit defaults.
  - Not verified, because reading grants needs a database login.
- **Fix**: Check in the dashboard SQL editor (`select grantee, privilege_type from information_schema.role_table_grants where table_name = 'shopping_lists';`), then fold `revoke truncate, references, trigger … from authenticated` and an explicit `grant … to service_role` into the F1 migration.
- **Decision**: FIXED (folded into the F1 migration; SQL check shows `authenticated` = DELETE/INSERT/SELECT/UPDATE only, `service_role` explicit, no `anon`)

### F3 — Whitespace-only names pass the database check

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: supabase/migrations/20261120204123_create_shopping_lists.sql:7
- **Detail**: `char_length(name) between 1 and 80` accepts `'   '`. The planned `createList` trims names, but a direct REST write does not, so `listTitle` would render an empty title.
- **Fix**: In Phase 2, `listTitle` treats a name that is empty after trimming as unnamed (date title), with a test. No schema change.
- **Decision**: FIXED (Phase 2 `listTitle` amendment in the plan review addendum; code and test land in Phase 2)

### F4 — `gen:types` empties the types file when the CLI fails

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: package.json (`gen:types`)
- **Detail**: `> src/lib/database.types.ts` truncates the file before the CLI runs. A failed run (no network, expired login) leaves an empty file, and every typed query breaks.
- **Fix**: Write to a temporary file and move it into place only on success (`supabase gen types … > "$TMPDIR/database.types.ts" && mv … src/lib/database.types.ts`).
- **Decision**: FIXED (`gen:types` writes to a temp file and moves on success; a crashed run left the file intact)

### F5 — `plan.md` contradicts what Phase 1 found

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: context/changes/shopping-lists/plan.md (Current State Analysis, Key Discoveries "No automatic grants", Phase 1 §1–§2, Desired End State)
- **Detail**:
  - The plan says new tables get no automatic grants. It names one migration, a `$TMPDIR` backup, and the agent running the dump, dry run and list.
  - Desired End State says "select, insert and delete", leaving out update.
  - Reviews of later phases treat the plan as ground truth.
- **Fix**: Add a dated correction note under Key Discoveries and Phase 1 §2 (default privileges, second migration, backup path, commands run by the user, update included). The phase blocks stay as written.
- **Decision**: FIXED (dated "Review addendum" after Key Discoveries in plan.md)
