#!/bin/bash
# Claude Code hook: surfaces fallow audit findings (dead code, dupes, complexity)
# after a task finishes (Stop) and at session end (SessionEnd).
# Informational only — always exits 0, never blocks the session.

set -u

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
FALLOW="$PROJECT_DIR/node_modules/.bin/fallow"

# Drain hook JSON from stdin so we don't leave a dangling pipe.
cat >/dev/null 2>&1

# Skip silently if fallow isn't installed yet (fresh checkout pre-pnpm-install).
[ -x "$FALLOW" ] || exit 0

cd "$PROJECT_DIR" || exit 0

# Audit scopes to files changed since the base ref (default branch, auto-detected).
# --quiet suppresses output when verdict is pass; markdown is human/Claude-friendly.
# Workspace-discovery warnings about subdirs without package.json are noise here —
# pnpm-workspace.yaml uses globstars but fallow walks every subdir as a candidate.
OUTPUT=$("$FALLOW" audit --quiet --format markdown 2>&1 | grep -v 'WARN.*no package.json')
STATUS=${PIPESTATUS[0]}

# Nothing to report — stay silent.
if [ -z "$OUTPUT" ]; then
    exit 0
fi

# Print to stderr so the findings show in the transcript without polluting stdout.
{
    echo "─── fallow audit (exit $STATUS) ───"
    echo "$OUTPUT"
    echo "────────────────────────────────────"
} >&2

exit 0
