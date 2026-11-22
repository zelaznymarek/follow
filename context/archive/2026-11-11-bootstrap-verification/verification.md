---
bootstrapped_at: 2026-11-11T15:48:23Z
starter_id: expo
starter_name: Expo (React Native)
project_name: follow
language_family: js
package_manager: npm
cwd_strategy: subdir-then-move
bootstrapper_confidence: verified
phase_3_status: ok
audit_command: npm audit --json
---

# Bootstrap verification — follow

## Hand-off

Source: `context/foundation/tech-stack.md` (invoked as `@tech-stack.md`; no file of that name at the repo root, resolved to the only match, the default hand-off path).

```yaml
starter_id: expo
package_manager: npm
project_name: follow
hints:
  language_family: js
  team_size: solo
  deployment_target: testflight
  ci_provider: github-actions
  ci_default_flow: manual-promotion
  bootstrapper_confidence: verified
  path_taken: custom
  quality_override: false
  self_check_answers:
    typed: true
    from_official_starter: true
    conventions: true
    docs_current: false
    can_judge_agent: false
  has_auth: true
  has_payments: false
  has_realtime: false
  has_ai: false
  has_background_jobs: false
```

### Why this stack

Filtering the registry to a mobile product in TypeScript leaves exactly one vetted card, and
Expo earns it: all four agent-friendly gates pass and scaffolding is verified end-to-end, which
matters disproportionately for a solo builder working after hours against a 2026-12-31 deadline
with React still ahead of them. The data layer was decided by the user's own exclusions rather
than by preference — no hand-written authentication and nothing self-hosted — ruling out an own
API tier and pointing at a managed service. Supabase won over the document-database alternative
because zones, route order and product-to-zone assignments are relational by nature, and
because its schema-generated types extend the typing story the app already has. It carries
FR-001, FR-025 (a new device restores the store, its zones, the route order and the remembered
assignments) and the account side of FR-026. Python, which the user also knows, was excluded:
there is no mobile path in it, and a backend written in it would break both exclusions at once.
The readiness check returned two negatives — current documentation and judging an agent's
output — and the second is real; the generated instruction file is where it gets compensated.

## Pre-scaffold verification

| Signal      | Value                                          | Severity | Notes                                                                                                   |
| ----------- | ---------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------- |
| npm package | create-expo-app v5.0.0 published 2026-09-23    | fresh    | resolved from cmd_template (`npx create-expo-app …`); `time.modified` 2026-09-23T11:27:31Z               |
| GitHub repo | not run (card)                                 | —        | card `docs_url` is `https://docs.expo.dev`, not a GitHub URL. Supplementary: `expo/expo` pushed_at 2026-11-11T15:45:04Z (fresh) |

## Scaffold log

**Resolved invocation**: `npx create-expo-app .bootstrap-scaffold --yes --template default`
**Strategy**: subdir-then-move
**Exit code**: 0
**Files moved**: 53 files (plus `node_modules/` moved as a directory; 560 packages installed by the CLI)
**Conflicts (.scaffold siblings)**: `CLAUDE.md.scaffold`, `LICENSE.scaffold`
**.gitignore handling**: moved silently (absent in cwd)
**.bootstrap-scaffold cleanup**: deleted

Move log:

```
MOVED    AGENTS.md
MOVED    app.json
MOVED    assets/ (directory)
CONFLICT CLAUDE.md -> CLAUDE.md.scaffold (existing kept)
CONFLICT LICENSE -> LICENSE.scaffold (existing kept)
MOVED    node_modules/ (directory)
MOVED    package-lock.json
MOVED    package.json
MOVED    README.md
MOVED    scripts/ (directory)
MOVED    src/ (directory)
MOVED    tsconfig.json
MOVED    .claude/settings.json   (cwd .claude/ existed; settings.json did not)
MOVED    .gitignore
MOVED    .vscode/ (directory)
```

Notes:

