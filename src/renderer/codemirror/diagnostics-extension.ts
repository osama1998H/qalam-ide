import { Diagnostic as CMDiagnostic, setDiagnostics, lintGutter } from '@codemirror/lint'
import { Extension } from '@codemirror/state'
import { EditorView } from '@codemirror/view'

// LSP Diagnostic type (matches useLSPStore)
export interface LSPDiagnostic {
  range: {
    start: { line: number; character: number }
    end: { line: number; character: number }
  }
  message: string
  severity?: number // 1=Error, 2=Warning, 3=Information, 4=Hint
  source?: string
}

// Map LSP severity to CodeMirror severity
function mapSeverity(lspSeverity?: number): 'error' | 'warning' | 'info' | 'hint' {
  switch (lspSeverity) {
    case 1: return 'error'
    case 2: return 'warning'
    case 3: return 'info'
    case 4: return 'hint'
    default: return 'error'
  }
}

// Convert LSP diagnostics to CodeMirror diagnostics
function lspToCmDiagnostics(doc: EditorView['state']['doc'], lspDiagnostics: LSPDiagnostic[]): CMDiagnostic[] {
  const cmDiagnostics: CMDiagnostic[] = []

  for (const diag of lspDiagnostics) {
    try {
      // Handle inverted ranges (LSP server bug workaround)
      let startPos = diag.range.start
      let endPos = diag.range.end

      // Swap if start comes after end
      if (startPos.line > endPos.line ||
          (startPos.line === endPos.line && startPos.character > endPos.character)) {
        ;[startPos, endPos] = [endPos, startPos]
      }

      // LSP lines are 0-indexed, CodeMirror lines are 1-indexed
      const startLine = startPos.line + 1
      const endLine = endPos.line + 1

      // Ensure lines are within document bounds
      if (startLine < 1 || startLine > doc.lines) continue
      if (endLine < 1 || endLine > doc.lines) continue

      const startLineInfo = doc.line(startLine)
      const endLineInfo = doc.line(endLine)

      // Calculate positions, clamping to line bounds
      const startChar = Math.min(startPos.character, startLineInfo.length)
      const endChar = Math.min(endPos.character, endLineInfo.length)

      const from = startLineInfo.from + startChar
      const to = endLineInfo.from + endChar

      // Ensure from <= to
      if (from > to) continue

      // If from === to, extend to at least one character or end of line
      let adjustedTo = to
      if (from === to) {
        adjustedTo = Math.min(to + 1, startLineInfo.to)
      }

      cmDiagnostics.push({
        from,
        to: adjustedTo,
        severity: mapSeverity(diag.severity),
        message: diag.message,
        source: diag.source
      })
    } catch (e) {
      // Skip invalid diagnostics
    }
  }

  return cmDiagnostics
}

// Theme for diagnostic styling
const diagnosticsTheme = EditorView.theme({
  // Error underline (red wavy)
  '.cm-lintRange-error': {
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='6' height='3'%3E%3Cpath d='m0 3 l2 -2 l1 0 l2 2 l1 0' stroke='%23e53935' fill='none' stroke-width='1.1'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'repeat-x',
    backgroundPosition: 'bottom',
    paddingBottom: '2px'
  },
  // Warning underline (yellow wavy)
  '.cm-lintRange-warning': {
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='6' height='3'%3E%3Cpath d='m0 3 l2 -2 l1 0 l2 2 l1 0' stroke='%23fb8c00' fill='none' stroke-width='1.1'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'repeat-x',
    backgroundPosition: 'bottom',
    paddingBottom: '2px'
  },
  // Info underline (blue wavy)
  '.cm-lintRange-info': {
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='6' height='3'%3E%3Cpath d='m0 3 l2 -2 l1 0 l2 2 l1 0' stroke='%231e88e5' fill='none' stroke-width='1.1'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'repeat-x',
    backgroundPosition: 'bottom',
    paddingBottom: '2px'
  },
  // Hint underline (gray dots)
  '.cm-lintRange-hint': {
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='2'%3E%3Ccircle cx='1' cy='1' r='0.8' fill='%23757575'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'repeat-x',
    backgroundPosition: 'bottom',
    paddingBottom: '2px'
  },
  // Lint gutter styling
  '.cm-lint-marker': {
    width: '0.8em',
    height: '0.8em'
  },
  '.cm-lint-marker-error': {
    content: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23e53935'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3Cpath d='M15 9l-6 6M9 9l6 6' stroke='white' stroke-width='2'/%3E%3C/svg%3E")`
  },
  '.cm-lint-marker-warning': {
    content: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23fb8c00'%3E%3Cpath d='M12 2L1 21h22L12 2z'/%3E%3Cpath d='M12 9v5M12 16v2' stroke='white' stroke-width='2'/%3E%3C/svg%3E")`
  },
  // Tooltip styling (RTL friendly)
  '.cm-tooltip-lint': {
    direction: 'rtl',
    textAlign: 'right',
    fontFamily: 'inherit',
    fontSize: '13px',
    padding: '0',
    borderRadius: '6px',
    maxWidth: '400px',
    backgroundColor: '#1e1e1e',
    border: '1px solid #3c3c3c',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)'
  },
  '.cm-diagnostic': {
    padding: '8px 12px',
    marginLeft: '0',
    marginRight: '0',
    borderRight: '3px solid transparent',
    borderLeft: 'none',
    color: '#cccccc'
  },
  '.cm-diagnostic-error': {
    borderRightColor: '#e53935',
    backgroundColor: 'rgba(229, 57, 53, 0.15)',
    color: '#f48771'
  },
  '.cm-diagnostic-warning': {
    borderRightColor: '#fb8c00',
    backgroundColor: 'rgba(251, 140, 0, 0.15)',
    color: '#ffd54f'
  },
  '.cm-diagnostic-info': {
    borderRightColor: '#1e88e5',
    backgroundColor: 'rgba(30, 136, 229, 0.15)',
    color: '#82b1ff'
  },
  '.cm-diagnostic-hint': {
    borderRightColor: '#757575',
    backgroundColor: 'rgba(117, 117, 117, 0.15)',
    color: '#b0b0b0'
  }
})

// Combined diagnostics extension
export function diagnosticsExtension(): Extension {
  return [
    lintGutter(),
    diagnosticsTheme
  ]
}

// Helper to update diagnostics on an editor view
export function updateDiagnostics(view: EditorView, diagnostics: LSPDiagnostic[]): void {
  const cmDiagnostics = lspToCmDiagnostics(view.state.doc, diagnostics)
  view.dispatch(setDiagnostics(view.state, cmDiagnostics))
}
