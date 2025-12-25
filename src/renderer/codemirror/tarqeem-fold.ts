import { foldService } from '@codemirror/language'
import { EditorState } from '@codemirror/state'

// Custom fold service for Tarqeem - folds brace blocks {}
export const tarqeemFoldService = foldService.of((state: EditorState, lineStart: number, lineEnd: number) => {
  const line = state.doc.lineAt(lineStart)
  const text = line.text

  // Find opening brace on this line
  let braceIndex = -1
  let inString = false
  let stringChar = ''

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]

    // Track string state
    if ((ch === '"' || ch === "'" || ch === '«') && (i === 0 || text[i - 1] !== '\\')) {
      if (!inString) {
        inString = true
        stringChar = ch === '«' ? '»' : ch
      } else if (ch === stringChar || (stringChar === '»' && ch === '»')) {
        inString = false
      }
    }

    // Find opening brace outside of strings
    if (!inString && ch === '{') {
      braceIndex = i
      break
    }
  }

  if (braceIndex === -1) return null

  // Find matching closing brace
  let depth = 1
  let pos = line.from + braceIndex + 1
  inString = false
  stringChar = ''

  while (pos < state.doc.length && depth > 0) {
    const ch = state.doc.sliceString(pos, pos + 1)

    // Track string state
    if ((ch === '"' || ch === "'" || ch === '«') && state.doc.sliceString(pos - 1, pos) !== '\\') {
      if (!inString) {
        inString = true
        stringChar = ch === '«' ? '»' : ch
      } else if (ch === stringChar || (stringChar === '»' && ch === '»')) {
        inString = false
      }
    }

    if (!inString) {
      if (ch === '{') depth++
      else if (ch === '}') depth--
    }

    pos++
  }

  if (depth !== 0) return null

  // pos is now right after the closing brace
  const endLine = state.doc.lineAt(pos - 1)

  // Only fold if it spans multiple lines
  if (endLine.number <= line.number) return null

  // Fold from after the opening brace to before the closing brace
  return {
    from: line.from + braceIndex + 1,
    to: pos - 1
  }
})

// Also add folding for comment blocks /* */
export const tarqeemCommentFoldService = foldService.of((state: EditorState, lineStart: number, lineEnd: number) => {
  const line = state.doc.lineAt(lineStart)
  const text = line.text.trim()

  // Check for block comment start
  if (!text.startsWith('/*')) return null

  // Find the end of the comment
  let pos = line.from + line.text.indexOf('/*') + 2

  while (pos < state.doc.length) {
    const slice = state.doc.sliceString(pos, pos + 2)
    if (slice === '*/') {
      const endLine = state.doc.lineAt(pos)
      if (endLine.number > line.number) {
        return {
          from: line.from + line.text.indexOf('/*') + 2,
          to: pos
        }
      }
      return null
    }
    pos++
  }

  return null
})
