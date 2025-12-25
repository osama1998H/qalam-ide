import { create } from 'zustand'

// LSP SymbolKind enum
export enum SymbolKind {
  File = 1,
  Module = 2,
  Namespace = 3,
  Package = 4,
  Class = 5,
  Method = 6,
  Property = 7,
  Field = 8,
  Constructor = 9,
  Enum = 10,
  Interface = 11,
  Function = 12,
  Variable = 13,
  Constant = 14,
  String = 15,
  Number = 16,
  Boolean = 17,
  Array = 18,
  Object = 19,
  Key = 20,
  Null = 21,
  EnumMember = 22,
  Struct = 23,
  Event = 24,
  Operator = 25,
  TypeParameter = 26
}

// Document Symbol interface (LSP compatible)
export interface DocumentSymbol {
  name: string
  kind: SymbolKind
  range: {
    start: { line: number; character: number }
    end: { line: number; character: number }
  }
  selectionRange: {
    start: { line: number; character: number }
    end: { line: number; character: number }
  }
  children?: DocumentSymbol[]
}

interface OutlineState {
  symbols: DocumentSymbol[]
  isLoading: boolean
  filterType: SymbolKind | null // null = show all
  sortBy: 'position' | 'name'
  expandedSymbols: Set<string>

  // Actions
  setSymbols: (symbols: DocumentSymbol[]) => void
  setLoading: (loading: boolean) => void
  setFilterType: (type: SymbolKind | null) => void
  setSortBy: (sort: 'position' | 'name') => void
  toggleExpanded: (symbolId: string) => void
  expandAll: () => void
  collapseAll: () => void
  refreshSymbols: (filePath: string, content: string) => Promise<void>
  clear: () => void
}

