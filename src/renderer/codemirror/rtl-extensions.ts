import { EditorView } from '@codemirror/view'

// RTL direction configuration
export const rtlConfig = EditorView.contentAttributes.of({ dir: 'rtl' })

// RTL theme with proper cursor, gutters, and font styling
// Colors are controlled via CSS variables for theme support
export const rtlTheme = EditorView.theme({
  '&': {
    direction: 'rtl',
    height: '100%',
    backgroundColor: 'var(--editor-bg)'
  },
  '.cm-content': {
    // fontFamily and fontSize controlled by settings
    lineHeight: '1.8',
    caretColor: 'var(--editor-cursor)',
    padding: '8px 0',
    unicodeBidi: 'isolate'
  },
  '.cm-line': {
    padding: '0 16px',
    unicodeBidi: 'isolate',
    direction: 'rtl'
  },
  '.cm-gutters': {
    direction: 'ltr',
    borderLeft: '1px solid var(--border)',
    borderRight: 'none',
    backgroundColor: 'var(--editor-gutter-bg)',
    color: 'var(--editor-gutter-text)'
  },
  '.cm-lineNumbers': {
    minWidth: '40px'
  },
  '.cm-lineNumbers .cm-gutterElement': {
    textAlign: 'right',
    paddingLeft: '8px',
    paddingRight: '8px'
  },
  '.cm-cursor': {
    borderLeftWidth: '0',
    borderRightWidth: '2px',
    borderRightStyle: 'solid',
    borderRightColor: 'var(--editor-cursor)'
  },
  '.cm-selectionBackground': {
    backgroundColor: 'var(--editor-selection) !important'
  },
  '&.cm-focused .cm-selectionBackground': {
    backgroundColor: 'var(--editor-selection) !important'
  },
  // Fix RTL selection layer positioning
  '.cm-selectionLayer': {
    direction: 'rtl'
  },
  '.cm-activeLine': {
    backgroundColor: 'var(--editor-active-line)'
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'var(--editor-active-line-gutter)'
  },
  '.cm-matchingBracket': {
    backgroundColor: 'var(--editor-matching-bracket)',
    outline: 'none'
  },
  '.cm-searchMatch': {
    backgroundColor: 'var(--editor-search-match)'
  },
  '.cm-searchMatch.cm-searchMatch-selected': {
    backgroundColor: 'var(--editor-search-match-selected)'
  },
  // Selection match highlighting (when selecting text, other matches are highlighted)
  '.cm-selectionMatch': {
    backgroundColor: 'var(--editor-selection-match, rgba(255, 193, 7, 0.3))'
  },
  // Scrollbar styling
  '.cm-scroller::-webkit-scrollbar': {
    width: '10px',
    height: '10px'
  },
  '.cm-scroller::-webkit-scrollbar-track': {
    backgroundColor: 'var(--scrollbar-track)'
  },
  '.cm-scroller::-webkit-scrollbar-thumb': {
    backgroundColor: 'var(--scrollbar-thumb)',
    borderRadius: '5px'
  },
  '.cm-scroller::-webkit-scrollbar-thumb:hover': {
    backgroundColor: 'var(--scrollbar-thumb-hover)'
  }
})
