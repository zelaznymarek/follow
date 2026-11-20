# First deployment — Android via EAS + Supabase project

> **Status (2026-11-18): Phases 1–3 EXECUTED (roadmap F-01 `first-android-deploy`)** — see [Executed](#executed) below. Phase 4 waits for Google Play verification and is tracked as roadmap F-02 `play-internal-testing`.

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

## Executed

Phases 1–3, roadmap F-01 `first-android-deploy`, on branch `chore/first-android-deploy` (commits `3b90368`, `c2ad633`), 2026-11-17 – 2026-11-18. Phase 4 is deferred to F-02 `play-internal-testing`.

| What | Value |
| --- | --- |
| EAS project | `@zelaznym-team/follow`, ID `6c6fc84d-2a52-49f2-871b-99dea06c3353` |
| App identity | display name `Follow`, Android package `dev.zelazny.follow`, version `1.0.0` |
| OTA config | `updates.url` `https://u.expo.dev/6c6fc84d-2a52-49f2-871b-99dea06c3353`, `runtimeVersion.policy` `fingerprint` |
| Supabase project | `follow`, ref `skudzowkkurdbevxwnht`, region eu-central-1 (Frankfurt); CLI `supabase` 3.2.0 pinned as devDependency |
| EAS env (`preview`, `production`) | `EXPO_PUBLIC_SUPABASE_URL` (plaintext), `EXPO_PUBLIC_SUPABASE_KEY` (sensitive, publishable key); mirrored in gitignored `.env.local` |
| Preview build | `90a6e460-6975-4161-a67e-cd0dd95462d5` — `FINISHED` 2026-11-17, APK, internal distribution, channel `preview`, versionCode 1, runtime `fd1fcb1206d0b904ab19a654a68ac8bb90a227b4`, commit `c2ad633` |
| Update channel / branch | channel `preview` → branch `preview` (production channel `production` reserved for F-02) |
| OTA smoke update | branch `preview`, group `897f5b6f-5970-4349-8840-28e36a0e43cc`, message "OTA smoke test", android only, same runtime as the build; launched by the Pixel 5 after two cold restarts — 1 launch, 0 crashes (`eas update:view <group> --insights`) |
| Android keystore | generated by EAS on the first preview build; backed up as base64 in Apple Passwords, SHA-256 restore check passed (2026-11-18) |
| Devices verified | Pixel 5 (Android 14) and current-Android emulator — starter launches in light and dark mode (2026-11-18) |

### Deviations

- The user ran `supabase login` and `supabase link` (planned for the agent). CLI v3 `link` asked for no DB password. The first link went to the wrong project (`ydyoheduzcnqaakkrfwy`, eu-north-1) and was redone against `skudzowkkurdbevxwnht`.
- The EAS project is owned by the account `zelaznym-team`, not `zelaznymar`: it is the only account the current login exposes, with credentials limited to the Developer role.
- `eas update:configure` wrote `android.runtimeVersion: { policy: "appVersion" }`; it was replaced by the top-level `fingerprint` policy.
- `eas update` in non-interactive mode requires `--environment`; the smoke update ran with `--environment preview --platform android`.
- `eas env:create` is deprecated in eas-cli 27.10 — use `eas env:set` next time.
- Agent sandbox: npm needs `--cache $TMPDIR/npm-cache` (root-owned files in `~/.npm`), `expo install` needs `EXPO_OFFLINE=1`, the Supabase CLI needs `DO_NOT_TRACK=1`; `eas update` uploads to `update-assets-upload-production.storage.googleapis.com`.

### 2026-11-18 — S-01 `account-sign-in`: hosted auth settings

`supabase config push` (reviewed by the user) applied `supabase/config.toml` to project `skudzowkkurdbevxwnht`: `auth.site_url` `follow://`, `auth.email.enable_confirmations` `false`, `auth.minimum_password_length` `8`, `auth.password_requirements` `letters_digits`. All other sections were aligned to the hosted values first, so nothing else changed; `supabase config diff` afterwards reports no differences.

### 2026-11-18 — S-01 `account-sign-in`: preview build

| What | Value |
| --- | --- |
| Preview build | `2e7aa089-1282-423c-a423-0bf82cf2279c` — `FINISHED` 2026-11-18, APK, internal distribution, channel `preview`, versionCode 1, runtime `7c659defc2f12bd944574fbecaffd57cb2956734`, commit `782c809` |
| What it adds | email/password sign-in and register, auth gate, Account tab with sign-out (supabase-js session stored under `follow-auth` via `expo-sqlite` localStorage) |
| Runtime | new fingerprint (F-01 was `fd1fcb12…`): the F-01 APK does not receive OTA updates published for this build, so reinstall from the new build |
| OTA updates on `preview` (2026-11-20) | `bcb80d1f` and `d0d0d5d9`: temporary sign-in diagnostics for check 3.7 (never committed); `ad51a27c`: same code as `782c809`, removes them |

### 2026-11-20 — S-02 `shopping-lists`: first migrations

| What | Value |
| --- | --- |
| Backup before the first push | `npx supabase db dump --remote` (schema) to `~/follow-backups/2026-11-20-pre-s02-schema.sql`, outside the repo, run by the user (Docker is not reachable from the agent sandbox) |
| `20261120204123_create_shopping_lists.sql` | Table `public.shopping_lists` (`id`, `user_id` default `auth.uid()` → `auth.users` on delete cascade, `name` null or 1–80 chars, `created_at`), index `(user_id, created_at desc)`, RLS with 4 owner policies `to authenticated`, `select/insert/update/delete` granted to `authenticated`; function `public.ping()` returning 1, execute granted to `anon` and `authenticated` |
| `20261120205749_revoke_anon_shopping_lists.sql` | `revoke all on public.shopping_lists from anon` (see deviation below) |
| Applied by | the user: `db push --remote --dry-run` reviewed, then `--yes` (both migrations) |
| REST checks (publishable key) | `GET /rest/v1/shopping_lists` → `401` `permission denied for table shopping_lists`; `POST /rest/v1/rpc/ping` → `1` |
| Generated types | `npm run gen:types` → `src/lib/database.types.ts` (excluded from Biome) |

#### Deviations

- **Default privileges.** Supabase changelog 45329 says new `public` tables have received no Data API grants since 2026-10-30. This project still applied the old default privileges: `anon` received grants on `shopping_lists`, and an anonymous `GET` returned `200 []`, with RLS the only barrier. The second migration revokes them. Future tables need an explicit `revoke … from anon` (or the schema's default privileges changed) until the project's defaults match the changelog.
- **Sandbox.** `supabase db push --remote --dry-run` and `supabase migration list --remote` hang at "Initialising login role…" in the agent sandbox; the user runs them. `supabase gen types --remote` works from the sandbox.