// Parse symbols from content using regex (fallback when LSP is not available)
function parseSymbolsFromContent(content: string): DocumentSymbol[] {
  const symbols: DocumentSymbol[] = []
  const lines = content.split('\n')

  // Patterns for different symbol types in Tarqeem
  const patterns = [
    { regex: /دالة\s+([\u0600-\u06FF_][\u0600-\u06FF\u0660-\u0669_0-9]*)/, kind: SymbolKind.Function },
    { regex: /صنف\s+([\u0600-\u06FF_][\u0600-\u06FF\u0660-\u0669_0-9]*)/, kind: SymbolKind.Class },
    { regex: /تعداد\s+([\u0600-\u06FF_][\u0600-\u06FF\u0660-\u0669_0-9]*)/, kind: SymbolKind.Enum },
    { regex: /ميثاق\s+([\u0600-\u06FF_][\u0600-\u06FF\u0660-\u0669_0-9]*)/, kind: SymbolKind.Interface },
    { regex: /منشئ\s*\(/, kind: SymbolKind.Constructor, isConstructor: true },
    { regex: /(?:متغير|ثابت)\s+([\u0600-\u06FF_][\u0600-\u06FF\u0660-\u0669_0-9]*)/, kind: SymbolKind.Variable }
  ]

  lines.forEach((line, lineIndex) => {
    const trimmedLine = line.trim()

    // Skip comment lines (lines starting with //)
    if (trimmedLine.startsWith('//')) {
      return
    }

    // Find comment position on this line (to skip symbols after //)
    const commentIndex = line.indexOf('//')

    for (const pattern of patterns) {
      const match = line.match(pattern.regex)
      if (match) {
        // Check if match is inside a comment
        const matchIndex = line.indexOf(match[0])
        if (commentIndex !== -1 && matchIndex > commentIndex) {
          continue
        }

        // For constructor, use "منشئ" as the name since there's no captured group
        const isConstructor = 'isConstructor' in pattern && pattern.isConstructor
        const name = isConstructor ? 'منشئ' : match[1]

        // Skip if name is undefined (safety check)
        if (!name) {
          continue
        }

        const charIndex = line.indexOf(name)
        symbols.push({
          name,
          kind: pattern.kind,
          range: {
            start: { line: lineIndex, character: 0 },
            end: { line: lineIndex, character: line.length }
          },
          selectionRange: {
            start: { line: lineIndex, character: charIndex },
            end: { line: lineIndex, character: charIndex + name.length }
          }
        })
      }
    }
  })

  return symbols
}

// Convert LSP response to DocumentSymbol array
function convertLSPSymbols(lspSymbols: unknown): DocumentSymbol[] {
  if (!Array.isArray(lspSymbols)) return []

  return lspSymbols.map((symbol: unknown) => {
    const s = symbol as {
      name?: string
      kind?: number
      range?: { start: { line: number; character: number }; end: { line: number; character: number } }
      selectionRange?: { start: { line: number; character: number }; end: { line: number; character: number } }
      children?: unknown[]
    }

    return {
      name: s.name || '',
      kind: s.kind || SymbolKind.Variable,
      range: s.range || { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
      selectionRange: s.selectionRange || s.range || { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
      children: s.children ? convertLSPSymbols(s.children) : undefined
    }
  })
}

// Generate unique ID for symbol
function getSymbolId(symbol: DocumentSymbol, parentId?: string): string {
  const base = `${symbol.name}-${symbol.kind}-${symbol.range.start.line}`
  return parentId ? `${parentId}/${base}` : base
}

// Collect all symbol IDs recursively
function collectAllSymbolIds(symbols: DocumentSymbol[], parentId?: string): string[] {
  const ids: string[] = []
  for (const symbol of symbols) {
    const id = getSymbolId(symbol, parentId)
    ids.push(id)
    if (symbol.children) {
      ids.push(...collectAllSymbolIds(symbol.children, id))
    }
  }
  return ids
}

export const useOutlineStore = create<OutlineState>((set, get) => ({
  symbols: [],
  isLoading: false,
  filterType: null,
  sortBy: 'position',
  expandedSymbols: new Set<string>(),

  setSymbols: (symbols: DocumentSymbol[]) => {
    set({ symbols })
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading })
  },

  setFilterType: (type: SymbolKind | null) => {
    set({ filterType: type })
  },

  setSortBy: (sort: 'position' | 'name') => {
    set({ sortBy: sort })
  },

  toggleExpanded: (symbolId: string) => {
    set((state) => {
      const newExpanded = new Set(state.expandedSymbols)
      if (newExpanded.has(symbolId)) {
        newExpanded.delete(symbolId)
      } else {
        newExpanded.add(symbolId)
      }
      return { expandedSymbols: newExpanded }
    })
  },

  expandAll: () => {
    const { symbols } = get()
    const allIds = collectAllSymbolIds(symbols)
    set({ expandedSymbols: new Set(allIds) })
  },

  collapseAll: () => {
    set({ expandedSymbols: new Set<string>() })
  },

  refreshSymbols: async (filePath: string, content: string) => {
    set({ isLoading: true })

    try {
      // Try LSP first if connected
      const lspConnected = window.qalam?.lsp && (await window.qalam.lsp.isRunning()).running

      if (lspConnected) {
        const uri = `file://${filePath}`
        const result = await window.qalam.lsp.request('textDocument/documentSymbol', {
          textDocument: { uri }
        })

        if (result.success && result.result) {
          const symbols = convertLSPSymbols(result.result)
          set({ symbols, isLoading: false })
          return
        }
      }

      // Fallback to regex parsing
      const symbols = parseSymbolsFromContent(content)
      set({ symbols, isLoading: false })
    } catch (error) {
      console.error('[Outline] Error refreshing symbols:', error)
      // Fallback to regex parsing on error
      const symbols = parseSymbolsFromContent(content)
      set({ symbols, isLoading: false })
    }
  },

  clear: () => {
    set({ symbols: [], expandedSymbols: new Set<string>() })
  }
}))

// Helper functions
export function getSymbolIcon(kind: SymbolKind): string {
  switch (kind) {
    case SymbolKind.Function:
    case SymbolKind.Method:
      return 'function'
    case SymbolKind.Class:
    case SymbolKind.Struct:
      return 'class'
    case SymbolKind.Interface:
      return 'interface'
    case SymbolKind.Enum:
    case SymbolKind.EnumMember:
      return 'enum'
    case SymbolKind.Variable:
    case SymbolKind.Field:
      return 'variable'
    case SymbolKind.Constant:
      return 'constant'
    case SymbolKind.Property:
      return 'property'
    case SymbolKind.Constructor:
      return 'constructor'
    default:
      return 'symbol'
  }
}

export function getSymbolKindLabel(kind: SymbolKind): string {
  switch (kind) {
    case SymbolKind.Function:
      return 'دالة'
    case SymbolKind.Method:
      return 'دالة'
    case SymbolKind.Class:
      return 'صنف'
    case SymbolKind.Struct:
      return 'بنية'
    case SymbolKind.Interface:
      return 'ميثاق'
    case SymbolKind.Enum:
      return 'تعداد'
    case SymbolKind.EnumMember:
      return 'عنصر'
    case SymbolKind.Variable:
      return 'متغير'
    case SymbolKind.Field:
      return 'حقل'
    case SymbolKind.Constant:
      return 'ثابت'
    case SymbolKind.Property:
      return 'خاصية'
    case SymbolKind.Constructor:
      return 'منشئ'
    default:
      return 'رمز'
  }
}

export { getSymbolId }
