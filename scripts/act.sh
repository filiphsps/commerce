#!/usr/bin/env bash
# Wrapper around `act` that wires `.env` and `.env.local` in as both
# `secrets` and `vars`, so `${{ secrets.X }}` / `${{ vars.X }}` references
# in the workflow files resolve when running locally.
#
# Pass any extra args through to `act`, e.g.:
#   ./scripts/act.sh -j lint
#   ./scripts/act.sh --list
#
# For full-workflow invocations the wrapper pre-warms the setup-node pnpm cache
# by running `lint` alone first. See the PRE-WARM block below for why.
set -euo pipefail

ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if ! command -v act >/dev/null 2>&1; then
    echo "act is not installed. Run: brew install act" >&2
    exit 127
fi

ARGS=()
for f in .env .env.local; do
    if [ -f "$f" ]; then
        ARGS+=(--secret-file "$f" --var-file "$f")
    fi
done

# Pin DNS to public resolvers because the Apple Virtualization Framework bridge
# resolver is flaky under load (pnpm install hits EAI_AGAIN). `.actrc` already
# sets `--network=bridge` via act's top-level flag; this only adds the DNS bits.
# Bundled here (not in .actrc) because the file's parser whitespace-splits values.
ARGS+=(--container-options "--dns=1.1.1.1 --dns=8.8.8.8")

# Restrict to the main CI workflow unless the caller explicitly passes `-W`/
# `--workflows`. Default `act` scans all of `.github/workflows/` and triggers
# every workflow that matches the event (e.g. the standalone Docs build kicks
# off alongside CI on `push`), which is rarely what you want locally.
caller_set_workflow=false
for a in "$@"; do
    case "$a" in
        -W|--workflows) caller_set_workflow=true; break ;;
        -W=*|--workflows=*) caller_set_workflow=true; break ;;
    esac
done
if [ "$caller_set_workflow" = "false" ]; then
    ARGS+=(-W .github/workflows/ci.yml)
fi

# --- PRE-WARM ---------------------------------------------------------------
# `setup-node` with `cache: 'pnpm'` saves a tarball of the pnpm store keyed by
# the lockfile hash. When stage-0 jobs (lint + typecheck) run in parallel
# *without* an existing cache, both of their post-step cache-saves race to
# write the same key — one ends up corrupted, and the SQLite database inside
# pnpm's store (v11+) reports `ERR_PNPM_ERR_SQLITE_ERROR: database disk image
# is malformed` when stage-1 jobs (build + test) try to restore it.
#
# Pre-warming by running `lint` alone seeds the cache cleanly. Subsequent
# parallel cache-saves see the key already exists and skip the write.
#
# Skips when: an explicit `-j`/`--job` filter is passed (single job, no
# parallel save), when the caller picks their own workflow via `-W`/
# `--workflows` (no guarantee a `lint` job exists there), when introspecting
# (`--list`/`-l`/`--help`/`-h`/`--dryrun`/`-n`), or when `ACT_NO_PREWARM=1`.
skip_prewarm=false
if [ "${ACT_NO_PREWARM:-}" = "1" ] || [ "$caller_set_workflow" = "true" ]; then
    skip_prewarm=true
fi
for a in "$@"; do
    case "$a" in
        -j|--job|--list|-l|--help|-h|-n|--dryrun) skip_prewarm=true; break ;;
    esac
done

if [ "$skip_prewarm" = "false" ]; then
    echo ">>> Pre-warming setup-node pnpm cache via 'lint' (skip with ACT_NO_PREWARM=1)..." >&2
    act "${ARGS[@]}" -j lint
    echo ">>> Pre-warm done; running full invocation..." >&2
fi

exec act "${ARGS[@]}" "$@"
