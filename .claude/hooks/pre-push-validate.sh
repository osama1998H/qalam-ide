#!/bin/bash
# PreToolUse Hook - Git Push Validation
# Ensures the project builds successfully before pushing

set -e

# Read the JSON input from stdin
INPUT=$(cat)

# Extract command from Bash tool input
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# Only check git push commands
if [[ ! "$COMMAND" =~ ^git[[:space:]]+push ]]; then
    exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

# Check if node_modules exists
if [[ ! -d "node_modules" ]]; then
    echo '{"decision": "block", "reason": "Cannot push: node_modules not found. Run npm install first."}'
    exit 0
fi

# Run TypeScript check
echo "Running pre-push validation..."

TSC_OUTPUT=$(npx tsc --noEmit 2>&1) || TSC_EXIT=$?

if [[ -n "$TSC_EXIT" && "$TSC_EXIT" -ne 0 ]]; then
    ERROR_COUNT=$(echo "$TSC_OUTPUT" | grep -c "error TS" || echo "0")

    # Show first few errors
    ERRORS=$(echo "$TSC_OUTPUT" | grep "error TS" | head -5)

    echo '{"decision": "block", "reason": "Cannot push: TypeScript has '"$ERROR_COUNT"' error(s). Fix type errors before pushing.\n\nFirst errors:\n'"$ERRORS"'"}'
    exit 0
fi

# Run build
BUILD_OUTPUT=$(npm run build 2>&1) || BUILD_EXIT=$?

if [[ -n "$BUILD_EXIT" && "$BUILD_EXIT" -ne 0 ]]; then
    echo '{"decision": "block", "reason": "Cannot push: Build failed. Fix build errors before pushing."}'
    exit 0
fi

# Check if out directory was created
if [[ ! -d "out" ]]; then
    echo '{"decision": "block", "reason": "Cannot push: Build did not produce output directory."}'
    exit 0
fi

echo "Pre-push validation passed"
exit 0
