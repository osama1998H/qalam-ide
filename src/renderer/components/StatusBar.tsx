import React from 'react'
import { AlertCircle, AlertTriangle } from 'lucide-react'

interface StatusBarProps {
  line: number
  column: number
  filePath: string | null
  isDirty: boolean
  errorCount?: number
  warningCount?: number
  onToggleProblems?: () => void
}

export default function StatusBar({ line, column, filePath, isDirty, errorCount = 0, warningCount = 0, onToggleProblems }: StatusBarProps) {
  const fileName = filePath ? filePath.split('/').pop() : 'ملف جديد'

  return (
    <div className="status-bar">
      <div className="status-bar-left">
        <span className="status-item">
          {isDirty && <span className="status-dirty">●</span>}
          {fileName}
        </span>
        {(errorCount > 0 || warningCount > 0) && (
          <button
            className="status-diagnostics-button"
            onClick={onToggleProblems}
            title="عرض المشاكل (Ctrl+Shift+M)"
          >
            {errorCount > 0 && (
              <span className="status-errors">
                <AlertCircle size={14} />
                <span>{errorCount}</span>
              </span>
            )}
            {warningCount > 0 && (
              <span className="status-warnings">
                <AlertTriangle size={14} />
                <span>{warningCount}</span>
              </span>
            )}
          </button>
        )}
      </div>

      <div className="status-bar-right">
        <span className="status-item">
          سطر {line}، عمود {column}
        </span>
        <span className="status-item">UTF-8</span>
        <span className="status-item">ترقيم</span>
      </div>
    </div>
  )
}
