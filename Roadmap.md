<div dir="rtl" align="right">

# قلم - خارطة طريق بيئة التطوير المتكاملة

**بيئة التطوير الأصلية للغة ترقيم العربية**

</div>

# Qalam-IDE: Tarqeem Language-Native IDE Roadmap

> **Vision**: Build the definitive Tarqeem development environment - not a generic editor with Tarqeem support, but an IDE that understands Tarqeem at a fundamental level.

> **Goal**: A developer using Qalam-IDE should think: *"I could never develop Tarqeem this effectively in any other editor because this IDE understands my language at a fundamental level."*

---

## Current State

### Technology Stack
- **Framework**: Electron 28.1 + React 18.2 + TypeScript
- **Code Editor**: CodeMirror 6.x
- **State Management**: Zustand 4.5
- **Build**: Electron Vite + Rollup

### Completed Features (MVP + Phase 1-2 Partial)

| Feature | Status | Tarqeem Integration |
|---------|--------|---------------------|
| RTL Code Editing | ✅ Complete | Native Arabic text support |
| Multi-tab Editor | ✅ Complete | - |
| Find & Replace | ✅ Complete | RTL-aware search |
| Go to Line/Symbol | ✅ Complete | Arabic symbol names |
| Settings Panel | ✅ Complete | - |
| Themes (Dark/Light/High-Contrast) | ✅ Complete | - |
| LSP Client Integration | ✅ Complete | Connected to `tarqeem-lsp` |
| Diagnostics Panel | ✅ Complete | Bilingual error display |
| Autocomplete | ✅ Complete | Arabic keyword completion |
| Hover Information | ✅ Complete | Type info with Arabic names |
| Format on Save | ✅ Complete | Uses Tarqeem formatter |
| File Explorer | ✅ Complete | Recognizes `.ترقيم` files |
| Project System | ✅ Complete | Recognizes `.حزمة` manifest |

### In Progress

| Feature | Current State | Gap |
|---------|---------------|-----|
| Go to Definition | LSP capable | Need Ctrl+Click, F12, Peek |
| Find All References | LSP capable | Need Shift+F12, references panel |
| Symbol Rename | LSP capable | Need F2, preview dialog |
| Code Actions | LSP capable | Need light bulb, Ctrl+. |
| Signature Help | LSP capable | Need parameter hints popup |
| Semantic Highlighting | LSP capable | Not connected to CodeMirror |
| Debugger UI | ✅ Complete | Full debug panels, DAP integration |

---

## What Makes This IDE Unique

### Tarqeem-First Design Principles

1. **Arabic-Only Keywords** - The IDE understands Tarqeem's Arabic-only syntax
2. **RTL Code Editing** - Not an afterthought; core requirement
3. **Bilingual Errors** - Arabic primary, English secondary
4. **Compiler Visualization** - AST/IR viewers no other editor has
5. **Arabic Philosophy** - Understands `ميثاق` (covenant), `مشترك` (shared), etc.

### Compiler Infrastructure Leveraged

| Component | IDE Opportunity |
|-----------|-----------------|
| **Lexer** (60+ tokens) | Syntax highlighting, token stream view |
| **Parser** (AST nodes) | AST viewer, structure outline |
| **Semantic Analyzer** | Type hover, go-to-definition |
| **IR Builder** (SSA) | IR dump view, CFG visualization |
| **Type System** | Inlay hints, type errors |
| **Interpreter** | Interactive debugging |

### LSP Capabilities (Already Implemented in `tarqeem-lsp`)

```
- textDocumentSync: FULL
- hoverProvider: true
- completionProvider: true (triggers: . : " /)
- definitionProvider: true
- referencesProvider: true
- renameProvider: true (with prepare)
- documentSymbolProvider: true
- workspaceSymbolProvider: true
- documentFormattingProvider: true
- codeActionProvider: true
- foldingRangeProvider: true
- semanticTokensProvider: true (full)
- inlayHintProvider: true
- signatureHelpProvider: true (triggers: ( ، ,)
```

---

## Roadmap

### Phase 0: LSP UI Completion (Month 1)

**Goal**: Complete unfinished LSP features and establish Tarqeem-native patterns.

#### 0.1 Navigation Features
- [x] **Go to Definition** (Ctrl+Click, F12)
- [x] **Peek Definition** (Alt+F12) - Inline preview
- [x] **Find All References** (Shift+F12) - References panel with file grouping
- [x] **Symbol Rename** (F2) - Preview changes dialog, multi-file support

