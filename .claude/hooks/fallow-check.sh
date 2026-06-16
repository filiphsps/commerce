#!/bin/bash
# Claude Code hook: surfaces fallow audit findings (dead code, dupes, complexity)
# after a task finishes (Stop). Informational only — always exits 0, never blocks
# the session.

set -u

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
FALLOW="$PROJECT_DIR/node_modules/.bin/fallow"
TMP="${TMPDIR:-/tmp}"

# Drain hook JSON from stdin so we don't leave a dangling pipe. Bounded by a short
# timeout: if the harness tears down without sending EOF, an unbounded read blocks
# until the hook is cancelled. On a normal Stop, stdin EOFs immediately and cat
# returns before the timeout fires — no added latency there.
timeout 1 cat >/dev/null 2>&1 || true

# Skip silently if fallow isn't installed yet (fresh checkout pre-pnpm-install).
[ -x "$FALLOW" ] || exit 0

cd "$PROJECT_DIR" || exit 0

# Single-flight guard. `fallow audit` runs the `new-only` gate's base-snapshot
# pass — a whole-program analysis of BOTH the base commit and the working tree,
# costing gigabytes of RSS on this monorepo. Many Claude sessions hitting Stop at
# once would otherwise each launch one heavy audit and stack to tens of GB of
# allocated memory. An atomic mkdir lock caps it to a single concurrent audit; a
# stale lock left by a crashed run (>10 min old) is reclaimed so we never deadlock.
LOCK="$TMP/fallow-audit${PROJECT_DIR//\//_}.lock"
if ! mkdir "$LOCK" 2>/dev/null; then
    if [ -n "$(find "$LOCK" -prune -mmin +10 2>/dev/null)" ]; then
        rmdir "$LOCK" 2>/dev/null || true
        mkdir "$LOCK" 2>/dev/null || exit 0
    else
        exit 0
    fi
fi
trap 'rmdir "$LOCK" 2>/dev/null || true' EXIT

# Reap fallow's leaked base-snapshot worktrees. The base-snapshot pass checks the
# base commit out into a `$TMPDIR/fallow-audit-base-cache-*` git worktree keyed by
# commit hash and never removes it, so one accrues per commit — unbounded $TMPDIR
# disk plus `.git/worktrees` registrations that slow every git invocation. Drop the
# ones untouched for over an hour (never an in-flight checkout) and prune the now
# dangling registrations; the current base's cache, if fresh, is left warm.
find "$TMP" -maxdepth 1 -name 'fallow-audit-base-cache-*' -mmin +60 -exec rm -rf {} + 2>/dev/null || true
git worktree prune 2>/dev/null || true

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
