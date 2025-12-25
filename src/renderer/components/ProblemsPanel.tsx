import React from 'react'
import { X, AlertCircle, AlertTriangle, Info, Lightbulb, FileCode } from 'lucide-react'
import { Diagnostic } from '../stores/useLSPStore'

interface DiagnosticWithFile {
  filePath: string
  diagnostics: Diagnostic[]
}

interface ProblemsPanelProps {
  visible: boolean
  onClose: () => void
  onNavigate: (filePath: string, line: number, character: number) => void
  allDiagnostics: DiagnosticWithFile[]
}

// Get severity icon component
function SeverityIcon({ severity }: { severity?: number }) {
  switch (severity) {
    case 1: // Error
      return <AlertCircle size={14} className="problem-icon problem-icon-error" />
    case 2: // Warning
      return <AlertTriangle size={14} className="problem-icon problem-icon-warning" />
    case 3: // Information
      return <Info size={14} className="problem-icon problem-icon-info" />
    case 4: // Hint
      return <Lightbulb size={14} className="problem-icon problem-icon-hint" />
    default:
      return <AlertCircle size={14} className="problem-icon problem-icon-error" />
  }
}

// Get severity label in Arabic
function getSeverityLabel(severity?: number): string {
  switch (severity) {
    case 1: return 'خطأ'
    case 2: return 'تحذير'
    case 3: return 'معلومة'
    case 4: return 'تلميح'
    default: return 'خطأ'
  }
}

export default function ProblemsPanel({
  visible,
  onClose,
  onNavigate,
  allDiagnostics
}: ProblemsPanelProps) {
  if (!visible) {
    return null
  }

  // Count total errors and warnings
  let totalErrors = 0
  let totalWarnings = 0
  for (const file of allDiagnostics) {
    for (const diag of file.diagnostics) {
      if (diag.severity === 1) totalErrors++
      else if (diag.severity === 2) totalWarnings++
    }
  }

  const totalProblems = allDiagnostics.reduce((sum, f) => sum + f.diagnostics.length, 0)

  return (
    <div className="problems-panel">
      <div className="problems-header">
        <div className="problems-title">
          <span>المشاكل</span>
          <span className="problems-count">
            {totalProblems > 0 && (
              <>
                {totalErrors > 0 && (
                  <span className="problems-count-errors">
                    <AlertCircle size={12} />
                    {totalErrors}
                  </span>
                )}
                {totalWarnings > 0 && (
                  <span className="problems-count-warnings">
                    <AlertTriangle size={12} />
                    {totalWarnings}
                  </span>
                )}
              </>
            )}
          </span>
        </div>
        <button className="problems-close" onClick={onClose} title="إغلاق (Esc)">
          <X size={16} />
        </button>
      </div>

      <div className="problems-list">
        {totalProblems === 0 ? (
          <div className="problems-empty">
            لا توجد مشاكل
          </div>
        ) : (
          allDiagnostics.map((file) => (
            <div key={file.filePath} className="problem-file-group">
              <div className="problem-file-header">
                <FileCode size={14} />
                <span className="problem-file-name">
                  {file.filePath.split('/').pop()}
                </span>
                <span className="problem-file-count">{file.diagnostics.length}</span>
              </div>

              {file.diagnostics.map((diag, index) => (
                <div
                  key={`${file.filePath}-${index}`}
                  className="problem-item"
                  onClick={() => onNavigate(
                    file.filePath,
                    diag.range.start.line + 1, // Convert to 1-indexed
                    diag.range.start.character
                  )}
                >
                  <SeverityIcon severity={diag.severity} />
                  <span className="problem-message">{diag.message}</span>
                  <span className="problem-location">
                    [{diag.range.start.line + 1}:{diag.range.start.character + 1}]
                  </span>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
