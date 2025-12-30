import React, { useState, useCallback, useRef, useEffect, KeyboardEvent, MouseEvent } from 'react'
import { Terminal, Trash2, X, Loader2, GripHorizontal } from 'lucide-react'
import { useInteractiveModeStore } from '../stores/useInteractiveModeStore'
import '../styles/panels/interactive-mode-panel.css'

interface InteractiveModePanelProps {
  visible: boolean
  onClose: () => void
}

/**
 * Interactive Mode Panel (الوضع التفاعلي)
 *
 * Provides a REPL-like interface for evaluating Tarqeem code snippets.
 * Features:
 * - Arabic RTL interface
 * - Command history navigation (Arrow up/down)
 * - Output display with syntax coloring
 * - Auto-scroll to latest output
 * - Resizable panel height
 */
export default function InteractiveModePanel({
  visible,
  onClose
}: InteractiveModePanelProps) {
  const [input, setInput] = useState('')
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [panelHeight, setPanelHeight] = useState(250)
  const [isResizing, setIsResizing] = useState(false)
  const outputRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const {
    output,
    history,
    isEvaluating,
    addOutput,
    addToHistory,
    clearOutput,
    setEvaluating
  } = useInteractiveModeStore()

  // Auto-scroll to bottom when new output arrives
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [output])

  // Focus input when panel becomes visible
  useEffect(() => {
    if (visible && inputRef.current) {
      inputRef.current.focus()
    }
  }, [visible])

  // Handle resize drag
  const handleResizeStart = useCallback((e: MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }, [])

  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: globalThis.MouseEvent) => {
      const windowHeight = window.innerHeight
      const newHeight = windowHeight - e.clientY - 24 // 24px for status bar
      setPanelHeight(Math.min(Math.max(newHeight, 150), windowHeight - 150))
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing])

  /**
   * Evaluate the current input
   */
  const handleEvaluate = useCallback(async () => {
    if (!input.trim() || isEvaluating) return

    const code = input.trim()

    // Add input to output
    addOutput('input', `> ${code}`)

    // Add to history
    addToHistory(code)
    setHistoryIndex(-1)
    setInput('')
    setEvaluating(true)

    try {
      const result = await window.qalam.interactive.evaluate(code)

      // Add output from print statements
      if (result.output && result.output.trim()) {
        addOutput('stdout', result.output)
      }

      // Add return value if present and not void
      if (result.returnValue && result.returnValue !== 'لا_شيء') {
        addOutput('result', `=> ${result.returnValue}`)
      }

      // Add error if present
      if (result.error) {
        addOutput('error', result.error)
      }
    } catch (err) {
      addOutput('error', `خطأ: ${err}`)
    } finally {
      setEvaluating(false)
    }
  }, [input, isEvaluating, addOutput, addToHistory, setEvaluating])

  /**
   * Handle keyboard navigation and submission
   */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleEvaluate()
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        if (history.length > 0) {
          const newIndex =
            historyIndex < history.length - 1 ? historyIndex + 1 : historyIndex
          setHistoryIndex(newIndex)
          setInput(history[history.length - 1 - newIndex] || '')
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        if (historyIndex > 0) {
          const newIndex = historyIndex - 1
          setHistoryIndex(newIndex)
          setInput(history[history.length - 1 - newIndex] || '')
        } else if (historyIndex === 0) {
          setHistoryIndex(-1)
          setInput('')
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    },
    [handleEvaluate, history, historyIndex, onClose]
  )

  if (!visible) return null

  return (
    <div
      className={`interactive-mode-panel ${isResizing ? 'resizing' : ''}`}
      dir="rtl"
      ref={panelRef}
      style={{ height: panelHeight }}
    >
      {/* Resize Handle */}
      <div
        className="interactive-mode-resize-handle"
        onMouseDown={handleResizeStart}
      >
        <GripHorizontal size={16} />
      </div>

      {/* Header */}
      <div className="interactive-mode-header">
        <div className="interactive-mode-title">
          <Terminal size={16} />
          <span>الوضع التفاعلي</span>
        </div>
        <div className="interactive-mode-actions">
          <button
            className="interactive-mode-action"
            onClick={clearOutput}
            title="مسح المخرجات"
          >
            <Trash2 size={14} />
          </button>
          <button
            className="interactive-mode-action"
            onClick={onClose}
            title="إغلاق"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Output Area */}
      <div className="interactive-mode-output" ref={outputRef} dir="rtl">
        {output.length === 0 ? (
          <div className="interactive-mode-empty">
            <Terminal size={24} />
            <span>أدخل تعبير ترقيم للتقييم</span>
          </div>
        ) : (
          output.map((line, index) => (
            <div
              key={index}
              className={`interactive-mode-line interactive-mode-${line.type}`}
            >
              {line.text}
            </div>
          ))
        )}
      </div>

      {/* Input Area */}
      <div className="interactive-mode-input-container" dir="rtl">
        <span className="interactive-mode-prompt">ترقيم&gt;</span>
        <input
          ref={inputRef}
          type="text"
          className="interactive-mode-input"
          placeholder="أدخل تعبير ترقيم..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isEvaluating}
          dir="rtl"
        />
        {isEvaluating && (
          <Loader2 size={14} className="interactive-mode-loader" />
        )}
      </div>
    </div>
  )
}
