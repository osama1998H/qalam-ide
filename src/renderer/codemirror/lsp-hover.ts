import { hoverTooltip, Tooltip, EditorView } from '@codemirror/view'
import { Extension } from '@codemirror/state'
import { filePathField } from './lsp-completion'
import { useLSPStore } from '../stores/useLSPStore'

// LSP Hover response types
interface LSPHover {
  contents: MarkupContent | string | MarkedString | MarkedString[]
  range?: { start: Position; end: Position }
}

interface MarkupContent {
  kind: 'plaintext' | 'markdown'
  value: string
}

interface MarkedString {
  language: string
  value: string
}

interface Position {
  line: number
  character: number
}

// Convert LSP hover content to HTML
function renderHoverContent(contents: LSPHover['contents']): HTMLElement {
  const container = document.createElement('div')
  container.className = 'cm-hover-content'

  if (typeof contents === 'string') {
    // Plain string content
    container.textContent = contents
  } else if (contents && 'kind' in contents) {
    // MarkupContent
    if (contents.kind === 'markdown') {
      container.innerHTML = parseMarkdown(contents.value)
    } else {
      container.textContent = contents.value
    }
  } else if (contents && 'language' in contents) {
    // Single MarkedString
    const code = document.createElement('pre')
    code.className = 'cm-hover-code'
    code.textContent = contents.value
    container.appendChild(code)
  } else if (Array.isArray(contents)) {
    // MarkedString[]
    contents.forEach(item => {
      const block = document.createElement('div')
      if (typeof item === 'string') {
        block.textContent = item
      } else if ('language' in item) {
        // Code block with language
        const code = document.createElement('pre')
        code.className = 'cm-hover-code'
        code.textContent = item.value
        block.appendChild(code)
      } else if ('kind' in item) {
        // MarkupContent in array
        if (item.kind === 'markdown') {
          block.innerHTML = parseMarkdown(item.value)
        } else {
          block.textContent = item.value
        }
      }
      container.appendChild(block)
    })
  }

  return container
}

// Simple markdown parser for hover content
function parseMarkdown(md: string): string {
  return md
    // Code blocks with language
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="cm-hover-code">$2</pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Bold text
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    // Italic text
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    // Line breaks (but not double for paragraphs)
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
}

// Hover tooltip source - called by CodeMirror when hovering
async function lspHoverSource(
  view: EditorView,
  pos: number,
  side: -1 | 1
): Promise<Tooltip | null> {
  // Get file path from state field
  const filePath = view.state.field(filePathField)
  if (!filePath) return null

  // Check LSP connection
  const lspStore = useLSPStore.getState()
  if (!lspStore.connected) return null

  // Convert position to LSP format (0-indexed lines)
  const line = view.state.doc.lineAt(pos)
  const lineNumber = line.number - 1
  const character = pos - line.from

  try {
    const hover = await lspStore.requestHover(filePath, lineNumber, character)

    // Check if we got a valid response
    if (!hover || !hover.contents) return null

    // Handle empty content
    if (typeof hover.contents === 'string' && !hover.contents.trim()) return null
    if (typeof hover.contents === 'object' && 'value' in hover.contents && !hover.contents.value.trim()) return null

    // Determine tooltip position range
    let from = pos
    let to = pos
    if (hover.range) {
      const startLine = view.state.doc.line(hover.range.start.line + 1)
      const endLine = view.state.doc.line(hover.range.end.line + 1)
      from = startLine.from + hover.range.start.character
      to = endLine.from + hover.range.end.character
    }

    return {
      pos: from,
      end: to,
      above: true, // Show tooltip above the symbol
      create() {
        const dom = document.createElement('div')
        dom.className = 'cm-tooltip-hover'
        dom.appendChild(renderHoverContent(hover.contents))
        return { dom }
      }
    }
  } catch (error) {
    console.error('[LSP Hover] Error:', error)
    return null
  }
}

// RTL theme for hover tooltips
const hoverRTLTheme = EditorView.theme({
  '.cm-tooltip-hover': {
    direction: 'rtl',
    textAlign: 'right',
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    padding: '8px 12px',
    maxWidth: '500px',
    minWidth: '200px',
    fontFamily: 'inherit',
    fontSize: '13px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
    zIndex: 100
  },
  '.cm-hover-content': {
    direction: 'rtl',
    textAlign: 'right',
    color: 'var(--text-primary)',
    lineHeight: '1.5'
  },
  '.cm-hover-content p': {
    margin: '0 0 8px 0'
  },
  '.cm-hover-content p:last-child': {
    marginBottom: 0
  },
  '.cm-hover-code': {
    direction: 'ltr', // Code is always LTR for readability
    textAlign: 'left',
    backgroundColor: 'var(--bg-primary)',
    padding: '6px 10px',
    borderRadius: '4px',
    fontFamily: "'Menlo', 'Monaco', 'Courier New', monospace",
    fontSize: '12px',
    margin: '6px 0',
    overflowX: 'auto',
    whiteSpace: 'pre-wrap',
    border: '1px solid var(--border)'
  },
  '.cm-hover-content code': {
    direction: 'ltr',
    backgroundColor: 'var(--bg-primary)',
    padding: '2px 6px',
    borderRadius: '3px',
    fontFamily: "'Menlo', 'Monaco', 'Courier New', monospace",
    fontSize: '12px'
  },
  // Type signature styling (bold text in markdown)
  '.cm-hover-content strong': {
    color: '#4ec9b0', // Teal color for types
    fontWeight: 600
  },
  '.cm-hover-content em': {
    color: '#9cdcfe', // Light blue for emphasis
    fontStyle: 'italic'
  }
})

// Export the hover extension
export function lspHoverExtension(): Extension {
  return [
    hoverTooltip(lspHoverSource, {
      hideOnChange: true, // Hide when document changes
      hoverTime: 300      // Delay before showing (300ms)
    }),
    hoverRTLTheme
  ]
}
