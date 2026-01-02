# Claude Code Hooks Plan for Qalam IDE

## Project Analysis Summary

**Qalam IDE** is an RTL-first, Arabic-native IDE for the Tarqeem Arabic Programming Language built with:
- **Stack**: Electron 28 + React 18 + TypeScript 5.3 + CodeMirror 6
- **Build**: electron-vite + Rollup
- **State**: Zustand (16+ stores)
- **Size**: ~31,090 LOC across 111 TypeScript files

### Current Gaps Identified

| Area | Status | Impact |
|------|--------|--------|
| Testing | ❌ None | No unit/integration tests |
| Linting | ❌ None | No ESLint configured |
| Formatting | ❌ None | No Prettier configured |
| Pre-commit hooks | ❌ None | No git hooks active |
| Type checking | ✅ TypeScript strict | Only quality gate |

---

## Proposed Claude Code Hooks

### 1. SessionStart Hook - Environment Setup

**Purpose**: Automatically verify and display development environment status when starting a Claude Code session.

**File**: `.claude/hooks/session-start.sh`

**Checks performed**:
- Node.js version (18+ required)
- npm dependencies installed and up-to-date
- Tarqeem compiler availability in PATH
- Git branch and status
- TypeScript version

**Benefit**: Ensures Claude has context about the development environment and catches setup issues early.

---

### 2. PostToolUse Hook - TypeScript Type Checking

**Purpose**: Run TypeScript type checking after editing `.ts` or `.tsx` files to catch type errors immediately.

**Matcher**: `Edit|Write|MultiEdit`

**File**: `.claude/hooks/post-edit-typecheck.sh`

**Behavior**:
- Triggered after any TypeScript file is edited
- Runs `npx tsc --noEmit` to check for type errors
- Reports errors as non-blocking feedback
- Allows Claude to fix issues in the same session

**Benefit**: Immediate feedback on type errors without waiting for CI.

---

### 3. PreToolUse Hook - Protect Sensitive Files

**Purpose**: Prevent accidental modifications to critical configuration files.

**Matcher**: `Edit|Write|MultiEdit`

**File**: `.claude/hooks/protect-files.sh`

**Protected files**:
- `package-lock.json` - Should only be modified via npm
- `electron-builder.yml` - Build configuration (warn only)
- `.github/workflows/*.yml` - CI/CD pipelines (warn only)

**Behavior**:
- Blocks direct edits to `package-lock.json`
- Warns (but allows) edits to other sensitive files

**Benefit**: Prevents accidental corruption of generated/critical files.

---

### 4. PreToolUse Hook - Git Push Validation

**Purpose**: Ensure the project builds successfully before pushing to remote.

**Matcher**: `Bash`

**File**: `.claude/hooks/pre-push-validate.sh`

**Trigger**: When a `git push` command is executed

**Checks**:
- Run `npm run build` to verify compilation
- Check for TypeScript errors
- Verify `out/` directory is generated

**Behavior**:
- Blocks push if build fails
- Shows clear error message with failing step

**Benefit**: Prevents pushing broken code that would fail CI.

---

### 5. PostToolUse Hook - Package.json Dependency Sync

**Purpose**: Automatically run `npm install` when package.json is modified.

**Matcher**: `Edit|Write`

**File**: `.claude/hooks/sync-dependencies.sh`

**Trigger**: When `package.json` is edited

**Behavior**:
- Detects changes to package.json
- Runs `npm install` to sync dependencies
- Reports installation status

**Benefit**: Keeps node_modules in sync with package.json changes.

---

### 6. Stop Hook - Uncommitted Changes Reminder

**Purpose**: Remind about uncommitted changes when Claude finishes working.

**Matcher**: `""` (empty - fires on all stops)

**File**: `.claude/hooks/stop-git-check.sh`

**Behavior**:
- Checks `git status` for uncommitted changes
- Reports number of modified/untracked files
- Provides a helpful reminder if changes exist

**Benefit**: Prevents forgetting to commit work.

---

### 7. PreToolUse Hook - Enforce Commit Message Convention

**Purpose**: Ensure git commits follow conventional commit format.

**Matcher**: `Bash`

**File**: `.claude/hooks/commit-convention.sh`

**Trigger**: When a `git commit` command is executed

**Enforced format**:
- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation
- `style:` - Formatting
- `refactor:` - Code refactoring
- `test:` - Adding tests
- `chore:` - Maintenance

**Behavior**:
- Validates commit message format
- Blocks commits that don't follow convention
- Provides helpful suggestions

**Benefit**: Maintains consistent, readable git history.

---

## Implementation Priority

| Priority | Hook | Effort | Impact |
|----------|------|--------|--------|
| 1 | SessionStart (env setup) | Low | High |
| 2 | PostToolUse (typecheck) | Medium | High |
| 3 | PreToolUse (protect files) | Low | Medium |
| 4 | Stop (git reminder) | Low | Medium |
| 5 | PreToolUse (push validation) | Medium | High |
| 6 | PostToolUse (npm sync) | Low | Medium |
| 7 | PreToolUse (commit convention) | Low | Medium |

---

## File Structure

```
.claude/
├── settings.json           # Hook configuration
├── settings.local.json     # Local overrides (gitignored)
├── hooks/
│   ├── session-start.sh
│   ├── post-edit-typecheck.sh
│   ├── protect-files.sh
│   ├── pre-push-validate.sh
│   ├── sync-dependencies.sh
│   ├── stop-git-check.sh
│   └── commit-convention.sh
└── plan-code-hooks.md      # This plan document
```

---

## Configuration Preview

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/session-start.sh"
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Edit|Write|MultiEdit",
        "hooks": [
          {
            "type": "command",
            "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/protect-files.sh"
          }
        ]
      },
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/pre-push-validate.sh"
          },
          {
            "type": "command",
            "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/commit-convention.sh"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Edit|Write|MultiEdit",
        "hooks": [
          {
            "type": "command",
            "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/post-edit-typecheck.sh"
          },
          {
            "type": "command",
            "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/sync-dependencies.sh"
          }
        ]
      }
    ],
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/stop-git-check.sh"
          }
        ]
      }
    ]
  }
}
```

---

## Notes

- All hooks use exit code 0 for success, exit code 2 for blocking errors
- Hooks receive JSON input via stdin with tool context
- PostToolUse hooks are non-blocking (report errors but don't fail)
- PreToolUse hooks can block operations with exit code 2
- Scripts should be fast (<1 second) to avoid slowing down workflow
