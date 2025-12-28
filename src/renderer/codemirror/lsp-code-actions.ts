import { keymap, EditorView, Decoration, DecorationSet, WidgetType, ViewPlugin, ViewUpdate } from '@codemirror/view'
import { Extension, StateField, StateEffect, RangeSetBuilder } from '@codemirror/state'
import { filePathField } from './lsp-completion'
import { useLSPStore, LSPCodeAction, LSPCommand, LSPWorkspaceEdit, TextEdit, Diagnostic } from '../stores/useLSPStore'

// Code action menu state
interface CodeActionMenuState {
  visible: boolean
  actions: (LSPCodeAction | LSPCommand)[]
  line: number
  x: number
  y: number
}

// Effect to show/hide code action menu
const showCodeActionMenuEffect = StateEffect.define<CodeActionMenuState | null>()

// StateField to hold menu state
const codeActionMenuStateField = StateField.define<CodeActionMenuState | null>({
  create: () => null,
  update: (value, tr) => {
    for (const e of tr.effects) {
      if (e.is(showCodeActionMenuEffect)) {
        return e.value
      }
    }
    return value
  }
})

// Light bulb widget
class LightBulbWidget extends WidgetType {
  constructor(readonly line: number, readonly hasActions: boolean) {
    super()
  }

  toDOM(view: EditorView): HTMLElement {
    const span = document.createElement('span')
    span.className = 'cm-lightbulb'
    span.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>`
    span.title = 'إجراءات الكود (Ctrl+.)'
    span.onclick = (e) => {
      e.preventDefault()
      e.stopPropagation()
      showCodeActionsAtLine(view, this.line)
    }
    return span
  }

  ignoreEvent(): boolean {
    return false
  }
}

// Convert URI to file path
function uriToPath(uri: string): string {
  return decodeURI(uri.replace('file://', ''))
}

// Apply workspace edit
async function applyWorkspaceEdit(view: EditorView, edit: LSPWorkspaceEdit, filePath: string): Promise<boolean> {
  let currentFileEdits: TextEdit[] = []

  if (edit.changes) {
    for (const [uri, edits] of Object.entries(edit.changes)) {
      const path = uriToPath(uri)
      if (path === filePath) {
        currentFileEdits = edits
      }
      // TODO: Handle edits to other files
    }
  }

  if (edit.documentChanges) {
    for (const docChange of edit.documentChanges) {
      const path = uriToPath(docChange.textDocument.uri)
      if (path === filePath) {
        currentFileEdits = docChange.edits
      }
    }
  }

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
    return true
  }

  return false
}

// Execute a code action
async function executeCodeAction(view: EditorView, action: LSPCodeAction | LSPCommand): Promise<boolean> {
  const filePath = view.state.field(filePathField)
  if (!filePath) return false

  // Close the menu
  view.dispatch({
    effects: showCodeActionMenuEffect.of(null)
  })

  // Check if it's a CodeAction with edit
  if ('edit' in action && action.edit) {
    await applyWorkspaceEdit(view, action.edit, filePath)
  }

  // Check if it has a command to execute
  if ('command' in action && action.command) {
    // TODO: Execute command via LSP
    console.log('[Code Action] Would execute command:', action.command)
  }

  view.focus()
  return true
}

// Show code actions at a specific line
async function showCodeActionsAtLine(view: EditorView, lineNumber: number): Promise<boolean> {
  const filePath = view.state.field(filePathField)
  if (!filePath) return false

  const lspStore = useLSPStore.getState()
  if (!lspStore.connected) return false

  // Get the line info
  const line = view.state.doc.line(lineNumber)
  const startLine = lineNumber - 1 // LSP 0-indexed
  const endLine = lineNumber - 1

  // Get diagnostics for this line
  const allDiagnostics = lspStore.diagnostics
  const uri = `file://${filePath}`
  const fileDiagnostics = allDiagnostics[uri] || allDiagnostics[decodeURI(uri)] || []
  const lineDiagnostics = fileDiagnostics.filter(
    d => d.range.start.line === startLine || d.range.end.line === startLine
  )

  try {
    const actions = await lspStore.requestCodeActions(
      filePath,
      startLine,
      0,
      endLine,
      line.length,
      lineDiagnostics
    )

    if (!actions || actions.length === 0) {
      return false
    }

    // Calculate menu position
    const lineDOM = view.lineBlockAt(line.from)
    const coords = view.coordsAtPos(line.from)

    view.dispatch({
      effects: showCodeActionMenuEffect.of({
        visible: true,
        actions,
        line: lineNumber,
        x: coords?.left || 0,
        y: (coords?.bottom || 0) + 4
      })
    })

    return true
  } catch (error) {
    console.error('[LSP Code Actions] Error:', error)
    return false
  }
}

// Show code actions at cursor
async function showCodeActionsAtCursor(view: EditorView): Promise<boolean> {
  const pos = view.state.selection.main.head
  const line = view.state.doc.lineAt(pos)
  return showCodeActionsAtLine(view, line.number)
}

// Close code action menu
function closeCodeActionMenu(view: EditorView): void {
  view.dispatch({
    effects: showCodeActionMenuEffect.of(null)
  })
}

// Code action menu DOM element
let menuElement: HTMLElement | null = null

// Create and manage the menu element
function updateCodeActionMenu(view: EditorView): void {
  const state = view.state.field(codeActionMenuStateField)

  if (!state?.visible) {
    if (menuElement) {
      menuElement.remove()
      menuElement = null
    }
    return
  }

  if (!menuElement) {
    menuElement = document.createElement('div')
    menuElement.className = 'cm-code-action-menu'
    document.body.appendChild(menuElement)
  }

  // Position the menu
  menuElement.style.left = `${state.x}px`
  menuElement.style.top = `${state.y}px`

  // Clear and rebuild content
  menuElement.innerHTML = ''

  // Header
  const header = document.createElement('div')
  header.className = 'cm-code-action-header'
  header.textContent = 'إجراءات الكود'
  menuElement.appendChild(header)

  // Action items
  for (const action of state.actions) {
    const item = document.createElement('div')
    item.className = 'cm-code-action-item'

    // Icon based on action kind
    const icon = document.createElement('span')
    icon.className = 'cm-code-action-icon'

    const kind = 'kind' in action ? action.kind : ''
    if (kind?.includes('quickfix')) {
      icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>`
    } else if (kind?.includes('refactor')) {
      icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>`
    } else {
      icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`
    }

    const title = document.createElement('span')
    title.className = 'cm-code-action-title'
    title.textContent = action.title

    // Preferred badge
    if ('isPreferred' in action && action.isPreferred) {
      const badge = document.createElement('span')
      badge.className = 'cm-code-action-preferred'
      badge.textContent = 'مفضل'
      item.appendChild(badge)
    }

    item.appendChild(icon)
    item.appendChild(title)

    item.onclick = () => {
      executeCodeAction(view, action)
    }

    menuElement.appendChild(item)
  }

  // Close on outside click
  const closeHandler = (e: MouseEvent) => {
    if (menuElement && !menuElement.contains(e.target as Node)) {
      closeCodeActionMenu(view)
      document.removeEventListener('mousedown', closeHandler)
    }
  }
  document.addEventListener('mousedown', closeHandler)
}

// View plugin to manage the menu
const codeActionMenuPlugin = ViewPlugin.fromClass(class {
  constructor(view: EditorView) {
    updateCodeActionMenu(view)
  }

  update(update: ViewUpdate) {
    if (update.state.field(codeActionMenuStateField) !== update.startState.field(codeActionMenuStateField)) {
      updateCodeActionMenu(update.view)
    }
  }

  destroy() {
    if (menuElement) {
      menuElement.remove()
      menuElement = null
    }
  }
})

// Light bulb decorations based on diagnostics
const lightBulbField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update: (decorations, tr) => {
    // Rebuild decorations when document or diagnostics change
    // For now, we'll show light bulbs on lines with errors
    return decorations.map(tr.changes)
  }
})

// View plugin to show light bulbs on lines with diagnostics
const lightBulbPlugin = ViewPlugin.fromClass(class {
  decorations: DecorationSet = Decoration.none

  constructor(readonly view: EditorView) {
    this.updateDecorations()
  }

  update(update: ViewUpdate) {
    if (update.docChanged || update.viewportChanged) {
      this.updateDecorations()
    }
  }

  updateDecorations() {
    const filePath = this.view.state.field(filePathField)
    if (!filePath) {
      this.decorations = Decoration.none
      return
    }

    const lspStore = useLSPStore.getState()
    const uri = `file://${filePath}`
    const diagnostics = lspStore.diagnostics[uri] || lspStore.diagnostics[decodeURI(uri)] || []

    if (diagnostics.length === 0) {
      this.decorations = Decoration.none
      return
    }

    const builder = new RangeSetBuilder<Decoration>()
    const seenLines = new Set<number>()

    // Sort diagnostics by line
    const sortedDiagnostics = [...diagnostics].sort((a, b) => a.range.start.line - b.range.start.line)

    for (const diag of sortedDiagnostics) {
      const lineNum = diag.range.start.line + 1 // Convert to 1-indexed
      if (seenLines.has(lineNum)) continue
      seenLines.add(lineNum)

      try {
        const line = this.view.state.doc.line(lineNum)
        const deco = Decoration.widget({
          widget: new LightBulbWidget(lineNum, true),
          side: -1
        })
        builder.add(line.from, line.from, deco)
      } catch {
        // Line doesn't exist
      }
    }

    this.decorations = builder.finish()
  }
}, {
  decorations: v => v.decorations
})

// Ctrl+. keymap for code actions
const codeActionKeymap = keymap.of([
  {
    key: 'Ctrl-.',
    mac: 'Cmd-.',
    run: (view) => {
      showCodeActionsAtCursor(view)
      return true
    }
  },
  {
    key: 'Escape',
    run: (view) => {
      const state = view.state.field(codeActionMenuStateField)
      if (state?.visible) {
        closeCodeActionMenu(view)
        return true
      }
      return false
    }
  }
])

// Theme for code actions
const codeActionTheme = EditorView.theme({
  '.cm-lightbulb': {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '18px',
    height: '18px',
    marginRight: '4px',
    color: '#dcdcaa',
    cursor: 'pointer',
    opacity: 0.7,
    transition: 'opacity 0.15s'
  },
  '.cm-lightbulb:hover': {
    opacity: 1,
    color: '#ffd54f'
  },
  '.cm-code-action-menu': {
    position: 'fixed',
    zIndex: 1000,
    minWidth: '200px',
    maxWidth: '400px',
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
    overflow: 'hidden',
    direction: 'rtl'
  },
  '.cm-code-action-header': {
    padding: '8px 12px',
    backgroundColor: 'var(--bg-primary)',
    borderBottom: '1px solid var(--border)',
    color: 'var(--text-secondary)',
    fontSize: '11px',
    fontWeight: 500,
    textTransform: 'uppercase'
  },
  '.cm-code-action-item': {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    cursor: 'pointer',
    direction: 'ltr'
  },
  '.cm-code-action-item:hover': {
    backgroundColor: 'var(--bg-hover, rgba(255, 255, 255, 0.05))'
  },
  '.cm-code-action-icon': {
    display: 'flex',
    alignItems: 'center',
    color: 'var(--accent)'
  },
  '.cm-code-action-title': {
    flex: 1,
    color: 'var(--text-primary)',
    fontSize: '13px'
  },
  '.cm-code-action-preferred': {
    padding: '2px 6px',
    backgroundColor: 'rgba(78, 201, 176, 0.2)',
    color: '#4ec9b0',
    fontSize: '10px',
    borderRadius: '3px'
  }
})

// Export the code actions extension
export function lspCodeActionsExtension(): Extension {
  return [
    codeActionMenuStateField,
    codeActionMenuPlugin,
    lightBulbPlugin,
    codeActionKeymap,
    codeActionTheme
  ]
}
