---
project: follow
researched_at: 2026-11-14
recommended_platform: EAS (Expo Application Services)
runner_up: Bitrise
context_type: mvp
tech_stack:
  language: TypeScript
  framework: Expo SDK 58 (React Native 0.88, expo-router)
  runtime: Hermes on iOS + Android (native mobile); backend Supabase (managed, external)
---

## Recommendation

**Deploy on EAS (Expo Application Services) for build, signing, store submission and OTA updates. Supabase stays as the backend.**

Follow is a native mobile app (iOS + Android per the PRD's non-functional requirements — iOS current major plus the one before, Android 14+, all above Expo SDK 58's floor of Android 7+ / iOS 16.4+; `deployment_target: testflight` in `tech-stack.md`) with no own API tier, so "deployment" means building signed binaries, getting them to TestFlight / Google Play internal testing, and shipping JS fixes — not hosting a server. EAS is the only candidate that is native to Expo SDK 58 and passed all five agent-friendly criteria. The interview answers point the same way: DX was prioritised over cost, there are no persistent connections, one region is enough, and external providers are fine. EAS adds OTA updates and one-command rollback that the alternatives lack or bolt on. EAS and Supabase have separate jobs. EAS gets the app onto the phone. Supabase (Auth + Postgres + RLS) serves the running app, which talks to it directly over HTTPS with supabase-js.

Interview answers (2026-11-14): persistent connections — no; priority — DX over cost; prior platform familiarity — none; geography — single region; co-location — external providers fine.

## Platform Comparison

The default web-hosting pool (Cloudflare, Vercel, Netlify, Fly.io, Railway, Render) was researched and **hard-filtered by the stack**: none of them builds or distributes a native iOS/Android binary, and the backend is managed Supabase, so there is no server to host. Their only possible role is hosting a privacy-policy page (required by both stores), for which GitHub Pages or the EAS Hosting free tier is enough. Expo Router server output / API routes (`web.output: "server"`, left over from the starter) is **beta** in Expo docs, and the Vercel/Netlify/Express adapters are **experimental** (checked 2026-11-14); the PRD has no web requirement.

The pool was therefore extended with mobile build/distribution pipelines:

| Platform | CLI-first | Managed/Serverless | Agent-readable docs | Stable deploy API | MCP / Integration | Total |
|---|---|---|---|---|---|---|
| **EAS (Expo)** | Pass | Pass | Pass | Pass | Pass (tool list "subject to change") | **5 / 5** |
| **Bitrise** | Pass | Pass | Pass | Partial | Pass | 4.5 / 5 |
| **GitHub Actions + fastlane** | Pass | Partial | Partial | Partial | Pass | 3.5 / 5 |
| Codemagic | Fail | Pass | Pass | Partial | Partial | 2.5 / 5 |
| Cloudflare / Vercel / Netlify / Fly.io / Railway / Render | — | — | — | — | — | filtered (stack runtime) |
| Supabase (backend — fixed by `tech-stack.md`, not competing) | Pass | Pass | Pass | Partial | Pass (dev only) | n/a |

**EAS.** `eas build --non-interactive --json --no-wait --auto-submit`, `eas submit`, `eas update --json`, `eas update:rollback` / `update:republish` / `update:roll-back-to-embedded`, `eas workflow:run` / `workflow:logs --json`; auth via `EXPO_TOKEN`. Docs at `docs.expo.dev/llms.txt`, any page as `.md`. Official MCP server at `https://mcp.expo.dev/mcp` (OAuth, on Free since 2026-05-26; `search_documentation` paid-only; capabilities "subject to change"). eas-cli 27.10.0 (2026-11-13). Minor gaps: `eas submit` has no `--json`; `eas build --local` is **experimental**. EAS Hosting launched as **public preview** (2025), no GA announcement found. "Expo Services" is the new product name, CLI is still `eas`.

**Bitrise.** CLI 3.0 (`bitrise build trigger/list/log/abort`), REST API, `llms.txt` + `.md` pages, official MCP at `mcp.bitrise.io` (status unlabelled, 88–136 tools). Partial on deploy API because its default Expo workflow runs the "EAS build" step — i.e. it builds on EAS anyway, adding a second vendor and bill — and native prebuild on Bitrise has no official recipe (Turtle / Expo Eject steps are legacy). Hobby free (500 min, 1 private app, card required); Starter $99/mo. Bitrise CodePush (launched 2026-03-10, "officially launched", not labelled GA) offers OTA.

