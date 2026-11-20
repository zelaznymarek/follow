# Review follow-ups — account-sign-in

Queued from `reviews/impl-review-phase-3.md` (2026-11-18). Each item names the change that should pick it up.

## F2 — Account tab icon → S-02 `shopping-lists`

The native Account tab reuses `assets/images/tabIcons/explore.png` (`src/components/app-tabs.tsx:26`); only home and explore icons exist. Add a person/account icon when S-02 replaces the starter visuals.

## F3 — Starter dead code → S-02 `shopping-lists`

Removing Explore left `src/components/ui/collapsible.tsx`, `assets/images/tutorial-web.png` and `assets/images/react-logo*.png` unreferenced. Remove them in the starter cleanup when S-02 replaces Home (re-check with a grep first; `external-link.tsx` and `web-badge.tsx` are still used). The starter Home hint at `src/app/(app)/index.tsx:49` still names the old path `src/app/index.tsx`; it goes when S-02 replaces Home (full review F5).

## Check 3.7 — one unexplained offline sign-out → next auth-touching change (or F-02 testing)

Closed by the user's decision on 2026-11-20 with one unexplained failure on record.

- **Failure (2026-11-19, Pixel 5, build `2e7aa089`):** signed in, app minimised for about 10 h with the phone online, then airplane mode (Wi-Fi off) and reopened → signed out.
- **Not reproduced (2026-11-20, Pixel 5, same build plus temporary diagnostics via OTA):** expired access token simulated by moving the clock +2 h, airplane mode on:
  - warm resume (process alive) twice → signed in, no auth events;
  - cold start after Force stop → `getSession` hit the 3 s limit, `readStoredSession` returned the stored session → signed in; `INITIAL_SESSION` with `null` arrived about 25 s later and was ignored as designed; the stored session survived.
- **Also checked:** a Jest harness with the real supabase-js client (offline fetch, session expired 9 h earlier, cold and warm) stays signed in; auth-js removes the stored session only on a non-retryable refresh error.
- **Remaining hypothesis:** the session was lost during the real 10 h in the background while online (for example a refresh rejected by the server), before airplane mode. Clock shifting cannot reproduce that. Supabase auth logs are not available on the free plan.
- **To pick up:** repeat the overnight scenario (minimise overnight online, open in airplane mode in the morning) with the diagnostics, which are tagged `[DEBUG-7c3e]` and can be restored from this change's transcript, or with the next auth change. If it recurs, record which auth event signed the user out.
