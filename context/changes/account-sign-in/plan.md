# Account Sign-In Implementation Plan

## Overview

Roadmap S-01 (`account-sign-in`, FR-001, Linear MAR-7): the user can register with email and password, sign in, and stay signed in on their phone. Accounts live in the hosted Supabase project linked by F-01. A gate keeps signed-out users on the sign-in / register screens and signed-in users in the app; an Account tab shows the signed-in email and signs out. "Stay signed in" holds across app restarts and while offline, so S-05 (marking with no connection) can rely on it.

## Current State Analysis

Verified 2026-11-18 on `chore/first-android-deploy` (F-01 implemented and reviewed, PR pending):

- `src/app/_layout.tsx:10` is the root layout and renders the starter tabs directly: `ThemeProvider` → `AnimatedSplashOverlay` → `AppTabs` (`:13-15`). No providers, no route groups. `SplashScreen.preventAutoHideAsync()` runs at module level (`:8`); the splash is hidden by the animated overlay in `src/components/animated-icon.tsx:52`.
- Routes: only `src/app/index.tsx` (Home) and `src/app/explore.tsx` (Explore demo). Tabs are platform-split: `src/components/app-tabs.tsx` (`NativeTabs`, triggers `index` `:15` and `explore` `:23`) and `src/components/app-tabs.web.tsx` (`expo-router/ui`, triggers `home` `/` `:25` and `explore` `/explore` `:28`).
- UI kit: `ThemedText` (`src/components/themed-text.tsx:7`), `ThemedView`, `useTheme()` (`src/hooks/use-theme.ts:9`). No Button or TextInput component. `src/constants/theme.ts:10-25` has no error colour. Press pattern: `Pressable` + `pressed && styles.pressed` (`explore.tsx:48`).
- Lint: `biome.json:23-28` `noReactNativeRawText` skip list is `ThemedText`, `TabButton`, `NativeTabs.Trigger.Label`.
- Tests: one test, `__tests__/home-screen-test.tsx` (async RNTL render, no mocks). `jest-setup.ts` only calls Reanimated's `setUpTests()`. jest-expo auto-mocks `ExpoSQLite` as stubs, so expo-sqlite storage does not work in Jest.
- Packages: no `@supabase/supabase-js`, no session storage library. `expo-linking`, `expo-constants` installed. `app.json` has `scheme: "follow"`, `web.output: "server"`, typed routes and React Compiler, `runtimeVersion` fingerprint policy.
- Supabase: project `follow` (`skudzowkkurdbevxwnht`, eu-central-1) linked; EAS env and `.env.local` hold `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_KEY` (publishable key). Hosted auth runs on defaults: **Confirm email is ON** on hosted projects, and the built-in mailer sends 2 emails/hour, only to Supabase team members. `supabase/config.toml` holds `supabase init` local defaults (F-01 review follow-up F2): `site_url`/`additional_redirect_urls` = `127.0.0.1:3000` (`:164`, `:168`), `minimum_password_length = 6` (`:187`), `password_requirements = ""` (`:190`), `[auth.email] enable_confirmations = false` (`:232`), `[db.seed]` points at a missing `seed.sql`.

## Desired End State

- Hosted auth settings come from `supabase/config.toml`, applied by a reviewed `supabase config push`: email confirmation off, sign-ups open, password minimum 8 with letters and digits.
- A Supabase client (native: expo-sqlite-backed `localStorage`; web: browser storage, client-only) and a `SessionProvider` expose `status: 'loading' | 'signed-in' | 'signed-out'` plus the user's email. A stored session is trusted while the network is unreachable; only an explicit sign-out or a server-rejected session signs the user out.
- The root layout is a Stack: `(app)` (the tabs) behind `Stack.Protected guard={signed-in}`, `sign-in` and `register` behind `guard={not signed-in}`. The splash stays up until the session status is known.
- Register and sign-in screens validate input (email format; password ≥ 8 with letters and digits on register) and show Supabase errors in plain language. Registering signs the user straight in.
- Home is unchanged; an Account tab replaces Explore on both platforms, showing the signed-in email and a Sign out button (`scope: 'local'`).
- A new preview APK carries the change; it is verified on the Pixel 5 and the emulator, and sign-in also works in the web build.

