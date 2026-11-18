# Review follow-ups — account-sign-in

Queued from `reviews/impl-review-phase-3.md` (2026-11-18). Each item names the change that should pick it up.

## F2 — Account tab icon → S-02 `shopping-lists`

The native Account tab reuses `assets/images/tabIcons/explore.png` (`src/components/app-tabs.tsx:26`); only home and explore icons exist. Add a person/account icon when S-02 replaces the starter visuals.

## F3 — Starter dead code → S-02 `shopping-lists`

Removing Explore left `src/components/ui/collapsible.tsx`, `assets/images/tutorial-web.png` and `assets/images/react-logo*.png` unreferenced. Remove them in the starter cleanup when S-02 replaces Home (re-check with a grep first; `external-link.tsx` and `web-badge.tsx` are still used).
