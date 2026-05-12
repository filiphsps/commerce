#!/usr/bin/env bash
# Wrapper around `act` that wires `.env` and `.env.local` in as both
# `secrets` and `vars`, so `${{ secrets.X }}` / `${{ vars.X }}` references
# in the workflow files resolve when running locally.
#
# Pass any extra args through to `act`, e.g.:
#   ./scripts/act.sh -j lint
#   ./scripts/act.sh --list
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

exec act "${ARGS[@]}" "$@"
