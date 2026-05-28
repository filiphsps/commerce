#!/bin/bash
# Claude Code PreToolUse hook (Bash matcher): trims test-runner output down to
# failures plus the run summary so passing-test spam and coverage tables do not
# flood the agent context.
#
# WHY a command rewrite instead of post-processing: a PreToolUse hook can only
# inspect and replace the command, so we wrap it as
#   set -o pipefail; { CMD ; } 2>&1 | awk <filter>
# `pipefail` is load-bearing — it preserves the RUNNER's exit code (green stays
# green, red stays red) rather than leaking awk's always-zero status. The old
# grep-based filter got this wrong: grep exits 1 when it matches nothing, so a
# fully passing run looked like a failure.
#
# Covered runners (any wrapper — dotenv, turbo, pnpm, NODE_OPTIONS=… prefix):
#   - vitest (`vitest run`, `pnpm test`, `pnpm test --project X`, per-package
#     `vitest run`) with the repo's `verbose` reporter and v8 coverage tables.
#   - playwright (`pnpm test:e2e`, `playwright test`) with the list reporter.
#
# Left untouched (passed straight through): compound or already-piped/redirected
# commands (wrapping them could change semantics or double-filter), and
# watch/UI/inspect modes (filtering a process that never exits would hang the
# tool). Non-test commands are a no-op.

set -u

# Degrade to a no-op rather than corrupting the command when jq is missing.
command -v jq >/dev/null 2>&1 || { echo '{}'; exit 0; }

passthrough() { echo '{}'; exit 0; }

input=$(cat)
cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // empty')

# No command, or we already rewrote it (recursion guard via our own marker).
[ -n "$cmd" ] || passthrough
case "$cmd" in *test-output-filter*) passthrough ;; esac

# Leave compound / already-redirected commands alone.
case "$cmd" in
    *'|'* | *'>'* | *'<'* | *'&&'* | *';'* | *'`'* | *'$('*) passthrough ;;
esac

# Watch / interactive runners never exit — filtering them would hang the tool.
if printf '%s' "$cmd" | grep -Eq '(--watch|(^| )-w( |$)|--ui|--inspect|:watch|vitest( +[^ ]+)* +watch)'; then
    passthrough
fi

# Must invoke a known test entrypoint AND a test trigger token. The trigger
# whitelist (`run`, `test`, `test:e2e/:unit/:integration`) deliberately excludes
# `test:watch` and non-runner scripts like `test:links`.
printf '%s' "$cmd" | grep -Eq '(^| )(pnpm|turbo|vitest|playwright|dotenv)( |$)' || passthrough
printf '%s' "$cmd" | grep -Eq '(^| )vitest( +[^ ]+)* +run([ =]|$)|(^| )playwright( +[^ ]+)* +test([ ]|$)|(^| )test(:e2e|:unit|:integration)?([ ]|$)' || passthrough

# awk filter. Default-KEEP, drop only known spam, so no failure detail is ever
# lost. `is_sum` lines (counts, durations, coverage summary, pnpm errors) are
# always kept — even past the line cap. Multibyte ✓/√ are matched as literal
# byte sequences (not bracket classes) to stay correct under BSD awk in any
# locale. Colors are stripped defensively though piped runs emit none.
PROG=$(
    cat <<'AWK'
function strip(s){ gsub(ANSI, "", s); return s }
BEGIN{ CAP=600; n=0; ESC=sprintf("%c",27); ANSI=ESC "\\[[0-9;?]*[ -/]*[@-~]" }
{
  line=strip($0)
  tmp=line; np=gsub(/\|/,"&",tmp)
  is_sum = (line ~ /(Test Files|[ \t]Tests[ \t]|Start at|Duration[ \t])/) \
        || (line ~ /[0-9]+ (passed|failed|skipped|flaky|todo|pending)([^a-zA-Z]|$)/) \
        || (line ~ /Coverage (summary|report)/) \
        || (line ~ /^[ \t]*(Statements|Branches|Functions|Lines)[ \t]*:/) \
        || (line ~ /ERROR: Coverage/) \
        || (line ~ /ERR_PNPM/) \
        || (line ~ /(No test files found|passWithNoTests|no tests found)/)
  if (!is_sum && line ~ /^[ \t]*✓[ \t]/) next
  if (!is_sum && line ~ /^[ \t]*√[ \t]/) next
  if (!is_sum && np>=3) next
  buf[n]=line; sum[n]=is_sum; n++
}
END{
  if (n<=CAP){ for(i=0;i<n;i++) print buf[i]; exit }
  for(i=0;i<CAP;i++) print buf[i]
  print "... [test-output-filter] truncated " (n-CAP) " lines; summary kept below ..."
  for(i=CAP;i<n;i++) if(sum[i]) print buf[i]
}
AWK
)

filtered_cmd="set -o pipefail; { $cmd ; } 2>&1 | awk '$PROG'"

jq -n --arg cmd "$filtered_cmd" \
    '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"allow",updatedInput:{command:$cmd}}}'
