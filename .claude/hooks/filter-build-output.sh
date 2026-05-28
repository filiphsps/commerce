#!/bin/bash
# Claude Code PreToolUse hook (Bash matcher): trims `turbo run build` (Next.js)
# output down to errors and the run summary.
#
# Same mechanism as filter-test-output.sh: rewrites the command as
#   set -o pipefail; { CMD ; } 2>&1 | awk <filter>
# so `pipefail` preserves the runner's exit code. The filter is default-KEEP, so
# every compile/type error and turbo failure marker survives; it only sheds
# turbo orchestration chatter (`• …` bullets, `pkg:task: $ …` echoes,
# `cache hit|bypass|miss`) and Next.js progress noise (the optimized-build
# banner, "Generating static pages", the route-size table and its legend). The
# `Tasks:/Cached:/Time:/Failed:` summary is always kept, even past the line cap.
# The Next.js patterns are best-effort and version-sensitive, but default-KEEP
# guarantees an unrecognized error line is shown rather than dropped.
#
# Compound/piped/redirected and non-build commands pass through untouched.

set -u

command -v jq >/dev/null 2>&1 || { echo '{}'; exit 0; }

passthrough() { echo '{}'; exit 0; }

input=$(cat)
cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // empty')

[ -n "$cmd" ] || passthrough
case "$cmd" in *build-output-filter*) passthrough ;; esac
case "$cmd" in
    *'|'* | *'>'* | *'<'* | *'&&'* | *';'* | *'`'* | *'$('*) passthrough ;;
esac

# Skip dev/watch — `next dev`, `--watch` never exit.
printf '%s' "$cmd" | grep -Eq '(--watch|(^| )-w( |$)|(^| )dev([ ]|$))' && passthrough

printf '%s' "$cmd" | grep -Eq '(^| )(pnpm|turbo|next)( |$)' || passthrough
printf '%s' "$cmd" | grep -Eq '(^| )build(:[a-z:]+)?([ ]|$)|(^| )next( +[^ ]+)* +build([ ]|$)' || passthrough

PROG=$(
    cat <<'AWK'
function strip(s){ gsub(ANSI, "", s); return s }
BEGIN{ CAP=400; n=0; ESC=sprintf("%c",27); ANSI=ESC "\\[[0-9;?]*[ -/]*[@-~]" }
{
  line=strip($0)
  # Turbo prefixes every replayed line with `pkg:task: `; strip it for matching
  # so the anchored Next.js route-table rules see the real line content.
  core=line; sub(/^[^ \t:]+:[A-Za-z0-9_:-]+: +/, "", core)
  is_sum = (line ~ /^[ \t]*(Tasks|Cached|Time|Failed):/) \
        || (line ~ /(error TS[0-9]|: error( |:)|Failed to compile|Type error:|Module not found|Cannot find module)/) \
        || (line ~ /(ELIFECYCLE|run failed|exited \(|^[ \t]*ERROR)/) \
        || (line ~ /[0-9]+ (errors?|warnings?)([^a-zA-Z]|$)/)
  if (!is_sum) {
    if (core ~ /^[ \t]*•/) next
    if (core ~ /^[ \t]*\$ /) next
    if (line ~ /:[ \t]*\$ /) next
    if (line ~ /cache (hit|bypass|miss)[ ,]/) next
    if (line ~ /(Creating an optimized production build|Compiled successfully|Compiled in |Collecting page data|Generating static pages|Collecting build traces|Finalizing page optimization|Linting and checking validity|▲ Next\.js|✓ Compiled|Skipping (linting|validation))/) next
    if (core ~ /^[ \t]*(┌|├|└|│)/) next
    if (line ~ /(Route \(app\)|Route \(pages\)|First Load JS|^[ \t]*Size[ \t]+First Load)/) next
    if (core ~ /^[ \t]*(○|●|ƒ|λ) /) next
    if (line ~ /\((Static|Dynamic|ISR|SSG|prerendered)\)/) next
    if (line ~ /chunks\/(app|pages|framework|main|webpack|polyfills)/) next
  }
  if (line ~ /^[ \t]*$/) { if (lastblank) next; lastblank=1 } else lastblank=0
  buf[n]=line; sum[n]=is_sum; n++
}
END{
  if (n<=CAP){ for(i=0;i<n;i++) print buf[i]; exit }
  for(i=0;i<CAP;i++) print buf[i]
  print "... [build-output-filter] truncated " (n-CAP) " lines; summary kept below ..."
  for(i=CAP;i<n;i++) if(sum[i]) print buf[i]
}
AWK
)

filtered_cmd="set -o pipefail; { $cmd ; } 2>&1 | awk '$PROG'"

jq -n --arg cmd "$filtered_cmd" \
    '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"allow",updatedInput:{command:$cmd}}}'
