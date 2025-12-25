import { create } from 'zustand'

// LSP Position and Range types
export interface Position {
  line: number
  character: number
}

export interface Range {
  start: Position
  end: Position
}

// LSP Hover response types
export interface MarkupContent {
  kind: 'plaintext' | 'markdown'
  value: string
}

export interface MarkedString {
  language: string
  value: string
}

export interface LSPHover {
  contents: MarkupContent | string | MarkedString | (string | MarkedString | MarkupContent)[]
  range?: Range
}

// LSP Location types
export interface LSPLocation {
  uri: string
  range: Range
}

export interface LSPLocationLink {
  targetUri: string
  targetRange: Range
  targetSelectionRange?: Range
}

export type LSPDefinitionResult = LSPLocation | LSPLocation[] | LSPLocationLink[] | null

// LSP Completion types
export interface LSPCompletionItem {
  label: string
  kind?: number
  detail?: string
  documentation?: string | { kind: string; value: string }
  sortText?: string
  filterText?: string
  insertText?: string
  insertTextFormat?: number
  textEdit?: {
    range: Range
    newText: string
  }
}

export interface LSPCompletionList {
  isIncomplete: boolean
  items: LSPCompletionItem[]
}

export type LSPCompletionResult = LSPCompletionItem[] | LSPCompletionList | null

// LSP Diagnostic type
export interface Diagnostic {
  range: {
    start: { line: number; character: number }
    end: { line: number; character: number }
  }
  message: string
  severity?: number // 1=Error, 2=Warning, 3=Information, 4=Hint
  source?: string
}

// LSP TextEdit type for formatting
export interface TextEdit {
  range: {
    start: { line: number; character: number }
    end: { line: number; character: number }
  }
  newText: string
}

// Document version tracking
interface DocumentVersion {
  uri: string
  version: number
}

interface LSPState {
  // Connection state
  connected: boolean
  connecting: boolean
  capabilities: unknown | null
  error: string | null

  // Diagnostics per file (uri -> diagnostics[])
  diagnostics: Record<string, Diagnostic[]>

  // Document versions
  documentVersions: Record<string, number>

  // Actions
  connect: (workspacePath: string) => Promise<boolean>
  disconnect: () => Promise<void>

  // Document synchronization
  documentOpened: (filePath: string, content: string, languageId?: string) => void
  documentChanged: (filePath: string, content: string) => void
  documentClosed: (filePath: string) => void
  documentSaved: (filePath: string, content: string) => void

  // LSP requests
  requestCompletion: (filePath: string, line: number, character: number) => Promise<LSPCompletionResult>
  requestHover: (filePath: string, line: number, character: number) => Promise<LSPHover | null>
  requestDefinition: (filePath: string, line: number, character: number) => Promise<LSPDefinitionResult>
  requestFormatting: (filePath: string, tabSize: number, insertSpaces: boolean) => Promise<TextEdit[] | null>

  // Internal
  setDiagnostics: (uri: string, diagnostics: Diagnostic[]) => void
  setError: (error: string | null) => void
  reset: () => void
}

// Convert file path to URI (decoded form for consistent key matching)
function pathToUri(filePath: string): string {
  // Use decoded form - we normalize all URIs to decoded format
  return `file://${filePath}`
}

// Convert URI to file path (decode URL-encoded characters)
function uriToPath(uri: string): string {
  const decoded = decodeURI(uri.replace('file://', ''))
  return decoded
}

