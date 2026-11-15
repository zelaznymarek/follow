# First Android Deployment — Plan Brief

> Full plan: `context/changes/first-android-deploy/plan.md`

## What & Why

Roadmap F-01: get the app onto real Android phones through EAS, with OTA updates and the hosted Supabase project wired in, by executing Phases 1–3 of the approved `context/deployment/deploy-plan.md`. Every later slice needs a way onto the phone, and the north star (S-05, marking items with no signal) can only be proven on a real device in airplane mode.

## Starting Point

The Expo SDK 58 starter is on `main` with a bare `app.json` (no package id, no EAS link, no update config), no `eas.json`, no Supabase CLI or `supabase/` directory. Node 24 runs via asdf, `eas-cli` is logged in, and the Supabase project `follow` already exists in Frankfurt; Google Play is still verifying and is not needed here.

## Desired End State

The unchanged starter app, built on EAS as a preview APK, runs on the household Pixel 5 (Android 14) and on a current-Android emulator, in light and dark mode. An OTA update published to the `preview` branch reaches the Pixel 5. The repo is linked to Supabase, the URL and publishable key sit in EAS env and `.env.local`, the keystore is backed up, and `deploy-plan.md` records what actually ran.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Scope | Deploy-plan Phases 1–3 only | Play internal testing waits on Google verification and is roadmap F-02. | Roadmap |
| Android application id | `dev.zelazny.follow` | Permanent once uploaded to Play, chosen up front. | Deploy plan |
| Build profiles | development / preview (internal APK) / production (auto-increment) | Matches EAS conventions; preview needs no store account. | Deploy plan |
| OTA runtime policy | `fingerprint`, set explicitly | SDK 58 changed the default; a mismatched update can crash at launch. | Deploy plan / Infrastructure |
| Supabase CLI | Pinned devDependency, v3 rule in CLAUDE.md | v3 changed defaults; agents must not hit the wrong target. | Deploy plan |
| Display name | "Follow" (slug stays `follow`) | Matches the product name and the future Play listing. | Plan |
| Verification devices | Pixel 5 (Android 14) + current-Android emulator | Covers both ends of the PRD's Android 14+ range with one phone. | Plan |
| Who runs `supabase link` | The user | Keeps the DB password out of the agent's shell and transcript (deviation from deploy plan). | Plan |
| OTA smoke test | No UI change; confirmed via launch data on expo.dev | Keeps the starter untouched, as deploy plan specified. | Deploy plan |

## Scope

**In scope:**
- `app.json` identity, EAS link, OTA config; new `eas.json`
- `expo-updates`; pinned Supabase CLI + `supabase/config.toml`; CLAUDE.md rule
- Supabase link, EAS env vars, `.env.local`
- First preview APK, installs on two devices, keystore backup, OTA smoke test, Executed record

**Out of scope:**
- Play internal testing (F-02), iOS/TestFlight (parked)
- Schema, `supabase-js` client, sign-in (S-01+), keep-alive cron (S-02)
- CI wiring, `expo-dev-client`, UI changes

## Architecture / Approach

Config-only change on branch `chore/first-android-deploy`. Repo config first (EAS project id must exist before OTA config), then Supabase link and EAS env (so the first build has a complete environment), then the first build and device checks. Credential-touching and interactive steps go to the user via `!`; the agent edits config, creates env vars, tracks builds and publishes to `preview` only.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Repo configuration | Buildable, OTA-ready repo with pinned Supabase CLI; `/verify` green | `eas update:configure` overwriting the fingerprint policy; `expo-updates` disturbing Jest |
| 2. Supabase link and EAS env | Linked Frankfurt project; URL/key in EAS env + `.env.local` | Supabase CLI v3 flag changes; secrets leaking into tracked files |
| 3. Preview APK on devices and OTA | Starter on Pixel 5 + emulator; OTA proven; keystore backed up; Executed record | EAS Free queue delays; Android Studio install; OTA launch data not visible |

**Prerequisites:** Supabase project `follow` in Frankfurt (done), `eas-cli` logged in (done), Node 24 (done); Android Studio + current-Android AVD before Phase 3.
**Estimated effort:** ~2 sessions across 3 phases; wall-clock time dominated by the EAS Free build queue.

## Open Risks & Assumptions

- Assumes `eas update:configure` and `eas build:configure` in eas-cli 27.10.0 behave as in the SDK 58 docs checked 2026-11-14; the implementer re-checks the docs before editing.
- The EAS Free tier queue may stretch the first build to hours; acceptable since only one build is planned.
- If expo.dev shows no launch data for the OTA update, the phase stops for a decision instead of adding a visible change.

## Success Criteria (Summary)

- The starter app installs from a preview APK and runs on the Pixel 5 and a current-Android emulator.
- An OTA update to `preview` reaches the Pixel 5 without a new build.
- Supabase is linked and its connection settings are available to every preview/production build, with no secret in git.