Verify with the per-phase Success Criteria; the end state is reached when every row in `## Progress` is checked.

### Key Discoveries:

- Offline with an expired access token, `getSession()` returns `{ session: null, error: AuthRetryableFetchError }` while the session stays in storage, and `INITIAL_SESSION` fires with `null` (auth-js 2.119.1 `GoTrueClient.ts` `__loadSession`, ~`:3080-3105`). A gate on `session === null` would send an offline user to sign-in.
- Refresh failures caused by the network keep the session and retry; a non-retryable failure (revoked refresh token) removes it (same source). `getUser()` always hits the network.
- `signOut()` defaults to `scope: 'global'`, which fails offline and keeps the user signed in; `scope: 'local'` clears storage and fires `SIGNED_OUT` first (supabase-js docs, `signOut`).
- With Confirm email off, `signUp()` returns both `user` and `session` (supabase-js docs, `signUp`).
- Expo's Supabase guide (checked 2026-11-18): `npx expo install @supabase/supabase-js expo-sqlite`, add the `expo-sqlite` config plugin, `import 'expo-sqlite/localStorage/install'`, `createClient(..., { auth: { storage: localStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false } })`, and an `AppState` listener registered once that calls `startAutoRefresh()` / `stopAutoRefresh()`. `react-native-url-polyfill` is not needed in Expo. The localStorage install is a no-op on web.
- `Stack.Protected` is stable in SDK 58; when a guard turns false the user is redirected to the first available screen and the guarded history is dropped (`docs.expo.dev/router/advanced/protected`). `NativeTabs` has no `Protected`, so the guard sits on the root Stack around the `(app)` group.
- `supabase config push` (CLI v3) shows the full diff and asks once; there is no `--dry-run` on push — preview with the read-only `supabase config diff`. It applies every differing section, not only `[auth]`.
- `expo-sqlite` is a native module with a config plugin: the runtime fingerprint changes, so this change needs a new preview build and cannot ship over OTA to the F-01 APK.

## What We're NOT Doing

- Email confirmation, verification codes or deep-link sign-in — confirmation is turned off.
- Password reset / "forgot password" — a forgotten password is reset by the user in the Supabase dashboard.
- Closing public sign-ups, social sign-in, MFA, leaked-password protection (Pro plan).
- Any table, migration or RLS policy — S-01 uses only Supabase's built-in `auth` schema; data tables start in S-02.
- Replacing the Home screen — it stays the starter screen until S-02.
- `expo-dev-client` (F-01 follow-up F3) — UI is iterated on web / Expo Go and verified on a preview build; F3 stays queued for the first change that needs a development build.
- The Supabase keep-alive cron (S-02), Play internal testing (F-02), iOS.
- A visible "offline" or "session pending" indicator (PRD non-goal).

## Implementation Approach

Three phases, each ending green. Phase 1 settles the hosted auth settings and builds the client plus `SessionProvider` with no UI change, so the offline rule is unit-tested in isolation. Phase 2 restructures routing around the provider and adds the two auth screens. Phase 3 swaps Explore for Account, adds sign-out, and spends the one EAS build on device verification once everything else is in place.

Tests mock the client module (`@/lib/supabase`) so Jest never loads supabase-js or expo-sqlite. Interactive or credential-touching steps stay with the user: `supabase config push`, the preview build. The agent runs `supabase config diff` and everything local.

## Critical Implementation Details

**Session state machine.** The provider decides `signed-in` from the stored session, not from `getSession()` alone: on start-up it calls `getSession()`; if that returns a session → `signed-in`; if it returns an error for which `isAuthRetryableFetchError(error)` is true → read the stored session from the client's storage under an explicit `storageKey` passed to `createClient` (e.g. `follow-auth`) and treat a parseable session as `signed-in`; otherwise → `signed-out`. After start-up, `onAuthStateChange` drives transitions: `SIGNED_IN` / `TOKEN_REFRESHED` / `USER_UPDATED` → `signed-in`, `SIGNED_OUT` → `signed-out`; an `INITIAL_SESSION` with `null` must not override a stored-session decision. Register the `AppState` auto-refresh listener once, at module level of the native client.

