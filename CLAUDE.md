# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Hard rules

- Expo SDK 58 / RN 0.88 may postdate your training — check `https://docs.expo.dev/versions/v58.0.0/` (or `https://docs.expo.dev/llms.txt`) before using an Expo or RN API.
- Never run `npm run reset-project` — it moves/deletes `src/` and demo assets.
- Jest config (`package.json` → `jest`) has workarounds — keep them when editing: Reanimated's resolver + `jest-setup.ts` (`setUpTests()`), `.css` → `jest/style-mock.js`, and an explicit `^@/assets/` mapper because jest-expo's generated `@/*` mapper otherwise swallows asset paths.
- Tabs are platform-split: `src/components/app-tabs.tsx` (`expo-router/native-tabs`) and `app-tabs.web.tsx` (`expo-router/ui`). A new tab must be added to both.
- New components that render text children (like `ThemedText`) must be added to the `noReactNativeRawText` `skip` list in `biome.json`, otherwise lint flags every usage.
- `app.json` enables `experiments.typedRoutes` and `experiments.reactCompiler` — use typed `href`s, and don't add manual `useMemo`/`useCallback` for perf.

## Tooling

- Use Node 24 LTS (`.nvmrc`). Node 23 triggers EBADENGINE warnings from Expo 58 / RN 0.88.
- `npx tsc --noEmit` needs the gitignored, generated `expo-env.d.ts` and `.expo/types/` (CSS module + typed-route types). If tsc reports missing `*.css` modules, run `npx expo start` once to generate them.
- Biome handles both formatting and linting (`biome.json`); ESLint / `expo lint` is not used. Lint with `npm run lint`.
- Tests: Jest (`jest-expo` preset) + React Native Testing Library 14 (`render` is async — `await` it). Tests go in root `__tests__/` named `*-test.tsx`, never in `src/app/` (every file there is a route). Run `npm test`, or one file with `npx jest <pattern>`.

## Code conventions

- Platform-specific code uses `.web.tsx` / `.web.ts` suffixes or `Platform.select`. `web.output` is `"server"`, so the first web render must match the server output: get the color scheme from `@/hooks/use-color-scheme` (never `useColorScheme` from `react-native`), and gate any other client-only value (e.g. `window`) behind a `hasHydrated` flag set in `useEffect`, as `src/hooks/use-color-scheme.web.ts` does.
- File names are kebab-case; components use named exports, route files use default exports.
- Style with `StyleSheet.create` plus tokens from `@/constants/theme` (`Colors`, `Spacing`, `Fonts`) and the `ThemedText` / `ThemedView` components — no hardcoded colors.

## Product context

Product and planning docs live in `context/` (10xDevs workflow): `context/foundation/prd.md` (grocery list sorted by store zones; offline read/marking required) and `context/foundation/tech-stack.md` (Supabase backend planned, not yet added; TestFlight target). Per-change work goes in `context/changes/<change-id>/`.

## Git

Work on a feature branch off `main` and open a PR per change. Commit messages are free-form (no Conventional Commits prefixes).
