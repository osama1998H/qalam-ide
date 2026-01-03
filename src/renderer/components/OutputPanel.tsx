import React, { useState, useEffect, useCallback } from 'react'
import { X, GripHorizontal } from 'lucide-react'

interface OutputPanelProps {
  output: string
  type: 'success' | 'error' | 'normal'
  visible: boolean
  onClose: () => void
}

export default function OutputPanel({ output, type, visible, onClose }: OutputPanelProps) {
  const [panelHeight, setPanelHeight] = useState(200)
  const [isResizing, setIsResizing] = useState(false)

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }, [])

  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: globalThis.MouseEvent) => {
      const windowHeight = window.innerHeight
      const newHeight = windowHeight - e.clientY - 24 // 24px for status bar
      setPanelHeight(Math.min(Math.max(newHeight, 100), windowHeight - 150))
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

  if (!visible) {
    return null
  }

  return (
    <div
      className={`output-panel ${isResizing ? 'resizing' : ''}`}
      style={{ height: panelHeight }}
    >
      <div
        className="output-resize-handle"
        onMouseDown={handleResizeStart}
      >
        <GripHorizontal size={16} />
      </div>
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