**Splash timing.** Keep the native splash until `status !== 'loading'`; the existing `AnimatedSplashOverlay` (which calls `SplashScreen.hideAsync()` at `animated-icon.tsx:52`) must not hide it earlier, otherwise the sign-in screen flashes before a stored session loads.

**Web and server rendering.** `web.output: "server"` renders on the server, where `window`/`localStorage` do not exist. The web client must be created lazily on the client (after hydration, per the `hasHydrated` pattern in `src/hooks/use-color-scheme.web.ts`), and the provider stays `loading` on the server render so the first client render matches.

**First config push.** The first `supabase config diff` may show differences outside `[auth]` (template defaults vs hosted values). Before the user pushes, every non-auth difference is either aligned in `config.toml` to the hosted value or explicitly accepted; the push must change only the intended auth settings.

## Phase 1: Hosted auth settings and session layer

### Overview

Apply the decided auth settings to the hosted project from `config.toml`, and add the Supabase client and `SessionProvider` with the offline rule, covered by unit tests. No visible UI change.

### Changes Required:

#### 1. Auth settings as code

**File**: `supabase/config.toml`

**Intent**: Replace the `supabase init` auth defaults with the values decided for the hosted project, closing F-01 follow-up F2.

**Contract**: `[auth]` `site_url = "follow://"`, `additional_redirect_urls = []`, `enable_signup = true`, `minimum_password_length = 8`, `password_requirements = "letters_digits"`; `[auth.email]` `enable_signup = true`, `enable_confirmations = false`; `[db.seed]` `enabled = false` (no `seed.sql` until migrations exist). Other sections aligned to hosted values where `supabase config diff` shows unintended differences.

#### 2. Reviewed push (agent + user)

**File**: hosted Supabase project (remote)

**Intent**: The agent runs `npx supabase config diff` and shows the output; the user reviews it and runs `! npx supabase config push`, answering the confirmation prompt.

**Contract**: After the push, `npx supabase config diff` reports no differences for `[auth]`. Recorded in `context/deployment/deploy-plan.md` Executed section as a new dated line.

#### 3. Dependencies

**File**: `package.json`, `package-lock.json`, `app.json`

**Intent**: Install the client and its storage per the Expo SDK 58 Supabase guide.

**Contract**: `npx expo install @supabase/supabase-js expo-sqlite` (SDK-pinned versions); `expo-sqlite` added to `app.json` `plugins`. No `react-native-url-polyfill`.

#### 4. Supabase client

**File**: `src/lib/supabase.ts` (native), `src/lib/supabase.web.ts` (web)

**Intent**: One client per platform, configured for a persisted, auto-refreshed session with no URL detection, reading `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_KEY` and failing loudly if either is missing.

**Contract**: Both files export the same API: `getSupabase(): SupabaseClient` and the storage key constant used by the session rule. Native: `expo-sqlite/localStorage/install`, explicit `storageKey`, `AppState` start/stop auto-refresh registered once. Web: browser `localStorage`, client created only on first call in the browser (never during server render).

#### 5. Session provider

**File**: `src/providers/session-provider.tsx` (new), `src/hooks/use-session.ts` (new)

**Intent**: Hold the auth status for the whole app and expose sign-in, register and sign-out actions, applying the offline rule from Critical Implementation Details.

**Contract**: `SessionProvider` (named export) wraps children; `useSession()` returns `{ status: 'loading' | 'signed-in' | 'signed-out'; email: string | null; signIn(email, password): Promise<AuthResult>; register(email, password): Promise<AuthResult>; signOut(): Promise<void> }`, where `AuthResult` is `{ ok: true } | { ok: false; message: string }` with user-facing messages mapped from Supabase errors (invalid credentials, email already registered, weak password, network unreachable). `signOut` uses `{ scope: 'local' }`. `useSession()` outside the provider throws.

#### 6. Unit tests

**File**: `__tests__/session-provider-test.tsx` (new)

**Intent**: Pin the session rules against a mocked `@/lib/supabase`.

**Contract**: Cases: stored valid session → `signed-in`; no session → `signed-out`; `getSession()` returns a retryable error with a stored session → `signed-in` (offline rule); retryable error with nothing stored → `signed-out`; `SIGNED_OUT` event → `signed-out`; `INITIAL_SESSION` null after a stored-session decision → stays `signed-in`; `signIn` invalid credentials → `{ ok: false, message }`; `signOut` called with `scope: 'local'`.

