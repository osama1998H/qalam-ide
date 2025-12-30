import { contextBridge, ipcRenderer } from 'electron'

// Types for the exposed API
export interface FileData {
  path: string
  content: string
}

export interface FileError {
  error: string
}

export interface SaveResult {
  success?: boolean
  path?: string
  error?: string
}

export interface CompilerResult {
  success: boolean
  output: string
  errors: string
  exitCode: number
}

export interface CompilationTiming {
  lexer: number
  parser: number
  semantic: number
  ir: number
  optimize: number
  codegen: number
  total: number
}

export interface CompileWithTimingResult {
  success: boolean
  timing: CompilationTiming | null
  output: string
  errors: string
  exitCode: number
}

// Build System Types (Phase 4.3)
export interface BuildConfiguration {
  mode: 'debug' | 'release'
  optimizationLevel: 'O0' | 'O1' | 'O2' | 'O3'
  outputTarget: 'native' | 'llvm-ir' | 'assembly' | 'object' | 'wasm'
  targetTriple?: string
  wasmJsBindings?: boolean
  timing?: boolean
}

export interface BuildResult {
  success: boolean
  output: string
  errors: string
  exitCode: number
  timing?: CompilationTiming
}

export type ArtifactType = 'executable' | 'object' | 'llvm-ir' | 'assembly' | 'wasm' | 'js-bindings' | 'unknown'

export interface BuildArtifact {
  name: string
  path: string
  type: ArtifactType
  size: number
  modifiedTime: number
}

export interface TestFileResult {
  filePath: string
  name: string
  passed: boolean
  duration: number
  error?: string
}

export interface TestResult {
  success: boolean
  passed: number
  failed: number
  total: number
  duration: number
  results: TestFileResult[]
  output?: string
  errors?: string
  error?: string
}

export interface ScriptRunResult {
  success: boolean
  output: string
  errors: string
  exitCode: number
  duration: number
}

// Search Types
export interface SearchMatch {
  lineNumber: number
  lineContent: string
  columnStart: number
  columnEnd: number
}

export interface SearchFileResult {
  filePath: string
  fileName: string
  matches: SearchMatch[]
}

export interface SearchOptions {
  caseSensitive: boolean
  wholeWord: boolean
  useRegex: boolean
  includePattern: string
  excludePattern: string
}

export interface SearchResult {
  success: boolean
  results?: SearchFileResult[]
  error?: string
}

export interface ReplaceResult {
  success: boolean
  modifiedFiles?: string[]
  replacedCount?: number
  error?: string
}

// LSP Types
export interface LSPStartResult {
  success: boolean
  capabilities?: unknown
  error?: string
}

export interface LSPRequestResult {
  success: boolean
  result?: unknown
  error?: string
}

export interface LSPDiagnostic {
  range: {
    start: { line: number; character: number }
    end: { line: number; character: number }
  }
  message: string
  severity?: number
  source?: string
}

export interface LSPDiagnosticsParams {
  uri: string
  diagnostics: LSPDiagnostic[]
}

// DAP Types
export interface DAPStartResult {
  success: boolean
  capabilities?: {
    supportsConditionalBreakpoints?: boolean
    supportsHitConditionalBreakpoints?: boolean
    supportsLogPoints?: boolean
    supportsRestartRequest?: boolean
  }
  error?: string
}

export interface DAPBreakpoint {
  id?: number
  verified: boolean
  line?: number
  message?: string
}

export interface DAPSetBreakpointsResult {
  success: boolean
  breakpoints?: DAPBreakpoint[]
  error?: string
}

export interface DAPStackFrame {
  id: number
  name: string
  source?: { path?: string }
  line: number
  column: number
}

export interface DAPStackTraceResult {
  success: boolean
  stackFrames?: DAPStackFrame[]
  error?: string
}

export interface DAPScope {
  name: string
  variablesReference: number
  expensive: boolean
}

