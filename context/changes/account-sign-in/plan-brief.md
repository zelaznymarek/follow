# Account Sign-In — Plan Brief

> Full plan: `context/changes/account-sign-in/plan.md`

## What & Why

Roadmap S-01 (FR-001, Linear MAR-7): the user can register with email and password, sign in, and stay signed in on their phone. Everything the user later creates (lists, store, zones, remembered products) belongs to the account, so accounts come before any data. "Stay signed in" must hold offline too, because S-05 (marking with no signal in the store) depends on it.

## Starting Point

F-01 linked the hosted Supabase project (Frankfurt) and put its URL and publishable key in EAS env and `.env.local`. The app is still the Expo starter: the root layout renders Home and Explore tabs directly, with no auth, no form components and no Supabase client. Hosted auth runs on defaults (email confirmation on, 2 emails/hour), and `supabase/config.toml` holds local-dev defaults (F-01 follow-up F2).

## Desired End State

A new user registers with email and a password (≥ 8, letters and digits) and is signed straight in; returning users sign in; the session survives restarts and offline cold starts. Signed-out users only see sign-in / register; signed-in users see Home and an Account tab with their email and a Sign out button. Hosted auth settings come from `config.toml`. Verified on a new preview APK (Pixel 5 + emulator) and on web.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) |
| --- | --- | --- |
| Email confirmation | Off | Avoids the 2-emails/hour, team-only mailer and deep links for a two-person household app. |
| Offline session | Trust the stored session; sign out only on explicit sign-out or server-rejected session | An offline cold start in the store must never land on sign-in (S-05). |
| Password policy | Min 8 with letters and digits | Chosen by the user over Supabase's 6-character default. |
| Auth settings source | `supabase/config.toml` + `config diff`, user runs `config push` | Versioned and reproducible; closes F-01 follow-up F2. |
| Signed-in landing | Starter Home unchanged behind the gate | No throwaway UI; S-02 replaces Home. |
| Sign-out location | Account tab replaces Explore (both platforms) | Permanent home for account actions; removes a demo tab. |
| Sign-out scope | `local` | The default `global` fails offline and keeps the user signed in. |
| Web | Works too (platform-split client, created after hydration) | Fast UI iteration in the browser without spending EAS builds. |
| Extras | No password reset, sign-ups stay open | Smallest S-01; resets go through the Supabase dashboard. |
| Session storage | `expo-sqlite` localStorage (Expo SDK 58 guide) | Current official setup; needs a new preview build (native module). |

## Scope

**In scope:**
- Hosted auth settings via `config.toml` and a reviewed push
- Supabase client (native + web), `SessionProvider` with the offline rule, unit tests
- Root Stack with `Stack.Protected`, `(app)` group, splash handling
- Sign-in and register screens, `TextField` / `Button`, error colour token, screen tests
- Account tab with email + Sign out; new preview APK; device and web checks

**Out of scope:**
- Email confirmation, password reset, closing sign-ups, social sign-in, MFA
- Any table, migration or RLS (S-02+), keep-alive cron (S-02)
- Replacing Home (S-02), `expo-dev-client` (F3 stays queued), F-02 / iOS
- Any offline or pending-session indicator (PRD non-goal)

## Architecture / Approach

`getSupabase()` (native: expo-sqlite storage + AppState auto-refresh; web: browser storage, client-only) feeds a `SessionProvider` that exposes `status` (`loading` / `signed-in` / `signed-out`), the email and the auth actions. On start-up it trusts a stored session when the refresh fails for network reasons; afterwards auth events drive the status. The root layout wraps a Stack in the provider: `(app)` tabs behind `Stack.Protected guard={signed-in}`, sign-in / register behind the inverse guard, and the splash holds until the status is known. Tests mock `@/lib/supabase` or `useSession`, so Jest never loads supabase-js or expo-sqlite.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Hosted auth settings and session layer | Auth settings pushed from `config.toml`; client + `SessionProvider` with tested offline rule | First `config push` touching sections beyond `[auth]` |
| 2. Gate and sign-in / register screens | Protected routing, splash handling, working forms on web / Expo Go | Splash timing (sign-in flash); server render on web |
| 3. Account tab, sign-out and on-device checks | Account tab, local sign-out, new preview APK verified on Pixel 5, emulator and web | One EAS build from the Free quota; 1-hour wait for the offline check |

**Prerequisites:** F-01 merged (or this branch based on it); Supabase project linked and `.env.local` present; `eas` and `supabase` CLIs logged in.
**Estimated effort:** ~2–3 sessions across 3 phases; one preview build.

## Open Risks & Assumptions

- The offline rule relies on supabase-js 2.119.x behaviour (`AuthRetryableFetchError` on network refresh failures, session kept in storage); a library upgrade could change it — the unit tests pin the expected contract against the mocked client.
- The first `supabase config diff` may surface non-auth differences between the template and the hosted project; they must be aligned or accepted before the push.
- Without email confirmation, a mistyped email cannot be corrected by the user and would block any future password reset.
- Anyone with the APK can register an empty account; acceptable while there is no data and RLS arrives with S-02.

## Success Criteria (Summary)

- A new account registers and lands on Home; sign-in and sign-out work on the Pixel 5, the emulator and web.
- The app stays signed in after a restart and on an offline cold start with an expired token.
- Hosted auth settings match `config.toml` (confirmation off, password ≥ 8 with letters and digits).
