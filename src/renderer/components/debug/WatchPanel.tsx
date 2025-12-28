import React, { useState, useCallback, KeyboardEvent } from 'react'
import { Plus, X, Eye, AlertCircle } from 'lucide-react'

interface WatchPanelProps {
  expressions: string[]
  results: Record<string, { value: string; error?: string }>
  onAdd: (expression: string) => void
  onRemove: (expression: string) => void
  onEvaluate: (expression: string) => Promise<void>
  isPaused: boolean
  disabled?: boolean
}

export default function WatchPanel({
  expressions,
  results,
  onAdd,
  onRemove,
  onEvaluate,
  isPaused,
  disabled
}: WatchPanelProps) {
  const [newExpression, setNewExpression] = useState('')

  const handleAdd = useCallback(() => {
    if (newExpression.trim()) {
      onAdd(newExpression.trim())
      if (isPaused) {
        onEvaluate(newExpression.trim())
      }
      setNewExpression('')
    }
  }, [newExpression, onAdd, onEvaluate, isPaused])

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleAdd()
    }
  }, [handleAdd])

  const handleRemove = useCallback((expression: string) => {
    onRemove(expression)
  }, [onRemove])

  if (disabled) {
    return (
      <div className="debug-empty-state">
        <Eye size={32} />
        <span className="debug-empty-state-text">ابدأ جلسة التصحيح لمراقبة التعبيرات</span>
      </div>
    )
  }

  return (
    <div className="watch-panel">
      <div className="watch-input-container">
        <input
          type="text"
          className="watch-input"
          placeholder="أضف تعبير للمراقبة..."
          value={newExpression}
          onChange={(e) => setNewExpression(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          className="watch-add-btn"
          onClick={handleAdd}
          disabled={!newExpression.trim()}
          title="إضافة تعبير"
        >
          <Plus size={16} />
        </button>
      </div>

      {expressions.length === 0 ? (
        <div className="debug-empty-state">
          <Eye size={24} />
          <span className="debug-empty-state-text">لا توجد تعبيرات مراقبة</span>
        </div>
      ) : (
        <ul className="watch-list">
          {expressions.map((expression) => {
            const result = results[expression]
            const hasError = result?.error

            return (
              <li key={expression} className="watch-item">
                <span className="watch-expression">{expression}</span>
                <span className="variable-separator">=</span>
                {hasError ? (
                  <span className="watch-result error" title={result.error}>
                    <AlertCircle size={12} style={{ marginLeft: '4px' }} />
                    {result.error}
                  </span>
                ) : (
                  <span className="watch-result">
                    {result?.value ?? (isPaused ? 'جاري التقييم...' : 'غير متاح')}
                  </span>
                )}
                <button
                  className="watch-remove"
                  onClick={() => handleRemove(expression)}
                  title="إزالة التعبير"
                >
                  <X size={14} />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