#### 0.2 Code Intelligence
- [x] **Code Actions** (Ctrl+.) - Light bulb indicator, quick fixes
- [x] **Semantic Highlighting** - Connect LSP semantic tokens to CodeMirror
- [x] **Signature Help** - Parameter hints on `(`, Arabic parameter names
- [x] **Inlay Hints** - Display inferred types (`عدد`, `نص`, `منطقي`)

**Deliverable**: Full LSP feature parity with modern IDEs.

---

### Phase 1: Debugging Experience (Month 2-3)

**Goal**: Professional debugging with Arabic variable inspection.

#### 1.1 Debug UI
- [x] Breakpoint gutter (click to toggle)
- [x] Conditional breakpoints (right-click menu)
- [x] Hit count breakpoints

#### 1.2 Debug Toolbar
- [x] Continue (F5)
- [x] Step Over (F10)
- [x] Step Into (F11)
- [x] Step Out (Shift+F11)
- [x] Restart, Stop

#### 1.3 Debug Panels
- [x] **Variables Panel** - Arabic variable names, type info, object expansion
- [x] **Watch Expressions** - Add/remove, evaluate in context
- [x] **Call Stack Panel** - Arabic function names, click to navigate
- [x] **Debug Console** - REPL in debug context

#### 1.4 DAP Integration
- [x] Spawn `tarqeem debug` subprocess
- [x] DAP JSON-RPC communication
- [x] Source mapping for breakpoints

**Deliverable**: VS Code-quality debugging for Tarqeem.

---

### Phase 2: Compiler Visualization (Month 1-2) ⭐ Core Differentiator

**Goal**: Expose Tarqeem compiler internals for learning and debugging.

**Why**: No other editor can show this; unique to Tarqeem.

#### 2.1 AST Viewer Panel
- [x] Tree view of parsed AST
- [x] Click node to highlight source
- [x] Arabic node type names (`تعريف_متغير`, `استدعاء_دالة`, etc.)

#### 2.2 Type Inspector
- [x] Show inferred types for all expressions
- [ ] Type compatibility information
- [ ] Generic instantiation visualization

#### 2.3 IR Viewer
- [ ] Three-address code view
- [ ] SSA form visualization
- [ ] Basic block / Control Flow Graph diagram

#### 2.4 Compilation Pipeline Status
- [ ] Stage indicator (lexer → parser → semantic → IR → codegen)
- [ ] Time spent per stage
- [ ] Errors/warnings per stage

**Deliverable**: Educational tool for understanding Tarqeem compilation.

---

### Phase 3: Arabic-Native Developer Experience (Month 3-4)

**Goal**: Features specifically designed for Arabic programming.

#### 3.1 RTL Code Intelligence
- [x] Smart cursor movement respecting Arabic text
- [x] Selection that understands mixed direction
- [x] Copy/paste preserving RTL

#### 3.2 Arabic Documentation Browser
- [x] Inline documentation in Arabic
- [x] Standard library browser with Arabic names
- [x] Method signatures with Arabic parameter names

#### 3.3 Arabic Error Experience
- [ ] Error panel shows Arabic Errors
- [ ] Error code lookup (e.g., `ن٠٣٠٨` for type mismatch)

#### 3.4 Arabic Snippets
- [x] `صنف` → class template (+ صنف_كامل، صنف_وحيد، صنف_معمم، صنف_بيانات)
- [x] `ميثاق` → interface template
- [x] `لكل` → for loop template (+ لكل_بفهرس، لكل_عكسي، حلقة_لانهائية)
- [x] `حاول` → try/catch template (+ حاول_نوع_خطأ، صنف_خطأ، تأكيد)
- [x] `دالة` → function template (+ دالة_عامة، دالة_خاصة، دالة_مشتركة)
- [x] Additional: 42+ new snippets across 10 categories

#### 3.5 Arabic Keyboard Shortcuts
- [x] Keyboard shortcut overlay in Arabic (Ctrl+Shift+/)
- [x] Customizable bindings with Arabic labels
- [x] Search/filter by Arabic text
- [x] Conflict detection for duplicate bindings
- [x] Persistent custom bindings (localStorage)

**Deliverable**: First-class Arabic programming experience.

---

### Phase 4: Project Management (Month 4-5)

