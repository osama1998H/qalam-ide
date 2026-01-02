#!/bin/bash
# PostToolUse Hook - TypeScript Type Checking
# Runs tsc --noEmit after editing TypeScript files

set -e

# Read the JSON input from stdin
INPUT=$(cat)

# Extract file path from the tool input
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.filePath // empty')

# If no file path, exit silently
if [[ -z "$FILE_PATH" ]]; then
    exit 0
fi

# Only check TypeScript files
if [[ ! "$FILE_PATH" =~ \.(ts|tsx)$ ]]; then
    exit 0
fi

# Skip node_modules and out directories
if [[ "$FILE_PATH" =~ node_modules|/out/ ]]; then
    exit 0
fi

# Check if tsc is available
if [[ ! -f "$CLAUDE_PROJECT_DIR/node_modules/.bin/tsc" ]]; then
    echo "TypeScript not installed - skipping type check"
    exit 0
fi

# Run type check
cd "$CLAUDE_PROJECT_DIR"

# Run tsc and capture output
TSC_OUTPUT=$(npx tsc --noEmit 2>&1) || TSC_EXIT=$?

if [[ -n "$TSC_EXIT" && "$TSC_EXIT" -ne 0 ]]; then
    # Count errors
    ERROR_COUNT=$(echo "$TSC_OUTPUT" | grep -c "error TS" || echo "0")

    echo "TypeScript check: $ERROR_COUNT error(s) found"
    echo ""

    # Show first 10 errors to avoid overwhelming output
    echo "$TSC_OUTPUT" | grep -A 1 "error TS" | head -30

    if [[ "$ERROR_COUNT" -gt 10 ]]; then
        echo ""
        echo "... and $((ERROR_COUNT - 10)) more errors"
    fi

    # Exit 0 (non-blocking) to allow Claude to fix the errors
    exit 0
else
    echo "TypeScript check: passed"
    exit 0
fi
