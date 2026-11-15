# First deployment — Android via EAS + Supabase project

> **Status (2026-11-15): READY TO RESUME — not executed.** Expo and Supabase accounts exist; the Google Play Console account awaits identity verification. Resume at Phase 0 step 3 (create the Supabase project in Frankfurt, if not done) and step 4 (`nvm use`, logins), then run Phases 1–3 (roadmap F-01 `first-android-deploy`). Phase 4 waits for Play verification and is tracked separately as roadmap F-02 `play-internal-testing`. The uncommitted `context/foundation/infrastructure.md` is still on branch `chore/project-tooling`.

## Context

`context/foundation/infrastructure.md` (2026-11-14) chose **EAS** for build/sign/submit/OTA and keeps **Supabase** as the backend. The user scoped this first deployment to **Android + Supabase** (iOS later). The application identifier is **`dev.zelazny.follow`**, which is permanent once uploaded to Play. The user has **no accounts yet** (Expo, Google Play, Supabase), so the plan front-loads the human gates.

**Intended outcome:**

1. The current starter app installs on an Android phone from an EAS preview APK.
2. OTA updates are wired.
3. A Supabase project exists in Frankfurt, linked to the repo via `supabase/`, with its URL and key stored in EAS env.
4. Once Google Play verification clears, a production `.aab` reaches the **Play internal testing** track via `eas submit`.

Out of scope:

- the Supabase schema and supabase-js client code (they belong to the first data feature),
- iOS,
- CI wiring,
- a keep-alive cron (nothing to lose while the DB is empty; add it with the first data feature, per the risk register).

Current state, verified:

- `app.json` has no `android.package`.
- There is no `eas.json`, no `expo-updates` and no `supabase/`.
- eas-cli and the supabase CLI are not installed.
- Active Node is **v23.6.0**, while `.nvmrc` says 24.
- The `gh` token is invalid.
- `.gitignore` already covers `*.jks`, `*.key`, `.env*.local`.

## Phase 0 — Human gates (user, start today; Play verification can take days)

1. Create an **Expo** account at expo.dev.
2. Create a **Google Play Console** developer account: $25, personal, with identity and Android-device verification. This is the critical path.
3. Create a **Supabase** account and a project named `follow` in region **Frankfurt (eu-central-1)**, set explicitly rather than the generic "Europe". Save the DB password in a password manager.
4. Run `nvm use` (Node 24, per `.nvmrc`).
5. In the terminal:
   - `! npm install --global eas-cli`
   - `! eas login`
   - `! npx supabase login`

   These are interactive and touch credentials, so the user runs them, not the agent.

## Phase 1 — Repo configuration (agent)

Work on a new branch `chore/first-android-deploy` off `main`, carrying over the uncommitted `context/foundation/infrastructure.md`. Commits happen only when the user asks.

1. **`app.json`:** add `"android": { "package": "dev.zelazny.follow", … }`, keeping the existing adaptive-icon keys.
2. **`eas init`** (agent may run it after login): links the project and writes `extra.eas.projectId` (and `owner`) into `app.json`.
3. **`eas.json`** (new), following the `docs.expo.dev/build/eas-json` examples:
   - `cli.appVersionSource: "remote"`. Validate with the `eas build:configure` output and the schema.
   - `build.development`: `developmentClient`, `distribution: internal`. This profile is not used yet.
   - `build.preview`: `distribution: internal`, `android.buildType: "apk"`, `channel: "preview"`, `environment: "preview"`.
   - `build.production`: `autoIncrement: true`, `channel: "production"`, `environment: "production"`, building an `.aab` (the default).
   - `submit.production.android`: `track: "internal"`.
