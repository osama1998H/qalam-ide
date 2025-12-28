import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate, WidgetType } from '@codemirror/view'
import { Extension, RangeSetBuilder } from '@codemirror/state'
import { filePathField } from './lsp-completion'
import { useLSPStore, LSPInlayHint, LSPInlayHintLabelPart, MarkupContent } from '../stores/useLSPStore'

// Inlay hint kinds
const INLAY_HINT_TYPE = 1
const INLAY_HINT_PARAMETER = 2

// Widget for inlay hint
class InlayHintWidget extends WidgetType {
  constructor(
    readonly label: string,
    readonly kind: number | undefined,
    readonly tooltip: string | undefined,
    readonly paddingLeft: boolean,
    readonly paddingRight: boolean
  ) {
    super()
  }

  toDOM(): HTMLElement {
    const span = document.createElement('span')
    span.className = 'cm-inlay-hint'

    if (this.kind === INLAY_HINT_TYPE) {
      span.classList.add('cm-inlay-hint-type')
    } else if (this.kind === INLAY_HINT_PARAMETER) {
      span.classList.add('cm-inlay-hint-parameter')
    }

    if (this.paddingLeft) {
      span.style.marginLeft = '4px'
    }
    if (this.paddingRight) {
      span.style.marginRight = '4px'
    }

    span.textContent = this.label

    if (this.tooltip) {
      span.title = this.tooltip
    }

    return span
  }

  eq(other: InlayHintWidget): boolean {
    return (
      this.label === other.label &&
      this.kind === other.kind &&
      this.paddingLeft === other.paddingLeft &&
      this.paddingRight === other.paddingRight
    )
  }

  ignoreEvent(): boolean {
    return true
  }
}

// Get label text from inlay hint
function getLabelText(label: string | LSPInlayHintLabelPart[]): string {
  if (typeof label === 'string') {
    return label
  }
  return label.map(part => part.value).join('')
}

// Get tooltip text
function getTooltipText(tooltip: string | MarkupContent | undefined): string | undefined {
  if (!tooltip) return undefined
  if (typeof tooltip === 'string') return tooltip
  return tooltip.value
}

// Debounce utility
function debounce<T extends (...args: unknown[]) => void>(fn: T, delay: number): T {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  return ((...args: unknown[]) => {
    if (timeoutId) clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }) as T
}

// ViewPlugin for inlay hints
class InlayHintsPlugin {
  decorations: DecorationSet = Decoration.none
  private pendingRequest = false
  private lastFilePath: string | null = null
  private lastVisibleRange: { from: number; to: number } | null = null

  constructor(readonly view: EditorView) {
    this.fetchAndApplyHints()
  }

  update(update: ViewUpdate) {
    const filePath = update.state.field(filePathField)

    // Check if file changed
    if (filePath !== this.lastFilePath) {
      this.lastFilePath = filePath
      this.scheduleUpdate()
      return
    }

    // Check if document changed
    if (update.docChanged) {
      this.scheduleUpdate()
      return
    }

    // Check if visible range changed significantly
    if (update.viewportChanged) {
      const currentRange = {
        from: this.view.visibleRanges[0]?.from ?? 0,
        to: this.view.visibleRanges[this.view.visibleRanges.length - 1]?.to ?? 0
      }

      if (!this.lastVisibleRange ||
          Math.abs(currentRange.from - this.lastVisibleRange.from) > 100 ||
          Math.abs(currentRange.to - this.lastVisibleRange.to) > 100) {
        this.lastVisibleRange = currentRange
        this.scheduleUpdate()
      }
    }
  }

  private scheduleUpdate = debounce(() => {
    this.fetchAndApplyHints()
  }, 300)

  private async fetchAndApplyHints() {
    if (this.pendingRequest) return
    this.pendingRequest = true

    try {
      const filePath = this.view.state.field(filePathField)
      if (!filePath) {
        this.decorations = Decoration.none
        return
      }

      const lspStore = useLSPStore.getState()
      if (!lspStore.connected) {
        return
      }

      // Calculate visible line range with some buffer
      const doc = this.view.state.doc
      const visibleRanges = this.view.visibleRanges

      if (visibleRanges.length === 0) return

      const firstVisible = visibleRanges[0].from
      const lastVisible = visibleRanges[visibleRanges.length - 1].to

      const startLine = Math.max(0, doc.lineAt(firstVisible).number - 1 - 5) // 5 line buffer, 0-indexed
      const endLine = Math.min(doc.lines, doc.lineAt(lastVisible).number - 1 + 5) // 5 line buffer, 0-indexed

      const hints = await lspStore.requestInlayHints(filePath, startLine, endLine)

      if (!hints || hints.length === 0) {
        this.decorations = Decoration.none
        this.view.dispatch({}) // Force update
        return
      }

      // Build decorations
      const builder = new RangeSetBuilder<Decoration>()

      // Sort hints by position
      const sortedHints = [...hints].sort((a, b) => {
        if (a.position.line !== b.position.line) {
          return a.position.line - b.position.line
        }
        return a.position.character - b.position.character
      })

      for (const hint of sortedHints) {
        try {
          // Convert LSP position (0-indexed) to CodeMirror position
          const lineNum = hint.position.line + 1
          if (lineNum < 1 || lineNum > doc.lines) continue

          const line = doc.line(lineNum)
          const pos = line.from + hint.position.character

          // Validate position
          if (pos < 0 || pos > doc.length) continue
          if (pos > line.to) continue

          const labelText = getLabelText(hint.label)
          const tooltipText = getTooltipText(hint.tooltip)

          const widget = new InlayHintWidget(
            labelText,
            hint.kind,
            tooltipText,
            hint.paddingLeft ?? false,
            hint.paddingRight ?? false
          )

          const deco = Decoration.widget({
            widget,
            side: 1 // After the character
          })

          builder.add(pos, pos, deco)
        } catch (e) {
          console.warn('[Inlay Hints] Invalid hint:', hint, e)
        }
      }

      this.decorations = builder.finish()
      this.view.dispatch({}) // Force update
    } catch (error) {
      console.error('[Inlay Hints] Error fetching hints:', error)
    } finally {
      this.pendingRequest = false
    }
  }

  destroy() {
    // Cleanup
  }
}

// Create the view plugin
const inlayHintsPlugin = ViewPlugin.fromClass(InlayHintsPlugin, {
  decorations: v => v.decorations
})

// Theme for inlay hints
const inlayHintsTheme = EditorView.theme({
  '.cm-inlay-hint': {
    display: 'inline',
    fontFamily: "'Menlo', 'Monaco', 'Courier New', monospace",
    fontSize: '0.9em',
    opacity: 0.7,
    borderRadius: '3px',
    padding: '0 3px',
    verticalAlign: 'baseline'
  },
  '.cm-inlay-hint-type': {
    color: '#4ec9b0',
    backgroundColor: 'rgba(78, 201, 176, 0.1)'
  },
  '.cm-inlay-hint-parameter': {
    color: '#9cdcfe',
    backgroundColor: 'rgba(156, 220, 254, 0.1)'
  }
})

// Export the inlay hints extension
export function lspInlayHintsExtension(): Extension {
  return [
    inlayHintsPlugin,
    inlayHintsTheme
  ]
}
