---
change_id: my-lists-ui
title: My lists UI audit and design-system contract
status: implementing
created: 2026-11-22
updated: 2026-11-22
archived_at: null
---

## Notes

UI change started via `/10x-ui`.

- **View (one):** `src/app/(app)/(lists)/index.tsx` (My lists — the screen after sign-in).
- **Token source:** `src/constants/theme.ts` (`Colors`, `Spacing`, `Fonts`); shared components in `src/components/`.
- **Contract variant:** existing design system (Expo starter theme + `Button`, `TextField`, `ThemedText`, `ThemedView`) — extend it, no new dependencies.
- **Why not `lists/[id].tsx`:** it only shows "No products yet" until S-04; S-04–S-06 will rebuild it and inherit the tokens from this change.
- **Screenshots:** `context/changes/my-lists-ui/screenshots/` (desktop + one mobile width per visual phase).
- **Open decision (user):** accent (`primary`) color — to be chosen at `/10x-plan`.
