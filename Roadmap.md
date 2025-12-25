# Qalam IDE - Full Development Roadmap

> **قلم** - بيئة تطوير متكاملة للغة ترقيم العربية
>
> Qalam - Integrated Development Environment for Tarqeem Arabic Programming Language

---

## Vision

Build the first professional-grade, RTL-native IDE specifically designed for Arabic programming. Qalam will provide a complete development experience for Tarqeem, setting the standard for Arabic-first developer tools.

---

## Current State (MVP - Completed)

### What We Have
- Electron + CodeMirror 6 + React + TypeScript
- RTL editing with proper cursor/selection behavior
- Syntax highlighting for all 50+ Tarqeem keywords
- File operations (open, save, save as)
- Basic compiler integration (`tarqeem compile/run`)
- Arabic application menu
- Dark theme with VS Code-inspired colors

### Project Location
`/Users/osamamuhammed/Tarqeem_Project/qalam-editor/`

---

## Roadmap Overview

```
Phase 0: MVP ✅ Complete
    │
Phase 1: Essential Editor Features (2-3 weeks)
    │   └── Multi-tab, Find/Replace, Settings, Themes
    │
Phase 2: Language Intelligence (3-4 weeks)
    │   └── LSP Client, Autocomplete, Diagnostics, Hover
    │
Phase 3: Project Management (2-3 weeks)
    │   └── File Explorer, Project System, Workspaces
    │
Phase 4: Debugging & Tooling (4-6 weeks)
    │   └── Debugger, Terminal, Package Manager UI
    │
Phase 5: Advanced Features (4-6 weeks)
    │   └── Git Integration, Extensions, Collaboration
    │
Phase 6: Polish & Release (2-4 weeks)
        └── Performance, Accessibility, Distribution
```

---

## Phase 1: Essential Editor Features

**Goal**: Transform basic editor into a usable daily-driver IDE

### 1.1 Multi-Tab Editor
- [x] Tab bar component with RTL layout
- [x] Tab management (open, close, reorder)
- [x] Close confirmation for unsaved files
- [x] Tab overflow handling (scroll or dropdown)
- [x] Keyboard navigation (Ctrl+Tab, Ctrl+W)
- [x] "Close others", "Close to the right" context menu

### 1.2 Find & Replace
- [x] Find panel (Ctrl+F) with RTL input
- [x] Replace panel (Ctrl+H)
- [x] Match case, whole word, regex options
- [x] Find in selection
- [x] Highlight all matches
- [x] Navigate between matches (F3/Shift+F3)
- [x] Replace all with preview count

### 1.3 Go To Line/Symbol
- [x] Go to line dialog (Ctrl+G)
- [x] Quick symbol navigation (Ctrl+Shift+O)
- [x] Breadcrumb navigation showing current location

### 1.4 Editor Enhancements
- [x] Line numbers toggle
- [x] Code folding for blocks (`{...}`)
- [x] Minimap (optional, may need RTL adjustments)
- [x] Indentation guides
- [x] Whitespace visualization toggle
- [x] Word wrap toggle
- [x] Auto-indent on Enter
- [x] Smart bracket matching and auto-close

### 1.5 Settings System
- [x] Settings UI panel (JSON + UI)
- [x] Font family and size selection
- [x] Tab size (2, 4 spaces)
- [x] Theme selection (dark/light)
- [x] Editor preferences persistence
- [x] Keybinding customization

### 1.6 Theme System
- [x] Light theme (professional, readable)
- [x] Dark theme (current, polish)
- [x] High contrast theme (accessibility)
- [x] Theme switching without restart
- [ ] Custom theme support (future)

### 1.7 Recent Files
- [x] Recent files list in File menu
- [x] Welcome screen with recent projects
- [x] Clear recent files option

**Deliverable**: Multi-tab editor with find/replace, settings, and themes

---

## Phase 2: Language Intelligence (LSP Integration)

**Goal**: Smart code assistance through Language Server Protocol

### 2.1 LSP Client Implementation
- [x] LSP client library integration (`vscode-languageclient` or custom)
- [x] Connection to `tarqeem-lsp` server
- [x] Lifecycle management (start, restart, shutdown)
- [x] Multiple document synchronization
- [x] Configuration passing to server

### 2.2 Diagnostics (Errors & Warnings)
- [x] Real-time error highlighting (red squiggles)
- [x] Warning highlighting (yellow squiggles)
- [x] Problems panel listing all diagnostics
- [x] Click to navigate to error location
- [x] Error count in status bar
- [x] Bilingual error messages display