- `context/` — the scaffold shipped nothing under `context/`; the cwd copy is untouched.
- `CLAUDE.md.scaffold` contains a single line, `@AGENTS.md`. The starter's `AGENTS.md` (Expo agent guidance) had no counterpart in cwd and was moved in as-is.
- `LICENSE.scaffold` is Expo's MIT license (`650 Industries, Inc.`); your own MIT `LICENSE` was kept.
- `.claude/settings.json` from the starter enables the `expo@claude-plugins-official` plugin.
- Post-move correction: the temp directory name leaked into identity fields. Replaced with `project_name`:
  `package.json` / `package-lock.json` `name: bootstrap-scaffold` → `follow`;
  `app.json` `expo.name` / `expo.slug: .bootstrap-scaffold` → `follow`, `expo.scheme: bootstrapscaffold` → `follow`.
- The CLI's interactive prompt ("You are creating a project inside of an existing Git repository. Skip initializing a new git repository?") received no input; no nested `.git/` was created.
- Toolchain warning: `npm warn EBADENGINE` for ~45 packages (`expo@58.0.24`, `react-native@0.88.1`, Metro 0.87.x, `@react-native/*` 0.88.1). Required `node: ^22.13.0 || ^24.3.0 || >= 26.0.0`; local `node v23.6.0`, `npm 10.9.2`. Install succeeded, but Node 23 is outside the supported range — switch to Node 24 LTS before running Metro.

Installed versions (from `package.json`): `expo ~58.0.24`, `expo-router ~58.0.31`, `react 19.3.0`, `react-native 0.88.1`, `typescript ~6.0.3`.

## Post-scaffold audit

**Tool**: `npm audit --json` (exit code 1 — informational)
**Summary**: 0 CRITICAL, 0 HIGH, 3 MODERATE, 0 LOW
**Direct vs transitive**: 0/0/1/0 direct of total 0/0/3/0 (581 dependencies total; 533 prod)

#### CRITICAL findings

None.

#### HIGH findings

None.

#### MODERATE findings

- **minimatch** 7.0.0 – 11.0.0 (transitive) — GHSA-g3hv-75wg-m249, "minimatch has potential denial of service via globparts amplification" (CWE-405). Patched upstream in `>=11.0.1`. Root cause of the two findings below.
- **@expo/fingerprint** `>=0.11.12-canary-20250303-4dba60e` (transitive) — vulnerable via `minimatch`.
- **expo** `>=53.0.0-canary-20241211-61c49bd` (direct) — vulnerable via `@expo/fingerprint`.

npm's suggested fix for all three is `expo@52.0.49` (`isSemVerMajor: true`) — a downgrade by six SDK majors, not a real remediation. The practical path is waiting for an Expo patch release that bumps `@expo/fingerprint`'s `minimatch`, or an `overrides` entry for `minimatch` once you have verified compatibility. `@expo/fingerprint` is build-time tooling, not shipped app code.

#### LOW / INFO findings

None.

## Hints recorded but not acted on

| Hint                                    | Value             |
| --------------------------------------- | ----------------- |
| bootstrapper_confidence                 | verified          |
| quality_override                        | false             |
| path_taken                              | custom            |
| self_check_answers.typed                | true              |
| self_check_answers.from_official_starter | true             |
| self_check_answers.conventions          | true              |
| self_check_answers.docs_current         | false             |
| self_check_answers.can_judge_agent      | false             |
| team_size                               | solo              |
| deployment_target                       | testflight        |
| ci_provider                             | github-actions    |
| ci_default_flow                         | manual-promotion  |
| has_auth                                | true              |
| has_payments                            | false             |
| has_realtime                            | false             |
| has_ai                                  | false             |
| has_background_jobs                     | false             |

The managed backend named in the hand-off rationale (Supabase, carrying `has_auth`) was not added — the scaffold is the Expo starter only.

## Next steps

Next: a future skill will set up agent context (CLAUDE.md, AGENTS.md). For now, your project is scaffolded and verified — happy hacking.

Useful manual steps in the meantime:
- `git init` (if you have not already) to start your own repo history.
- Review any `.scaffold` siblings the conflict policy created and decide which version of each file to keep.
- Address audit findings per your project's risk tolerance — the full breakdown is in this log.