**Goal**: Deep integration with Tarqeem project system.

#### 4.1 Package Manifest Editor
- [ ] Visual editor for `ترقيم.حزمة`
- [ ] Dependency autocomplete
- [ ] Version constraint validation

#### 4.2 Dependency Visualization
- [ ] Dependency tree graph
- [ ] Conflict identification
- [ ] Update outdated packages

#### 4.3 Build System Integration
- [ ] `tarqeem compile` integration
- [ ] `tarqeem run` one-click execution
- [ ] Build output panel
- [ ] Problem matcher for build errors

#### 4.4 REPL Integration
- [ ] Embedded REPL panel
- [ ] Execute selection in REPL
- [ ] REPL history with Arabic input

**Deliverable**: Complete Tarqeem project workflow.

---

### Phase 5: Performance & Profiling (Month 5)

**Goal**: Help developers optimize Tarqeem code.

#### 5.1 Performance Profiler
- [ ] CPU time per function
- [ ] Hot spot identification
- [ ] Call frequency visualization

#### 5.2 Memory Inspector
- [ ] Heap allocations view
- [ ] Reference count monitoring
- [ ] Memory timeline

#### 5.3 JIT Status Panel
- [ ] Show JIT-compiled functions
- [ ] Tier transitions (baseline → optimizing)
- [ ] Deoptimization reasons

**Deliverable**: Performance optimization toolkit.

---

### Phase 6: Polish & Distribution (Month 6+)

**Goal**: Production-ready release.

#### 6.1 Performance Optimization
- [ ] Large file handling (virtual scrolling)
- [ ] Lazy panel loading
- [ ] Memory optimization
- [ ] Startup time < 3 seconds

#### 6.2 Accessibility
- [ ] Screen reader support (Arabic ARIA labels)
- [ ] Keyboard-only navigation
- [ ] RTL accessibility testing

#### 6.3 Distribution
- [ ] **macOS**: DMG installer
- [ ] **Windows**: NSIS installer
- [ ] **Linux**: AppImage, Snap, Flatpak, deb, rpm
- [ ] Auto-update system

#### 6.4 Documentation
- [ ] User guide (Arabic primary)
- [ ] Video tutorials
- [ ] Interactive first-run tutorial

**Deliverable**: Production-ready IDE distribution.

---

## Implementation Timeline

| Month | Focus | Key Deliverables |
|-------|-------|------------------|
| **1** | LSP + Compiler Viz | Go-to-def, References, AST Viewer, Type Inspector |
| **2** | IR + Debug UI | IR Viewer, Debug Toolbar, Breakpoints |
| **3** | Debug + Arabic | Variables Panel, Call Stack, RTL Intelligence |
| **4** | Arabic + Project | Snippets, Manifest Editor, Dependencies |
| **5** | Build + Profile | REPL, Profiler, Memory Inspector |
| **6+** | Polish | Accessibility, Distribution, Documentation |

---

## Priority Matrix

| Phase | Tarqeem-First Value | Effort | Priority |
|-------|---------------------|--------|----------|
| 0 (LSP Completion) | HIGH | LOW | **P0** |
| 2 (Compiler Viz) | VERY HIGH | MEDIUM | **P0** |
| 1 (Debugging) | HIGH | MEDIUM | **P1** |
| 3 (Arabic DX) | VERY HIGH | MEDIUM | **P1** |
| 4 (Project Mgmt) | HIGH | LOW | **P2** |
| 5 (Profiling) | MEDIUM | HIGH | **P2** |
| 6 (Polish) | MEDIUM | MEDIUM | **P3** |

---

## Success Metrics

### Measurable Goals
1. **Autocomplete < 100ms** for Arabic keywords
2. **Error highlighting < 500ms** after typing
3. **AST/IR visualization** not available in any other editor
4. **Arabic-first documentation** integrated
5. **Debugging with Arabic variable names** fully functional
6. **Zero RTL text bugs** in code editing

### Performance Targets
- **Startup time**: < 3 seconds
- **Memory usage**: < 500MB for typical projects
- **File opening**: < 100ms for files up to 100KB

---

## What We're NOT Doing

These are explicitly **out of scope** to maintain Tarqeem-first focus:

1. ❌ Git integration (use external tools)
2. ❌ Extension marketplace (Tarqeem-only focus)
3. ❌ Multi-language support (Tarqeem is Arabic-only)
4. ❌ Theme customization priority (use built-in themes)
5. ❌ VS Code feature parity for its own sake
6. ❌ Collaboration features (defer to v2)