### 2.3 Autocomplete
- [x] Trigger on typing (keywords, identifiers)
- [x] Completion popup with RTL layout
- [x] Icon differentiation (keyword, function, variable, type)
- [x] Documentation preview in completion
- [x] Snippet support with placeholders
- [x] Auto-import suggestions

### 2.4 Hover Information
- [x] Type information on hover
- [x] Documentation display
- [x] RTL-aware tooltip positioning
- [x] Syntax-highlighted code in tooltips

### 2.5 Go To Definition
- [ ] Ctrl+Click to navigate
- [ ] F12 keyboard shortcut
- [ ] Peek definition (inline preview)
- [ ] Go to declaration vs definition

### 2.6 Find All References
- [ ] Shift+F12 to find references
- [ ] References panel with file grouping
- [ ] Highlight all references in current file

### 2.7 Symbol Rename
- [ ] F2 to rename symbol
- [ ] Preview changes before applying
- [ ] Cross-file rename support

### 2.8 Code Actions & Quick Fixes
- [ ] Light bulb indicator for available actions
- [ ] Quick fix suggestions (Ctrl+.)
- [ ] Import missing symbol
- [ ] Generate function stub

### 2.9 Signature Help
- [ ] Parameter hints while typing function calls
- [ ] Current parameter highlighting
- [ ] Documentation for each parameter

### 2.10 Document Formatting
- [x] Format document (Shift+Alt+F)
- [x] Format selection
- [x] Format on save option
- [x] Format on paste option

**Deliverable**: Full LSP integration with autocomplete, diagnostics, navigation

---

## Phase 3: Project Management

**Goal**: Manage multi-file projects efficiently

### 3.1 File Explorer
- [x] Tree view sidebar (RTL layout)
- [x] File/folder icons
- [x] Expand/collapse folders
- [x] Context menu (new file, rename, delete)
- [x] Drag and drop file organization
- [x] File filtering and search

### 3.2 Project System
- [x] Project file format (`ترقيم.حزمة`)
- [x] Open folder as project
- [x] Recent projects list
- [x] Project-specific settings

### 3.3 Workspace Management
- [-] Multi-root workspaces
- [-] Workspace settings
- [-] Save/restore workspace state
- [-] Window state persistence (size, position, layout)

### 3.4 File Operations
- [x] New file dialog with templates
- [x] Rename file/folder
- [x] Delete to trash
- [ ] Duplicate file
- [ ] Move file refactoring

### 3.5 Search Across Files
- [x] Find in files (Ctrl+Shift+F)
- [x] Search results panel
- [x] Include/exclude patterns
- [x] Replace in files
- [x] Regex search

### 3.6 Outline View
- [x] Document symbols tree
- [x] Navigate by clicking
- [x] Filter symbols by type
- [x] Sort alphabetically or by position

**Deliverable**: File explorer, project system, cross-file search

---

## Phase 4: Debugging & Developer Tools

**Goal**: Professional debugging and development workflow

### 4.1 Integrated Terminal
- [ ] Terminal panel (node-pty or similar)
- [ ] Multiple terminal instances
- [ ] RTL-aware terminal (challenging)
- [ ] Shell selection (bash, zsh, PowerShell)
- [ ] Terminal splitting

### 4.2 Debugger UI
- [ ] Debug configuration system
- [ ] Breakpoint management (click gutter)
- [ ] Conditional breakpoints
- [ ] Debug toolbar (continue, step over, step into, step out)
- [ ] Variables panel
- [ ] Watch expressions
- [ ] Call stack panel
- [ ] Debug console

### 4.3 Debug Adapter Protocol (DAP)
- [ ] DAP client implementation
- [ ] Connection to Tarqeem debugger
- [ ] Source mapping
- [ ] Exception breakpoints

### 4.4 Build System Integration
- [ ] Build tasks configuration
- [ ] Run task (Ctrl+Shift+B)
- [ ] Task output panel
- [ ] Problem matcher for build errors
- [ ] Pre-launch tasks

### 4.5 Package Manager UI
- [ ] View installed packages
- [ ] Search package registry
- [ ] Install/update/remove packages
- [ ] `ترقيم.حزمة` file editing assistance
- [ ] Dependency tree visualization

### 4.6 Output Channels
- [ ] Multiple output channels (compiler, LSP, extensions)
- [ ] Channel switching
- [ ] Clear output
- [ ] Copy output

**Deliverable**: Integrated terminal, debugger, build system

---

## Phase 5: Advanced Features

**Goal**: Professional IDE features for team development

