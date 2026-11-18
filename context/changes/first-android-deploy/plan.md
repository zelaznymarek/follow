# First Android Deployment Implementation Plan

## Overview

Execute Phases 1–3 of the approved `context/deployment/deploy-plan.md` (roadmap F-01 `first-android-deploy`): configure the repo for EAS builds and over-the-air (OTA) updates, pin and link the hosted Supabase project with its connection settings in EAS env, and install the unchanged starter app on a physical Pixel 5 (Android 14) and a current-Android emulator from a preview APK, proving that an OTA update reaches the phone. This gives every later roadmap slice a way onto a real device, and gives the north star S-05 its offline verification path.

## Current State Analysis

Verified 2026-11-15 on `main` (after merge of PR #1):

- `app.json` exists but has none of the deployment keys: `name` is `"follow"`, `android` holds only `adaptiveIcon` and `predictiveBackGestureEnabled` (no `package`), and there is no `extra.eas`, `updates` or `runtimeVersion` (`app.json:3`, `app.json:13-21`).
- No `eas.json`, no `supabase/` directory; `package.json` has neither `expo-updates` nor a `supabase` devDependency.
- No `app.config.*`, no other branch or stash carries this work.
- Tooling: Node 24.22.3 active via asdf (`.tool-versions`, uncommitted on `main`); `eas-cli` 27.10.0 installed globally and logged in as `zelaznymar`; Supabase CLI not installed in the repo.
- Accounts: Expo and Supabase exist; the Supabase project `follow` exists in Frankfurt (eu-central-1). Google Play Console awaits identity verification — not needed by this change.
- Devices: household Pixel 5 (Android 14, the PRD floor). No Android Studio / Android SDK on the machine (`~/Library/Android/sdk` absent), so the current-Android emulator needs a one-time install.
- `.gitignore` already covers `*.jks`, `*.key`, `.env*.local`, `/android`, `/ios` — builds stay managed (Continuous Native Generation), no native folders are committed.
- Jest config in `package.json` carries the workarounds listed in CLAUDE.md (Reanimated resolver, `.css` mock, `^@/assets/` mapper); adding a native module must not disturb them.

## Desired End State

- `app.json` declares display name "Follow", Android package `dev.zelazny.follow`, the EAS project id/owner, the EAS Update URL and `runtimeVersion` with the `fingerprint` policy.
- `eas.json` defines `development`, `preview` (internal APK, channel/env `preview`) and `production` (auto-increment, channel/env `production`) build profiles plus the internal-track submit profile F-02 will use.
- Supabase CLI is pinned as a devDependency, `supabase/config.toml` is committed, the hosted Frankfurt project is linked, and `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_KEY` exist in EAS `preview` and `production` environments and in a gitignored `.env.local`.
- CLAUDE.md carries the Supabase CLI v3 rule.
- A preview APK built on EAS runs the starter app on the Pixel 5 and on a current-Android emulator, in light and dark mode; an OTA update published to the `preview` branch is launched by the Pixel 5; the Android keystore is backed up in a password manager.
- `context/deployment/deploy-plan.md` records what actually ran.

Verify with the per-phase Success Criteria below; the end state is reached when every row in `## Progress` is checked.

### Key Discoveries:

- `context/deployment/deploy-plan.md` Phases 1–3 already fix every technical choice (package id, profiles, channels, env var names, approval boundaries); this plan executes it rather than redesigning it.
- `context/foundation/infrastructure.md` risk register: SDK 58 changed the default fingerprint preset — an explicit `runtimeVersion` policy is required to avoid OTA updates crashing an incompatible binary.
- `context/foundation/infrastructure.md`: Supabase CLI v3 (2026-11-02) targets the local stack by default; hosted commands need `--remote`, and `--linked` / `--project-ref` are deprecated on most commands.
- `app.json:22-25`: `web.output: "server"` is a beta feature the PRD does not need; it is irrelevant to Android builds and is left alone.

## What We're NOT Doing

- Google Play internal-testing release, service-account key, store listing, privacy-policy page — roadmap F-02 `play-internal-testing`.
- iOS builds, TestFlight, Apple Developer enrolment — parked for M-01 (roadmap `## Parked`).
- Supabase schema, migrations, `supabase-js` client code, sign-in — roadmap S-01 and later.
- Supabase keep-alive cron — lands with the first stored data (roadmap S-02).
- CI wiring (EAS Workflows / GitHub Actions) — `ci_default_flow: manual-promotion`.
- Installing `expo-dev-client`: the `development` profile is declared for later but unused now.
- Any change to the starter app's screens, or to `web.output`.
- A visible UI change for the OTA smoke test (deploy-plan specifies none).

## Implementation Approach

Follow deploy-plan Phases 1–3 in order, on a new branch `chore/first-android-deploy` off `main` that carries the uncommitted `.tool-versions` and the CLAUDE.md asdf rule. Repo configuration comes first because EAS needs the project id before OTA can be configured, and the preview build must embed `expo-updates` and the channel. Linking Supabase and creating the EAS env vars precede the first build so the preview environment is complete from build one, even though no code reads the variables yet. Interactive and credential-touching steps (Supabase login and link, keystore generation and download, the first preview build) are run by the user with `!`; the agent runs config edits, `eas init`, `eas update:configure`, env creation, build tracking and the OTA publish to `preview`, per the approval boundaries in deploy-plan.

## Critical Implementation Details

**Ordering.** `eas init` must run before `eas update:configure` (the update URL is derived from the project id), and `runtimeVersion` must be set to `{ "policy": "fingerprint" }` *after* `eas update:configure`, which may write its own default. Check the SDK 58 pages (`https://docs.expo.dev/versions/v58.0.0/`, `docs.expo.dev/eas-update/runtime-versions` and `docs.expo.dev/build/eas-json`) before editing, per the CLAUDE.md Expo rule.

**Supabase password stays out of the agent.** The agent's shell has no `SUPABASE_DB_PASSWORD`, and the password must not enter the transcript, so `supabase link` and `supabase migration list --remote` are run by the user (they prompt for the password). This deviates from deploy-plan Phase 2, which had the agent run `link`; record it in the Executed section.

**Sandbox network.** Agent commands that reach EAS, npm or Supabase need their hosts allowed (`api.expo.dev`, `u.expo.dev`, `registry.npmjs.org`, `api.supabase.com`, `<ref>.supabase.co`).

## Phase 1: Repo configuration

### Overview

Make the repo buildable on EAS with OTA updates and a pinned Supabase CLI; no external state changes except registering the EAS project.

### Changes Required:

#### 1. Branch

**File**: git

**Intent**: Start `chore/first-android-deploy` from `main`, carrying over the uncommitted `.tool-versions` and CLAUDE.md asdf rule, per the CLAUDE.md git convention.

**Contract**: All commits of this change land on `chore/first-android-deploy`; a PR to `main` closes it.

#### 2. App identity

**File**: `app.json`

**Intent**: Set the launcher name to "Follow" and add the Android application id, keeping every existing key (adaptive icon, `predictiveBackGestureEnabled`, `scheme`, plugins, experiments).

**Contract**: `expo.name = "Follow"`, `expo.slug` stays `"follow"`, `expo.android.package = "dev.zelazny.follow"`. The package id becomes permanent on the first Play upload (F-02).

#### 3. EAS project link

**File**: `app.json` (written by `eas init`)

**Intent**: Register the app as an EAS project under the logged-in account so builds, env and updates can target it.

**Contract**: `expo.extra.eas.projectId` (UUID) and `expo.owner = "zelaznymar"` present.

#### 4. Build and submit profiles

**File**: `eas.json` (new)

**Intent**: Define the three build profiles and the internal-track submit profile from deploy-plan Phase 1.3, using `eas build:configure` output and the SDK 58 `eas.json` schema as the base.

**Contract**:
- `cli.appVersionSource: "remote"` (plus whatever `cli.version` constraint `eas build:configure` writes).
- `build.development`: `developmentClient: true`, `distribution: "internal"` (unused until `expo-dev-client` is added).
- `build.preview`: `distribution: "internal"`, `android.buildType: "apk"`, `channel: "preview"`, `environment: "preview"`.
- `build.production`: `autoIncrement: true`, `channel: "production"`, `environment: "production"`, default `.aab` output.
- `submit.production.android.track: "internal"`.

#### 5. OTA updates

**File**: `package.json`, `app.json`

**Intent**: Install `expo-updates` at the SDK-58-compatible version and configure EAS Update, then pin the runtime version policy to `fingerprint` so an update can only reach a binary with matching native code.

**Contract**: `dependencies["expo-updates"]` added via `npx expo install expo-updates`; `expo.updates.url = "https://u.expo.dev/<projectId>"`; `expo.runtimeVersion = { "policy": "fingerprint" }`.

#### 6. Supabase CLI

**File**: `package.json`, `package-lock.json`, `supabase/config.toml` (new), `supabase/.gitignore` (new, generated)

**Intent**: Pin the Supabase CLI in the repo so agents and the user run the same v3 binary via `npx supabase`, and initialise the project directory.

**Contract**: `devDependencies.supabase` at an exact version (`npm install --save-dev --save-exact supabase`); `npx supabase init` creates `supabase/config.toml`; `supabase/.temp` and other generated state stay out of git (via the generated `supabase/.gitignore`, or a root `.gitignore` entry if init does not ignore them).

#### 7. Agent rule

**File**: `CLAUDE.md`

**Intent**: Prevent agents from running pre-v3 Supabase flags against the wrong target or applying unreviewed migrations.

**Contract**: One bullet under `## Tooling`, in the file's style: "Supabase CLI v3: target hosted with `--remote` (never `--linked`/`--project-ref`); run `db push --remote --dry-run` and get human approval before `--yes`; `npx supabase db dump` before any remote push."

### Success Criteria:

#### Automated Verification:

- `npx expo config --type public` shows name `Follow`, `android.package` `dev.zelazny.follow`, `runtimeVersion.policy` `fingerprint`, an `updates.url` and `extra.eas.projectId`
- `eas config --platform android --profile preview --non-interactive` resolves without errors
- `npx supabase --version` runs the pinned CLI from `node_modules`, and `git status` lists `supabase/config.toml` but nothing under `supabase/.temp`
- `/verify` passes (Biome, `npx tsc --noEmit`, `npm test`)

#### Manual Verification:

- The starter app still starts locally with `npx expo start` (web or Expo Go)

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Supabase link and EAS env

### Overview

Link the hosted Frankfurt project to the repo and put its URL and publishable key where builds and local dev read them.

### Changes Required:

#### 1. Supabase login and link (user)

**File**: `supabase/.temp/*` (generated, gitignored)

**Intent**: The user runs `! npx supabase login`, then `! npx supabase link` (confirm the v3 arguments with `npx supabase link --help` first) against the `follow` project, entering the DB password at the prompt; the user then shares the project ref (not the password) with the agent.

**Contract**: Repo linked to project ref `<ref>` in eu-central-1; no secret in tracked files or the transcript.

#### 2. EAS environment variables (agent)

**File**: EAS project env (remote)

**Intent**: Store the Supabase URL and publishable key for the `preview` and `production` environments so every build of those profiles embeds them; the `service_role` key is never used.

**Contract**: `eas env:create --name EXPO_PUBLIC_SUPABASE_URL --value <url> --environment preview --environment production --visibility plaintext`; the same for `EXPO_PUBLIC_SUPABASE_KEY` with the publishable key and `--visibility sensitive`.

#### 3. Local env

**File**: `.env.local` (new, gitignored)

**Intent**: Mirror the two variables for local `npx expo start` runs.

**Contract**: `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_KEY` defined; file matched by the existing `.env*.local` ignore rule.

### Success Criteria:

#### Automated Verification:

- `npx supabase projects list` shows the linked `follow` project in the Frankfurt (eu-central-1) region
- `curl -s -o /dev/null -w "%{http_code}" https://<ref>.supabase.co/auth/v1/health -H "apikey: <publishable key>"` returns `200`
- `eas env:list --environment preview` and `eas env:list --environment production` each show both `EXPO_PUBLIC_SUPABASE_*` variables
- `git check-ignore .env.local` confirms the file is ignored, and `git status` shows no tracked file containing the key

#### Manual Verification:

- `npx supabase migration list --remote`, run by the user, succeeds and lists no migrations

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Preview APK on devices and OTA

### Overview

Build the first preview APK, run it on both ends of the supported Android range, back up the keystore, prove the OTA path, and record what was deployed.

### Changes Required:

#### 1. Emulator (user, one-time)

**File**: local machine

**Intent**: Install Android Studio and create an emulator (AVD) on the newest stable Android system image, so the upper end of the PRD's Android 14+ range is checked without a second phone.

**Contract**: `emulator -list-avds` (from the Android SDK) lists at least one AVD on the current Android release; `adb devices` sees it when running.

#### 2. First preview build (user)

**File**: EAS build (remote)

**Intent**: The user runs `! eas build --platform android --profile preview` and answers Yes to generating the Android keystore; the agent then tracks the build with `eas build:list --platform android --limit 1 --json --non-interactive` and `eas build:view <id> --json`.

**Contract**: One `FINISHED` preview build with channel `preview` and an APK artifact.

#### 3. Install and keystore backup

**File**: devices, password manager

**Intent**: The user installs the APK on the Pixel 5 from the build's install link/QR and on the emulator (`eas build:run --platform android --latest` with the emulator running), then downloads the keystore with `! eas credentials --platform android` into a password manager.

**Contract**: Starter app launches on both devices; keystore and its passwords stored outside the repo.

#### 4. OTA smoke test (agent + user)

**File**: EAS Update branch `preview` (remote)

**Intent**: The agent publishes `eas update --branch preview --message "OTA smoke test" --non-interactive` with no UI change; the user force-closes and reopens the app on the Pixel 5 twice; the update's page on expo.dev then shows a launch from the device.

**Contract**: An update group on branch `preview` with the build's fingerprint runtime version, launched by ≥ 1 device. If the dashboard shows no launch data, stop and report rather than adding a visible change.

#### 5. Record what was deployed

**File**: `context/deployment/deploy-plan.md`

**Intent**: Add an "Executed" section (deploy-plan Phase 5, scoped to Phases 1–3) and update the status line, so later milestones know what is live.

**Contract**: Section lists the preview build ID, EAS project ID, Supabase project ref and region, env var names (no values), channel/branch names, devices verified, and deviations (user ran `supabase link`; Phase 4 deferred to F-02).

### Success Criteria:

#### Automated Verification:

- `eas build:view <id> --json` reports status `FINISHED` for the preview build, with channel `preview`
- `eas update:list --branch preview --json --non-interactive` lists the "OTA smoke test" update
- `context/deployment/deploy-plan.md` contains an Executed section naming the build ID, EAS project ID and Supabase project ref

#### Manual Verification:

- The starter app launches on the Pixel 5 (Android 14) in light and dark mode
- The starter app launches on the current-Android emulator in light and dark mode
- The Android keystore and its credentials are stored in a password manager
- After two cold restarts on the Pixel 5, the update's page on expo.dev shows the smoke update launched by the device

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Testing Strategy

### Unit Tests:

- No new tests: the change adds configuration and one native dependency, no app code. The existing `__tests__/home-screen-test.tsx` plus `/verify` guard that `expo-updates` does not break the Jest workarounds.

### Integration Tests:

- The EAS preview build itself is the integration test: it proves `app.json`, `eas.json`, `expo-updates` and the env resolve together on EAS.

### Manual Testing Steps:

1. Install the preview APK on the Pixel 5 from the build page; launch it; toggle system dark mode; confirm the starter renders in both.
2. Start the emulator; run `eas build:run --platform android --latest`; repeat the light/dark check.
3. After the agent publishes the OTA update, force-close and reopen the app on the Pixel 5 twice; check the update's launch count on expo.dev.

## Performance Considerations

None for the app. The EAS Free tier queue dominates wall-clock time; per the infrastructure risk register, iterate locally and use EAS only for distribution builds.

## Migration Notes

None — no data exists yet. The package id `dev.zelazny.follow` and the keystore generated here become permanent once F-02 uploads to Play; losing the keystore later would block Play updates, hence the mandatory backup.

## References

- Approved deployment plan: `context/deployment/deploy-plan.md` (Phases 1–3)
- Platform research and risk register: `context/foundation/infrastructure.md`
- Roadmap item: `context/foundation/roadmap.md` — F-01 `first-android-deploy` (Phase 4 → F-02 `play-internal-testing`)
- Stack: `context/foundation/tech-stack.md`
- Current config: `app.json:1-36`, `package.json`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Repo configuration

#### Automated

- [x] 1.1 `npx expo config --type public` shows name `Follow`, `android.package` `dev.zelazny.follow`, `runtimeVersion.policy` `fingerprint`, an `updates.url` and `extra.eas.projectId` — 3b90368
- [x] 1.2 `eas config --platform android --profile preview --non-interactive` resolves without errors — 3b90368
- [x] 1.3 `npx supabase --version` runs the pinned CLI from `node_modules`, and `git status` lists `supabase/config.toml` but nothing under `supabase/.temp` — 3b90368
- [x] 1.4 `/verify` passes (Biome, `npx tsc --noEmit`, `npm test`) — 3b90368

#### Manual

- [x] 1.5 The starter app still starts locally with `npx expo start` (web or Expo Go) — 3b90368

### Phase 2: Supabase link and EAS env

#### Automated

- [x] 2.1 `npx supabase projects list` shows the linked `follow` project in the Frankfurt (eu-central-1) region — c2ad633
- [x] 2.2 `curl -s -o /dev/null -w "%{http_code}" https://<ref>.supabase.co/auth/v1/health -H "apikey: <publishable key>"` returns `200` — c2ad633
- [x] 2.3 `eas env:list --environment preview` and `eas env:list --environment production` each show both `EXPO_PUBLIC_SUPABASE_*` variables — c2ad633
- [x] 2.4 `git check-ignore .env.local` confirms the file is ignored, and `git status` shows no tracked file containing the key — c2ad633

#### Manual

- [x] 2.5 `npx supabase migration list --remote`, run by the user, succeeds and lists no migrations — c2ad633

### Phase 3: Preview APK on devices and OTA

#### Automated

- [x] 3.1 `eas build:view <id> --json` reports status `FINISHED` for the preview build, with channel `preview`
- [x] 3.2 `eas update:list --branch preview --json --non-interactive` lists the "OTA smoke test" update
- [x] 3.3 `context/deployment/deploy-plan.md` contains an Executed section naming the build ID, EAS project ID and Supabase project ref

#### Manual

- [x] 3.4 The starter app launches on the Pixel 5 (Android 14) in light and dark mode
- [x] 3.5 The starter app launches on the current-Android emulator in light and dark mode
- [x] 3.6 The Android keystore and its credentials are stored in a password manager
- [x] 3.7 After two cold restarts on the Pixel 5, the update's page on expo.dev shows the smoke update launched by the device
