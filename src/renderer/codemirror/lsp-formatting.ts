/**
 * LSP Formatting utilities
 * Converts LSP TextEdit arrays to formatted content
 */

import { TextEdit } from '../stores/useLSPStore'

/**
 * Apply LSP TextEdits to content string
 * TextEdits are applied from bottom to top to preserve positions
 */
export function applyTextEdits(content: string, edits: TextEdit[]): string {
  if (!edits || edits.length === 0) {
    return content
  }

  const lines = content.split('\n')

  // Sort edits from bottom to top, right to left to preserve positions
  const sortedEdits = [...edits].sort((a, b) => {
    if (a.range.start.line !== b.range.start.line) {
      return b.range.start.line - a.range.start.line
    }
    return b.range.start.character - a.range.start.character
  })

  for (const edit of sortedEdits) {
    const { range, newText } = edit
    const { start, end } = range

    // Handle single-line edit
    if (start.line === end.line) {
      const line = lines[start.line] || ''
      lines[start.line] =
        line.substring(0, start.character) +
        newText +
        line.substring(end.character)
    } else {
      // Handle multi-line edit
      const startLine = lines[start.line] || ''
      const endLine = lines[end.line] || ''

      const before = startLine.substring(0, start.character)
      const after = endLine.substring(end.character)

      // Count lines to remove
      const linesToRemove = end.line - start.line + 1

      // Split new text into lines
      const newLines = newText.split('\n')

      if (newLines.length === 1) {
        // Replace with single line
        lines.splice(start.line, linesToRemove, before + newLines[0] + after)
      } else {
        // Replace with multiple lines
        newLines[0] = before + newLines[0]
        newLines[newLines.length - 1] = newLines[newLines.length - 1] + after
        lines.splice(start.line, linesToRemove, ...newLines)
      }
    }
  }

  return lines.join('\n')
}

/**
 * Format document using LSP and return the formatted content
 */
export async function formatDocument(
  content: string,
  filePath: string,
  tabSize: number,
  insertSpaces: boolean,
  requestFormatting: (
    filePath: string,
    tabSize: number,
    insertSpaces: boolean
  ) => Promise<TextEdit[] | null>
): Promise<string | null> {
  try {
    const edits = await requestFormatting(filePath, tabSize, insertSpaces)

    if (edits && edits.length > 0) {
      return applyTextEdits(content, edits)
    }

    return null // No changes needed
  } catch (error) {
    console.error('[LSP Formatting] Error:', error)
    return null
  }
}