export interface DAPVariable {
  name: string
  value: string
  type?: string
  variablesReference: number
}

export interface DAPStoppedEvent {
  reason: 'breakpoint' | 'step' | 'pause' | 'entry' | 'exception'
  threadId?: number
  allThreadsStopped?: boolean
  hitBreakpointIds?: number[]
}

export interface DAPOutputEvent {
  category: 'console' | 'stdout' | 'stderr' | 'telemetry'
  output: string
  line?: number
  column?: number
}

// Interactive Mode (الوضع التفاعلي) Types
export interface InteractiveModeResult {
  success: boolean
  output: string
  returnValue?: string
  error?: string
}

// Expose protected methods to the renderer
contextBridge.exposeInMainWorld('qalam', {
  // File operations
  file: {
    open: (): Promise<FileData | FileError | null> =>
      ipcRenderer.invoke('file:open'),

    read: (path: string): Promise<{ content: string } | null> =>
      ipcRenderer.invoke('file:read', path),

    save: (path: string, content: string): Promise<SaveResult> =>
      ipcRenderer.invoke('file:save', { path, content }),

    saveAs: (content: string): Promise<SaveResult | null> =>
      ipcRenderer.invoke('file:save-as', content)
  },

  // Folder operations
  folder: {
    open: (): Promise<{ path: string; name: string } | null> =>
      ipcRenderer.invoke('folder:open'),

    read: (path: string): Promise<Array<{ name: string; path: string; type: 'file' | 'directory' }>> =>
      ipcRenderer.invoke('folder:read', path),

    createFile: (path: string, content?: string): Promise<{ success?: boolean; error?: string }> =>
      ipcRenderer.invoke('folder:createFile', path, content),

    createFolder: (path: string): Promise<{ success?: boolean; error?: string }> =>
      ipcRenderer.invoke('folder:createFolder', path),

    rename: (oldPath: string, newPath: string): Promise<{ success?: boolean; error?: string }> =>
      ipcRenderer.invoke('folder:rename', oldPath, newPath),

    delete: (path: string): Promise<{ success?: boolean; error?: string }> =>
      ipcRenderer.invoke('folder:delete', path),

    reveal: (path: string): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('folder:reveal', path),

    duplicate: (path: string): Promise<{ success?: boolean; newPath?: string; error?: string }> =>
      ipcRenderer.invoke('folder:duplicate', path),

    moveWithRefactor: (oldPath: string, newPath: string, projectRoot: string): Promise<{
      success?: boolean
      updatedFiles?: string[]
      errors?: string[]
      error?: string
    }> => ipcRenderer.invoke('folder:moveWithRefactor', oldPath, newPath, projectRoot)
  },

  // Search operations
  search: {
    inFiles: (
      rootPath: string,
      query: string,
      options: SearchOptions
    ): Promise<SearchResult> =>
      ipcRenderer.invoke('search:inFiles', { rootPath, query, options }),

    replaceInFiles: (
      rootPath: string,
      query: string,
      replacement: string,
      options: SearchOptions,
      filePaths?: string[]
    ): Promise<ReplaceResult> =>
      ipcRenderer.invoke('search:replaceInFiles', { rootPath, query, replacement, options, filePaths })
  },

  // Project operations
  project: {
    exists: (folderPath: string): Promise<{ exists: boolean }> =>
      ipcRenderer.invoke('project:exists', folderPath),

    read: (folderPath: string): Promise<{ success: boolean; manifest?: unknown; error?: string }> =>
      ipcRenderer.invoke('project:read', folderPath),

    write: (folderPath: string, manifest: unknown): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('project:write', folderPath, manifest),

    init: (folderPath: string, projectName: string): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('project:init', folderPath, projectName)
  },

  // Compiler operations
  compiler: {
    compile: (filePath: string): Promise<CompilerResult> =>
      ipcRenderer.invoke('compiler:compile', filePath),

    run: (filePath: string): Promise<CompilerResult> =>
      ipcRenderer.invoke('compiler:run', filePath),

    parseAst: (filePath: string): Promise<{ success: boolean; ast: unknown; error: string | null }> =>
      ipcRenderer.invoke('compiler:parseAst', filePath),

    generateIR: (filePath: string): Promise<{ success: boolean; ir: string | null; error: string | null }> =>
      ipcRenderer.invoke('compiler:generateIR', filePath),

    compileWithTiming: (filePath: string): Promise<CompileWithTimingResult> =>
      ipcRenderer.invoke('compiler:compileWithTiming', filePath),

    onStdout: (callback: (output: string) => void): void => {
      ipcRenderer.on('compiler:stdout', (_, output) => callback(output))
    },

    onStderr: (callback: (error: string) => void): void => {
      ipcRenderer.on('compiler:stderr', (_, error) => callback(error))
    },

    removeListeners: (): void => {
      ipcRenderer.removeAllListeners('compiler:stdout')
      ipcRenderer.removeAllListeners('compiler:stderr')
    }
  },

  // Build System operations (Phase 4.3)
  build: {
    compile: (filePath: string, config: BuildConfiguration): Promise<BuildResult> =>
      ipcRenderer.invoke('build:compile', filePath, config),

    project: (projectPath: string, release: boolean): Promise<BuildResult> =>
      ipcRenderer.invoke('build:project', projectPath, release),

    runScript: (projectPath: string, command: string): Promise<ScriptRunResult> =>
      ipcRenderer.invoke('build:runScript', projectPath, command),

    test: (projectPath: string, filter?: string): Promise<TestResult> =>
      ipcRenderer.invoke('build:test', projectPath, filter),

    clean: (projectPath: string): Promise<{ success: boolean; output?: string; error?: string }> =>
      ipcRenderer.invoke('build:clean', projectPath),

    listArtifacts: (projectPath: string): Promise<{ success: boolean; artifacts: BuildArtifact[]; error?: string }> =>
      ipcRenderer.invoke('build:listArtifacts', projectPath),

    onStdout: (callback: (output: string) => void): (() => void) => {
      const handler = (_: unknown, output: string) => callback(output)
      ipcRenderer.on('build:stdout', handler)
      return () => ipcRenderer.removeListener('build:stdout', handler)
    },

    onStderr: (callback: (error: string) => void): (() => void) => {
      const handler = (_: unknown, error: string) => callback(error)
      ipcRenderer.on('build:stderr', handler)
      return () => ipcRenderer.removeListener('build:stderr', handler)
    },

    removeListeners: (): void => {
      ipcRenderer.removeAllListeners('build:stdout')
      ipcRenderer.removeAllListeners('build:stderr')
    }
  },

  // Menu event listeners
  menu: {
    onOpen: (callback: () => void): (() => void) => {
      ipcRenderer.on('menu:open', callback)
      return () => ipcRenderer.removeListener('menu:open', callback)
    },
    onSave: (callback: () => void): (() => void) => {
      ipcRenderer.on('menu:save', callback)
      return () => ipcRenderer.removeListener('menu:save', callback)
    },
    onSaveAs: (callback: () => void): (() => void) => {
      ipcRenderer.on('menu:save-as', callback)
      return () => ipcRenderer.removeListener('menu:save-as', callback)
    },
    onCompile: (callback: () => void): (() => void) => {
      ipcRenderer.on('menu:compile', callback)
      return () => ipcRenderer.removeListener('menu:compile', callback)
    },
    onRun: (callback: () => void): (() => void) => {
      ipcRenderer.on('menu:run', callback)
      return () => ipcRenderer.removeListener('menu:run', callback)
    },
    onFormatDocument: (callback: () => void): (() => void) => {
      ipcRenderer.on('menu:format-document', callback)
      return () => ipcRenderer.removeListener('menu:format-document', callback)
    },
    onFormatSelection: (callback: () => void): (() => void) => {
      ipcRenderer.on('menu:format-selection', callback)
      return () => ipcRenderer.removeListener('menu:format-selection', callback)
    },
    onToggleAstViewer: (callback: () => void): (() => void) => {
      ipcRenderer.on('menu:toggleAstViewer', callback)
      return () => ipcRenderer.removeListener('menu:toggleAstViewer', callback)
    },
    onToggleTypeInspector: (callback: () => void): (() => void) => {
      ipcRenderer.on('menu:toggleTypeInspector', callback)
      return () => ipcRenderer.removeListener('menu:toggleTypeInspector', callback)
    },
    onToggleIRViewer: (callback: () => void): (() => void) => {
      ipcRenderer.on('menu:toggleIRViewer', callback)
      return () => ipcRenderer.removeListener('menu:toggleIRViewer', callback)
    },
    onTogglePipelineStatus: (callback: () => void): (() => void) => {
      ipcRenderer.on('menu:togglePipelineStatus', callback)
      return () => ipcRenderer.removeListener('menu:togglePipelineStatus', callback)
    },
    // Build system menu items (Phase 4.3)
    onBuildProject: (callback: () => void): (() => void) => {
      ipcRenderer.on('menu:build-project', callback)
      return () => ipcRenderer.removeListener('menu:build-project', callback)
    },
    onBuildProjectRelease: (callback: () => void): (() => void) => {
      ipcRenderer.on('menu:build-project-release', callback)
      return () => ipcRenderer.removeListener('menu:build-project-release', callback)
    },
    onRunTests: (callback: () => void): (() => void) => {
      ipcRenderer.on('menu:run-tests', callback)
      return () => ipcRenderer.removeListener('menu:run-tests', callback)
    },
    onBuildConfig: (callback: () => void): (() => void) => {
      ipcRenderer.on('menu:build-config', callback)
      return () => ipcRenderer.removeListener('menu:build-config', callback)
    },
    onCleanBuild: (callback: () => void): (() => void) => {
      ipcRenderer.on('menu:clean-build', callback)
      return () => ipcRenderer.removeListener('menu:clean-build', callback)
    }
  },

  // LSP (Language Server Protocol) operations
  lsp: {
    start: (workspacePath: string): Promise<LSPStartResult> =>
      ipcRenderer.invoke('lsp:start', workspacePath),

    stop: (): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('lsp:stop'),

    request: (method: string, params: unknown): Promise<LSPRequestResult> =>
      ipcRenderer.invoke('lsp:request', method, params),

    notify: (method: string, params: unknown): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('lsp:notify', method, params),

    isRunning: (): Promise<{ running: boolean }> =>
      ipcRenderer.invoke('lsp:isRunning'),

    // Server → Client notification listeners
    onDiagnostics: (callback: (params: LSPDiagnosticsParams) => void): (() => void) => {
      const handler = (_: unknown, params: LSPDiagnosticsParams) => callback(params)
      ipcRenderer.on('lsp:diagnostics', handler)
      return () => ipcRenderer.removeListener('lsp:diagnostics', handler)
    },

    onLog: (callback: (params: { type: string; message: string }) => void): (() => void) => {
      const handler = (_: unknown, params: { type: string; message: string }) => callback(params)
      ipcRenderer.on('lsp:log', handler)
      return () => ipcRenderer.removeListener('lsp:log', handler)
    },

    onError: (callback: (params: { message: string }) => void): (() => void) => {
      const handler = (_: unknown, params: { message: string }) => callback(params)
      ipcRenderer.on('lsp:error', handler)
      return () => ipcRenderer.removeListener('lsp:error', handler)
    },

    onClose: (callback: (params: { code: number }) => void): (() => void) => {
      const handler = (_: unknown, params: { code: number }) => callback(params)
      ipcRenderer.on('lsp:close', handler)
      return () => ipcRenderer.removeListener('lsp:close', handler)
    },

    removeListeners: (): void => {
      ipcRenderer.removeAllListeners('lsp:diagnostics')
      ipcRenderer.removeAllListeners('lsp:log')
      ipcRenderer.removeAllListeners('lsp:error')
      ipcRenderer.removeAllListeners('lsp:close')
    }
  },

  // Workspace operations
  workspace: {
    open: (): Promise<{ path: string } | null> =>
      ipcRenderer.invoke('workspace:open'),

    openFile: (path: string): Promise<{ content: string; error?: string } | null> =>
      ipcRenderer.invoke('workspace:openFile', path),

    save: (path: string, content: string): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('workspace:save', path, content),

    saveAs: (content: string): Promise<{ path: string; error?: string } | null> =>
      ipcRenderer.invoke('workspace:saveAs', content),

    readFolderSettings: (folderPath: string): Promise<{ settings: Record<string, unknown> } | null> =>
      ipcRenderer.invoke('workspace:readFolderSettings', folderPath),

    writeFolderSettings: (folderPath: string, settings: Record<string, unknown>): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('workspace:writeFolderSettings', folderPath, settings),

    addFolder: (): Promise<{ path: string; name: string } | null> =>
      ipcRenderer.invoke('workspace:addFolder')
  },

  // DAP (Debug Adapter Protocol) operations
  dap: {
    start: (filePath: string): Promise<DAPStartResult> =>
      ipcRenderer.invoke('dap:start', filePath),

    stop: (): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('dap:stop'),

    launch: (): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('dap:launch'),

    setBreakpoints: (filePath: string, breakpoints: Array<{ line: number; condition?: string; hitCondition?: string; logMessage?: string }>): Promise<DAPSetBreakpointsResult> =>
      ipcRenderer.invoke('dap:setBreakpoints', filePath, breakpoints),

    continue: (threadId?: number): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('dap:continue', threadId),

    stepOver: (threadId?: number): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('dap:stepOver', threadId),

    stepInto: (threadId?: number): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('dap:stepInto', threadId),

    stepOut: (threadId?: number): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('dap:stepOut', threadId),

    pause: (threadId?: number): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('dap:pause', threadId),

    restart: (): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('dap:restart'),

    stackTrace: (threadId?: number): Promise<DAPStackTraceResult> =>
      ipcRenderer.invoke('dap:stackTrace', threadId),

    scopes: (frameId: number): Promise<{ success: boolean; scopes?: DAPScope[]; error?: string }> =>
      ipcRenderer.invoke('dap:scopes', frameId),

    variables: (variablesReference: number): Promise<{ success: boolean; variables?: DAPVariable[]; error?: string }> =>
      ipcRenderer.invoke('dap:variables', variablesReference),

    evaluate: (expression: string, frameId?: number): Promise<{ success: boolean; result?: { result: string; type?: string; variablesReference: number }; error?: string }> =>
      ipcRenderer.invoke('dap:evaluate', expression, frameId),

    isRunning: (): Promise<{ running: boolean }> =>
      ipcRenderer.invoke('dap:isRunning'),

    // DAP event listeners
    onStopped: (callback: (event: DAPStoppedEvent) => void): (() => void) => {
      const handler = (_: unknown, event: DAPStoppedEvent) => callback(event)
      ipcRenderer.on('dap:stopped', handler)
      return () => ipcRenderer.removeListener('dap:stopped', handler)
    },

    onContinued: (callback: (event: { threadId: number; allThreadsContinued?: boolean }) => void): (() => void) => {
      const handler = (_: unknown, event: { threadId: number; allThreadsContinued?: boolean }) => callback(event)
      ipcRenderer.on('dap:continued', handler)
      return () => ipcRenderer.removeListener('dap:continued', handler)
    },

    onTerminated: (callback: (event?: { restart?: boolean }) => void): (() => void) => {
      const handler = (_: unknown, event?: { restart?: boolean }) => callback(event)
      ipcRenderer.on('dap:terminated', handler)
      return () => ipcRenderer.removeListener('dap:terminated', handler)
    },

    onExited: (callback: (event: { exitCode: number }) => void): (() => void) => {
      const handler = (_: unknown, event: { exitCode: number }) => callback(event)
      ipcRenderer.on('dap:exited', handler)
      return () => ipcRenderer.removeListener('dap:exited', handler)
    },

    onOutput: (callback: (event: DAPOutputEvent) => void): (() => void) => {
      const handler = (_: unknown, event: DAPOutputEvent) => callback(event)
      ipcRenderer.on('dap:output', handler)
      return () => ipcRenderer.removeListener('dap:output', handler)
    },

    onBreakpoint: (callback: (event: { reason: string; breakpoint: DAPBreakpoint }) => void): (() => void) => {
      const handler = (_: unknown, event: { reason: string; breakpoint: DAPBreakpoint }) => callback(event)
      ipcRenderer.on('dap:breakpoint', handler)
      return () => ipcRenderer.removeListener('dap:breakpoint', handler)
    },

    onError: (callback: (event: { message: string }) => void): (() => void) => {
      const handler = (_: unknown, event: { message: string }) => callback(event)
      ipcRenderer.on('dap:error', handler)
      return () => ipcRenderer.removeListener('dap:error', handler)
    },

    onClose: (callback: (event: { code: number }) => void): (() => void) => {
      const handler = (_: unknown, event: { code: number }) => callback(event)
      ipcRenderer.on('dap:close', handler)
      return () => ipcRenderer.removeListener('dap:close', handler)
    },

    removeListeners: (): void => {
      ipcRenderer.removeAllListeners('dap:stopped')
      ipcRenderer.removeAllListeners('dap:continued')
      ipcRenderer.removeAllListeners('dap:terminated')
      ipcRenderer.removeAllListeners('dap:exited')
      ipcRenderer.removeAllListeners('dap:output')
      ipcRenderer.removeAllListeners('dap:breakpoint')
      ipcRenderer.removeAllListeners('dap:error')
      ipcRenderer.removeAllListeners('dap:close')
    }
  },

  // Interactive Mode (الوضع التفاعلي) operations
  interactive: {
    start: (): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('interactive:start'),

    stop: (): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('interactive:stop'),

    evaluate: (code: string): Promise<InteractiveModeResult> =>
      ipcRenderer.invoke('interactive:evaluate', code),

    isRunning: (): Promise<{ running: boolean }> =>
      ipcRenderer.invoke('interactive:isRunning'),

    // Event listeners
    onOutput: (callback: (text: string) => void): (() => void) => {
      const handler = (_: unknown, text: string) => callback(text)
      ipcRenderer.on('interactive:output', handler)
      return () => ipcRenderer.removeListener('interactive:output', handler)
    },

    onStderr: (callback: (text: string) => void): (() => void) => {
      const handler = (_: unknown, text: string) => callback(text)
      ipcRenderer.on('interactive:stderr', handler)
      return () => ipcRenderer.removeListener('interactive:stderr', handler)
    },

    onError: (callback: (event: { message: string }) => void): (() => void) => {
      const handler = (_: unknown, event: { message: string }) => callback(event)
      ipcRenderer.on('interactive:error', handler)
      return () => ipcRenderer.removeListener('interactive:error', handler)
    },

    onClose: (callback: (event: { code: number }) => void): (() => void) => {
      const handler = (_: unknown, event: { code: number }) => callback(event)
      ipcRenderer.on('interactive:close', handler)
      return () => ipcRenderer.removeListener('interactive:close', handler)
    },

    removeListeners: (): void => {
      ipcRenderer.removeAllListeners('interactive:output')
      ipcRenderer.removeAllListeners('interactive:stderr')
      ipcRenderer.removeAllListeners('interactive:error')
      ipcRenderer.removeAllListeners('interactive:close')
    }
  }
})