### 5.1 Git Integration
- [ ] Source control panel
- [ ] File status indicators (modified, staged, untracked)
- [ ] Stage/unstage changes
- [ ] Commit with message
- [ ] Diff viewer (inline and side-by-side)
- [ ] Branch management
- [ ] Pull/push operations
- [ ] Merge conflict resolution
- [ ] Git blame annotations
- [ ] Git history viewer

### 5.2 Extension System
- [ ] Extension API design
- [ ] Extension host process
- [ ] Extension marketplace UI
- [ ] Extension installation/management
- [ ] Theme extensions
- [ ] Language extensions
- [ ] Snippet extensions

### 5.3 Snippets
- [ ] Built-in Tarqeem snippets
- [ ] User snippet creation
- [ ] Snippet variables and placeholders
- [ ] Tab stop navigation
- [ ] Snippet choice placeholders

### 5.4 Code Lens
- [ ] Reference count above functions
- [ ] Run/Debug buttons for main functions
- [ ] Test status indicators
- [ ] Custom code lens from LSP

### 5.5 Semantic Highlighting
- [ ] Enhanced token types from LSP
- [ ] Semantic token modifiers
- [ ] More precise coloring for variables, parameters, etc.

### 5.6 Collaboration (Future)
- [ ] Real-time collaboration protocol
- [ ] Cursor sharing
- [ ] Selection sharing
- [ ] Chat integration
- [ ] Live Share-like functionality

### 5.7 AI Assistance (Future)
- [ ] Inline code suggestions
- [ ] Code explanation
- [ ] Documentation generation
- [ ] Arabic natural language to code

**Deliverable**: Git integration, extension system, advanced features

---

## Phase 6: Polish & Release

**Goal**: Production-ready, accessible, performant IDE

### 6.1 Performance Optimization
- [ ] Large file handling (virtual scrolling)
- [ ] Lazy loading of panels
- [ ] Efficient re-renders (React optimization)
- [ ] Memory profiling and optimization
- [ ] Startup time optimization
- [ ] Extension sandboxing

### 6.2 Accessibility
- [ ] Screen reader support (ARIA labels in Arabic)
- [ ] High contrast themes
- [ ] Keyboard-only navigation
- [ ] Font size scaling
- [ ] Reduced motion option
- [ ] RTL accessibility testing

### 6.3 Localization
- [ ] Full Arabic UI translation
- [ ] English UI option
- [ ] Date/time formatting
- [ ] Number formatting (Arabic-Indic option)

### 6.4 Documentation
- [ ] User guide (Arabic)
- [ ] Keyboard shortcuts reference
- [ ] Video tutorials
- [ ] Interactive tutorial (first-run)

### 6.5 Distribution
- [ ] macOS: DMG, App Store (future)
- [ ] Windows: NSIS installer, portable, Microsoft Store (future)
- [ ] Linux: AppImage, Snap, Flatpak, deb, rpm
- [ ] Auto-update system
- [ ] Crash reporting
- [ ] Telemetry (opt-in)

### 6.6 Testing
- [ ] Unit tests for components
- [ ] Integration tests for IPC
- [ ] E2E tests with Playwright
- [ ] Performance benchmarks
- [ ] Accessibility audits

**Deliverable**: Production-ready IDE with installers and documentation

---

## Architecture Evolution

### Current Architecture (MVP)
```
┌─────────────────────────────────────────────────┐
│                   Electron                       │
├─────────────────────────────────────────────────┤
│  Main Process     │     Renderer Process        │
│  ┌─────────────┐  │  ┌───────────────────────┐  │
│  │ File I/O    │  │  │      React App        │  │
│  │ Compiler    │◄─┼──┤  ┌─────────────────┐  │  │
│  │ Menu        │  │  │  │   CodeMirror    │  │  │
│  └─────────────┘  │  │  │   (RTL Editor)  │  │  │
│                   │  │  └─────────────────┘  │  │
│                   │  └───────────────────────┘  │
└─────────────────────────────────────────────────┘
```

