import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate } from '@codemirror/view'
import { Extension, RangeSetBuilder } from '@codemirror/state'
import { filePathField } from './lsp-completion'
import { useLSPStore, LSPSemanticTokens } from '../stores/useLSPStore'

// Semantic token types (must match LSP server order)
const TOKEN_TYPES = [
  'namespace',
  'type',
  'class',
  'enum',
  'interface',
  'struct',
  'typeParameter',
  'parameter',
  'variable',
  'property',
  'enumMember',
  'event',
  'function',
  'method',
  'macro',
  'keyword',
  'modifier',
  'comment',
  'string',
  'number',
  'regexp',
  'operator'
] as const

// Semantic token modifiers (bit flags, must match LSP server order)
const TOKEN_MODIFIERS = [
  'declaration',
  'definition',
  'readonly',
  'static',
  'deprecated',
  'abstract',
  'async',
  'modification',
  'documentation',
  'defaultLibrary'
] as const

type TokenType = typeof TOKEN_TYPES[number]
type TokenModifier = typeof TOKEN_MODIFIERS[number]

// Decoded semantic token
interface DecodedToken {
  line: number
  startChar: number
  length: number
  tokenType: TokenType
  modifiers: TokenModifier[]
}

// Decode delta-encoded semantic tokens from LSP
function decodeSemanticTokens(data: number[]): DecodedToken[] {
  const tokens: DecodedToken[] = []

  // Each token is 5 integers: deltaLine, deltaStart, length, tokenType, tokenModifiers
  let currentLine = 0
  let currentStart = 0

  for (let i = 0; i < data.length; i += 5) {
    const deltaLine = data[i]
    const deltaStart = data[i + 1]
    const length = data[i + 2]
    const tokenTypeIndex = data[i + 3]
    const modifiersBitset = data[i + 4]

    // Update position
    if (deltaLine > 0) {
      currentLine += deltaLine
      currentStart = deltaStart
    } else {
      currentStart += deltaStart
    }

    // Get token type
    const tokenType = TOKEN_TYPES[tokenTypeIndex] || 'variable'

    // Decode modifiers bitset
    const modifiers: TokenModifier[] = []
    for (let j = 0; j < TOKEN_MODIFIERS.length; j++) {
      if (modifiersBitset & (1 << j)) {
        modifiers.push(TOKEN_MODIFIERS[j])
      }
    }

    tokens.push({
      line: currentLine,
      startChar: currentStart,
      length,
      tokenType,
      modifiers
    })
  }

  return tokens
}

// Create decoration class for token
function getTokenClass(token: DecodedToken): string {
  const classes = [`cm-semantic-${token.tokenType}`]

  for (const mod of token.modifiers) {
    classes.push(`cm-semantic-mod-${mod}`)
  }

  return classes.join(' ')
}

// Debounce function for performance
function debounce<T extends (...args: unknown[]) => void>(fn: T, delay: number): T {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  return ((...args: unknown[]) => {
    if (timeoutId) clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }) as T
}

// ViewPlugin for semantic tokens
class SemanticTokensPlugin {
  decorations: DecorationSet = Decoration.none
  private pendingUpdate: boolean = false
  private lastFilePath: string | null = null
  private lastVersion: number = 0

  constructor(readonly view: EditorView) {
    this.fetchAndApplyTokens()
  }

  update(update: ViewUpdate) {
    // Check if file path changed
    const filePath = update.state.field(filePathField)
    if (filePath !== this.lastFilePath) {
      this.lastFilePath = filePath
      this.fetchAndApplyTokens()
      return
    }

    // Check if document changed
    if (update.docChanged) {
      // Debounce to avoid too many requests
      this.scheduleUpdate()
    }
  }

  private scheduleUpdate = debounce(() => {
    this.fetchAndApplyTokens()
  }, 500)