// TypeScript declaration for window.qalam
declare global {
  interface Window {
    qalam: {
      file: {
        open: () => Promise<FileData | FileError | null>
        read: (path: string) => Promise<{ content: string } | null>
        save: (path: string, content: string) => Promise<SaveResult>
        saveAs: (content: string) => Promise<SaveResult | null>
      }
      folder: {
        open: () => Promise<{ path: string; name: string } | null>
        read: (path: string) => Promise<Array<{ name: string; path: string; type: 'file' | 'directory' }>>
        createFile: (path: string, content?: string) => Promise<{ success?: boolean; error?: string }>
        createFolder: (path: string) => Promise<{ success?: boolean; error?: string }>
        rename: (oldPath: string, newPath: string) => Promise<{ success?: boolean; error?: string }>
        delete: (path: string) => Promise<{ success?: boolean; error?: string }>
        reveal: (path: string) => Promise<{ success: boolean }>
        duplicate: (path: string) => Promise<{ success?: boolean; newPath?: string; error?: string }>
        moveWithRefactor: (oldPath: string, newPath: string, projectRoot: string) => Promise<{
          success?: boolean
          updatedFiles?: string[]
          errors?: string[]
          error?: string
        }>
      }
      search: {
        inFiles: (rootPath: string, query: string, options: SearchOptions) => Promise<SearchResult>
        replaceInFiles: (
          rootPath: string,
          query: string,
          replacement: string,
          options: SearchOptions,
          filePaths?: string[]
        ) => Promise<ReplaceResult>
      }
      project: {
        exists: (folderPath: string) => Promise<{ exists: boolean }>
        read: (folderPath: string) => Promise<{ success: boolean; manifest?: unknown; error?: string }>
        write: (folderPath: string, manifest: unknown) => Promise<{ success: boolean; error?: string }>
        init: (folderPath: string, projectName: string) => Promise<{ success: boolean; error?: string }>
      }
      compiler: {
        compile: (filePath: string) => Promise<CompilerResult>
        run: (filePath: string) => Promise<CompilerResult>
        parseAst: (filePath: string) => Promise<{ success: boolean; ast: unknown; error: string | null }>
        generateIR: (filePath: string) => Promise<{ success: boolean; ir: string | null; error: string | null }>
        compileWithTiming: (filePath: string) => Promise<CompileWithTimingResult>
        onStdout: (callback: (output: string) => void) => void
        onStderr: (callback: (error: string) => void) => void
        removeListeners: () => void
      }
      build: {
        compile: (filePath: string, config: BuildConfiguration) => Promise<BuildResult>
        project: (projectPath: string, release: boolean) => Promise<BuildResult>
        runScript: (projectPath: string, command: string) => Promise<ScriptRunResult>
        test: (projectPath: string, filter?: string) => Promise<TestResult>
        clean: (projectPath: string) => Promise<{ success: boolean; output?: string; error?: string }>
        listArtifacts: (projectPath: string) => Promise<{ success: boolean; artifacts: BuildArtifact[]; error?: string }>
        onStdout: (callback: (output: string) => void) => () => void
        onStderr: (callback: (error: string) => void) => () => void
        removeListeners: () => void
      }
      menu: {
        onOpen: (callback: () => void) => () => void
        onSave: (callback: () => void) => () => void
        onSaveAs: (callback: () => void) => () => void
        onCompile: (callback: () => void) => () => void
        onRun: (callback: () => void) => () => void
        onFormatDocument: (callback: () => void) => () => void
        onFormatSelection: (callback: () => void) => () => void
        onToggleAstViewer: (callback: () => void) => () => void
        onToggleTypeInspector: (callback: () => void) => () => void
        onToggleIRViewer: (callback: () => void) => () => void
        onTogglePipelineStatus: (callback: () => void) => () => void
        onBuildProject: (callback: () => void) => () => void
        onBuildProjectRelease: (callback: () => void) => () => void
        onRunTests: (callback: () => void) => () => void
        onBuildConfig: (callback: () => void) => () => void
        onCleanBuild: (callback: () => void) => () => void
      }
      lsp: {
        start: (workspacePath: string) => Promise<LSPStartResult>
        stop: () => Promise<{ success: boolean; error?: string }>
        request: (method: string, params: unknown) => Promise<LSPRequestResult>
        notify: (method: string, params: unknown) => Promise<{ success: boolean; error?: string }>
        isRunning: () => Promise<{ running: boolean }>
        onDiagnostics: (callback: (params: LSPDiagnosticsParams) => void) => () => void
        onLog: (callback: (params: { type: string; message: string }) => void) => () => void
        onError: (callback: (params: { message: string }) => void) => () => void
        onClose: (callback: (params: { code: number }) => void) => () => void
        removeListeners: () => void
      }
      workspace: {
        open: () => Promise<{ path: string } | null>
        openFile: (path: string) => Promise<{ content: string; error?: string } | null>
        save: (path: string, content: string) => Promise<{ success: boolean; error?: string }>
        saveAs: (content: string) => Promise<{ path: string; error?: string } | null>
        readFolderSettings: (folderPath: string) => Promise<{ settings: Record<string, unknown> } | null>
        writeFolderSettings: (folderPath: string, settings: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>
        addFolder: () => Promise<{ path: string; name: string } | null>
      }
      dap: {
        start: (filePath: string) => Promise<DAPStartResult>
        stop: () => Promise<{ success: boolean; error?: string }>
        launch: () => Promise<{ success: boolean; error?: string }>
        setBreakpoints: (filePath: string, breakpoints: Array<{ line: number; condition?: string; hitCondition?: string; logMessage?: string }>) => Promise<DAPSetBreakpointsResult>
        continue: (threadId?: number) => Promise<{ success: boolean; error?: string }>
        stepOver: (threadId?: number) => Promise<{ success: boolean; error?: string }>
        stepInto: (threadId?: number) => Promise<{ success: boolean; error?: string }>
        stepOut: (threadId?: number) => Promise<{ success: boolean; error?: string }>
        pause: (threadId?: number) => Promise<{ success: boolean; error?: string }>
        restart: () => Promise<{ success: boolean; error?: string }>
        stackTrace: (threadId?: number) => Promise<DAPStackTraceResult>
        scopes: (frameId: number) => Promise<{ success: boolean; scopes?: DAPScope[]; error?: string }>
        variables: (variablesReference: number) => Promise<{ success: boolean; variables?: DAPVariable[]; error?: string }>
        evaluate: (expression: string, frameId?: number) => Promise<{ success: boolean; result?: { result: string; type?: string; variablesReference: number }; error?: string }>
        isRunning: () => Promise<{ running: boolean }>
        onStopped: (callback: (event: DAPStoppedEvent) => void) => () => void
        onContinued: (callback: (event: { threadId: number; allThreadsContinued?: boolean }) => void) => () => void
        onTerminated: (callback: (event?: { restart?: boolean }) => void) => () => void
        onExited: (callback: (event: { exitCode: number }) => void) => () => void
        onOutput: (callback: (event: DAPOutputEvent) => void) => () => void
        onBreakpoint: (callback: (event: { reason: string; breakpoint: DAPBreakpoint }) => void) => () => void
        onError: (callback: (event: { message: string }) => void) => () => void
        onClose: (callback: (event: { code: number }) => void) => () => void
        removeListeners: () => void
      }
      interactive: {
        start: () => Promise<{ success: boolean; error?: string }>
        stop: () => Promise<{ success: boolean; error?: string }>
        evaluate: (code: string) => Promise<InteractiveModeResult>
        isRunning: () => Promise<{ running: boolean }>
        onOutput: (callback: (text: string) => void) => () => void
        onStderr: (callback: (text: string) => void) => () => void
        onError: (callback: (event: { message: string }) => void) => () => void
        onClose: (callback: (event: { code: number }) => void) => () => void
        removeListeners: () => void
      }
    }
  }
}
