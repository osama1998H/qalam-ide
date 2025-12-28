/**
 * RTL Cursor Movement Extension
 *
 * Provides visual cursor movement for RTL (Right-to-Left) text editing.
 * In RTL context:
 * - ArrowLeft moves the cursor visually left (towards the end of line)
 * - ArrowRight moves the cursor visually right (towards the start of line)
 *
 * This extension swaps the logical direction of arrow keys to match
 * visual expectations in RTL editing mode.
 */

import { keymap } from '@codemirror/view'
import {
  cursorCharLeft,
  cursorCharRight,
  selectCharLeft,
  selectCharRight,
  cursorGroupLeft,
  cursorGroupRight,
  selectGroupLeft,
  selectGroupRight,
  cursorLineStart,
  cursorLineEnd,
  selectLineStart,
  selectLineEnd,
  cursorDocStart,
  cursorDocEnd,
  selectDocStart,
  selectDocEnd
} from '@codemirror/commands'

/**
 * RTL Visual Cursor Movement Keymap
 *
 * Remaps arrow keys to follow visual order in RTL context:
 * - Visual left (ArrowLeft) = Logical right (towards line end in RTL)
 * - Visual right (ArrowRight) = Logical left (towards line start in RTL)
 */
export const rtlCursorKeymap = keymap.of([
  // Character movement - swap left/right for visual order
  { key: 'ArrowLeft', run: cursorCharRight },
  { key: 'ArrowRight', run: cursorCharLeft },

  // Character selection - swap for visual order
  { key: 'Shift-ArrowLeft', run: selectCharRight },
  { key: 'Shift-ArrowRight', run: selectCharLeft },

  // Word/group movement - swap for visual order
  // Ctrl+Arrow moves by word (or group of similar characters)
  { key: 'Ctrl-ArrowLeft', run: cursorGroupRight },
  { key: 'Ctrl-ArrowRight', run: cursorGroupLeft },
  { key: 'Alt-ArrowLeft', run: cursorGroupRight },  // macOS uses Alt for word movement
  { key: 'Alt-ArrowRight', run: cursorGroupLeft },

  // Word/group selection - swap for visual order
  { key: 'Ctrl-Shift-ArrowLeft', run: selectGroupRight },
  { key: 'Ctrl-Shift-ArrowRight', run: selectGroupLeft },
  { key: 'Alt-Shift-ArrowLeft', run: selectGroupRight },  // macOS
  { key: 'Alt-Shift-ArrowRight', run: selectGroupLeft },

  // Line start/end - swap Home/End behavior for RTL
  // In RTL: Home goes to visual start (right side), End goes to visual end (left side)
  { key: 'Home', run: cursorLineEnd },
  { key: 'End', run: cursorLineStart },
  { key: 'Shift-Home', run: selectLineEnd },
  { key: 'Shift-End', run: selectLineStart },

  // Document start/end remain the same (top/bottom of document)
  { key: 'Ctrl-Home', run: cursorDocStart },
  { key: 'Ctrl-End', run: cursorDocEnd },
  { key: 'Ctrl-Shift-Home', run: selectDocStart },
  { key: 'Ctrl-Shift-End', run: selectDocEnd },
  { key: 'Cmd-ArrowUp', run: cursorDocStart },    // macOS
  { key: 'Cmd-ArrowDown', run: cursorDocEnd },
  { key: 'Cmd-Shift-ArrowUp', run: selectDocStart },
  { key: 'Cmd-Shift-ArrowDown', run: selectDocEnd }
])

/**
 * High-priority RTL keymap that takes precedence over default keymaps
 * Use this to ensure RTL cursor behavior overrides CodeMirror defaults
 */
export const rtlCursorKeymapHighPriority = keymap.of([
  // Character movement with high precedence
  { key: 'ArrowLeft', run: cursorCharRight, preventDefault: true },
  { key: 'ArrowRight', run: cursorCharLeft, preventDefault: true },
  { key: 'Shift-ArrowLeft', run: selectCharRight, preventDefault: true },
  { key: 'Shift-ArrowRight', run: selectCharLeft, preventDefault: true }
])
