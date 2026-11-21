# Review follow-ups — shopping-lists

Queued from `reviews/impl-review-phase-3.md` (2026-11-20). Each item names the change that should pick it up.

## F3 — Next native build → F-02 `play-internal-testing` (or the first `expo-dev-client` build)

S-02 shipped over OTA, so dependency changes were deferred: they change the runtime fingerprint. At the next change that needs a native build anyway:

- Remove the dependencies nothing imports any more: `expo-web-browser` (last used by the deleted `external-link.tsx`) and `expo-device` (last used by the deleted starter Home). Re-check with a grep first.
- Add `fingerprint.config.js` with `sourceSkips: SourceSkips.PackageJsonScriptsAll`, so later npm-script edits no longer change the runtime. `packageJson:scripts` is a fingerprint source (`node_modules/@expo/fingerprint/build/sourcer/Bare.js:142`). Adding this config changes the runtime once, which is why it waits for a build.

## Phase 2 review F7 — Keep loaded lists visible when a refresh fails → S-05 `offline-marking`

Queued from `reviews/impl-review-phase-2.md` (2026-11-21). When a focus refresh fails offline, My lists replaces the rows it already has with the offline message, although `lists` still holds them (`src/hooks/use-shopping-lists.ts:32-33`). Decide together with the S-05 device copy whether to keep showing them with a notice.
