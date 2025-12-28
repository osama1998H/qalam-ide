/**
 * RTL Clipboard Extension
 *
 * Provides RTL-aware copy/paste functionality for Arabic text.
 * Handles Unicode directional markers to preserve text direction
 * when copying and pasting code.
 *
 * Unicode Direction Markers:
 * - RLM (U+200F): Right-to-Left Mark - invisible marker for RTL context
 * - LRM (U+200E): Left-to-Right Mark - invisible marker for LTR context
 * - RLE (U+202B): Right-to-Left Embedding
 * - PDF (U+202C): Pop Directional Formatting
 */

import { EditorView } from '@codemirror/view'
import { EditorSelection } from '@codemirror/state'

// Unicode directional control characters
const RLM = '\u200F'  // Right-to-Left Mark
const LRM = '\u200E'  // Left-to-Right Mark
const RLE = '\u202B'  // Right-to-Left Embedding
const PDF = '\u202C'  // Pop Directional Formatting
const RLO = '\u202E'  // Right-to-Left Override
const LRO = '\u202D'  // Left-to-Right Override

/**
 * Detect if text contains Arabic characters
 */
function containsArabic(text: string): boolean {
  // Arabic Unicode ranges:
  // - Arabic: U+0600-U+06FF
  // - Arabic Supplement: U+0750-U+077F
  // - Arabic Extended-A: U+08A0-U+08FF
  // - Arabic Presentation Forms-A: U+FB50-U+FDFF
  // - Arabic Presentation Forms-B: U+FE70-U+FEFF
  const arabicPattern = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/
  return arabicPattern.test(text)
}

/**
 * Detect if text starts with RTL character
 */
function startsWithRTL(text: string): boolean {
  if (!text) return false
  const firstChar = text.trim()[0]
  if (!firstChar) return false

  // Check if first meaningful character is RTL
  const rtlPattern = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\u0590-\u05FF]/
  return rtlPattern.test(firstChar)
}

/**
 * Clean up excessive directional markers from text
 * Prevents accumulation of markers from repeated copy/paste
 */
function cleanDirectionalMarkers(text: string): string {
  // Remove standalone directional markers (but keep those needed for embedding)
  return text
    .replace(/[\u200E\u200F]+/g, '')  // Remove RLM/LRM
    .replace(/\u202B([^\u202C]*)\u202C/g, '$1')  // Remove RLE...PDF pairs
    .replace(/[\u202B\u202C\u202D\u202E]+/g, '')  // Remove any stray embedding markers
}

/**
 * Add appropriate directional context to text for clipboard
 */
function wrapWithDirectionalContext(text: string): string {
  if (!text) return text

  // Clean any existing markers first
  const cleanText = cleanDirectionalMarkers(text)

  // If text contains Arabic, add RTL context
  if (containsArabic(cleanText)) {
    // Add RLM at start to establish RTL context
    // This helps when pasting into LTR applications
    return RLM + cleanText
  }

  return cleanText
}

/**
 * Process pasted text to handle directional markers appropriately
 */
function processIncomingText(text: string): string {
  if (!text) return text

  // Clean excessive markers that may have accumulated
  const cleanText = cleanDirectionalMarkers(text)

  return cleanText
}

/**
 * RTL-aware clipboard extension for CodeMirror
 *
 * Handles copy and paste operations with proper RTL context preservation
 */
export const rtlClipboard = EditorView.domEventHandlers({
  /**
   * Handle copy event - add RTL markers when copying Arabic text
   */
  copy(event: ClipboardEvent, view: EditorView) {
    const selection = view.state.selection.main
    if (selection.empty) return false

    const selectedText = view.state.sliceDoc(selection.from, selection.to)

    // Only modify if text contains Arabic
    if (containsArabic(selectedText)) {
      event.preventDefault()

      const wrappedText = wrapWithDirectionalContext(selectedText)

      // Set both plain text and HTML formats
      event.clipboardData?.setData('text/plain', wrappedText)
      event.clipboardData?.setData('text/html', `<div dir="rtl">${wrappedText}</div>`)

      return true
    }

    return false  // Let default copy handle non-Arabic text
  },

  /**
   * Handle cut event - same as copy but also removes text
   */
  cut(event: ClipboardEvent, view: EditorView) {
    const selection = view.state.selection.main
    if (selection.empty) return false

    const selectedText = view.state.sliceDoc(selection.from, selection.to)

    // Only modify clipboard if text contains Arabic
    if (containsArabic(selectedText)) {
      event.preventDefault()

      const wrappedText = wrapWithDirectionalContext(selectedText)

      event.clipboardData?.setData('text/plain', wrappedText)
      event.clipboardData?.setData('text/html', `<div dir="rtl">${wrappedText}</div>`)

      // Remove the selected text
      view.dispatch({
        changes: { from: selection.from, to: selection.to, insert: '' },
        selection: EditorSelection.cursor(selection.from)
      })

      return true
    }

    return false
  },

  /**
   * Handle paste event - clean up directional markers from pasted text
   */
  paste(event: ClipboardEvent, view: EditorView) {
    const clipboardText = event.clipboardData?.getData('text/plain')
    if (!clipboardText) return false

    // Check if text has excessive directional markers that need cleaning
    const hasExcessiveMarkers = /[\u200E\u200F]{2,}|[\u202B-\u202E]{2,}/.test(clipboardText)

    if (hasExcessiveMarkers || containsArabic(clipboardText)) {
      event.preventDefault()

      const cleanText = processIncomingText(clipboardText)
      const selection = view.state.selection.main

      view.dispatch({
        changes: { from: selection.from, to: selection.to, insert: cleanText },
        selection: EditorSelection.cursor(selection.from + cleanText.length)
      })

      return true
    }

    return false  // Let default paste handle clean text
  }
})

/**
 * Extension to handle drag and drop with RTL awareness
 */
export const rtlDragDrop = EditorView.domEventHandlers({
  drop(event: DragEvent, view: EditorView) {
    const text = event.dataTransfer?.getData('text/plain')
    if (!text) return false

    // Process dropped text same as paste
    if (containsArabic(text)) {
      const cleanText = processIncomingText(text)

      // Get drop position
      const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
      if (pos === null) return false

      event.preventDefault()

      view.dispatch({
        changes: { from: pos, to: pos, insert: cleanText },
        selection: EditorSelection.cursor(pos + cleanText.length)
      })

      return true
    }

    return false
  }
})
