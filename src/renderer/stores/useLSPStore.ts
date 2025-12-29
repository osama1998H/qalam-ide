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

// LSP References result type
export type LSPReferencesResult = LSPLocation[] | null

// LSP Rename types
export interface LSPPrepareRenameResult {
  range: Range
  placeholder?: string
}

export interface LSPTextDocumentEdit {
  textDocument: { uri: string; version?: number | null }
  edits: TextEdit[]
}

export interface LSPWorkspaceEdit {
  changes?: Record<string, TextEdit[]>
  documentChanges?: LSPTextDocumentEdit[]
}

// LSP Code Action types
export interface LSPCodeActionContext {
  diagnostics: Diagnostic[]
  only?: string[]
}

export interface LSPCommand {
  title: string
  command: string
  arguments?: unknown[]
}

export interface LSPCodeAction {
  title: string
  kind?: string
  diagnostics?: Diagnostic[]
  isPreferred?: boolean
  edit?: LSPWorkspaceEdit
  command?: LSPCommand
}

export type LSPCodeActionResult = (LSPCodeAction | LSPCommand)[] | null

// LSP Semantic Tokens types
export interface LSPSemanticTokensLegend {
  tokenTypes: string[]
  tokenModifiers: string[]
}

export interface LSPSemanticTokens {
  resultId?: string
  data: number[]
}

export type LSPSemanticTokensResult = LSPSemanticTokens | null

// LSP Signature Help types
export interface LSPParameterInformation {
  label: string | [number, number]
  documentation?: string | MarkupContent
}

export interface LSPSignatureInformation {
  label: string
  documentation?: string | MarkupContent
  parameters?: LSPParameterInformation[]
  activeParameter?: number
}

export interface LSPSignatureHelp {
  signatures: LSPSignatureInformation[]
  activeSignature?: number
  activeParameter?: number
}

export type LSPSignatureHelpResult = LSPSignatureHelp | null

// LSP Inlay Hints types
export interface LSPInlayHintLabelPart {
  value: string
  tooltip?: string | MarkupContent
  location?: LSPLocation
  command?: LSPCommand
}

export interface LSPInlayHint {
  position: Position
  label: string | LSPInlayHintLabelPart[]
  kind?: number // 1 = Type, 2 = Parameter
  tooltip?: string | MarkupContent
  paddingLeft?: boolean
  paddingRight?: boolean
  textEdits?: TextEdit[]
  data?: unknown
}

export type LSPInlayHintsResult = LSPInlayHint[] | null

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
  code?: string | number // Error code (e.g., "د٠٣٠١")
  codeDescription?: {
    href: string // Link to error documentation
  }
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
  requestReferences: (filePath: string, line: number, character: number, includeDeclaration?: boolean) => Promise<LSPReferencesResult>
  requestPrepareRename: (filePath: string, line: number, character: number) => Promise<LSPPrepareRenameResult | null>
  requestRename: (filePath: string, line: number, character: number, newName: string) => Promise<LSPWorkspaceEdit | null>
  requestCodeActions: (filePath: string, startLine: number, startChar: number, endLine: number, endChar: number, diagnostics: Diagnostic[]) => Promise<LSPCodeActionResult>
  requestSemanticTokens: (filePath: string) => Promise<LSPSemanticTokensResult>
  requestSignatureHelp: (filePath: string, line: number, character: number) => Promise<LSPSignatureHelpResult>
  requestInlayHints: (filePath: string, startLine: number, endLine: number) => Promise<LSPInlayHintsResult>
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

  // Request references
  requestReferences: async (filePath: string, line: number, character: number, includeDeclaration = true): Promise<LSPReferencesResult> => {
    if (!get().connected) return null

    const uri = pathToUri(filePath)

    const result = await window.qalam.lsp.request('textDocument/references', {
      textDocument: { uri },
      position: { line, character },
      context: { includeDeclaration }
    })

    if (result.success && result.result) {
      return result.result as LSPReferencesResult
    }
    return null
  },

  // Request prepare rename (validates if rename is possible at position)
  requestPrepareRename: async (filePath: string, line: number, character: number): Promise<LSPPrepareRenameResult | null> => {
    if (!get().connected) return null

    const uri = pathToUri(filePath)

    const result = await window.qalam.lsp.request('textDocument/prepareRename', {
      textDocument: { uri },
      position: { line, character }
    })

    if (result.success && result.result) {
      return result.result as LSPPrepareRenameResult
    }
    return null
  },

  // Request rename
  requestRename: async (filePath: string, line: number, character: number, newName: string): Promise<LSPWorkspaceEdit | null> => {
    if (!get().connected) return null

    const uri = pathToUri(filePath)

    const result = await window.qalam.lsp.request('textDocument/rename', {
      textDocument: { uri },
      position: { line, character },
      newName
    })

    if (result.success && result.result) {
      return result.result as LSPWorkspaceEdit
    }
    return null
  },

  // Request code actions
  requestCodeActions: async (filePath: string, startLine: number, startChar: number, endLine: number, endChar: number, diagnostics: Diagnostic[]): Promise<LSPCodeActionResult> => {
    if (!get().connected) return null

    const uri = pathToUri(filePath)

    const result = await window.qalam.lsp.request('textDocument/codeAction', {
      textDocument: { uri },
      range: {
        start: { line: startLine, character: startChar },
        end: { line: endLine, character: endChar }
      },
      context: {
        diagnostics
      }
    })

    if (result.success && result.result) {
      return result.result as LSPCodeActionResult
    }
    return null
  },

  // Request semantic tokens
  requestSemanticTokens: async (filePath: string): Promise<LSPSemanticTokensResult> => {
    if (!get().connected) return null

    const uri = pathToUri(filePath)

    const result = await window.qalam.lsp.request('textDocument/semanticTokens/full', {
      textDocument: { uri }
    })

    if (result.success && result.result) {
      return result.result as LSPSemanticTokensResult
    }
    return null
  },

  // Request signature help (function parameter hints)
  requestSignatureHelp: async (filePath: string, line: number, character: number): Promise<LSPSignatureHelpResult> => {
    if (!get().connected) return null

    const uri = pathToUri(filePath)

    const result = await window.qalam.lsp.request('textDocument/signatureHelp', {
      textDocument: { uri },
      position: { line, character }
    })

    if (result.success && result.result) {
      return result.result as LSPSignatureHelpResult
    }
    return null
  },

  // Request inlay hints (inline type annotations)
  requestInlayHints: async (filePath: string, startLine: number, endLine: number): Promise<LSPInlayHintsResult> => {
    if (!get().connected) return null

    const uri = pathToUri(filePath)

    const result = await window.qalam.lsp.request('textDocument/inlayHint', {
      textDocument: { uri },
      range: {
        start: { line: startLine, character: 0 },
        end: { line: endLine, character: 0 }
      }
    })

    if (result.success && result.result) {
      return result.result as LSPInlayHintsResult
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
