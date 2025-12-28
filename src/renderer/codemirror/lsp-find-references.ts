import { keymap, EditorView, showPanel, Panel } from '@codemirror/view'
import { Extension, StateField, StateEffect } from '@codemirror/state'
import { filePathField } from './lsp-completion'
import { useLSPStore, LSPLocation } from '../stores/useLSPStore'

// Reference with file content for preview
interface ReferenceWithContent {
  filePath: string
  line: number
  character: number
  endLine: number
  endCharacter: number
  lineContent: string
}

// Grouped references by file
interface GroupedReferences {
  filePath: string
  fileName: string
  references: ReferenceWithContent[]
}

// References panel state
interface ReferencesState {
  visible: boolean
  symbolName: string
  groupedReferences: GroupedReferences[]
  totalCount: number
  loading: boolean
}

// Effect to show/hide references panel
const showReferencesEffect = StateEffect.define<ReferencesState | null>()

// StateField to hold references state
const referencesStateField = StateField.define<ReferencesState | null>({
  create: () => null,
  update: (value, tr) => {
    for (const e of tr.effects) {
      if (e.is(showReferencesEffect)) {
        return e.value
      }
    }
    return value
  }
})

// Close references panel
function closeReferencesPanel(view: EditorView): void {
  view.dispatch({
    effects: showReferencesEffect.of(null)
  })
}

// Callback type for navigation
type NavigateCallback = (filePath: string, line: number, character: number) => void

// Store the navigation callback globally
let navigationCallback: NavigateCallback | null = null

// Set the navigation callback (called from Editor.tsx)
export function setFindReferencesCallback(callback: NavigateCallback | null): void {
  navigationCallback = callback
}

// Convert URI to file path
function uriToPath(uri: string): string {
  return decodeURI(uri.replace('file://', ''))
}

// Get the symbol/word at cursor position
function getWordAtPosition(view: EditorView, pos: number): string {
  const line = view.state.doc.lineAt(pos)
  const text = line.text
  const offset = pos - line.from

  // Find word boundaries (Arabic letters, English letters, numbers, underscore)
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

  return text.slice(start, end)
}

