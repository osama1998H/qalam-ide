import React, { useState, useCallback, useRef, useEffect, KeyboardEvent } from 'react'
import { Terminal, Trash2 } from 'lucide-react'

export interface ConsoleOutput {
  type: 'stdout' | 'stderr' | 'result' | 'input'
  text: string
  timestamp?: number
}

interface DebugConsolePanelProps {
  output: ConsoleOutput[]
  onEvaluate: (expression: string) => Promise<string>
  onClear: () => void
  isPaused: boolean
  disabled?: boolean
}

export default function DebugConsolePanel({
  output,
  onEvaluate,
  onClear,
  isPaused,
  disabled
}: DebugConsolePanelProps) {
  const [input, setInput] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [evaluating, setEvaluating] = useState(false)
  const outputRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Scroll to bottom when new output arrives
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [output])

  const handleEvaluate = useCallback(async () => {
    if (!input.trim() || !isPaused || evaluating) return

    const expression = input.trim()

    // Add to history
    setHistory(prev => [...prev, expression])
    setHistoryIndex(-1)
    setInput('')
    setEvaluating(true)

    try {
      await onEvaluate(expression)
    } catch (err) {
      console.error('Evaluation error:', err)
    } finally {
      setEvaluating(false)
    }
  }, [input, isPaused, evaluating, onEvaluate])

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleEvaluate()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (history.length > 0) {
        const newIndex = historyIndex < history.length - 1 ? historyIndex + 1 : historyIndex
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
    }
  }, [handleEvaluate, history, historyIndex])

  if (disabled) {
    return (
      <div className="debug-console">
        <div className="debug-empty-state">
          <Terminal size={32} />
          <span className="debug-empty-state-text">ابدأ جلسة التصحيح لاستخدام وحدة التحكم</span>
        </div>
      </div>
    )
  }

  return (
    <div className="debug-console">
      <div className="debug-console-output" ref={outputRef}>
        {output.length === 0 ? (
          <div className="debug-empty-state" style={{ padding: '16px' }}>
            <span className="debug-empty-state-text">لا توجد مخرجات</span>
          </div>
        ) : (
          output.map((line, index) => (
            <div key={index} className={`console-line ${line.type}`}>
              {line.text}
            </div>
          ))
        )}
      </div>

      <div className="debug-console-input-container">
        <span className="debug-console-prompt">&gt;</span>
        <input
          ref={inputRef}
          type="text"
          className="debug-console-input"
          placeholder={isPaused ? 'أدخل تعبير للتقييم...' : 'التقييم متاح فقط عند التوقف'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={!isPaused || evaluating}
        />
        <div className="debug-console-actions">
          <button
            className="debug-panel-action"
            onClick={onClear}
            title="مسح وحدة التحكم"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
