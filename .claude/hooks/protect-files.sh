#!/bin/bash
# PreToolUse Hook - Protect Sensitive Files
# Blocks or warns about modifications to critical configuration files

set -e

# Read the JSON input from stdin
INPUT=$(cat)

# Extract file path from the tool input
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.filePath // empty')

# If no file path, allow the operation
if [[ -z "$FILE_PATH" ]]; then
    exit 0
fi

# Get just the filename for comparison
FILENAME=$(basename "$FILE_PATH")

# Files that should NEVER be directly edited (exit code 2 = block)
BLOCKED_FILES=(
    "package-lock.json"
)

# Files that should trigger a warning but allow editing
WARN_FILES=(
    "electron-builder.yml"
)

# Check blocked files
for blocked in "${BLOCKED_FILES[@]}"; do
    if [[ "$FILENAME" == "$blocked" ]]; then
        echo '{"decision": "block", "reason": "Direct editing of '"$blocked"' is not recommended. Use npm commands to modify dependencies instead (e.g., npm install, npm uninstall)."}'
        exit 0
    fi
done

# Check warning files
for warn in "${WARN_FILES[@]}"; do
    if [[ "$FILENAME" == "$warn" ]]; then
        echo "Note: Modifying $warn - this affects the build configuration"
        exit 0
    fi
done

# Check for .github/workflows files
if [[ "$FILE_PATH" =~ \.github/workflows/.*\.yml$ ]]; then
    echo "Note: Modifying CI/CD workflow - changes will affect automated builds"
    exit 0
fi

# Allow all other files
exit 0
