import { keymap, EditorView, showPanel, Panel } from '@codemirror/view'
import { Extension, StateField, StateEffect } from '@codemirror/state'
import { filePathField } from './lsp-completion'
import { useLSPStore, LSPWorkspaceEdit, TextEdit } from '../stores/useLSPStore'

// Rename state
interface RenameState {
  visible: boolean
  originalName: string
  newName: string
  line: number
  character: number
  inputElement?: HTMLInputElement
  previewCount: number
  loading: boolean
  error?: string
}

// Effect to show/hide rename panel
const showRenameEffect = StateEffect.define<RenameState | null>()

// StateField to hold rename state
const renameStateField = StateField.define<RenameState | null>({
  create: () => null,
  update: (value, tr) => {
    for (const e of tr.effects) {
      if (e.is(showRenameEffect)) {
        return e.value
      }
    }
    return value
  }
})

// Close rename panel
function closeRenamePanel(view: EditorView): void {
  view.dispatch({
    effects: showRenameEffect.of(null)
  })
  view.focus()
}

// Callback type for applying edits across files
type ApplyEditsCallback = (edits: { filePath: string; edits: TextEdit[] }[]) => Promise<void>

// Store the apply edits callback globally
let applyEditsCallback: ApplyEditsCallback | null = null

// Set the apply edits callback (called from Editor.tsx or parent component)
export function setRenameApplyEditsCallback(callback: ApplyEditsCallback | null): void {
  applyEditsCallback = callback
}

// Convert URI to file path
function uriToPath(uri: string): string {
  return decodeURI(uri.replace('file://', ''))
}

// Get the symbol/word at cursor position
function getWordAtPosition(view: EditorView, pos: number): { word: string; from: number; to: number } {
  const line = view.state.doc.lineAt(pos)
  const text = line.text
  const offset = pos - line.from

  let start = offset
  let end = offset

  // Move start backwards to find word start
  while (start > 0 && /[\u0600-\u06FF\u0750-\u077F\w]/.test(text[start - 1])) {
    start--
  }

  // Move end forwards to find word end
  while (end < text.length && /[\u0600-\u06FF\u0750-\u077F\w]/.test(text[end])) {
    end++
  }

  return {
    word: text.slice(start, end),
    from: line.from + start,
    to: line.from + end
  }
}

// Apply rename to current file
async function applyRenameToCurrentFile(view: EditorView, workspaceEdit: LSPWorkspaceEdit, filePath: string): Promise<boolean> {
  // Extract edits for the current file
  let currentFileEdits: TextEdit[] = []
  const otherFileEdits: { filePath: string; edits: TextEdit[] }[] = []

  if (workspaceEdit.changes) {
    for (const [uri, edits] of Object.entries(workspaceEdit.changes)) {
      const path = uriToPath(uri)
      if (path === filePath) {
        currentFileEdits = edits
      } else {
        otherFileEdits.push({ filePath: path, edits })
      }
    }
  }

  if (workspaceEdit.documentChanges) {
    for (const docChange of workspaceEdit.documentChanges) {
      const path = uriToPath(docChange.textDocument.uri)
      if (path === filePath) {
        currentFileEdits = docChange.edits
      } else {
        otherFileEdits.push({ filePath: path, edits: docChange.edits })
      }
    }
  }

  // Apply edits to current file (in reverse order to preserve positions)
  if (currentFileEdits.length > 0) {
    // Sort by start position descending
    const sortedEdits = [...currentFileEdits].sort((a, b) => {
      if (b.range.start.line !== a.range.start.line) {
        return b.range.start.line - a.range.start.line
      }
      return b.range.start.character - a.range.start.character
    })

    const changes: { from: number; to: number; insert: string }[] = []
    for (const edit of sortedEdits) {
      const startLine = view.state.doc.line(edit.range.start.line + 1)
      const endLine = view.state.doc.line(edit.range.end.line + 1)
      const from = startLine.from + edit.range.start.character
      const to = endLine.from + edit.range.end.character

      changes.push({ from, to, insert: edit.newText })
    }

    view.dispatch({ changes })
  }

  // Apply edits to other files via callback
  if (otherFileEdits.length > 0 && applyEditsCallback) {
    await applyEditsCallback(otherFileEdits)
  }

  return true
}

