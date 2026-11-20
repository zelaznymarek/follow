# Review follow-ups — first-android-deploy

Queued from `reviews/impl-review.md` (2026-11-18). Each item names the change that should pick it up.

## F2 — Supabase auth config defaults → S-01 `account-sign-in`

`supabase/config.toml` still holds the `supabase init` local-dev auth defaults: `site_url` / `additional_redirect_urls` = `127.0.0.1:3000` (:164, :168), `minimum_password_length = 6` (:187), `password_requirements = ""` (:190), `[auth.email] enable_confirmations = false` (:232), and `[db.seed]` points at a missing `seed.sql`. The S-01 plan must:

- set the app-scheme redirect URL(s) (`follow://…`) and a real `site_url`;
- choose the password policy and whether email confirmation is required;
- decide whether `config.toml` (`supabase config push`, reviewed) or the dashboard is the source of truth for hosted auth settings;
- resolve `[db.seed]` (add `seed.sql` or disable seeding).

Until then, do not run `supabase config push`.

## F1 — EAS login scoped to Developer → F-02 `play-internal-testing`

The EAS project is owned by the team account `zelaznym-team` (`app.json:47`). The user is Owner of it, but `eas whoami` reports the current login as "limited to Developer by the current credentials". Before the F-02 service-account upload and `eas submit`:

- the user re-runs `eas login` and grants full permissions;
- `eas whoami` no longer shows the Developer limit;
- the F-02 plan names `@zelaznym-team/follow` as the project (the F-01 plan contract still says `zelaznymar`).

## F4 — Preview and Play builds share `dev.zelazny.follow` → F-02 `play-internal-testing`

Preview and production profiles both build `dev.zelazny.follow` (`eas.json:12`). Once a phone has the Play build (re-signed by Play App Signing), a sideloaded preview APK cannot install over it without uninstalling, and uninstalling wipes the on-device data S-05 offline marking depends on. The F-02 plan must choose one:

- a separate preview application id (e.g. `dev.zelazny.follow.preview`) via `app.config.ts` keyed on the build profile — check the SDK 58 docs, keep `typedRoutes` / `reactCompiler`, and confirm OTA channels still map per id; or
- Play-only installs on household phones, with preview APKs limited to the emulator or a spare device.

## F3 — Development profile needs `expo-dev-client` → first change that needs a development build

`eas.json:7` declares `development` with `developmentClient: true`, but `expo-dev-client` is not installed (deliberately out of F-01's scope). The first change that builds this profile (likely S-01, if sign-in redirects are iterated on a dev build) runs `npx expo install expo-dev-client` first and checks that `/verify` still passes.
