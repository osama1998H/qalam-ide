import { keymap, EditorView, showPanel, Panel } from '@codemirror/view'
import { Extension, StateField, StateEffect } from '@codemirror/state'
import { filePathField } from './lsp-completion'
import { useLSPStore } from '../stores/useLSPStore'

// LSP Location type
interface LSPLocation {
  uri: string
  range: {
    start: { line: number; character: number }
    end: { line: number; character: number }
  }
}

// Peek definition state
interface PeekState {
  visible: boolean
  filePath: string
  content: string
  line: number
  character: number
  targetLine: number
}

// Effect to show/hide peek panel
const showPeekEffect = StateEffect.define<PeekState | null>()

// StateField to hold peek state
const peekStateField = StateField.define<PeekState | null>({
  create: () => null,
  update: (value, tr) => {
    for (const e of tr.effects) {
      if (e.is(showPeekEffect)) {
        return e.value
      }
    }
    return value
  }
})

// Close peek panel
function closePeekPanel(view: EditorView): void {
  view.dispatch({
    effects: showPeekEffect.of(null)
  })
}

// Peek panel extension - uses showPanel.from to create panel based on state
const peekPanelExtension = showPanel.from(peekStateField, (peekState) => {
  if (!peekState?.visible) return null

  // Return a function that creates the panel using the peekState value
  return (view: EditorView): Panel => {
    const dom = document.createElement('div')
    dom.className = 'cm-peek-panel'

    // Header
    const header = document.createElement('div')
    header.className = 'cm-peek-header'

    const title = document.createElement('span')
    title.className = 'cm-peek-title'
    title.textContent = peekState.filePath.split('/').pop() || peekState.filePath

    const location = document.createElement('span')
    location.className = 'cm-peek-location'
    location.textContent = `:${peekState.targetLine}`

    const closeBtn = document.createElement('button')
    closeBtn.className = 'cm-peek-close'
    closeBtn.innerHTML = '×'
    closeBtn.title = 'إغلاق (Escape)'
    closeBtn.onclick = () => closePeekPanel(view)

    const gotoBtn = document.createElement('button')
    gotoBtn.className = 'cm-peek-goto'
    gotoBtn.textContent = 'انتقال'
    gotoBtn.title = 'الانتقال إلى التعريف'
    gotoBtn.onclick = () => {
      closePeekPanel(view)
      if (navigationCallback) {
        navigationCallback(peekState.filePath, peekState.targetLine, peekState.character)
      }
    }

    header.appendChild(title)
    header.appendChild(location)
    header.appendChild(gotoBtn)
    header.appendChild(closeBtn)

    // Content area with code preview
    const content = document.createElement('div')
    content.className = 'cm-peek-content'

    // Show lines around the target
    const lines = peekState.content.split('\n')
    const startLine = Math.max(0, peekState.targetLine - 4)
    const endLine = Math.min(lines.length, peekState.targetLine + 6)

    for (let i = startLine; i < endLine; i++) {
      const lineDiv = document.createElement('div')
      lineDiv.className = 'cm-peek-line'
      if (i === peekState.targetLine - 1) {
        lineDiv.className += ' cm-peek-line-highlight'
      }

      const lineNum = document.createElement('span')
      lineNum.className = 'cm-peek-line-number'
      lineNum.textContent = String(i + 1)

      const lineContent = document.createElement('span')
      lineContent.className = 'cm-peek-line-content'
      lineContent.textContent = lines[i] || ''

      lineDiv.appendChild(lineNum)
      lineDiv.appendChild(lineContent)
      content.appendChild(lineDiv)
    }

    dom.appendChild(header)
    dom.appendChild(content)

    return {
      dom,
      top: false // Show at bottom
    }
  }
})

// Callback type for navigation
type NavigateCallback = (filePath: string, line: number, character: number) => void

// Store the navigation callback globally so the extension can access it
let navigationCallback: NavigateCallback | null = null

// Set the navigation callback (called from Editor.tsx)
export function setGotoDefinitionCallback(callback: NavigateCallback | null): void {
  navigationCallback = callback
}

// Convert URI to file path
function uriToPath(uri: string): string {
  return decodeURI(uri.replace('file://', ''))
}

