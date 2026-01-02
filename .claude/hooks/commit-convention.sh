#!/bin/bash
# PreToolUse Hook - Commit Convention Enforcement
# Ensures git commits follow conventional commit format

set -e

# Read the JSON input from stdin
INPUT=$(cat)

# Extract command from Bash tool input
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# Only check git commit commands
if [[ ! "$COMMAND" =~ ^git[[:space:]]+commit ]]; then
    exit 0
fi

# Extract commit message
# Handle various formats: -m "msg", -m 'msg', -m msg
COMMIT_MSG=""

if [[ "$COMMAND" =~ -m[[:space:]]+[\"\']([^\"\']+)[\"\'] ]]; then
    COMMIT_MSG="${BASH_REMATCH[1]}"
elif [[ "$COMMAND" =~ -m[[:space:]]+([^[:space:]]+) ]]; then
    COMMIT_MSG="${BASH_REMATCH[1]}"
elif [[ "$COMMAND" =~ \$\(cat ]]; then
    # HEREDOC format - extract the message
    # This is commonly used: git commit -m "$(cat <<'EOF' ... EOF)"
    # Allow these as they're typically well-formatted
    exit 0
fi

# If we couldn't extract a message, allow it (might be interactive or complex)
if [[ -z "$COMMIT_MSG" ]]; then
    exit 0
fi

# Valid conventional commit prefixes
VALID_PREFIXES=(
    "feat:"
    "fix:"
    "docs:"
    "style:"
    "refactor:"
    "test:"
    "chore:"
    "perf:"
    "ci:"
    "build:"
    "revert:"
)

# Check if message starts with a valid prefix
VALID=false
for prefix in "${VALID_PREFIXES[@]}"; do
    if [[ "$COMMIT_MSG" == "$prefix"* ]]; then
        VALID=true
        break
    fi
done

if [[ "$VALID" == false ]]; then
    PREFIXES_LIST=$(printf '%s, ' "${VALID_PREFIXES[@]}" | sed 's/, $//')
    echo '{"decision": "block", "reason": "Commit message does not follow conventional commit format.\n\nMessage: '"$COMMIT_MSG"'\n\nValid prefixes: '"$PREFIXES_LIST"'\n\nExamples:\n- feat: add new feature\n- fix: resolve bug in component\n- docs: update README\n- refactor: restructure code"}'
    exit 0
fi

exit 0