### Success Criteria:

#### Automated Verification:

- `npx supabase config diff` reports no `[auth]` differences after the push
- `npx expo config --type public` lists `expo-sqlite` in `plugins`, and `package.json` has `@supabase/supabase-js` and `expo-sqlite`
- `npx jest session-provider` passes, including the offline-rule cases
- `/verify` passes (Biome, `npx tsc --noEmit`, `npm test`)

#### Manual Verification:

- The user reviewed the `supabase config diff` output and ran `npx supabase config push`
- In the Supabase dashboard (Authentication → Sign In / Providers → Email), Confirm email is off and the password policy shows minimum 8 with letters and digits

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Gate and sign-in / register screens

### Overview

Restructure routing around `SessionProvider` and add the two auth screens, so a signed-out user can register or sign in and a signed-in user lands on Home.

### Changes Required:

#### 1. Root layout and gate

**File**: `src/app/_layout.tsx`, `src/app/(app)/_layout.tsx` (new)

**Intent**: Make the root a Stack wrapped in `ThemeProvider` and `SessionProvider`, with the tabs moved into a protected `(app)` group and the auth screens in a signed-out group; keep the splash until the status is known.

**Contract**: Root: `Stack` with `Stack.Protected guard={status === 'signed-in'}` → `(app)`, and `Stack.Protected guard={status !== 'signed-in'}` → `sign-in`, `register`; headers hidden. While `loading`, the sign-in screen mounts under the splash (as in the Expo auth guide), so the navigator always has an available screen. `(app)/_layout.tsx` renders `AppTabs` (the current root content). A splash controller keeps the native splash until `status !== 'loading'`, and `AnimatedSplashOverlay` no longer hides it before that.

#### 2. Move Home into the group

**File**: `src/app/index.tsx` → `src/app/(app)/index.tsx`, `src/app/explore.tsx` → `src/app/(app)/explore.tsx`

**Intent**: Keep both tab routes working inside the protected group (Explore is replaced in Phase 3). URLs stay `/` and `/explore`.

**Contract**: Route paths unchanged; tab triggers in `app-tabs.tsx` / `app-tabs.web.tsx` keep resolving. `__tests__/home-screen-test.tsx` import path updated.

#### 3. Form building blocks

**File**: `src/components/text-field.tsx` (new), `src/components/button.tsx` (new), `src/constants/theme.ts`, `biome.json`

**Intent**: Minimal themed input and button for the auth forms (and later screens), plus an error colour token.

**Contract**: `TextField` (label, value, onChangeText, error message, `secureTextEntry`, `autoComplete`/`textContentType`, `keyboardType`); `Button` (title, onPress, `disabled`, `loading`) using the `Pressable` + `pressed` opacity pattern. `Colors.light.error` / `Colors.dark.error` added. If either component renders text children directly, its name is added to the `noReactNativeRawText` skip list.

#### 4. Sign-in and register screens

**File**: `src/app/sign-in.tsx` (new), `src/app/register.tsx` (new)

**Intent**: Email + password forms that call `useSession().signIn` / `register`, validate before sending, show the returned message, and link to each other.

**Contract**: Sign-in: email required and well-formed, password required. Register: email well-formed; password ≥ 8 characters containing at least one letter and one digit (mirrors `config.toml`); inline field errors; submit disabled while a request is in flight. Successful sign-in or registration needs no navigation code — the gate switches to `(app)`. Links use typed `href`s (`/register`, `/sign-in`).

#### 5. Screen tests

**File**: `__tests__/sign-in-screen-test.tsx`, `__tests__/register-screen-test.tsx` (new)

**Intent**: Pin validation and error display with `useSession` mocked.

**Contract**: Register rejects a 7-character password and a password without digits, and accepts `abcd1234`; sign-in shows the message from a failed `signIn`; submit calls the session action with the trimmed email.

### Success Criteria:

#### Automated Verification:

- `npx jest sign-in register home-screen` passes
- `/verify` passes (Biome, `npx tsc --noEmit`, `npm test`)

#### Manual Verification:

