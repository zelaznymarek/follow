# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Hard rules

- Never exit the sandbox without my permission. Even if it's required to complete the task, ask first.
- Expo SDK 58 / RN 0.88 may postdate your training — check `https://docs.expo.dev/versions/v58.0.0/` (or `https://docs.expo.dev/llms.txt`) before using an Expo or RN API.
- Never run `npm run reset-project` — it moves/deletes `src/` and demo assets.
- Jest config (`package.json` → `jest`) has workarounds — keep them when editing: Reanimated's resolver + `jest-setup.ts` (`setUpTests()`), `.css` → `jest/style-mock.js`, and an explicit `^@/assets/` mapper because jest-expo's generated `@/*` mapper otherwise swallows asset paths.
- Tabs are platform-split: `src/components/app-tabs.tsx` (`expo-router/native-tabs`) and `app-tabs.web.tsx` (`expo-router/ui`). A new tab must be added to both.
- New components that render text children (like `ThemedText`) must be added to the `noReactNativeRawText` `skip` list in `biome.json`, otherwise lint flags every usage.
- `app.json` enables `experiments.typedRoutes` and `experiments.reactCompiler` — use typed `href`s, and don't add manual `useMemo`/`useCallback` for perf.

## Tooling

- Use Node 24 LTS (`.nvmrc`). Node 23 triggers EBADENGINE warnings from Expo 58 / RN 0.88.
- Locally, asdf sets the Node version via `.tool-versions` (nvm is not installed); keep it on the same major as `.nvmrc`.
- `npx tsc --noEmit` needs the gitignored, generated `expo-env.d.ts` and `.expo/types/` (CSS module + typed-route types). If tsc reports missing `*.css` modules, run `npx expo start` once to generate them.
- Supabase CLI v3: target hosted with `--remote` (never `--linked`/`--project-ref`); run `db push --remote --dry-run` and get human approval before `--yes`; `npx supabase db dump` before any remote push.
- Supabase migrations: every new table enables RLS and grants explicitly (`authenticated`; `anon` only on purpose); every new function runs `revoke execute … from public` and then grants explicitly. `public` defaults no longer grant to anon/authenticated (`supabase/migrations/20261120211932_tighten_default_privileges.sql`), but Postgres still gives `PUBLIC` execute on new functions.
- Biome handles both formatting and linting (`biome.json`); ESLint / `expo lint` is not used. Lint with `npm run lint`.
- Tests: Jest (`jest-expo` preset) + React Native Testing Library 14 (`render` is async — `await` it). Tests go in root `__tests__/` named `*-test.tsx`, never in `src/app/` (every file there is a route). Run `npm test`, or one file with `npx jest <pattern>`.
- Regenerate Supabase types with `sh scripts/gen-types.sh` (writes `src/lib/database.types.ts`). Don't add npm scripts casually: `package.json` `scripts` are part of the EAS runtime fingerprint, so any change there needs a new build before OTA updates reach installed apps.

## Code conventions

- Platform-specific code uses `.web.tsx` / `.web.ts` suffixes or `Platform.select`. `web.output` is `"server"`, so the first web render must match the server output: get the color scheme from `@/hooks/use-color-scheme` (never `useColorScheme` from `react-native`), and gate any other client-only value (e.g. `window`) behind a `hasHydrated` flag set in `useEffect`, as `src/hooks/use-color-scheme.web.ts` does.
- File names are kebab-case; components use named exports, route files use default exports.
- Style with `StyleSheet.create` plus tokens from `@/constants/theme`: `Colors` (incl. `primary` / `onPrimary`), `Spacing`, `Radius`, `Opacity`, `Fonts`. No colour, radius or opacity literals in views — `__tests__/design-tokens-test.ts` fails on them.
- Before creating a component, check `src/components/`: `Button` (`variant` `primary` / `secondary`), `Card`, `TextField`, `ThemedText`, `ThemedView`.
- Show every state of a new or changed view on `/kitchen-sink` (`src/app/kitchen-sink.tsx`, dev only) and check it there.

## Product context

Product and planning docs live in `context/` (10xDevs workflow): `context/foundation/prd.md` (grocery list sorted by store zones; offline read/marking required) and `context/foundation/tech-stack.md` (Supabase backend planned, not yet added; TestFlight target). Per-change work goes in `context/changes/<change-id>/`.

## Git

Work on a feature branch off `main` and open a PR per change. Commit messages are free-form (no Conventional Commits prefixes).
<!-- BEGIN @przeprogramowani/10x-cli -->

## Zestaw narzędzi AI 10xDevs — Moduł 2, Lekcja 5 (interfejs 10xDevs 4.0)

**W przypadku pracy nad interfejsem widoku, który już się renderuje, zacznij od `/10x-ui <view>`.** To
punkt wejścia: krótki audyt wstępny, sugerowany identyfikator zmiany oraz polecenie `/10x-new` do
uruchomienia, a następnie opis audytu dla `/10x-research`. Zmiana wizualna przechodzi przez ten sam łańcuch
co każda inna zmiana (`/10x-new` → `/10x-research` → `/10x-plan` → `/10x-implement` →
`/10x-impl-review`); `/10x-ui <change-id>` wznawia pracę od pierwszego kroku, który nie został jeszcze wykonany. Przenosi
zasady:
kiedy rozpocząć i który widok wybrać, audyt do opłat, kontrakt systemu projektowego w formie,
w jakiej realizuje go to repozytorium, stany komponentów, bramkę zrzutu ekranu oraz zasadę, która
utrzymuje następnego agenta przy kontrakcie. Jego `references/` zawiera listę kontrolną jakości.

Tworzenie widoku po raz pierwszy nie jest zadaniem dla `/10x-ui` — utwórz go za pomocą
zwykłego łańcucha, a następnie wróć do niego z `/10x-ui`.

<!-- END @przeprogramowani/10x-cli -->