**GitHub Actions + fastlane.** `gh workflow run` / `gh run view --log`, GitHub remote MCP **GA since 2025-09-04**, and it is the CI provider already named in `tech-stack.md`. Partial on managed (you own fastlane `match`, temporary keychains, `.p8` / service-account secrets, runner-image and Xcode pinning — `macos-14` retired 2026-11-02; `xcode-27` label GA on 2026-10-15 per changelog but README still shows preview), docs (fastlane is HTML) and deploy API (no rollback; halt/expire + new build number). No OTA. Free includes $12/month ≈ 190 macOS minutes ≈ 7–9 iOS builds.

**Codemagic.** 500 free macOS M2 minutes, `llms.txt`. Fails CLI-first: `codemagic-cli-tools` only runs inside builds; triggering / logs go through the dashboard or the REST API labelled **preview** (v3 has no log-text or rerun endpoint). No official MCP (community servers only; `codemagic-init` agent skills, first released 2026-08-11, unlabelled). Expo treated as plain RN — prebuild in CI, no build-number auto-increment, no fingerprint repack.

**Supabase (fixed backend, scored for the operational story).** CLI v3 (released **2026-11-02**, breaking: commands target the local stack by default, `--remote` needed for hosted, `--yes` needed in CI, `--linked` / `--project-ref` deprecated). Free: 2 projects, **paused after 7 days of inactivity**, 500 MB DB, **no automatic backups**; Pro $25/mo. Branching is **beta** and Pro-only. Official MCP (`mcp.supabase.com/mcp`, branching tools **experimental**) — Supabase advises dev/test only, never production data. EU regions: Frankfurt, Ireland, Paris, Stockholm, London, Zurich.

### Shortlisted Platforms

#### 1. EAS (Recommended)

The only option native to Expo SDK 58. It covers build, credentials, TestFlight submission, the first Google Play internal-testing release (now handled by `eas submit` out of the box) and OTA updates from one CLI with `--json` output. Rollback is a single non-interactive command, and the official MCP server can read build, submission and TestFlight crash data. The Free plan (15 iOS + 15 Android builds/month, 1,000 update MAUs) covers the MVP; Starter ($19/mo + usage) is the escape valve if the build count or the queue becomes the bottleneck.

#### 2. Bitrise

The agent tooling is as strong as EAS's (CLI 3.0, `llms.txt`, a first-party MCP server) and there is an OTA option. It ranks second because for Expo it either delegates the build to EAS (two vendors, two dashboards) or needs an unsupported custom prebuild path, and moving past Hobby jumps to $99/mo. Choose it only if a native-build CI independent of Expo's cloud becomes a requirement.

#### 3. GitHub Actions + fastlane

It has no dependency on Expo's cloud, it is already the chosen CI, and the GitHub MCP server is GA. It ranks third because signing, Xcode pinning and runner caches all become your job. There is no rollback and no OTA, and the free allowance covers only about 8 iOS builds a month. It stays the natural place for lint, typecheck and tests alongside EAS, which is not a replacement for it.

## Anti-Bias Cross-Check: EAS (+ Supabase backend)

### Devil's Advocate — Weaknesses

1. **The Free tier has low queue priority and a cap of 15 iOS builds a month.** Evening development in Europe coincides with peak US daytime, so builds may queue for a long time. A week of iterating on native config (Supabase auth deep links, the `scheme`) can exhaust the cap before the 2026-12-31 deadline.
2. **Supabase Free pauses a project after 7 days of inactivity.** A household that shops weekly sits exactly on that threshold. A paused project means sign-in or sync fails at the store entrance, and marks stay queued on the device.
3. **Supabase Free has no automatic backups.** A bad migration or a manual dashboard edit is irreversible unless a `supabase db dump` was taken first.
4. **A misconfigured OTA `runtimeVersion` can crash the app.** SDK 58 changed the default fingerprint preset to `balanced` (a breaking change). An update delivered to an incompatible binary crashes at launch. Worse for an offline-first app, a JS update that changes the format of the local mark queue can drop pending marks, which breaks the "no item is ever lost" guardrail.
5. **Supabase CLI v3 is 12 days old and changed its defaults.** Agent training data and tutorials use `--linked` / `--project-ref`; without `--remote`, `db push` targets the local stack. An agent can report a production migration as successful when it never ran — or, with `--yes` in a script, apply one unreviewed.

### Pre-Mortem — How This Could Fail

The team assumed free tiers were "enough for two people" and never checked what that implied. In week three, iterating on Supabase auth deep links burned through the 15 free iOS builds. The remaining evening builds sat in the low-priority queue, and the deadline slipped by a week. After launch, a week without a shopping trip let Supabase pause the project. On Saturday the app opened its cached list, but signing in on the spouse's new phone failed in the store. To fix a sorting bug, the developer pushed an OTA update without understanding SDK 58's new fingerprint policy. That update also changed the shape of the offline mark queue, so marks made in the store were silently dropped: exactly the failure the product existed to prevent. Meanwhile the agent, following pre-v3 tutorials, ran `supabase db push` without `--remote` and reported a migration that production never received. A manual fix in the dashboard went wrong, and the Free plan had no backup to restore. In March the TestFlight build expired after 90 days and the app stopped launching. Nobody remembered where the signing credentials lived.

