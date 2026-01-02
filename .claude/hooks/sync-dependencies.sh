#!/bin/bash
# PostToolUse Hook - Dependency Sync
# Automatically runs npm install when package.json is modified

set -e

# Read the JSON input from stdin
INPUT=$(cat)

# Extract file path from the tool input
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.filePath // empty')

# If no file path, exit silently
if [[ -z "$FILE_PATH" ]]; then
    exit 0
fi

# Get just the filename
FILENAME=$(basename "$FILE_PATH")

# Only run for package.json changes
if [[ "$FILENAME" != "package.json" ]]; then
    exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

echo "package.json was modified - syncing dependencies..."

# Run npm install
NPM_OUTPUT=$(npm install 2>&1) || NPM_EXIT=$?

if [[ -n "$NPM_EXIT" && "$NPM_EXIT" -ne 0 ]]; then
    echo "Warning: npm install failed"
    echo "$NPM_OUTPUT" | tail -10
    exit 0
fi

# Count installed/updated packages
ADDED=$(echo "$NPM_OUTPUT" | grep -c "added" || echo "0")
REMOVED=$(echo "$NPM_OUTPUT" | grep -c "removed" || echo "0")

echo "Dependencies synced successfully"

exit 0