4. **OTA:** run `npx expo install expo-updates`, then `eas update:configure` (writes `updates.url`, `runtimeVersion` and the channels). Then set `"runtimeVersion": { "policy": "fingerprint" }` in `app.json` (risk register: SDK 58's `balanced` fingerprint default).
5. **Supabase CLI:** run `npm install --save-dev supabase`, which pins the CLI, then `npx supabase init`. This creates `supabase/config.toml`; commit it and leave `supabase/.temp` gitignored as generated.
6. **CLAUDE.md:** add one rule under Tooling: "Supabase CLI v3: target hosted with `--remote` (never `--linked`/`--project-ref`); run `db push --remote --dry-run` and get human approval before `--yes`; `npx supabase db dump` before any remote push." Keep it in line with the existing style.
7. Run `/verify` (Biome, tsc and Jest). `expo-updates` must not break the Jest config workarounds.

## Phase 2 — Supabase link and env (agent, after Phase 0.3)

1. `npx supabase link <project-ref>`. The user provides the ref, and `SUPABASE_DB_PASSWORD` comes from their shell.
2. Verify with `npx supabase migration list --remote` (expect an empty list) and `curl https://<ref>.supabase.co/auth/v1/health -H "apikey: <publishable key>"`, which should return 200.
3. Create the EAS env vars for the `preview` and `production` environments:
   - `eas env:create --name EXPO_PUBLIC_SUPABASE_URL --value … --environment preview --environment production --visibility plaintext`
   - the same for `EXPO_PUBLIC_SUPABASE_KEY` (the publishable key, with visibility `sensitive`).
   - Locally, write the same values to `.env.local`, which is gitignored.

   Never use the `service_role` key.

## Phase 3 — Android preview build on a phone (Expo account only, no Play needed)

1. The **user** runs `! eas build --platform android --profile preview`. The first run prompts to generate the Android keystore; answer Yes.
2. The agent tracks the build with `eas build:list --platform android --limit 1 --json` and `eas build:view <id> --json`.
3. The user installs the APK from the build's install link/QR and confirms the starter app launches (light and dark mode) on Android 14 (the household Pixel 5, the PRD's minimum) and on a current Android version.
4. **Keystore backup (user):** `! eas credentials --platform android`, then download the keystore and store it in a password manager.
5. **OTA smoke test:** the agent runs `eas update --branch preview --message "OTA smoke test" --non-interactive`. The user restarts the app twice and confirms the update was received with `eas update:list --branch preview --json`, using no visible UI change.

## Phase 4 — Google Play internal testing (after Play verification clears)

1. **User, in Play Console:**
   - Create the app "Follow" (app, free), whose package will bind to `dev.zelazny.follow` on the first upload.
   - Create a Google Cloud service account with a JSON key and grant it release permissions for the app in Play Console. Upload the key with `! eas credentials --platform android` (Google Service Account section). The key must not go into the repo.
   - Add internal testers (the user's own Google account and their spouse's).
2. The agent runs `eas build --platform android --profile production --non-interactive --no-wait`. The keystore already exists, so it can run non-interactively.
3. The **user approves**, then runs `eas submit --platform android --latest --profile production`. Per the Expo docs, the first submission "works out of the box" and creates the first internal-testing release.
4. If Play Console blocks rollout pending setup tasks:
   - fill in the content rating, target audience and Data safety form (account email and list contents);
   - publish the privacy policy through GitHub Pages, after `! gh auth refresh -h github.com`, to get the required URL.
5. Testers install from the internal-testing opt-in link.

## Phase 5 — Record what was deployed

Write `context/deployment/deploy-plan.md`. It contains:

- this approved plan,
- an "Executed" section listing what actually ran: build IDs, the EAS project ID, the Supabase project ref and region, the env var names (not their values), the update channel/branch names, and the Play track,
- any deviations.

It serves milestone planning as the source of truth for "what's already deployed".

## Critical files

- `app.json`: `android.package`, `extra.eas.projectId`, `updates.url`, `runtimeVersion`
- `eas.json` (new)
- `package.json`: `expo-updates` dependency, `supabase` devDependency
- `supabase/config.toml` (new)
- `CLAUDE.md`: Supabase CLI v3 rule
- `context/deployment/deploy-plan.md` (new)

## Verification

- After Phase 1: `/verify` passes, and `npx expo config --type public` shows `android.package`, `runtimeVersion.policy = fingerprint` and `updates.url`.
- After Phase 2: `npx supabase migration list --remote` succeeds; the auth health curl returns 200; `eas env:list --environment preview` shows both vars.
- After Phase 3: the build status is `FINISHED` in `eas build:view --json`; the app launches on a physical Android 14 phone (Pixel 5) and a phone on a current Android version; `eas update:list` shows the smoke update on the `preview` branch.
- After Phase 4: `eas submit` reports success; Play Console → Internal testing shows release 1 (versionCode from EAS remote versioning); a tester installs via the opt-in link.

## Approval boundaries (from infrastructure.md)

- **The user runs or approves:** every login, keystore generation and download, service-account upload, `eas submit`, Play Console actions, and any future `supabase db push --remote --yes`.
- **The agent runs unattended:** repo config edits, `eas init`, `eas build` with `--no-wait`, the `build:list`/`view`/`update:list` reads, `eas update` to the `preview` branch, `supabase link` and `migration list --remote`, and `/verify`.
