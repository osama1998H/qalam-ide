import React from 'react'
import { X } from 'lucide-react'

interface OutputPanelProps {
  output: string
  type: 'success' | 'error' | 'normal'
  visible: boolean
  onClose: () => void
}

export default function OutputPanel({ output, type, visible, onClose }: OutputPanelProps) {
  if (!visible) {
    return null
  }

  return (
    <div className="output-panel">
      <div className="output-header">
        <span className="output-title">المخرجات</span>
        <button className="output-close" onClick={onClose} title="إغلاق">
          <X size={16} />
        </button>
      </div>
      <pre className={`output-content ${type}`}>
        {output || 'لا توجد مخرجات'}
      </pre>
    </div>
  )
}