  private async fetchAndApplyTokens() {
    const filePath = this.view.state.field(filePathField)
    if (!filePath) {
      this.decorations = Decoration.none
      return
    }

    const lspStore = useLSPStore.getState()
    if (!lspStore.connected) {
      return
    }

    try {
      const result = await lspStore.requestSemanticTokens(filePath)

      if (!result || !result.data || result.data.length === 0) {
        this.decorations = Decoration.none
        this.view.dispatch({}) // Trigger re-render
        return
      }

      // Decode tokens
      const tokens = decodeSemanticTokens(result.data)

      // Build decorations
      const builder = new RangeSetBuilder<Decoration>()
      const doc = this.view.state.doc

      // Sort tokens by position (should already be sorted, but ensure)
      tokens.sort((a, b) => {
        if (a.line !== b.line) return a.line - b.line
        return a.startChar - b.startChar
      })

      for (const token of tokens) {
        try {
          // LSP uses 0-indexed lines, CodeMirror uses 1-indexed
          const lineNum = token.line + 1
          if (lineNum < 1 || lineNum > doc.lines) continue

          const line = doc.line(lineNum)
          const from = line.from + token.startChar
          const to = from + token.length

          // Validate range
          if (from < 0 || to > doc.length || from >= to) continue
          if (from < line.from || to > line.to) continue

          const deco = Decoration.mark({
            class: getTokenClass(token)
          })

          builder.add(from, to, deco)
        } catch (e) {
          // Skip invalid token
          console.warn('[Semantic Tokens] Invalid token:', token, e)
        }
      }

      this.decorations = builder.finish()

      // Force view update
      this.view.dispatch({})
    } catch (error) {
      console.error('[Semantic Tokens] Error fetching tokens:', error)
    }
  }

  destroy() {
    // Cleanup if needed
  }
}

// Create the view plugin
const semanticTokensPlugin = ViewPlugin.fromClass(SemanticTokensPlugin, {
  decorations: v => v.decorations
})

// Theme for semantic tokens - VSCode-inspired colors
const semanticTokensTheme = EditorView.theme({
  // Type-related
  '.cm-semantic-namespace': { color: '#4ec9b0' },
  '.cm-semantic-type': { color: '#4ec9b0' },
  '.cm-semantic-class': { color: '#4ec9b0' },
  '.cm-semantic-enum': { color: '#4ec9b0' },
  '.cm-semantic-interface': { color: '#b8d7a3' },
  '.cm-semantic-struct': { color: '#4ec9b0' },
  '.cm-semantic-typeParameter': { color: '#4ec9b0' },

  // Variables and parameters
  '.cm-semantic-parameter': { color: '#9cdcfe' },
  '.cm-semantic-variable': { color: '#9cdcfe' },
  '.cm-semantic-property': { color: '#9cdcfe' },
  '.cm-semantic-enumMember': { color: '#4fc1ff' },
  '.cm-semantic-event': { color: '#c586c0' },

  // Functions
  '.cm-semantic-function': { color: '#dcdcaa' },
  '.cm-semantic-method': { color: '#dcdcaa' },
  '.cm-semantic-macro': { color: '#569cd6' },

  // Keywords and modifiers
  '.cm-semantic-keyword': { color: '#569cd6' },
  '.cm-semantic-modifier': { color: '#569cd6' },

  // Literals
  '.cm-semantic-comment': { color: '#6a9955' },
  '.cm-semantic-string': { color: '#ce9178' },
  '.cm-semantic-number': { color: '#b5cea8' },
  '.cm-semantic-regexp': { color: '#d16969' },
  '.cm-semantic-operator': { color: '#d4d4d4' },

  // Modifiers
  '.cm-semantic-mod-declaration': { fontWeight: 'bold' },
  '.cm-semantic-mod-definition': { fontWeight: 'bold' },
  '.cm-semantic-mod-readonly': { fontStyle: 'italic' },
  '.cm-semantic-mod-static': { textDecoration: 'underline' },
  '.cm-semantic-mod-deprecated': { textDecoration: 'line-through' },
  '.cm-semantic-mod-abstract': { fontStyle: 'italic' },
  '.cm-semantic-mod-async': { /* async indicator - could add background */ },
  '.cm-semantic-mod-documentation': { color: '#608b4e' },
  '.cm-semantic-mod-defaultLibrary': { color: '#4ec9b0' }
})

// Export the semantic tokens extension
export function lspSemanticTokensExtension(): Extension {
  return [
    semanticTokensPlugin,
    semanticTokensTheme
  ]
}
