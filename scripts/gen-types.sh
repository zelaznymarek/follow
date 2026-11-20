#!/bin/sh
# Regenerates src/lib/database.types.ts from the hosted Supabase schema. Run from the repo root:
#   sh scripts/gen-types.sh
# It is not an npm script on purpose: package.json "scripts" are part of the EAS runtime fingerprint,
# so adding one changes the runtime and blocks OTA updates to installed builds.
set -eu

tmp="${TMPDIR:-/tmp}/database.types.ts"
npx supabase gen types typescript --remote --schema public > "$tmp"
mv "$tmp" src/lib/database.types.ts
