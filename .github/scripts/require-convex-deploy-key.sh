#!/usr/bin/env bash
#
# Fail-loud pre-flight for the production Convex deploy jobs in deploy.yml and release.yml.
#
# Those jobs only run on master (the canonical repo), where the production Convex deployment MUST move
# in lockstep with the apps that call it. The jobs used to *skip green* when CONVEX_DEPLOY_KEY was
# absent, which is exactly what let the deployed backend drift behind the admin app: the app shipped a
# query carrying a newly-added `email` arg while the stale backend's validator still rejected it,
# 500-ing production while every pipeline stayed green. Failing here turns that invisible drift into a
# red pipeline the moment the key goes missing.
#
# Runs before bootstrap, so it depends on nothing but a POSIX shell — no node/pnpm install required.
set -euo pipefail

if [ -z "${CONVEX_DEPLOY_KEY:-}" ]; then
    echo "::error title=Convex production deploy BLOCKED::CONVEX_DEPLOY_KEY is not configured as a repository secret. The production Convex deployment cannot be updated and would drift behind the apps that call it. Provision it per .specs/2026-05-30-convex-migration/convex-prod-provisioning.md." >&2
    exit 1
fi

echo "CONVEX_DEPLOY_KEY is configured; production Convex deploy may proceed."
