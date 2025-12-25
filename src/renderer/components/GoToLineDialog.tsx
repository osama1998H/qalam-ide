import React, { useState, useRef, useEffect, useCallback } from 'react'
import { EditorView } from '@codemirror/view'
import { EditorSelection } from '@codemirror/state'

interface GoToLineDialogProps {
  view: EditorView | null
  visible: boolean
  onClose: () => void
  totalLines: number
}

export default function GoToLineDialog({
  view,
  visible,
  onClose,
  totalLines
}: GoToLineDialogProps) {
  const [lineNumber, setLineNumber] = useState('')
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input when dialog opens
  useEffect(() => {
    if (visible && inputRef.current) {
      setLineNumber('')
      setError('')
      inputRef.current.focus()
    }
  }, [visible])

  // Validate and go to line
  const handleGoToLine = useCallback(() => {
    if (!view) return

    const num = parseInt(lineNumber, 10)

    if (isNaN(num) || num < 1) {
      setError('أدخل رقم سطر صحيح')
      return
    }

    if (num > totalLines) {
      setError(`آخر سطر هو ${totalLines}`)
      return
    }

    // Get the line and move cursor to it
    const line = view.state.doc.line(num)

    view.dispatch({
      selection: EditorSelection.cursor(line.from),
      scrollIntoView: true
    })

    view.focus()
    onClose()
  }, [view, lineNumber, totalLines, onClose])

  // Handle input change with validation
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    // Only allow numbers
    if (value === '' || /^\d+$/.test(value)) {
      setLineNumber(value)
      setError('')
    }
  }

  // Handle keyboard events
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    } else if (e.key === 'Enter') {
      handleGoToLine()
    }
  }, [onClose, handleGoToLine])

  if (!visible) return null

  return (
    <div className="goto-dialog-overlay" onClick={onClose}>
      <div className="goto-dialog" onClick={(e) => e.stopPropagation()} onKeyDown={handleKeyDown}>
        <div className="goto-dialog-header">
          <span>الذهاب إلى السطر</span>
          <span className="goto-dialog-hint">1 - {totalLines}</span>
        </div>
        <div className="goto-dialog-content">
          <input
            ref={inputRef}
            type="text"
            className="goto-input"
            placeholder="رقم السطر..."
            value={lineNumber}
            onChange={handleInputChange}
            autoComplete="off"
          />
          {error && <span className="goto-error">{error}</span>}
        </div>
        <div className="goto-dialog-footer">
          <button className="goto-button primary" onClick={handleGoToLine}>
            انتقال
          </button>
          <button className="goto-button" onClick={onClose}>
            إلغاء
          </button>
        </div>
      </div>
    </div>
  )
}