- Web (`npx expo start --web`): a new account registers and lands on Home; sign-in with a wrong password shows an error; reload keeps the user signed in
- Expo Go or the emulator: register / sign-in work, and the splash stays until the right screen is shown (no sign-in flash when already signed in)
- The new user appears in the Supabase dashboard (Authentication → Users) as confirmed

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Account tab, sign-out and on-device checks

### Overview

Replace the Explore demo with an Account tab that shows the signed-in email and signs out, then verify the whole flow on a new preview APK.

### Changes Required:

#### 1. Account screen

**File**: `src/app/(app)/account.tsx` (new), `src/app/(app)/explore.tsx` (deleted)

**Intent**: Show the signed-in email and a Sign out button that calls `useSession().signOut`; the gate then shows sign-in.

**Contract**: Route `/account`. Sign-out works offline (local scope).

#### 2. Tabs on both platforms

**File**: `src/components/app-tabs.tsx`, `src/components/app-tabs.web.tsx`

**Intent**: Replace the Explore trigger with Account in both tab implementations, per the CLAUDE.md rule that tabs are platform-split.

**Contract**: Native trigger `name="account"` with label "Account"; web trigger `name="account" href="/account"`. Reuse an existing tab icon asset unless a fitting one exists in `assets/`.

#### 3. Account test

**File**: `__tests__/account-screen-test.tsx` (new)

**Intent**: Pin that the screen shows the email and that Sign out calls the session action.

**Contract**: With `useSession` mocked to `{ status: 'signed-in', email: 'a@b.co' }`, the email is visible and pressing Sign out calls `signOut` once.

#### 4. Preview build and record (user + agent)

**File**: EAS (remote), `context/deployment/deploy-plan.md`

**Intent**: The user runs `! eas build --platform android --profile preview` (the fingerprint changed); the agent tracks it and records the build ID and the S-01 auth settings in the deploy-plan Executed section.

**Contract**: One `FINISHED` preview build on channel `preview` with a new runtime version; deploy-plan lists its ID and date.

### Success Criteria:

#### Automated Verification:

- `npx jest account` passes
- `/verify` passes (Biome, `npx tsc --noEmit`, `npm test`)
- `eas build:view <id> --json` reports `FINISHED` with update channel `preview` for the new build
- `context/deployment/deploy-plan.md` names the S-01 preview build ID and the applied auth settings

#### Manual Verification:

- Pixel 5 (Android 14), new APK: register a second test account, sign out, sign in again; light and dark mode render correctly
- Pixel 5: force-close and reopen → still signed in, no sign-in flash
- Pixel 5 offline rule: sign in, wait more than 1 hour without opening the app, enable airplane mode, cold-start → the app opens signed in on Home; Sign out in airplane mode returns to sign-in
- Emulator (current Android): sign-in, Account tab and sign-out work
- Web: Account tab shows the email; Sign out returns to sign-in

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Testing Strategy

### Unit Tests:

- Session rules in `SessionProvider` with a mocked client: stored / missing session, retryable error with and without a stored session, auth events, error-message mapping, local sign-out.
- Form validation on register (length, letters + digits) and error display on sign-in.
- Account screen renders the email and triggers sign-out.

### Integration Tests:

- None automated: no backend test harness exists, and Jest cannot run expo-sqlite storage. The hosted flow is exercised manually on web and devices.

### Manual Testing Steps:

1. Web: register a new account → Home; reload → still signed in; Account → Sign out → sign-in screen; wrong password → error message.
2. Pixel 5 preview APK: same flow, plus force-close/reopen and light/dark mode.
3. Pixel 5 offline: sign in, leave the app closed for over an hour, airplane mode, cold start → Home, not sign-in.
4. Emulator: sign-in and sign-out.

## Performance Considerations

None beyond start-up: the session check reads local storage only (no network) before the splash hides, so cold start is not slowed by connectivity.

> **Correction (implementation review, 2026-11-20):** the note above is wrong. Offline with an expired access token, `getSession()` retries the refresh for about 25 s. The provider therefore races it against `STARTUP_TIMEOUT_MS` (3 s) and then trusts the stored session. Sign-out uses the same race with `SIGN_OUT_TIMEOUT_MS` (2 s).

## Migration Notes