### Unknown Unknowns

- **TestFlight builds expire after 90 days.** A private app that is "done" still needs a fresh build at least quarterly, or it stops launching.
- **New personal Google Play accounts must run a 14-day closed test with 12 testers before production access.** The internal testing track has no such gate, so for a household app, staying on internal testing permanently is the realistic path.
- **Both stores require a privacy-policy URL**, despite the PRD's deliberate "no privacy commitment". Google Play also requires a Data safety form, and the app stays in draft until the Play Console setup tasks are complete.
- **Offline auth expiry.** In a store with no signal for longer than the access-token lifetime, supabase-js cannot refresh the session. The app must not sign the user out or lock the list in that state, or the offline read/mark requirement fails.
- **`eas build --local` is experimental.** It also ignores "Secret" EAS env vars and build caching, so it is a weaker fallback during an EAS outage than it appears.

**Decision (2026-11-14):** the user reviewed the cross-check and chose to proceed with EAS, with the risks recorded below.

## Operational Story

- **Preview deploys**: `eas build --profile preview` produces internal-distribution builds (iOS ad hoc needs each device registered via `eas device:create`). JS-only changes go out with `eas update --branch preview` and are tested on a preview build before promotion to production. PR-triggered builds are possible via EAS Workflows `pull_request` triggers, but the MVP keeps manual promotion (`ci_default_flow: manual-promotion`). Database changes are previewed against the local Supabase stack (Docker) because Supabase branching is beta and Pro-only.
- **Secrets**: `EXPO_TOKEN`, `SUPABASE_ACCESS_TOKEN` and `SUPABASE_DB_PASSWORD` live in the developer's local shell env (and GitHub Secrets if CI uses them), never in the repo. The App Store Connect API key, the Google Play service-account JSON and the signing certificates/keystore live in EAS credentials. Back up the Android keystore locally via `eas credentials`. The Supabase URL and publishable (anon) key ship in the app bundle as `EXPO_PUBLIC_*` vars managed with `eas env:create`; their protection is RLS, so the `service_role` key never enters the app or EAS. Rotation means regenerating in the Supabase or Expo dashboard, then updating the env var, then running a new build or update.
- **Rollback**: JS/OTA rollback is `eas update:rollback` (non-interactive needs the group ID), `eas update:republish --group <id>` or `eas update:roll-back-to-embedded` and takes minutes. Native rollback is not possible in the stores: expire the bad TestFlight build, or halt the Play internal release, then build the previous commit with a higher build number (EAS auto-increments). Database rollback means a fix-forward migration. Take `supabase db dump` before every `supabase db push --remote`, because Free has no backups.
- **Approval**: a human runs or approves `supabase db push --remote` (`--yes` only after reviewing `--dry-run`), `eas update` to the production branch, `eas submit`, any `eas credentials` change, Supabase key rotation, project pause/restore/delete, and everything in App Store Connect and Play Console. An agent may run unattended: lint, typecheck and tests, `eas build` (any profile, `--no-wait`), `eas build:list/view --json`, `eas update --branch preview`, `supabase db push --remote --dry-run`, `supabase gen types`, `supabase db dump`, and all read-only log queries.
- **Logs**: builds with `eas build:list --json --limit 5`, then `eas build:view <id> --json` (log URLs). Workflows with `eas workflow:logs --json`. TestFlight crashes and build/submission status through the Expo MCP server. Backend with `supabase logs --remote --service postgres|auth --output-format json` (24-hour window, no tail). Optional Supabase MCP, always scoped `?project_ref=<ref>&read_only=true`.

## Risk Register

