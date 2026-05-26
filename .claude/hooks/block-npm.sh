#!/bin/bash

# Thanks https://www.youtube.com/watch?v=3CSi8QAoN-s

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command')

# Check if the command starts with npm (as a command, not just mentioned in a string)
if echo "$COMMAND" | grep -qE '(^|&&|\|\||;)\s*npm\s'; then
    echo "Blocked: use pnpm, not npm." >&2
    exit 2
fi

# Check if the command starts with npx (as a command, not just mentioned in a string)
if echo "$COMMAND" | grep -qE '(^|&&|\|\||;)\s*npx\s'; then
    echo "Blocked: use 'pnpm dlx' (or 'pnpm exec' for local binaries), not npx." >&2
    exit 2
fi

exit 0