No app data exists yet. Changing hosted auth settings affects only future sign-ups and password changes; any test users created before the push keep working. The new preview APK replaces the F-01 APK on the devices (same application id and keystore).

## References

- Roadmap: `context/foundation/roadmap.md` — S-01 `account-sign-in` (FR-001); unlocks S-02, S-03
- PRD: `context/foundation/prd.md` — FR-001, Access Control (MVP), NFR offline read/mark
- Infrastructure risks: `context/foundation/infrastructure.md` — offline auth expiry, Supabase CLI v3
- F-01 follow-ups: `context/changes/first-android-deploy/follow-ups/review-fixes.md` — F2 (auth config, closed here), F3 (expo-dev-client, stays queued)
- Docs (checked 2026-11-18): `docs.expo.dev/guides/using-supabase`, `docs.expo.dev/router/advanced/authentication`, `docs.expo.dev/router/advanced/protected`, `supabase.com/docs/guides/auth/passwords`, `supabase.com/docs/guides/auth/sessions`, supabase-js reference (`signUp`, `signOut`, `startAutoRefresh`), Supabase CLI `config diff` / `config push`
- Current code: `src/app/_layout.tsx:8-15`, `src/components/animated-icon.tsx:52`, `src/components/app-tabs.tsx:15-23`, `src/components/app-tabs.web.tsx:25-28`, `src/constants/theme.ts:10-25`, `biome.json:23-28`, `supabase/config.toml:164-232`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Hosted auth settings and session layer

#### Automated

- [x] 1.1 `npx supabase config diff` reports no `[auth]` differences after the push — 65d5174
- [x] 1.2 `npx expo config --type public` lists `expo-sqlite` in `plugins`, and `package.json` has `@supabase/supabase-js` and `expo-sqlite` — 65d5174
- [x] 1.3 `npx jest session-provider` passes, including the offline-rule cases — 65d5174
- [x] 1.4 `/verify` passes (Biome, `npx tsc --noEmit`, `npm test`) — 65d5174

#### Manual

- [x] 1.5 The user reviewed the `supabase config diff` output and ran `npx supabase config push` — 65d5174
- [x] 1.6 In the Supabase dashboard (Authentication → Sign In / Providers → Email), Confirm email is off and the password policy shows minimum 8 with letters and digits — 65d5174

### Phase 2: Gate and sign-in / register screens

#### Automated

- [x] 2.1 `npx jest sign-in register home-screen` passes — c496c1d
- [x] 2.2 `/verify` passes (Biome, `npx tsc --noEmit`, `npm test`) — c496c1d

#### Manual

- [x] 2.3 Web (`npx expo start --web`): a new account registers and lands on Home; sign-in with a wrong password shows an error; reload keeps the user signed in — c496c1d
- [x] 2.4 Expo Go or the emulator: register / sign-in work, and the splash stays until the right screen is shown (no sign-in flash when already signed in) — c496c1d
- [x] 2.5 The new user appears in the Supabase dashboard (Authentication → Users) as confirmed — c496c1d

### Phase 3: Account tab, sign-out and on-device checks

#### Automated

- [x] 3.1 `npx jest account` passes — 841a55f
- [x] 3.2 `/verify` passes (Biome, `npx tsc --noEmit`, `npm test`) — 841a55f
- [x] 3.3 `eas build:view <id> --json` reports `FINISHED` with update channel `preview` for the new build — 841a55f
- [x] 3.4 `context/deployment/deploy-plan.md` names the S-01 preview build ID and the applied auth settings — 841a55f

#### Manual

- [x] 3.5 Pixel 5 (Android 14), new APK: register a second test account, sign out, sign in again; light and dark mode render correctly — 841a55f
- [x] 3.6 Pixel 5: force-close and reopen → still signed in, no sign-in flash — 841a55f
- [x] 3.7 Pixel 5 offline rule: sign in, wait more than 1 hour without opening the app, enable airplane mode, cold-start → the app opens signed in on Home; Sign out in airplane mode returns to sign-in — 841a55f
- [x] 3.8 Emulator (current Android): sign-in, Account tab and sign-out work — 841a55f
- [x] 3.9 Web: Account tab shows the email; Sign out returns to sign-in — 841a55f