export const useLSPStore = create<LSPState>((set, get) => ({
  // Initial state
  connected: false,
  connecting: false,
  capabilities: null,
  error: null,
  diagnostics: {},
  documentVersions: {},

  // Connect to LSP server
  connect: async (workspacePath: string) => {
    if (get().connected || get().connecting) {
      return get().connected
    }

    set({ connecting: true, error: null })

    try {
      const result = await window.qalam.lsp.start(workspacePath)

      if (result.success) {
        set({
          connected: true,
          connecting: false,
          capabilities: result.capabilities
        })

        // Set up notification listeners
        window.qalam.lsp.onDiagnostics((params) => {
          get().setDiagnostics(params.uri, params.diagnostics)
        })

        window.qalam.lsp.onError((params) => {
          get().setError(params.message)
        })

        window.qalam.lsp.onClose(() => {
          get().reset()
        })

        return true
      } else {
        set({
          connecting: false,
          error: result.error || 'Failed to connect to LSP server'
        })
        return false
      }
    } catch (err) {
      set({
        connecting: false,
        error: (err as Error).message
      })
      return false
    }
  },

  // Disconnect from LSP server
  disconnect: async () => {
    if (!get().connected) return

    try {
      window.qalam.lsp.removeListeners()
      await window.qalam.lsp.stop()
    } catch (err) {
      console.error('[LSP] Error disconnecting:', err)
    }

    get().reset()
  },

  // Document opened
  documentOpened: (filePath: string, content: string, languageId = 'tarqeem') => {
    if (!get().connected) return

    const uri = pathToUri(filePath)
    const version = 1

    set((state) => ({
      documentVersions: { ...state.documentVersions, [uri]: version }
    }))

    window.qalam.lsp.notify('textDocument/didOpen', {
      textDocument: {
        uri,
        languageId,
        version,
        text: content
      }
    })
  },

  // Document changed
  documentChanged: (filePath: string, content: string) => {
    if (!get().connected) return

    const uri = pathToUri(filePath)
    const currentVersion = get().documentVersions[uri] || 0
    const newVersion = currentVersion + 1

    set((state) => ({
      documentVersions: { ...state.documentVersions, [uri]: newVersion }
    }))

    window.qalam.lsp.notify('textDocument/didChange', {
      textDocument: {
        uri,
        version: newVersion
      },
      contentChanges: [{ text: content }]
    })
  },

  // Document closed
  documentClosed: (filePath: string) => {
    if (!get().connected) return

    const uri = pathToUri(filePath)

    // Remove from document versions and diagnostics
    set((state) => {
      const { [uri]: _, ...remainingVersions } = state.documentVersions
      const { [uri]: __, ...remainingDiagnostics } = state.diagnostics
      return {
        documentVersions: remainingVersions,
        diagnostics: remainingDiagnostics
      }
    })

    window.qalam.lsp.notify('textDocument/didClose', {
      textDocument: { uri }
    })
  },

  // Document saved
  documentSaved: (filePath: string, content: string) => {
    if (!get().connected) return

    const uri = pathToUri(filePath)

    window.qalam.lsp.notify('textDocument/didSave', {
      textDocument: { uri },
      text: content
    })
  },

  // Request completion
  requestCompletion: async (filePath: string, line: number, character: number): Promise<LSPCompletionResult> => {
    if (!get().connected) return null

    const uri = pathToUri(filePath)

    const result = await window.qalam.lsp.request('textDocument/completion', {
      textDocument: { uri },
      position: { line, character }
    })

    if (result.success) {
      return result.result as LSPCompletionResult
    }
    return null
  },

  // Request hover
  requestHover: async (filePath: string, line: number, character: number): Promise<LSPHover | null> => {
    if (!get().connected) return null

    const uri = pathToUri(filePath)

    const result = await window.qalam.lsp.request('textDocument/hover', {
      textDocument: { uri },
      position: { line, character }
    })

    if (result.success && result.result) {
      return result.result as LSPHover
    }
    return null
  },

  // Request definition
  requestDefinition: async (filePath: string, line: number, character: number): Promise<LSPDefinitionResult> => {
    if (!get().connected) return null

    const uri = pathToUri(filePath)

    const result = await window.qalam.lsp.request('textDocument/definition', {
      textDocument: { uri },
      position: { line, character }
    })

    if (result.success) {
      return result.result as LSPDefinitionResult
    }
    return null
  },

  // Request document formatting
  requestFormatting: async (filePath: string, tabSize: number, insertSpaces: boolean) => {
    if (!get().connected) return null

    const uri = pathToUri(filePath)

    const result = await window.qalam.lsp.request('textDocument/formatting', {
      textDocument: { uri },
      options: {
        tabSize,
        insertSpaces
      }
    })

    if (result.success && result.result) {
      return result.result as TextEdit[]
    }
    return null
  },

  // Set diagnostics for a file
  setDiagnostics: (uri: string, diagnostics: Diagnostic[]) => {
    // Normalize URI by decoding to handle LSP server's URL-encoded URIs
    const normalizedUri = decodeURI(uri)
    set((state) => ({
      diagnostics: { ...state.diagnostics, [normalizedUri]: diagnostics }
    }))
  },

  // Set error
  setError: (error: string | null) => {
    set({ error })
  },

  // Reset state
  reset: () => {
    set({
      connected: false,
      connecting: false,
      capabilities: null,
      error: null,
      diagnostics: {},
      documentVersions: {}
    })
  }
}))

// Helper hook to get diagnostics for a specific file
export function useDiagnosticsForFile(filePath: string | null): Diagnostic[] {
  const diagnostics = useLSPStore((state) => state.diagnostics)

  if (!filePath) return []

  const uri = pathToUri(filePath)
  return diagnostics[uri] || []
}

// Helper to get all diagnostics across all files
export function useAllDiagnostics(): { filePath: string; diagnostics: Diagnostic[] }[] {
  const allDiagnostics = useLSPStore((state) => state.diagnostics)

  return Object.entries(allDiagnostics)
    .filter(([_, diags]) => diags.length > 0)
    .map(([uri, diags]) => ({
      filePath: uriToPath(uri),
      diagnostics: diags
    }))
}

// Helper to convert file path to URI (exported for use in other components)
export { pathToUri, uriToPath }
