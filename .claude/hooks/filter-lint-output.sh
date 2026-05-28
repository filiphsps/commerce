#!/bin/bash
# Claude Code PreToolUse hook (Bash matcher): trims Biome lint output so a run
# with dozens of diagnostics does not flood the agent context.
#
# Same mechanism as filter-test-output.sh: rewrites the command as
#   set -o pipefail; { CMD ; } 2>&1 | awk <filter>
# so `pipefail` preserves Biome's exit code (errors fail, clean passes). The
# filter is default-KEEP — every diagnostic header, message and code frame
# survives — and only sheds Biome's repetitive boilerplate: the `i` info/hint
# lines, the FIXABLE unsafe-fix diff blocks, and the decorative ━ rules. The
# `Checked … / Found N error|warning` summary is always kept, even past the
# line cap. Run `pnpm biome check --write` to apply the dropped fixes.
#
# Compound/piped/redirected and non-lint commands pass through untouched.

set -u

command -v jq >/dev/null 2>&1 || { echo '{}'; exit 0; }

passthrough() { echo '{}'; exit 0; }

input=$(cat)
cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // empty')

[ -n "$cmd" ] || passthrough
case "$cmd" in *lint-output-filter*) passthrough ;; esac
case "$cmd" in
    *'|'* | *'>'* | *'<'* | *'&&'* | *';'* | *'`'* | *'$('*) passthrough ;;
esac

# Must invoke a known entrypoint AND a lint trigger token.
printf '%s' "$cmd" | grep -Eq '(^| )(pnpm|turbo|biome)( |$)' || passthrough
printf '%s' "$cmd" | grep -Eq '(^| )biome( +[^ ]+)* +(lint|check)([ ]|$)|(^| )(lint|format:lint|format:check)([ ]|$)' || passthrough

PROG=$(
    cat <<'AWK'
function strip(s){ gsub(ANSI, "", s); return s }
BEGIN{ CAP=500; n=0; ESC=sprintf("%c",27); ANSI=ESC "\\[[0-9;?]*[ -/]*[@-~]" }
{
  line=strip($0)
  is_sum = (line ~ /^[ \t]*(Checked|Found) /) \
        || (line ~ /No fixes applied/) \
        || (line ~ /Some (errors|warnings) were emitted/)
  if (!is_sum) {
    if (line ~ /^[ \t]*[━─—=]+[ \t]*$/) next
    if (line ~ /^[ \t]*i[ \t]/) next
    if (line ~ /│[ \t]*[+-]/) next
    if (line ~ /^[ \t]*[0-9]+ +[0-9]+ +│/) next
  }
  if (line ~ /^[ \t]*$/) { if (lastblank) next; lastblank=1 } else lastblank=0
  buf[n]=line; sum[n]=is_sum; n++
}
END{
  if (n<=CAP){ for(i=0;i<n;i++) print buf[i]; exit }
  for(i=0;i<CAP;i++) print buf[i]
  print "... [lint-output-filter] truncated " (n-CAP) " lines; summary kept below ..."
  for(i=CAP;i<n;i++) if(sum[i]) print buf[i]
}
AWK
)

filtered_cmd="set -o pipefail; { $cmd ; } 2>&1 | awk '$PROG'"

jq -n --arg cmd "$filtered_cmd" \
    '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"allow",updatedInput:{command:$cmd}}}'
