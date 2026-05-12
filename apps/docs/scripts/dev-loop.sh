#!/usr/bin/env bash
# Run the Docusaurus dev server and auto-restart on crash.
# Used as the background companion to remote-tunnel review sessions.
#
# Exit codes 0 and 130 (Ctrl-C) cause the loop to exit. Anything else
# triggers a 2s backoff and a respawn.

set -u
cd "$(dirname "$0")/.."

while true; do
    pnpm --silent run docusaurus:start --host 0.0.0.0
    status=$?
    if [ $status -eq 0 ] || [ $status -eq 130 ]; then
        echo "dev-loop: server exited cleanly ($status); stopping loop."
        break
    fi
    echo "dev-loop: server crashed (exit $status); restarting in 2s..." >&2
    sleep 2
done
