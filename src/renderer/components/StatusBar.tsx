import React from 'react'
import { AlertCircle, AlertTriangle, Check, X } from 'lucide-react'

interface CompilerInfo {
  found: boolean
  path: string | null
  version: string | null
}

interface StatusBarProps {
  line: number
  column: number
  filePath: string | null
  isDirty: boolean
  errorCount?: number
  warningCount?: number
  onToggleProblems?: () => void
  compilerInfo?: CompilerInfo | null
}

export default function StatusBar({ line, column, filePath, isDirty, errorCount = 0, warningCount = 0, onToggleProblems, compilerInfo }: StatusBarProps) {
  const fileName = filePath ? filePath.split('/').pop() : 'ملف جديد'

  // Format compiler version for display (extract version number from "tarqeem X.X.X")
  const getVersionDisplay = () => {
    if (!compilerInfo) return null
    if (!compilerInfo.found) return 'غير موجود'
    if (!compilerInfo.version) return 'ترقيم'
    // Extract version from "tarqeem 0.1.0" format
    const match = compilerInfo.version.match(/(\d+\.\d+\.\d+)/)
    return match ? `ترقيم ${match[1]}` : compilerInfo.version
  }

  // Build tooltip text
  const getTooltip = () => {
    if (!compilerInfo) return 'جارٍ اكتشاف المترجم...'
    if (!compilerInfo.found) return 'مترجم ترقيم غير موجود - يرجى التثبيت أو تحديد المسار في الإعدادات'
    return `المسار: ${compilerInfo.path}\nالإصدار: ${compilerInfo.version || 'غير معروف'}`
  }

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
        <span
          className={`status-item status-compiler ${compilerInfo?.found === false ? 'status-compiler-missing' : ''}`}
          title={getTooltip()}
        >
          {compilerInfo?.found === false ? (
            <X size={12} className="status-compiler-icon status-compiler-missing-icon" />
          ) : compilerInfo?.found ? (
            <Check size={12} className="status-compiler-icon status-compiler-ok-icon" />
          ) : null}
          {getVersionDisplay() || 'ترقيم'}
        </span>
      </div>
    </div>
  )
}