// Execute rename
async function executeRename(view: EditorView, newName: string): Promise<boolean> {
  const filePath = view.state.field(filePathField)
  const renameState = view.state.field(renameStateField)

  if (!filePath || !renameState) return false

  const lspStore = useLSPStore.getState()
  if (!lspStore.connected) return false

  try {
    const result = await lspStore.requestRename(
      filePath,
      renameState.line,
      renameState.character,
      newName
    )

    if (!result) {
      view.dispatch({
        effects: showRenameEffect.of({
          ...renameState,
          error: 'لا يمكن إعادة التسمية'
        })
      })
      return false
    }

    // Apply the edits
    await applyRenameToCurrentFile(view, result, filePath)

    closeRenamePanel(view)
    return true
  } catch (error) {
    console.error('[LSP Rename] Error:', error)
    view.dispatch({
      effects: showRenameEffect.of({
        ...renameState,
        error: 'حدث خطأ أثناء إعادة التسمية'
      })
    })
    return false
  }
}

// Rename panel extension
const renamePanelExtension = showPanel.from(renameStateField, (renameState) => {
  if (!renameState?.visible) return null

  return (view: EditorView): Panel => {
    const dom = document.createElement('div')
    dom.className = 'cm-rename-panel'

    // Header
    const header = document.createElement('div')
    header.className = 'cm-rename-header'

    const title = document.createElement('span')
    title.className = 'cm-rename-title'
    title.textContent = 'إعادة تسمية الرمز'

    const closeBtn = document.createElement('button')
    closeBtn.className = 'cm-rename-close'
    closeBtn.innerHTML = '×'
    closeBtn.title = 'إلغاء (Escape)'
    closeBtn.onclick = () => closeRenamePanel(view)

    header.appendChild(title)
    header.appendChild(closeBtn)

    // Content area
    const content = document.createElement('div')
    content.className = 'cm-rename-content'

    // Original name label
    const originalLabel = document.createElement('div')
    originalLabel.className = 'cm-rename-label'
    originalLabel.textContent = `الاسم الحالي: ${renameState.originalName}`

    // Input container
    const inputContainer = document.createElement('div')
    inputContainer.className = 'cm-rename-input-container'

    const inputLabel = document.createElement('label')
    inputLabel.textContent = 'الاسم الجديد:'
    inputLabel.className = 'cm-rename-input-label'

    const input = document.createElement('input')
    input.type = 'text'
    input.className = 'cm-rename-input'
    input.value = renameState.newName || renameState.originalName
    input.placeholder = 'أدخل الاسم الجديد'

    // Handle Enter to confirm, Escape to cancel
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        const newName = input.value.trim()
        if (newName && newName !== renameState.originalName) {
          executeRename(view, newName)
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        closeRenamePanel(view)
      }
    })

    inputContainer.appendChild(inputLabel)
    inputContainer.appendChild(input)

    // Error message
    if (renameState.error) {
      const errorDiv = document.createElement('div')
      errorDiv.className = 'cm-rename-error'
      errorDiv.textContent = renameState.error
      content.appendChild(errorDiv)
    }

    // Buttons
    const buttons = document.createElement('div')
    buttons.className = 'cm-rename-buttons'

    const cancelBtn = document.createElement('button')
    cancelBtn.className = 'cm-rename-btn cm-rename-btn-cancel'
    cancelBtn.textContent = 'إلغاء'
    cancelBtn.onclick = () => closeRenamePanel(view)

    const confirmBtn = document.createElement('button')
    confirmBtn.className = 'cm-rename-btn cm-rename-btn-confirm'
    confirmBtn.textContent = 'تأكيد'
    confirmBtn.onclick = () => {
      const newName = input.value.trim()
      if (newName && newName !== renameState.originalName) {
        executeRename(view, newName)
      }
    }

    buttons.appendChild(cancelBtn)
    buttons.appendChild(confirmBtn)

    content.appendChild(originalLabel)
    content.appendChild(inputContainer)
    content.appendChild(buttons)

    dom.appendChild(header)
    dom.appendChild(content)

    // Focus the input after DOM is attached
    setTimeout(() => {
      input.focus()
      input.select()
    }, 0)

    return {
      dom,
      top: true // Show at top
    }
  }
})

