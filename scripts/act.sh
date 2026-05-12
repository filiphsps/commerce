#!/usr/bin/env bash
# Wrapper around `act` that wires `.env` and `.env.local` in as both
# `secrets` and `vars`, so `${{ secrets.X }}` / `${{ vars.X }}` references
# in the workflow files resolve when running locally.
#
# Defaults tuned for local iteration on macOS/Apple Silicon:
#   - Restricts to `.github/workflows/ci.yml` (skips Docs, Deploy, Cleanups).
#   - Targets the `test` job (the only stage-1 job that survives QEMU and is
#     the one exercising the codecov upload path).
#
# Examples:
#   ./scripts/act.sh                       # ci.yml, push event, -j test
#   ./scripts/act.sh -j lint               # run a different single job
#   ACT_ALL_JOBS=1 ./scripts/act.sh        # full workflow (slow, Build will SIGSEGV)
#   ./scripts/act.sh --list                # list jobs without running
#   ./scripts/act.sh -W .github/workflows/docs.yml  # target another workflow
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

# Inspect caller args once.
caller_set_workflow=false
caller_set_job=false
caller_introspect=false
for a in "$@"; do
    case "$a" in
        -W|--workflows|-W=*|--workflows=*) caller_set_workflow=true ;;
        -j|--job) caller_set_job=true ;;
        --list|-l|--help|-h|-n|--dryrun) caller_introspect=true ;;
    esac
done

# Restrict to the main CI workflow unless the caller explicitly passes `-W`/
# `--workflows`. Default `act` scans all of `.github/workflows/` and triggers
# every workflow that matches the event (e.g. the standalone Docs build kicks
# off alongside CI on `push`), which is rarely what you want locally.
if [ "$caller_set_workflow" = "false" ]; then
    ARGS+=(-W .github/workflows/ci.yml)
fi

# Default to the `test` job. It's the only stage-1 job that actually completes
# under QEMU on Apple Silicon (Build SIGSEGVs in Turbopack, E2E is gated on
# Build), and it's where the codecov upload path lives — so it's the highest-
# signal local invocation. Skipped when:
#   - caller passes `-j`/`--job` themselves (picks a different job),
#   - caller is just introspecting (`--list`/`--help`/`--dryrun`/etc.),
#   - caller sets `ACT_ALL_JOBS=1` to opt into the full parallel workflow.
if [ "$caller_set_job" = "false" ] \
    && [ "$caller_introspect" = "false" ] \
    && [ "${ACT_ALL_JOBS:-}" != "1" ]; then
    ARGS+=(-j test)
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
# Only runs when the user opts into the full parallel workflow via
# `ACT_ALL_JOBS=1` and hasn't suppressed it via `ACT_NO_PREWARM=1`.
# Single-job invocations don't race, so the pre-warm is wasted work for them.
if [ "${ACT_ALL_JOBS:-}" = "1" ] \
    && [ "${ACT_NO_PREWARM:-}" != "1" ] \
    && [ "$caller_set_job" = "false" ] \
    && [ "$caller_set_workflow" = "false" ] \
    && [ "$caller_introspect" = "false" ]; then
    echo ">>> Pre-warming setup-node pnpm cache via 'lint' (skip with ACT_NO_PREWARM=1)..." >&2
    act "${ARGS[@]}" -j lint
    echo ">>> Pre-warm done; running full invocation..." >&2
fi

exec act "${ARGS[@]}" "$@"
