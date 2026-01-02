#!/bin/bash
# Stop Hook - Git Status Reminder
# Reminds about uncommitted changes when Claude finishes working

set -e

# Check if we're in a git repository
if [[ ! -d "$CLAUDE_PROJECT_DIR/.git" ]]; then
    exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

# Get status counts
STAGED=$(git diff --cached --name-only 2>/dev/null | wc -l | tr -d ' ')
MODIFIED=$(git diff --name-only 2>/dev/null | wc -l | tr -d ' ')
UNTRACKED=$(git ls-files --others --exclude-standard 2>/dev/null | wc -l | tr -d ' ')

TOTAL=$((STAGED + MODIFIED + UNTRACKED))

if [[ "$TOTAL" -gt 0 ]]; then
    echo "There are uncommitted changes in the repository:"

    if [[ "$STAGED" -gt 0 ]]; then
        echo "  - $STAGED staged file(s)"
    fi
    if [[ "$MODIFIED" -gt 0 ]]; then
        echo "  - $MODIFIED modified file(s)"
    fi
    if [[ "$UNTRACKED" -gt 0 ]]; then
        echo "  - $UNTRACKED untracked file(s)"
    fi

    echo ""
    echo "Consider committing and pushing these changes."
fi

exit 0
