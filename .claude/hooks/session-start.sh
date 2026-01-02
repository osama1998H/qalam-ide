#!/bin/bash
# SessionStart Hook - Environment Setup for Qalam IDE
# Checks development environment and provides context to Claude

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Qalam IDE Environment Check ===${NC}"
echo ""

# Check Node.js version
NODE_VERSION=$(node --version 2>/dev/null || echo "not found")
if [[ "$NODE_VERSION" == "not found" ]]; then
    echo -e "${RED}Node.js: NOT INSTALLED${NC}"
    echo "  Required: Node.js 18+"
else
    NODE_MAJOR=$(echo "$NODE_VERSION" | sed 's/v\([0-9]*\).*/\1/')
    if [[ "$NODE_MAJOR" -ge 18 ]]; then
        echo -e "${GREEN}Node.js: $NODE_VERSION${NC}"
    else
        echo -e "${YELLOW}Node.js: $NODE_VERSION (18+ recommended)${NC}"
    fi
fi

# Check npm version
NPM_VERSION=$(npm --version 2>/dev/null || echo "not found")
if [[ "$NPM_VERSION" == "not found" ]]; then
    echo -e "${RED}npm: NOT INSTALLED${NC}"
else
    echo -e "${GREEN}npm: v$NPM_VERSION${NC}"
fi

# Check TypeScript version
if [[ -f "$CLAUDE_PROJECT_DIR/node_modules/.bin/tsc" ]]; then
    TSC_VERSION=$("$CLAUDE_PROJECT_DIR/node_modules/.bin/tsc" --version 2>/dev/null | awk '{print $2}')
    echo -e "${GREEN}TypeScript: $TSC_VERSION${NC}"
else
    echo -e "${YELLOW}TypeScript: not installed (run npm install)${NC}"
fi

# Check if node_modules exists and is up-to-date
if [[ -d "$CLAUDE_PROJECT_DIR/node_modules" ]]; then
    # Check if package.json is newer than node_modules
    if [[ "$CLAUDE_PROJECT_DIR/package.json" -nt "$CLAUDE_PROJECT_DIR/node_modules" ]]; then
        echo -e "${YELLOW}Dependencies: may be outdated (package.json modified)${NC}"
        echo "  Consider running: npm install"
    else
        echo -e "${GREEN}Dependencies: installed${NC}"
    fi
else
    echo -e "${RED}Dependencies: NOT INSTALLED${NC}"
    echo "  Run: npm install"
fi

# Check for Tarqeem compiler
TARQEEM_PATH=$(which tarqeem 2>/dev/null || echo "")
if [[ -n "$TARQEEM_PATH" ]]; then
    TARQEEM_VERSION=$(tarqeem --version 2>/dev/null || echo "unknown")
    echo -e "${GREEN}Tarqeem compiler: $TARQEEM_VERSION${NC}"
    echo "  Path: $TARQEEM_PATH"
else
    echo -e "${YELLOW}Tarqeem compiler: not in PATH${NC}"
    echo "  The IDE will prompt for compiler path if needed"
fi

echo ""

# Git status
if [[ -d "$CLAUDE_PROJECT_DIR/.git" ]]; then
    BRANCH=$(git -C "$CLAUDE_PROJECT_DIR" rev-parse --abbrev-ref HEAD 2>/dev/null)
    CHANGES=$(git -C "$CLAUDE_PROJECT_DIR" status --porcelain 2>/dev/null | wc -l | tr -d ' ')

    echo -e "${BLUE}Git Status:${NC}"
    echo "  Branch: $BRANCH"

    if [[ "$CHANGES" -eq 0 ]]; then
        echo -e "  Working tree: ${GREEN}clean${NC}"
    else
        echo -e "  Working tree: ${YELLOW}$CHANGES file(s) modified${NC}"
    fi

    # Check if ahead/behind remote
    AHEAD=$(git -C "$CLAUDE_PROJECT_DIR" rev-list --count @{upstream}..HEAD 2>/dev/null || echo "0")
    BEHIND=$(git -C "$CLAUDE_PROJECT_DIR" rev-list --count HEAD..@{upstream} 2>/dev/null || echo "0")

    if [[ "$AHEAD" -gt 0 ]]; then
        echo -e "  ${YELLOW}$AHEAD commit(s) ahead of remote${NC}"
    fi
    if [[ "$BEHIND" -gt 0 ]]; then
        echo -e "  ${YELLOW}$BEHIND commit(s) behind remote${NC}"
    fi
fi

echo ""
echo -e "${BLUE}Project: Qalam IDE (قلم)${NC}"
echo "  Electron + React + TypeScript + CodeMirror 6"
echo ""

exit 0
