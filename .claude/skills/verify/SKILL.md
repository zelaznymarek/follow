---
name: verify
description: Run this project's pre-done checks (Biome format + lint, tsc typecheck, Jest tests) and report failures. Use before declaring any task done, before committing, or when the user says "verify", "check my changes", or "run the checks".
---

Run the checks AGENTS.md requires before a task is done, from the repo root. Run all of them even if one fails, then report.

1. **Format + lint** on changed/untracked files (so pre-existing issues in stock template files aren't flagged):
   ```bash
   npx biome check $(git diff --name-only --diff-filter=d HEAD; git ls-files --others --exclude-standard) --no-errors-on-unmatched
   ```
   Formatting diffs and safe fixes can be applied by adding `--write`. Errors fail the check; warnings/infos are reported but don't fail it.

2. **Typecheck**:
   ```bash
   npx tsc --noEmit
   ```
   If it complains about missing `*.css` modules or typed routes, `expo-env.d.ts` / `.expo/types/` haven't been generated — run `npx expo start` once, then re-run.

3. **Tests**:
   ```bash
   npm test
   ```

Report a short pass/fail line per check, with the actual error output for any failure. Fix failures that come from your own changes; for pre-existing failures, report them and don't fix unless asked. Never claim the task is verified if any check failed or was skipped.
