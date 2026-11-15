---
starter_id: expo
package_manager: npm
project_name: follow
hints:
  language_family: js
  team_size: solo
  deployment_target: testflight
  ci_provider: github-actions
  ci_default_flow: manual-promotion
  bootstrapper_confidence: verified
  path_taken: custom
  quality_override: false
  self_check_answers:
    typed: true
    from_official_starter: true
    conventions: true
    docs_current: false
    can_judge_agent: false
  has_auth: true
  has_payments: false
  has_realtime: false
  has_ai: false
  has_background_jobs: false
---

## Why this stack

Filtering the registry to a mobile product in TypeScript leaves exactly one vetted card, and
Expo earns it: all four agent-friendly gates pass and scaffolding is verified end-to-end, which
matters disproportionately for a solo builder working after hours against a 2026-12-31 deadline
with React still ahead of them. The data layer was decided by the user's own exclusions rather
than by preference — no hand-written authentication and nothing self-hosted — ruling out an own
API tier and pointing at a managed service. Supabase won over the document-database alternative
because zones, route order and product-to-zone assignments are relational by nature, and
because its schema-generated types extend the typing story the app already has. It carries
FR-001, FR-025 (a new device restores the store, its zones, the route order and the remembered
assignments) and the account side of FR-026. Python, which the user also knows, was excluded:
there is no mobile path in it, and a backend written in it would break both exclusions at once.
The readiness check returned two negatives — current documentation and judging an agent's
output — and the second is real; the generated instruction file is where it gets compensated.
