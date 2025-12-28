import { EditorView, ViewPlugin, ViewUpdate, Tooltip, showTooltip } from '@codemirror/view'
import { Extension, StateField, StateEffect } from '@codemirror/state'
import { filePathField } from './lsp-completion'
import { useLSPStore, LSPSignatureHelp, LSPSignatureInformation, MarkupContent } from '../stores/useLSPStore'

// State for signature help
interface SignatureHelpState {
  help: LSPSignatureHelp | null
  pos: number
}

// Effect to update signature help
const setSignatureHelpEffect = StateEffect.define<SignatureHelpState>()

// StateField for signature help
const signatureHelpField = StateField.define<SignatureHelpState>({
  create: () => ({ help: null, pos: -1 }),
  update: (value, tr) => {
    for (const e of tr.effects) {
      if (e.is(setSignatureHelpEffect)) {
        return e.value
      }
    }
    // Clear on doc change if position is affected
    if (tr.docChanged && value.help) {
      return { help: null, pos: -1 }
    }
    return value
  }
})

// Extract text from documentation
function getDocumentationText(doc: string | MarkupContent | undefined): string | undefined {
  if (!doc) return undefined
  if (typeof doc === 'string') return doc
  return doc.value
}

// Create tooltip for signature help
function signatureHelpTooltip(state: SignatureHelpState): Tooltip | null {
  if (!state.help || !state.help.signatures || state.help.signatures.length === 0) {
    return null
  }

  const activeSignatureIndex = state.help.activeSignature ?? 0
  const signature = state.help.signatures[activeSignatureIndex]
  if (!signature) return null

  const activeParamIndex = state.help.activeParameter ?? signature.activeParameter ?? 0

  return {
    pos: state.pos,
    above: true,
    create: () => {
      const dom = document.createElement('div')
      dom.className = 'cm-signature-help'

      // Signature label with parameter highlighting
      const labelDiv = document.createElement('div')
      labelDiv.className = 'cm-signature-label'

      if (signature.parameters && signature.parameters.length > 0) {
        // Parse the signature to highlight the active parameter
        const labelText = signature.label
        let lastEnd = 0

        // Find parameter positions in the label
        for (let i = 0; i < signature.parameters.length; i++) {
          const param = signature.parameters[i]
          let paramStart: number
          let paramEnd: number

          if (Array.isArray(param.label)) {
            // Label is [start, end] offsets
            paramStart = param.label[0]
            paramEnd = param.label[1]
          } else {
            // Label is a string - find it in the signature
            const paramText = param.label
            const searchStart = lastEnd
            paramStart = labelText.indexOf(paramText, searchStart)
            if (paramStart === -1) {
              paramStart = labelText.indexOf(paramText)
            }
            paramEnd = paramStart + paramText.length
          }

          // Add text before this parameter
          if (paramStart > lastEnd) {
            const textNode = document.createTextNode(labelText.slice(lastEnd, paramStart))
            labelDiv.appendChild(textNode)
          }

          // Add parameter (highlighted if active)
          const paramSpan = document.createElement('span')
          paramSpan.className = i === activeParamIndex ? 'cm-signature-param-active' : 'cm-signature-param'
          paramSpan.textContent = labelText.slice(paramStart, paramEnd)
          labelDiv.appendChild(paramSpan)

          lastEnd = paramEnd
        }

        // Add remaining text after last parameter
        if (lastEnd < labelText.length) {
          const textNode = document.createTextNode(labelText.slice(lastEnd))
          labelDiv.appendChild(textNode)
        }
      } else {
        labelDiv.textContent = signature.label
      }

      dom.appendChild(labelDiv)

      // Active parameter documentation
      if (signature.parameters && signature.parameters[activeParamIndex]) {
        const activeParam = signature.parameters[activeParamIndex]
        const paramDoc = getDocumentationText(activeParam.documentation)
        if (paramDoc) {
          const paramDocDiv = document.createElement('div')
          paramDocDiv.className = 'cm-signature-param-doc'
          paramDocDiv.textContent = paramDoc
          dom.appendChild(paramDocDiv)
        }
      }

      // Signature documentation
      const signatureDoc = getDocumentationText(signature.documentation)
      if (signatureDoc) {
        const docDiv = document.createElement('div')
        docDiv.className = 'cm-signature-doc'
        docDiv.textContent = signatureDoc
        dom.appendChild(docDiv)
      }

      // Signature counter (if multiple signatures)
      if (state.help!.signatures.length > 1) {
        const counterDiv = document.createElement('div')
        counterDiv.className = 'cm-signature-counter'
        counterDiv.textContent = `${activeSignatureIndex + 1} / ${state.help!.signatures.length}`
        dom.appendChild(counterDiv)
      }

      return { dom }
    }
  }
}