---

## Technical Architecture

### Current Architecture
```
┌─────────────────────────────────────────────────┐
│                   Electron                       │
├─────────────────────────────────────────────────┤
│  Main Process     │     Renderer Process        │
│  ┌─────────────┐  │  ┌───────────────────────┐  │
│  │ File I/O    │  │  │      React App        │  │
│  │ LSP Client  │◄─┼──┤  ┌─────────────────┐  │  │
│  │ DAP Client  │  │  │  │   CodeMirror    │  │  │
│  │ Menu        │  │  │  │   (RTL Editor)  │  │  │
│  └─────────────┘  │  │  └─────────────────┘  │  │
│        │          │  └───────────────────────┘  │
│        ▼          │                             │
│  ┌─────────────┐  │                             │
│  │ tarqeem-lsp │  │                             │
│  │ tarqeem-dap │  │                             │
│  └─────────────┘  │                             │
└─────────────────────────────────────────────────┘
```

### Target Architecture
```
┌───────────────────────────────────────────────────────────────┐
│                          Electron                              │
├───────────────────────────────────────────────────────────────┤
│  Main Process              │        Renderer Process          │
│  ┌───────────────────────┐ │  ┌─────────────────────────────┐ │
│  │ File System Watcher   │ │  │         React App           │ │
│  │ Process Manager       │ │  │  ┌───────────────────────┐  │ │
│  │ LSP Client            │◄┼──┤  │     Workbench         │  │ │
│  │ DAP Client            │ │  │  │  ┌─────┬───────────┐  │  │ │
│  └───────────────────────┘ │  │  │  │Side │  Editor   │  │  │ │
│           │                │  │  │  │bar  │  Group    │  │  │ │
│           ▼                │  │  │  │     │           │  │  │ │
│  ┌───────────────────────┐ │  │  │  └─────┴───────────┘  │  │ │
│  │    tarqeem-lsp        │ │  │  │  ┌─────────────────┐  │  │ │
│  │    tarqeem debug      │ │  │  │  │  Panel Area     │  │  │ │
│  │    tarqeem compile    │ │  │  │  │  (AST, IR,      │  │  │ │
│  │    tarqeem run        │ │  │  │  │   Debug, REPL)  │  │  │ │
│  └───────────────────────┘ │  │  │  └─────────────────┘  │  │ │
│                            │  │  └───────────────────────┘  │ │
│                            │  └─────────────────────────────┘ │
└───────────────────────────────────────────────────────────────┘
```

---

## File References

### Qalam-IDE
- `src/main/index.ts` - Electron main process
- `src/renderer/App.tsx` - React app root
- `src/renderer/hooks/useLspClient.ts` - LSP client
- `src/renderer/components/Editor.tsx` - CodeMirror editor
- `src/renderer/store/` - Zustand stores

### Tarqeem Compiler
- `tarqeem/src/lsp/` - LSP server (14 handlers)
- `tarqeem/src/debug/` - DAP server
- `tarqeem/src/package/` - Package manager
- `tarqeem/src/fmt/` - Code formatter

---

<div dir="rtl" align="right">

## ملخص باللغة العربية

### الرؤية
بناء بيئة التطوير الأصلية للغة ترقيم - ليس محرراً عاماً مع دعم ترقيم، بل بيئة تفهم اللغة على مستوى أساسي.

### المراحل
1. **المرحلة ٠**: إكمال ميزات LSP (الشهر ١)
2. **المرحلة ١**: تجربة التصحيح (الشهر ٢-٣)
3. **المرحلة ٢**: تصور المترجم (الشهر ١-٢) ⭐
4. **المرحلة ٣**: تجربة المطور العربي (الشهر ٣-٤)
5. **المرحلة ٤**: إدارة المشاريع (الشهر ٤-٥)
6. **المرحلة ٥**: الأداء والتحليل (الشهر ٥)
7. **المرحلة ٦**: التلميع والتوزيع (الشهر ٦+)

### الميزة الفريدة
**تصور المترجم** - عارض AST، مفتش الأنواع، عارض IR - ميزات لا يملكها أي محرر آخر.

</div>

---

*Last Updated: December 2024*
*Version: 2.0 (Tarqeem-First Rewrite)*