| Risk | Source | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| Free EAS build cap (15 iOS/month) or low-priority queue stalls development before the deadline | Devil's advocate | M | M | Iterate locally with dev builds (`npx expo run:ios`) and use EAS for distribution builds only. Use `eas update` for JS-only changes. Upgrade to Starter ($19/mo) if the queue blocks more than one evening. |
| Supabase project paused after 7 idle days; sign-in/sync fails in the store | Devil's advocate | H | H | Add a scheduled keep-alive (e.g. a weekly GitHub Actions cron running a trivial query), or move to Pro ($25/mo). The app must treat "backend unreachable" as offline, not as an error. |
| No backups on Supabase Free; a bad migration or manual edit is irreversible | Devil's advocate | M | H | Run `supabase db dump` before every `db push --remote`. Keep migrations in git. Never edit schema in the dashboard. |
| OTA update hits an incompatible binary (SDK 58 `balanced` fingerprint default) and crashes at launch | Devil's advocate | M | H | Set an explicit `runtimeVersion` policy (`fingerprint`) in `app.json`. Always publish to the preview branch and verify on a preview build before production. |
| JS update changes the local mark-queue format and drops pending offline marks | Pre-mortem | L | H | Version the persisted queue schema with a migration step, and add a Jest test that loads the previous format. Treat queue-format changes as release-blocking. |
| Agent runs Supabase CLI with pre-v3 flags and targets the local stack instead of production, or the reverse | Devil's advocate | M | M | Pin the CLI version in `package.json` (`npx supabase`). Record "always `--remote`, never `--linked`" in CLAUDE.md. Require `--dry-run` output before any `--yes`. |
| TestFlight build expires after 90 days and the app stops launching | Unknown unknowns | H | M | Put a calendar reminder at 75 days to ship a new build. Optionally add an EAS Workflows scheduled build. |
| Google Play production access needs a 14-day, 12-tester closed test | Unknown unknowns | H | L | Distribute permanently via the internal testing track (2 testers); production access is unnecessary for a household app. |
| Stores require a privacy-policy URL and the Data safety form despite the PRD's "no privacy commitment" | Unknown unknowns | H | L | Publish a one-page policy on GitHub Pages (or EAS Hosting free) before the first submit, and fill in the Data safety form honestly (account email, list contents). |
| Offline longer than the access-token lifetime signs the user out or locks the list | Unknown unknowns | M | H | Keep cached lists readable and markable regardless of session state. Refresh the session on reconnect before draining the mark queue. Add a test for an expired token while offline. |
| `eas build --local` (experimental) is not a reliable fallback during an EAS outage | Unknown unknowns | L | L | Accept for MVP. The fallback is waiting, or the documented GitHub Actions + fastlane path. |
| Expo MCP tool list is "subject to change"; Supabase MCP is unsafe on production data | Research finding (checked 2026-11-14) | M | L | Use the CLIs as the primary path. Use the Supabase MCP only with `read_only=true` and `project_ref`, with manual tool approval on. |
| Apple Developer enrolment ($99/yr) and verification can take days and sits on the critical path | Research finding | M | M | Enrol immediately, before any build work. Create the Google Play account ($25) the same day. |
| Losing the Expo account loses the managed Android upload keystore | Research finding | L | H | Download the keystore and credentials with `eas credentials` and store them in a password manager. |
| Starter's `web.output: "server"` targets a beta feature the PRD does not need | Research finding (checked 2026-11-14) | L | L | Ignore web for the MVP; switch to `"static"` if web is ever exported. |

## Getting Started

These steps were verified against Expo SDK 58, eas-cli 27.10.0 and Supabase CLI v3 (2026-11-14).

1. **Manual gates (human, today):** enrol in the Apple Developer Program, create a Google Play developer account, create an Expo account, and create a Supabase project in a specific EU region (choose **Frankfurt**; the generic "Europe" option can land in London/Zurich). Generate an App Store Connect API key and a Google Play service account.
2. **Link the project to EAS:** `npm install -g eas-cli` (or `npx eas-cli@latest`), then `eas login`, then `eas init`, which writes the project ID into `app.json`. Then run `eas build:configure`, which creates `eas.json` with `development`, `preview` and `production` profiles (enable `autoIncrement`).
3. **OTA setup:** run `npx expo install expo-updates`, then `eas update:configure`. Set an explicit `runtimeVersion` policy (`fingerprint`) in `app.json`.
4. **First store builds:** run `eas build --platform ios --profile production --auto-submit` (TestFlight) and `eas build --platform android --profile production --auto-submit` (Play internal testing track). The non-interactive iOS submit needs `ascAppId` in `eas.json` plus the API key.
5. **Supabase wiring:** run `npm install --save-dev supabase` (pinned), then `npx supabase init` and `npx supabase link`. Confirm the v3 flags with `npx supabase link --help`, since `--project-ref` is deprecated on other commands. Then run `npx supabase db push --remote --dry-run`, `npx supabase gen types typescript`. Install the client per the official Expo quickstart: `@supabase/supabase-js`, `react-native-url-polyfill` and `expo-sqlite`, with session storage via `expo-sqlite/localStorage/install` and `detectSessionInUrl: false`.

## Out of Scope

The following were not evaluated in this research:
- Docker image configuration
- CI/CD pipeline setup (including EAS Workflows / GitHub Actions wiring beyond naming the commands)
- Production-scale architecture (multi-region, HA, DR)
- Web hosting for Expo Router server output (no web requirement in the PRD)