### Target Architecture (Full IDE)
```
┌─────────────────────────────────────────────────────────────────┐
│                          Electron                                │
├─────────────────────────────────────────────────────────────────┤
│  Main Process              │        Renderer Process            │
│  ┌───────────────────────┐ │  ┌─────────────────────────────┐   │
│  │ File System Watcher   │ │  │         React App           │   │
│  │ Project Manager       │ │  │  ┌───────────────────────┐  │   │
│  │ Process Manager       │ │  │  │     Workbench         │  │   │
│  │ Extension Host        │◄┼──┤  │  ┌─────┬───────────┐  │  │   │
│  │ Update Manager        │ │  │  │  │Side │  Editor   │  │  │   │
│  └───────────────────────┘ │  │  │  │bar  │  Group    │  │  │   │
│           │                │  │  │  │     │           │  │  │   │
│           │                │  │  │  └─────┴───────────┘  │  │   │
│  ┌────────▼──────────────┐ │  │  │  ┌─────────────────┐  │  │   │
│  │    LSP Client         │ │  │  │  │  Panel Area     │  │  │   │
│  │    ┌──────────┐       │ │  │  │  │  (Terminal,     │  │  │   │
│  │    │ tarqeem- │       │◄┼──┼──┤  │   Output, etc.) │  │  │   │
│  │    │   lsp    │       │ │  │  │  └─────────────────┘  │  │   │
│  │    └──────────┘       │ │  │  └───────────────────────┘  │   │
│  └───────────────────────┘ │  └─────────────────────────────┘   │
│           │                │              │                      │
│  ┌────────▼──────────────┐ │  ┌───────────▼─────────────────┐   │
│  │    DAP Client         │ │  │     State Management        │   │
│  │    ┌──────────┐       │ │  │  (Zustand/Redux/Jotai)     │   │
│  │    │ tarqeem- │       │ │  └─────────────────────────────┘   │
│  │    │ debugger │       │ │                                     │
│  │    └──────────┘       │ │                                     │
│  └───────────────────────┘ │                                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Technical Decisions

### State Management
- **Recommendation**: Zustand or Jotai for React state
- Separate stores for: Editor, Files, Settings, UI, LSP

### Layout System
- **Recommendation**: Custom flexbox-based layout or `react-mosaic`
- Resizable panels, docking, persistence

### LSP Communication
- Use `vscode-jsonrpc` for protocol handling
- Spawn LSP as child process
- Handle stdio or socket communication

### File Watching
- Use `chokidar` for cross-platform file watching
- Debounce rapid changes
- Handle external file modifications

### Persistence
- Settings: JSON files in user config directory
- Window state: Electron store
- Workspace: `.qalam/` folder in project root

---

## Milestones & Timeline

| Milestone | Description | Duration |
|-----------|-------------|----------|
| **M1** | Multi-tab + Find/Replace + Settings | 2-3 weeks |
| **M2** | LSP Integration (Diagnostics + Autocomplete) | 3-4 weeks |
| **M3** | File Explorer + Project System | 2-3 weeks |
| **M4** | Terminal + Basic Debugging | 4-6 weeks |
| **M5** | Git Integration | 2-3 weeks |
| **M6** | Extension System | 3-4 weeks |
| **M7** | Polish + Release | 2-4 weeks |

**Total Estimated Time**: 4-6 months for full IDE

---

## Success Metrics

### Usability
- [ ] Can create, edit, and run a Tarqeem project from scratch
- [ ] Autocomplete works within 100ms
- [ ] Error highlighting appears within 500ms of typing
- [ ] No crashes during normal usage

### Performance
- [ ] Opens files up to 100KB instantly
- [ ] Startup time < 3 seconds
- [ ] Memory usage < 500MB for typical projects

### Adoption
- [ ] 100+ downloads in first month
- [ ] Positive community feedback
- [ ] Used in Tarqeem tutorials and documentation

---

## Dependencies on Tarqeem Project

| Qalam Feature | Requires from Tarqeem |
|---------------|----------------------|
| Diagnostics | `tarqeem check` or LSP server |
| Autocomplete | LSP server with completion |
| Go to Definition | LSP server with navigation |
| Debugging | Debug adapter (DAP server) |
| Formatting | `tarqeem fmt` or LSP |
| Documentation | Doc comments in stdlib |

**Note**: LSP server development should be prioritized alongside IDE development.

---

## Files Reference

| Category | Path |
|----------|------|
| Qalam Editor | `/Users/osamamuhammed/Tarqeem_Project/qalam-editor/` |
| Tarqeem Compiler | `/Users/osamamuhammed/Tarqeem_Project/tarqeem/` |
| Keywords | `tarqeem/src/lexer/keywords.rs` |
| Language Spec | `tarqeem/LANGUAGE_SPEC.md` |
| Examples | `tarqeem/examples/` |

---

## Next Steps (Immediate)

1. **Phase 1.1**: Implement multi-tab support
2. **Phase 1.2**: Add find/replace functionality
3. **Phase 1.5**: Create settings system
4. **Parallel**: Begin LSP server development in `tarqeem/` project

---

*Last Updated: December 2024*
*Version: 1.0*
