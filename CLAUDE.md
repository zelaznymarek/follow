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
<!-- BEGIN @przeprogramowani/10x-cli -->

## Zestaw narzędzi AI 10xDevs — Moduł 2, Lekcja 1

Przejdź od konfiguracji sprintu zerowego do orkiestracji projektu za pomocą **łańcucha roadmapy**:

```
(Module 1 foundation docs) -> /10x-roadmap -> backlog-ready roadmap items
```

`/10x-roadmap` jest tematem lekcji. `/10x-new` zostaje celowo wprowadzone w Module 2, Lesson 2, gdy wybrany element roadmapy staje się folderem zmiany implementacyjnej.

### Router zadań — od czego zacząć

| Skill | Użyj, gdy |
| --- | --- |
| **Roadmap (temat lekcji)** | |
| `/10x-roadmap` | Masz `context/foundation/prd.md` oraz przygotowaną bazę projektu i potrzebujesz roadmapy MVP o priorytecie pionowych przekrojów. Skill odczytuje PRD, analizuje bazę kodu, wykorzystuje dostępne dokumenty podstawowe, takie jak `tech-stack.md`, `infrastructure.md` i `deploy-plan.md`, a następnie zapisuje `context/foundation/roadmap.md`. Użyj go PRZED utworzeniem folderów dla poszczególnych zmian lub planów implementacji. |
| **W razie potrzeby uruchom ponownie etap wcześniejszy** | |
| `/10x-shape` / `/10x-prd` / `/10x-tech-stack-selector` / `/10x-bootstrapper` / `/10x-agents-md` / `/10x-infra-research` | Zestawione z Module 1, aby kontrakty podstawowe można było poprawić przed ustaleniem kolejności roadmapy. Jeśli generowanie roadmapy ujawni lukę w PRD, popraw PRD, zanim uznasz backlog za gotowy. |

### Jak łańcuch przekazuje pracę dalej

- `/10x-roadmap` łączy produkt z implementacją. Nie wybiera frameworków, nie projektuje schematów ani nie tworzy planu implementacji dla pojedynczej zmiany.
- Wynikiem jest `context/foundation/roadmap.md`: uporządkowane kamienie milowe, pionowe przekroje, ograniczone fundamenty, zależności, niewiadome, ryzyka oraz pola przekazania do backlogu.
- Elementy roadmapy powinny otrzymywać stabilne, czytelne dla ludzi identyfikatory w narzędziach backlogu. Rzeczywisty folder `context/changes/<change-id>/` zostanie utworzony w Lekcji 2 za pomocą `/10x-new`.

### Granice roadmapy

- Domyślnie stosuj pionowe przekroje: widoczne dla użytkownika rezultaty obejmujące UI, dane, logikę biznesową i integracje.
- Praca horyzontalna jest dozwolona tylko jako ograniczony element umożliwiający realizację, który wskazuje docelowy pionowy kamień milowy, jaki odblokowuje.
- Unikaj osieroconej pracy horyzontalnej, takiej jak „zbuduj całą bazę danych”, „zbuduj wszystkie endpointy API” lub „zaprojektuj cały UI” przed pierwszym przepływem widocznym dla użytkownika.
- Roadmapa nie jest estymacją kalendarzową. Nie wymyślaj dat, punktów historyjek ani prędkości sprintu, chyba że użytkownik wyraźnie poprosi o osobny artefakt planowania.

### Ścieżki podstawowe używane przez tę lekcję

- `context/foundation/prd.md` — dane wejściowe
- `context/foundation/tech-stack.md` — opcjonalne dane wejściowe
- `context/foundation/infrastructure.md` — opcjonalne dane wejściowe
- `context/deployment/deploy-plan.md` — opcjonalne dane wejściowe
- `context/foundation/roadmap.md` — dane wyjściowe
- `context/foundation/lessons.md` — powtarzające się reguły i pułapki
- `docs/reference/contract-surfaces.md` — rejestr nazw krytycznych dla działania

Skills nie mogą zapisywać do `context/archive/`. Zarchiwizowane zmiany są niezmienne; jeśli rozwiązana ścieżka docelowa zaczyna się od `context/archive/`, przerwij z komunikatem: „This change is archived. Open a new change with `/10x-new` instead.”

<!-- END @przeprogramowani/10x-cli -->