// Start rename at cursor position
async function startRenameAtCursor(view: EditorView): Promise<boolean> {
  const filePath = view.state.field(filePathField)
  if (!filePath) return false

  const lspStore = useLSPStore.getState()
  if (!lspStore.connected) return false

  // Get cursor position
  const pos = view.state.selection.main.head
  const line = view.state.doc.lineAt(pos)
  const lineNumber = line.number - 1 // LSP uses 0-indexed
  const character = pos - line.from

  // Get the word at cursor
  const { word } = getWordAtPosition(view, pos)

  if (!word) return false

  // Try prepare rename to validate
  try {
    const prepareResult = await lspStore.requestPrepareRename(filePath, lineNumber, character)

    // If prepare rename fails or returns null, the position might not be renamable
    // But we'll still show the dialog and let the actual rename fail if needed
    const placeholder = prepareResult?.placeholder || word

    // Show rename panel
    view.dispatch({
      effects: showRenameEffect.of({
        visible: true,
        originalName: placeholder,
        newName: placeholder,
        line: lineNumber,
        character,
        previewCount: 0,
        loading: false
      })
    })

    return true
  } catch (error) {
    console.error('[LSP Prepare Rename] Error:', error)
    // Still try to show rename dialog with the word
    view.dispatch({
      effects: showRenameEffect.of({
        visible: true,
        originalName: word,
        newName: word,
        line: lineNumber,
        character,
        previewCount: 0,
        loading: false
      })
    })
    return true
  }
}

// F2 keymap for rename
const renameKeymap = keymap.of([
  {
    key: 'F2',
    run: (view) => {
      startRenameAtCursor(view)
      return true
    }
  },
  {
    key: 'Escape',
    run: (view) => {
      const state = view.state.field(renameStateField)
      if (state?.visible) {
        closeRenamePanel(view)
        return true
      }
      return false
    }
  }
])

// Theme for rename panel
const renamePanelTheme = EditorView.theme({
  '.cm-rename-panel': {
    direction: 'rtl',
    backgroundColor: 'var(--bg-secondary)',
    borderBottom: '1px solid var(--border)',
    padding: '0'
  },
  '.cm-rename-header': {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    backgroundColor: 'var(--bg-primary)',
    borderBottom: '1px solid var(--border)'
  },
  '.cm-rename-title': {
    color: '#dcdcaa',
    fontWeight: 500,
    fontSize: '13px'
  },
  '.cm-rename-close': {
    padding: '2px 8px',
    backgroundColor: 'transparent',
    color: 'var(--text-secondary)',
    border: 'none',
    borderRadius: '3px',
    cursor: 'pointer',
    fontSize: '16px',
    lineHeight: 1
  },
  '.cm-rename-close:hover': {
    backgroundColor: 'var(--bg-hover)',
    color: 'var(--text-primary)'
  },
  '.cm-rename-content': {
    padding: '12px'
  },
  '.cm-rename-label': {
    color: 'var(--text-secondary)',
    fontSize: '12px',
    marginBottom: '8px'
  },
  '.cm-rename-input-container': {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px'
  },
  '.cm-rename-input-label': {
    color: 'var(--text-primary)',
    fontSize: '13px',
    whiteSpace: 'nowrap'
  },
  '.cm-rename-input': {
    flex: 1,
    padding: '6px 10px',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border)',
    borderRadius: '4px',
    color: 'var(--text-primary)',
    fontSize: '13px',
    fontFamily: "'Menlo', 'Monaco', 'Courier New', monospace",
    direction: 'ltr',
    textAlign: 'left'
  },
  '.cm-rename-input:focus': {
    outline: 'none',
    borderColor: 'var(--accent)'
  },
  '.cm-rename-error': {
    color: '#f44747',
    fontSize: '12px',
    marginBottom: '8px',
    padding: '6px 10px',
    backgroundColor: 'rgba(244, 71, 71, 0.1)',
    borderRadius: '4px'
  },
  '.cm-rename-buttons': {
    display: 'flex',
    gap: '8px',
    justifyContent: 'flex-start'
  },
  '.cm-rename-btn': {
    padding: '6px 16px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 500
  },
  '.cm-rename-btn-cancel': {
    backgroundColor: 'var(--bg-primary)',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border)'
  },
  '.cm-rename-btn-cancel:hover': {
    backgroundColor: 'var(--bg-hover)'
  },
  '.cm-rename-btn-confirm': {
    backgroundColor: 'var(--accent)',
    color: 'white'
  },
  '.cm-rename-btn-confirm:hover': {
    backgroundColor: '#1177bb'
  }
})

// Export the rename extension
export function lspRenameExtension(): Extension {
  return [
    renameStateField,
    renamePanelExtension,
    renamePanelTheme,
    renameKeymap
  ]
}