// Extension to show tooltip from state
const signatureHelpTooltipExtension = showTooltip.compute([signatureHelpField], (state) => {
  const helpState = state.field(signatureHelpField)
  return signatureHelpTooltip(helpState)
})

// Check if we're inside a function call
function shouldTriggerSignatureHelp(view: EditorView): { trigger: boolean; pos: number } {
  const pos = view.state.selection.main.head
  const line = view.state.doc.lineAt(pos)
  const textBefore = line.text.slice(0, pos - line.from)

  // Count parentheses to see if we're inside a call
  let depth = 0
  let openParenPos = -1

  for (let i = textBefore.length - 1; i >= 0; i--) {
    const c = textBefore[i]
    if (c === ')') {
      depth++
    } else if (c === '(') {
      if (depth === 0) {
        openParenPos = line.from + i
        break
      }
      depth--
    }
  }

  return {
    trigger: openParenPos >= 0,
    pos: openParenPos >= 0 ? openParenPos + 1 : pos
  }
}

// Debounce utility
function debounce<T extends (...args: unknown[]) => void>(fn: T, delay: number): T {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  return ((...args: unknown[]) => {
    if (timeoutId) clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }) as T
}

// ViewPlugin to handle signature help
class SignatureHelpPlugin {
  private pendingRequest = false

  constructor(readonly view: EditorView) {}

  update(update: ViewUpdate) {
    // Check on selection change or doc change
    if (update.selectionSet || update.docChanged) {
      this.checkSignatureHelp()
    }
  }

  private checkSignatureHelp = debounce(() => {
    this.requestSignatureHelp()
  }, 100)

  private async requestSignatureHelp() {
    if (this.pendingRequest) return
    this.pendingRequest = true

    try {
      const filePath = this.view.state.field(filePathField)
      if (!filePath) {
        this.clearSignatureHelp()
        return
      }

      const { trigger, pos } = shouldTriggerSignatureHelp(this.view)
      if (!trigger) {
        this.clearSignatureHelp()
        return
      }

      const lspStore = useLSPStore.getState()
      if (!lspStore.connected) {
        this.clearSignatureHelp()
        return
      }

      // Get cursor position
      const cursorPos = this.view.state.selection.main.head
      const line = this.view.state.doc.lineAt(cursorPos)
      const lineNumber = line.number - 1 // LSP uses 0-indexed
      const character = cursorPos - line.from

      const result = await lspStore.requestSignatureHelp(filePath, lineNumber, character)

      if (result && result.signatures && result.signatures.length > 0) {
        this.view.dispatch({
          effects: setSignatureHelpEffect.of({ help: result, pos })
        })
      } else {
        this.clearSignatureHelp()
      }
    } catch (error) {
      console.error('[Signature Help] Error:', error)
      this.clearSignatureHelp()
    } finally {
      this.pendingRequest = false
    }
  }

  private clearSignatureHelp() {
    const currentState = this.view.state.field(signatureHelpField)
    if (currentState.help) {
      this.view.dispatch({
        effects: setSignatureHelpEffect.of({ help: null, pos: -1 })
      })
    }
  }

  destroy() {
    // Cleanup
  }
}

const signatureHelpPlugin = ViewPlugin.fromClass(SignatureHelpPlugin)

// Theme for signature help
const signatureHelpTheme = EditorView.theme({
  '.cm-signature-help': {
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    padding: '8px 12px',
    maxWidth: '500px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
    direction: 'ltr',
    textAlign: 'left',
    fontSize: '13px',
    fontFamily: "'Menlo', 'Monaco', 'Courier New', monospace"
  },
  '.cm-signature-label': {
    color: 'var(--text-primary)',
    marginBottom: '4px',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word'
  },
  '.cm-signature-param': {
    color: '#9cdcfe'
  },
  '.cm-signature-param-active': {
    color: '#4ec9b0',
    fontWeight: 'bold',
    textDecoration: 'underline'
  },
  '.cm-signature-param-doc': {
    color: '#6a9955',
    fontSize: '12px',
    marginTop: '6px',
    paddingTop: '6px',
    borderTop: '1px solid var(--border)'
  },
  '.cm-signature-doc': {
    color: 'var(--text-secondary)',
    fontSize: '12px',
    marginTop: '6px',
    paddingTop: '6px',
    borderTop: '1px solid var(--border)'
  },
  '.cm-signature-counter': {
    color: 'var(--text-secondary)',
    fontSize: '11px',
    marginTop: '6px',
    textAlign: 'right'
  }
})

// Export the signature help extension
export function lspSignatureHelpExtension(): Extension {
  return [
    signatureHelpField,
    signatureHelpPlugin,
    signatureHelpTooltipExtension,
    signatureHelpTheme
  ]
}
