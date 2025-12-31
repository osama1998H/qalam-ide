import React, { useState, useEffect } from 'react'
import { X, Loader2, AlertCircle, BookOpen } from 'lucide-react'
import '../styles/panels/error-explanation-panel.css'

interface ErrorExplanationPanelProps {
  errorCode: string | null
  onClose: () => void
}

export default function ErrorExplanationPanel({
  errorCode,
  onClose
}: ErrorExplanationPanelProps) {
  const [explanation, setExplanation] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!errorCode) {
      setExplanation('')
      setError(null)
      return
    }

    setLoading(true)
    setError(null)
    setExplanation('')

    window.qalam.error
      .explain(errorCode)
      .then((result) => {
        if (result.success && result.explanation) {
          setExplanation(result.explanation)
        } else {
          setError(result.error || 'فشل في الحصول على شرح الخطأ')
        }
      })
      .catch((err) => {
        setError(err.message || 'حدث خطأ غير متوقع')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [errorCode])

  if (!errorCode) {
    return null
  }

  return (
    <div className="error-explanation-panel">
      <div className="error-explanation-header">
        <div className="error-explanation-title">
          <BookOpen size={16} />
          <span>شرح الخطأ</span>
          <span className="error-explanation-code">{errorCode}</span>
        </div>
        <button
          className="error-explanation-close"
          onClick={onClose}
          title="إغلاق (Esc)"
        >
          <X size={16} />
        </button>
      </div>

      <div className="error-explanation-content">
        {loading && (
          <div className="error-explanation-loading">
            <Loader2 size={24} className="animate-spin" />
            <span>جاري التحميل...</span>
          </div>
        )}

        {error && (
          <div className="error-explanation-error">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {!loading && !error && explanation && (
          <pre className="error-explanation-text">{explanation}</pre>
        )}
      </div>
    </div>
  )
}
