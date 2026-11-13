# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project specifics

- Package manager is **npm** (`package-lock.json`); use `npx`, not `bunx`. Expo SDK is **58**.
- Use Node 24 LTS (`.nvmrc`). Node 23 triggers EBADENGINE warnings from Expo 58 / RN 0.88.
- `npx tsc --noEmit` needs the gitignored, generated `expo-env.d.ts` and `.expo/types/` (CSS module + typed-route types). If tsc reports missing `*.css` modules, run `npx expo start` once to generate them.
- Biome handles both formatting and linting (`biome.json`); ESLint / `expo lint` is not used. Lint with `npm run lint`, format with `npx biome format --write <files>`. Style: 2-space indent, single quotes, semicolons, 100 cols.
- New components that render text children (like `ThemedText`) must be added to the `noReactNativeRawText` `skip` list in `biome.json`, otherwise lint flags every usage.
- `app.json` enables `experiments.typedRoutes` and `experiments.reactCompiler` — use typed `href`s, and don't add manual `useMemo`/`useCallback` for perf.
- Tabs are platform-split: `src/components/app-tabs.tsx` (`expo-router/native-tabs`) and `app-tabs.web.tsx` (`expo-router/ui`). A new tab must be added to both.
- Platform-specific code uses `.web.tsx` / `.web.ts` suffixes or `Platform.select`. `web.output` is `"server"`, so web code must be hydration-safe (see `use-color-scheme.web.ts`).
- Imports use `@/*` → `src/*` and `@/assets/*` → `assets/*`. File names are kebab-case; components use named exports, route files use default exports.
- Style with `StyleSheet.create` plus tokens from `@/constants/theme` (`Colors`, `Spacing`, `Fonts`) and the `ThemedText` / `ThemedView` components — no hardcoded colors.
- Tests: Jest (`jest-expo` preset) + React Native Testing Library 14 (`render` is async — `await` it). Tests go in root `__tests__/` named `*-test.tsx`, never in `src/app/` (every file there is a route). Run `npm test`, or one file with `npx jest <pattern>`.
- Jest config (`package.json` → `jest`) has workarounds — keep them when editing: Reanimated's resolver + `jest-setup.ts` (`setUpTests()`), `.css` → `jest/style-mock.js`, and an explicit `^@/assets/` mapper because jest-expo's generated `@/*` mapper otherwise swallows asset paths.
- Never run `npm run reset-project` — it moves/deletes `src/` and demo assets.

## Product context

Product and planning docs live in `context/` (10xDevs workflow): `context/foundation/prd.md` (grocery list sorted by store zones; offline read/marking required) and `context/foundation/tech-stack.md` (Supabase backend planned, not yet added; TestFlight target). Per-change work goes in `context/changes/<change-id>/`.

## Git

Work on a feature branch off `main` and open a PR per change. Commit messages are free-form (no Conventional Commits prefixes).