// Go to definition at cursor position
async function gotoDefinitionAtCursor(view: EditorView): Promise<boolean> {
  const filePath = view.state.field(filePathField)
  if (!filePath) return false

  const lspStore = useLSPStore.getState()
  if (!lspStore.connected) return false

  // Get cursor position
  const pos = view.state.selection.main.head
  const line = view.state.doc.lineAt(pos)
  const lineNumber = line.number - 1 // LSP uses 0-indexed
  const character = pos - line.from

  try {
    const result = await lspStore.requestDefinition(filePath, lineNumber, character)

    if (!result) return false

    // Handle different response formats
    let location: LSPLocation | null = null

    if (Array.isArray(result)) {
      // LocationLink[] or Location[]
      if (result.length > 0) {
        const first = result[0]
        if ('targetUri' in first) {
          // LocationLink
          location = {
            uri: first.targetUri,
            range: first.targetSelectionRange || first.targetRange
          }
        } else if ('uri' in first) {
          // Location
          location = first
        }
      }
    } else if ('uri' in result) {
      // Single Location
      location = result
    }

    if (!location) return false

    const targetPath = uriToPath(location.uri)
    const targetLine = location.range.start.line + 1 // Convert to 1-indexed
    const targetChar = location.range.start.character

    // Check if it's the same file
    if (targetPath === filePath) {
      // Navigate within the same file
      const targetLineInfo = view.state.doc.line(targetLine)
      const targetPos = targetLineInfo.from + Math.min(targetChar, targetLineInfo.length)

      view.dispatch({
        selection: { anchor: targetPos },
        scrollIntoView: true,
        effects: EditorView.scrollIntoView(targetPos, { y: 'center' })
      })
      view.focus()
      return true
    } else {
      // Navigate to different file - use callback
      if (navigationCallback) {
        navigationCallback(targetPath, targetLine, targetChar)
        return true
      }
    }

    return false
  } catch (error) {
    console.error('[LSP Go To Definition] Error:', error)
    return false
  }
}

// Go to definition at a specific position (for Ctrl+Click)
async function gotoDefinitionAtPosition(view: EditorView, pos: number): Promise<boolean> {
  const filePath = view.state.field(filePathField)
  if (!filePath) return false

  const lspStore = useLSPStore.getState()
  if (!lspStore.connected) return false

  const line = view.state.doc.lineAt(pos)
  const lineNumber = line.number - 1
  const character = pos - line.from

  try {
    const result = await lspStore.requestDefinition(filePath, lineNumber, character)

    if (!result) return false

    // Handle different response formats (same as above)
    let location: LSPLocation | null = null

    if (Array.isArray(result)) {
      if (result.length > 0) {
        const first = result[0]
        if ('targetUri' in first) {
          location = {
            uri: first.targetUri,
            range: first.targetSelectionRange || first.targetRange
          }
        } else if ('uri' in first) {
          location = first
        }
      }
    } else if ('uri' in result) {
      location = result
    }

    if (!location) return false

    const targetPath = uriToPath(location.uri)
    const targetLine = location.range.start.line + 1
    const targetChar = location.range.start.character

    if (targetPath === filePath) {
      const targetLineInfo = view.state.doc.line(targetLine)
      const targetPos = targetLineInfo.from + Math.min(targetChar, targetLineInfo.length)

      view.dispatch({
        selection: { anchor: targetPos },
        scrollIntoView: true,
        effects: EditorView.scrollIntoView(targetPos, { y: 'center' })
      })
      view.focus()
      return true
    } else {
      if (navigationCallback) {
        navigationCallback(targetPath, targetLine, targetChar)
        return true
      }
    }

    return false
  } catch (error) {
    console.error('[LSP Go To Definition] Error:', error)
    return false
  }
}

// Peek definition at cursor position
async function peekDefinitionAtCursor(view: EditorView): Promise<boolean> {
  const filePath = view.state.field(filePathField)
  if (!filePath) return false

  const lspStore = useLSPStore.getState()
  if (!lspStore.connected) return false

  const pos = view.state.selection.main.head
  const line = view.state.doc.lineAt(pos)
  const lineNumber = line.number - 1
  const character = pos - line.from

  try {
    const result = await lspStore.requestDefinition(filePath, lineNumber, character)

    if (!result) return false

    let location: LSPLocation | null = null

    if (Array.isArray(result)) {
      if (result.length > 0) {
        const first = result[0]
        if ('targetUri' in first) {
          location = {
            uri: first.targetUri,
            range: first.targetSelectionRange || first.targetRange
          }
        } else if ('uri' in first) {
          location = first
        }
      }
    } else if ('uri' in result) {
      location = result
    }

    if (!location) return false

    const targetPath = uriToPath(location.uri)
    const targetLine = location.range.start.line + 1
    const targetChar = location.range.start.character

    // Read the file content for preview
    let content = ''
    if (targetPath === filePath) {
      // Same file
      content = view.state.doc.toString()
    } else {
      // Different file - read it
      try {
        const fileResult = await window.qalam.file.read(targetPath)
        if (fileResult && fileResult.content !== undefined) {
          content = fileResult.content
        }
      } catch {
        return false
      }
    }

    // Show peek panel
    view.dispatch({
      effects: showPeekEffect.of({
        visible: true,
        filePath: targetPath,
        content,
        line: lineNumber,
        character: targetChar,
        targetLine
      })
    })

    return true
  } catch (error) {
    console.error('[LSP Peek Definition] Error:', error)
    return false
  }
}

