import React, { useEffect, useRef, useImperativeHandle, forwardRef, useMemo } from 'react'
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightActiveLine, drawSelection, dropCursor, rectangularSelection, crosshairCursor } from '@codemirror/view'
import { EditorState, Compartment } from '@codemirror/state'
import { history, historyKeymap, defaultKeymap, indentWithTab } from '@codemirror/commands'
import { bracketMatching, foldGutter, foldKeymap, indentOnInput, indentUnit, LanguageSupport } from '@codemirror/language'
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete'
import { search, highlightSelectionMatches } from '@codemirror/search'
import { rtlConfig, rtlTheme } from '../codemirror/rtl-extensions'
import { tarqeemStreamParser } from '../codemirror/tarqeem-lang'
import { tarqeemHighlighting } from '../codemirror/tarqeem-highlight'
import { tarqeemFoldService, tarqeemCommentFoldService } from '../codemirror/tarqeem-fold'
import { diagnosticsExtension, updateDiagnostics, LSPDiagnostic } from '../codemirror/diagnostics-extension'
import { lspCompletionExtension, updateFilePath } from '../codemirror/lsp-completion'
import { lspHoverExtension } from '../codemirror/lsp-hover'
import { lspGotoDefinitionExtension, setGotoDefinitionCallback } from '../codemirror/lsp-goto-definition'
import { useEditorSettings } from '../stores/useEditorSettings'

interface EditorProps {
  content: string
  onChange: (content: string) => void
  onCursorChange: (pos: { line: number; col: number }) => void
  diagnostics?: LSPDiagnostic[]
  filePath?: string | null
  onGotoDefinition?: (filePath: string, line: number, character: number) => void
}

export interface EditorHandle {
  getView: () => EditorView | null
}

// Compartments for dynamic configuration
const lineNumbersCompartment = new Compartment()
const wordWrapCompartment = new Compartment()
const tabSizeCompartment = new Compartment()
const closeBracketsCompartment = new Compartment()
const fontCompartment = new Compartment()

const Editor = forwardRef<EditorHandle, EditorProps>(function Editor(
  { content, onChange, onCursorChange, diagnostics = [], filePath = null, onGotoDefinition },
  ref
) {
  const settings = useEditorSettings()
  const editorRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const isExternalUpdate = useRef(false)

  // Expose the view via ref
  useImperativeHandle(ref, () => ({
    getView: () => viewRef.current
  }), [])

  useEffect(() => {
    if (!editorRef.current) return

    // Create Tarqeem language support
    const tarqeemLanguage = new LanguageSupport(tarqeemStreamParser)

    // Update listener for content and cursor changes
    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged && !isExternalUpdate.current) {
        onChange(update.state.doc.toString())
      }
      if (update.selectionSet || update.docChanged) {
        const pos = update.state.selection.main.head
        const line = update.state.doc.lineAt(pos)
        onCursorChange({
          line: line.number,
          col: pos - line.from + 1
        })
      }
    })

    // Font theme (size and family)
    const fontTheme = EditorView.theme({
      '&': {
        fontSize: `${settings.fontSize}px`,
        fontFamily: settings.fontFamily
      },
      '.cm-scroller': {
        fontFamily: 'inherit'
      },
      '.cm-content': {
        fontFamily: 'inherit'
      },
      '.cm-gutters': {
        fontFamily: 'inherit'
      }
    })

    const state = EditorState.create({
      doc: content,
      extensions: [
        // RTL configuration
        rtlConfig,
        rtlTheme,

        // Dynamic settings via compartments
        lineNumbersCompartment.of(settings.lineNumbers ? lineNumbers() : []),
        wordWrapCompartment.of(settings.wordWrap ? EditorView.lineWrapping : []),
        tabSizeCompartment.of(indentUnit.of(' '.repeat(settings.tabSize))),
        closeBracketsCompartment.of(settings.autoCloseBrackets ? closeBrackets() : []),
        fontCompartment.of(fontTheme),

        // Gutter features
        highlightActiveLineGutter(),
        highlightActiveLine(),

        // Code folding
        tarqeemFoldService,
        tarqeemCommentFoldService,
        foldGutter({
          markerDOM: (open) => {
            const wrapper = document.createElement('div')
            wrapper.className = 'cm-fold-marker'
            // Using Lucide-style SVG icons
            if (open) {
              // ChevronDown icon
              wrapper.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`
            } else {
              // ChevronRight icon
              wrapper.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>`
            }
            return wrapper
          }
        }),

        // Selection enhancements
        drawSelection(),
        dropCursor(),
        rectangularSelection(),
        crosshairCursor(),

        // Editing features
        history(),
        bracketMatching(),
        indentOnInput(),

        // Keymaps
        keymap.of([
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...historyKeymap,
          ...foldKeymap,
          indentWithTab
        ]),

        // Search extensions
        search({ top: true }),
        highlightSelectionMatches(),

        // Tarqeem language support
        tarqeemLanguage,
        tarqeemHighlighting,

        // Diagnostics (LSP errors/warnings)
        diagnosticsExtension(),

        // LSP autocomplete
        lspCompletionExtension(),

        // LSP hover tooltips
        lspHoverExtension(),

        // LSP go to definition
        lspGotoDefinitionExtension(),

        // Update listener
        updateListener
      ]
    })

    const view = new EditorView({
      state,
      parent: editorRef.current
    })

    viewRef.current = view

    return () => {
      view.destroy()
    }
  }, []) // Only run once on mount

  // Update content when prop changes externally (e.g., file open)
  useEffect(() => {
    const view = viewRef.current
    if (view && content !== view.state.doc.toString()) {
      isExternalUpdate.current = true
      view.dispatch({
        changes: {
          from: 0,
          to: view.state.doc.length,
          insert: content
        }
      })
      isExternalUpdate.current = false
    }
  }, [content])

  // Update settings dynamically
  useEffect(() => {
    const view = viewRef.current
    if (!view) return

    const fontTheme = EditorView.theme({
      '&': {
        fontSize: `${settings.fontSize}px`,
        fontFamily: settings.fontFamily
      },
      '.cm-scroller': {
        fontFamily: 'inherit'
      },
      '.cm-content': {
        fontFamily: 'inherit'
      },
      '.cm-gutters': {
        fontFamily: 'inherit'
      }
    })

    view.dispatch({
      effects: [
        lineNumbersCompartment.reconfigure(settings.lineNumbers ? lineNumbers() : []),
        wordWrapCompartment.reconfigure(settings.wordWrap ? EditorView.lineWrapping : []),
        tabSizeCompartment.reconfigure(indentUnit.of(' '.repeat(settings.tabSize))),
        closeBracketsCompartment.reconfigure(settings.autoCloseBrackets ? closeBrackets() : []),
        fontCompartment.reconfigure(fontTheme)
      ]
    })
  }, [settings.lineNumbers, settings.wordWrap, settings.tabSize, settings.autoCloseBrackets, settings.fontSize, settings.fontFamily])

  // Update diagnostics when they change
  useEffect(() => {
    const view = viewRef.current
    if (view) {
      updateDiagnostics(view, diagnostics)
    }
  }, [diagnostics])

  // Update file path for LSP completion
  useEffect(() => {
    const view = viewRef.current
    if (view) {
      updateFilePath(view, filePath)
    }
  }, [filePath])

  // Set up goto definition callback
  useEffect(() => {
    setGotoDefinitionCallback(onGotoDefinition || null)
    return () => {
      setGotoDefinitionCallback(null)
    }
  }, [onGotoDefinition])

  return <div ref={editorRef} className="editor-container" />
})

export default Editor