// References panel extension
const referencesPanelExtension = showPanel.from(referencesStateField, (refsState) => {
  if (!refsState?.visible) return null

  return (view: EditorView): Panel => {
    const dom = document.createElement('div')
    dom.className = 'cm-references-panel'

    // Header
    const header = document.createElement('div')
    header.className = 'cm-references-header'

    const title = document.createElement('span')
    title.className = 'cm-references-title'

    if (refsState.loading) {
      title.textContent = 'جاري البحث...'
    } else {
      title.textContent = `المراجع: ${refsState.symbolName} (${refsState.totalCount})`
    }

    const closeBtn = document.createElement('button')
    closeBtn.className = 'cm-references-close'
    closeBtn.innerHTML = '×'
    closeBtn.title = 'إغلاق (Escape)'
    closeBtn.onclick = () => closeReferencesPanel(view)

    header.appendChild(title)
    header.appendChild(closeBtn)

    // Content area with grouped references
    const content = document.createElement('div')
    content.className = 'cm-references-content'

    if (refsState.loading) {
      const loading = document.createElement('div')
      loading.className = 'cm-references-loading'
      loading.textContent = 'جاري البحث عن المراجع...'
      content.appendChild(loading)
    } else if (refsState.groupedReferences.length === 0) {
      const empty = document.createElement('div')
      empty.className = 'cm-references-empty'
      empty.textContent = 'لم يتم العثور على مراجع'
      content.appendChild(empty)
    } else {
      // Show grouped references
      for (const group of refsState.groupedReferences) {
        const fileGroup = document.createElement('div')
        fileGroup.className = 'cm-references-file-group'

        // File header
        const fileHeader = document.createElement('div')
        fileHeader.className = 'cm-references-file-header'

        const fileIcon = document.createElement('span')
        fileIcon.className = 'cm-references-file-icon'
        fileIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>`

        const fileName = document.createElement('span')
        fileName.className = 'cm-references-file-name'
        fileName.textContent = group.fileName

        const refCount = document.createElement('span')
        refCount.className = 'cm-references-file-count'
        refCount.textContent = `(${group.references.length})`

        fileHeader.appendChild(fileIcon)
        fileHeader.appendChild(fileName)
        fileHeader.appendChild(refCount)

        // Reference items
        const refList = document.createElement('div')
        refList.className = 'cm-references-list'

        for (const ref of group.references) {
          const refItem = document.createElement('div')
          refItem.className = 'cm-references-item'
          refItem.onclick = () => {
            closeReferencesPanel(view)
            if (navigationCallback) {
              navigationCallback(ref.filePath, ref.line, ref.character)
            }
          }

          const lineNum = document.createElement('span')
          lineNum.className = 'cm-references-line-num'
          lineNum.textContent = String(ref.line)

          const lineContent = document.createElement('span')
          lineContent.className = 'cm-references-line-content'
          lineContent.textContent = ref.lineContent.trim()

          refItem.appendChild(lineNum)
          refItem.appendChild(lineContent)
          refList.appendChild(refItem)
        }

        fileGroup.appendChild(fileHeader)
        fileGroup.appendChild(refList)
        content.appendChild(fileGroup)
      }
    }

    dom.appendChild(header)
    dom.appendChild(content)

    return {
      dom,
      top: false // Show at bottom
    }
  }
})

// Find all references at cursor position
async function findReferencesAtCursor(view: EditorView): Promise<boolean> {
  const filePath = view.state.field(filePathField)
  if (!filePath) return false

  const lspStore = useLSPStore.getState()
  if (!lspStore.connected) return false

  // Get cursor position
  const pos = view.state.selection.main.head
  const line = view.state.doc.lineAt(pos)
  const lineNumber = line.number - 1 // LSP uses 0-indexed
  const character = pos - line.from

  // Get symbol name for display
  const symbolName = getWordAtPosition(view, pos)

  // Show loading state
  view.dispatch({
    effects: showReferencesEffect.of({
      visible: true,
      symbolName,
      groupedReferences: [],
      totalCount: 0,
      loading: true
    })
  })

  try {
    const result = await lspStore.requestReferences(filePath, lineNumber, character, true)

    if (!result || result.length === 0) {
      view.dispatch({
        effects: showReferencesEffect.of({
          visible: true,
          symbolName,
          groupedReferences: [],
          totalCount: 0,
          loading: false
        })
      })
      return true
    }

    // Group references by file and load content
    const groupedMap = new Map<string, ReferenceWithContent[]>()

    for (const location of result) {
      const refPath = uriToPath(location.uri)
      const refLine = location.range.start.line + 1 // Convert to 1-indexed
      const refChar = location.range.start.character
      const refEndLine = location.range.end.line + 1
      const refEndChar = location.range.end.character

      // Get line content
      let lineContent = ''
      if (refPath === filePath) {
        // Same file - get from current view
        const targetLine = view.state.doc.line(refLine)
        lineContent = targetLine.text
      } else {
        // Different file - need to read it
        try {
          const fileResult = await window.qalam.file.read(refPath)
          if (fileResult && fileResult.content !== undefined) {
            const lines = fileResult.content.split('\n')
            lineContent = lines[refLine - 1] || ''
          }
        } catch {
          lineContent = '(لا يمكن قراءة الملف)'
        }
      }

      const ref: ReferenceWithContent = {
        filePath: refPath,
        line: refLine,
        character: refChar,
        endLine: refEndLine,
        endCharacter: refEndChar,
        lineContent
      }

      if (!groupedMap.has(refPath)) {
        groupedMap.set(refPath, [])
      }
      groupedMap.get(refPath)!.push(ref)
    }

    // Convert to grouped array
    const groupedReferences: GroupedReferences[] = []
    for (const [path, refs] of groupedMap) {
      // Sort by line number
      refs.sort((a, b) => a.line - b.line)

      groupedReferences.push({
        filePath: path,
        fileName: path.split('/').pop() || path,
        references: refs
      })
    }

    // Sort groups by file name
    groupedReferences.sort((a, b) => a.fileName.localeCompare(b.fileName))

    view.dispatch({
      effects: showReferencesEffect.of({
        visible: true,
        symbolName,
        groupedReferences,
        totalCount: result.length,
        loading: false
      })
    })

    return true
  } catch (error) {
    console.error('[LSP Find References] Error:', error)
    view.dispatch({
      effects: showReferencesEffect.of({
        visible: true,
        symbolName,
        groupedReferences: [],
        totalCount: 0,
        loading: false
      })
    })
    return false
  }
}

// Shift+F12 keymap for find all references
const findReferencesKeymap = keymap.of([
  {
    key: 'Shift-F12',
    run: (view) => {
      findReferencesAtCursor(view)
      return true
    }
  },
  {
    key: 'Escape',
    run: (view) => {
      const state = view.state.field(referencesStateField)
      if (state?.visible) {
        closeReferencesPanel(view)
        return true
      }
      return false
    }
  }
])

// Theme for references panel
const referencesPanelTheme = EditorView.theme({
  '.cm-references-panel': {
    direction: 'rtl',
    backgroundColor: 'var(--bg-secondary)',
    borderTop: '1px solid var(--border)',
    maxHeight: '300px',
    display: 'flex',
    flexDirection: 'column'
  },
  '.cm-references-header': {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    backgroundColor: 'var(--bg-primary)',
    borderBottom: '1px solid var(--border)'
  },
  '.cm-references-title': {
    color: '#4ec9b0',
    fontWeight: 500,
    fontSize: '13px'
  },
  '.cm-references-close': {
    padding: '2px 8px',
    backgroundColor: 'transparent',
    color: 'var(--text-secondary)',
    border: 'none',
    borderRadius: '3px',
    cursor: 'pointer',
    fontSize: '16px',
    lineHeight: 1
  },
  '.cm-references-close:hover': {
    backgroundColor: 'var(--bg-hover)',
    color: 'var(--text-primary)'
  },
  '.cm-references-content': {
    overflow: 'auto',
    padding: '4px 0',
    direction: 'ltr'
  },
  '.cm-references-loading, .cm-references-empty': {
    padding: '16px',
    textAlign: 'center',
    color: 'var(--text-secondary)',
    fontStyle: 'italic'
  },
  '.cm-references-file-group': {
    marginBottom: '4px'
  },
  '.cm-references-file-header': {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 12px',
    backgroundColor: 'var(--bg-tertiary, var(--bg-secondary))',
    fontSize: '12px',
    fontWeight: 500
  },
  '.cm-references-file-icon': {
    display: 'flex',
    alignItems: 'center',
    color: 'var(--text-secondary)'
  },
  '.cm-references-file-name': {
    color: '#dcdcaa'
  },
  '.cm-references-file-count': {
    color: 'var(--text-secondary)',
    fontSize: '11px'
  },
  '.cm-references-list': {
    fontFamily: "'Menlo', 'Monaco', 'Courier New', monospace",
    fontSize: '12px'
  },
  '.cm-references-item': {
    display: 'flex',
    alignItems: 'center',
    padding: '3px 12px 3px 24px',
    cursor: 'pointer',
    gap: '12px'
  },
  '.cm-references-item:hover': {
    backgroundColor: 'var(--bg-hover, rgba(255, 255, 255, 0.05))'
  },
  '.cm-references-line-num': {
    color: 'var(--text-secondary)',
    minWidth: '32px',
    textAlign: 'right',
    fontSize: '11px'
  },
  '.cm-references-line-content': {
    color: 'var(--text-primary)',
    whiteSpace: 'pre',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  }
})

// Export the find references extension
export function lspFindReferencesExtension(): Extension {
  return [
    referencesStateField,
    referencesPanelExtension,
    referencesPanelTheme,
    findReferencesKeymap
  ]
}