// F12 keymap for go to definition, Alt+F12 for peek
const gotoDefinitionKeymap = keymap.of([
  {
    key: 'F12',
    run: (view) => {
      gotoDefinitionAtCursor(view)
      return true
    }
  },
  {
    key: 'Alt-F12',
    run: (view) => {
      peekDefinitionAtCursor(view)
      return true
    }
  },
  {
    key: 'Escape',
    run: (view) => {
      const state = view.state.field(peekStateField)
      if (state?.visible) {
        closePeekPanel(view)
        return true
      }
      return false
    }
  }
])

// Ctrl+Click handler
const ctrlClickHandler = EditorView.domEventHandlers({
  mousedown: (event, view) => {
    // Check for Ctrl+Click (Windows/Linux) or Cmd+Click (Mac)
    if ((event.ctrlKey || event.metaKey) && event.button === 0) {
      const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
      if (pos !== null) {
        event.preventDefault()
        gotoDefinitionAtPosition(view, pos)
        return true
      }
    }
    return false
  }
})

// Theme for hover cursor change on Ctrl
const ctrlHoverTheme = EditorView.theme({
  '&.cm-focused .cm-content': {
    cursor: 'text'
  }
})

// Extension to change cursor to pointer when Ctrl is held
const ctrlCursorHandler = EditorView.domEventHandlers({
  keydown: (event, view) => {
    if (event.key === 'Control' || event.key === 'Meta') {
      view.contentDOM.style.cursor = 'pointer'
    }
    return false
  },
  keyup: (event, view) => {
    if (event.key === 'Control' || event.key === 'Meta') {
      view.contentDOM.style.cursor = ''
    }
    return false
  },
  blur: (event, view) => {
    view.contentDOM.style.cursor = ''
    return false
  }
})

// Theme for peek panel
const peekPanelTheme = EditorView.theme({
  '.cm-peek-panel': {
    direction: 'rtl',
    backgroundColor: 'var(--bg-secondary)',
    borderTop: '1px solid var(--border)',
    maxHeight: '250px',
    display: 'flex',
    flexDirection: 'column'
  },
  '.cm-peek-header': {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 12px',
    backgroundColor: 'var(--bg-primary)',
    borderBottom: '1px solid var(--border)',
    direction: 'ltr'
  },
  '.cm-peek-title': {
    color: '#4ec9b0',
    fontWeight: 500
  },
  '.cm-peek-location': {
    color: 'var(--text-secondary)',
    fontSize: '12px'
  },
  '.cm-peek-goto': {
    marginRight: 'auto',
    marginLeft: '8px',
    padding: '2px 8px',
    backgroundColor: 'var(--accent)',
    color: 'white',
    border: 'none',
    borderRadius: '3px',
    cursor: 'pointer',
    fontSize: '12px'
  },
  '.cm-peek-goto:hover': {
    backgroundColor: '#1177bb'
  },
  '.cm-peek-close': {
    padding: '2px 8px',
    backgroundColor: 'transparent',
    color: 'var(--text-secondary)',
    border: 'none',
    borderRadius: '3px',
    cursor: 'pointer',
    fontSize: '16px',
    lineHeight: 1
  },
  '.cm-peek-close:hover': {
    backgroundColor: 'var(--bg-hover)',
    color: 'var(--text-primary)'
  },
  '.cm-peek-content': {
    overflow: 'auto',
    padding: '4px 0',
    fontFamily: "'Menlo', 'Monaco', 'Courier New', monospace",
    fontSize: '13px',
    direction: 'ltr'
  },
  '.cm-peek-line': {
    display: 'flex',
    padding: '1px 12px',
    lineHeight: '1.5'
  },
  '.cm-peek-line-highlight': {
    backgroundColor: 'rgba(255, 255, 0, 0.1)',
    borderRight: '2px solid #ffd54f'
  },
  '.cm-peek-line-number': {
    color: 'var(--text-secondary)',
    minWidth: '40px',
    textAlign: 'right',
    paddingLeft: '12px',
    userSelect: 'none'
  },
  '.cm-peek-line-content': {
    color: 'var(--text-primary)',
    whiteSpace: 'pre',
    paddingRight: '8px'
  }
})

// Export the go to definition extension
export function lspGotoDefinitionExtension(): Extension {
  return [
    peekStateField,
    peekPanelExtension,
    peekPanelTheme,
    gotoDefinitionKeymap,
    ctrlClickHandler,
    ctrlCursorHandler,
    ctrlHoverTheme
  ]
}
