import React from 'react'
import { Layers, PlayCircle, FileCode } from 'lucide-react'
import { StackFrame } from '../../stores/useDebugStore'

interface CallStackPanelProps {
  frames: StackFrame[]
  currentFrameId: number | null
  onFrameSelect: (frameId: number) => void
  onNavigate: (filePath: string, line: number) => void
  disabled?: boolean
}

// Extract just the filename from a full path
function getFileName(filePath: string | undefined): string {
  if (!filePath) return ''
  const parts = filePath.split('/')
  return parts[parts.length - 1] || filePath
}

export default function CallStackPanel({
  frames,
  currentFrameId,
  onFrameSelect,
  onNavigate,
  disabled
}: CallStackPanelProps) {
  if (disabled) {
    return (
      <div className="debug-empty-state">
        <Layers size={32} />
        <span className="debug-empty-state-text">ابدأ جلسة التصحيح لعرض مكدس الاستدعاءات</span>
      </div>
    )
  }

  if (frames.length === 0) {
    return (
      <div className="debug-empty-state">
        <Layers size={32} />
        <span className="debug-empty-state-text">لا يوجد مكدس استدعاءات</span>
      </div>
    )
  }

  const handleFrameClick = (frame: StackFrame) => {
    onFrameSelect(frame.id)
    if (frame.filePath) {
      onNavigate(frame.filePath, frame.line)
    }
  }

  return (
    <ul className="callstack-list">
      {frames.map((frame, index) => (
        <li
          key={frame.id}
          className={`callstack-frame ${frame.id === currentFrameId ? 'current' : ''}`}
          onClick={() => handleFrameClick(frame)}
          title={frame.filePath ? `${frame.filePath}:${frame.line}` : undefined}
        >
          <span className="frame-icon">
            {index === 0 ? (
              <PlayCircle size={14} />
            ) : (
              <FileCode size={14} />
            )}
          </span>

          <span className="frame-name">{frame.name || '(مجهول)'}</span>

          {frame.filePath && (
            <span className="frame-location">
              {getFileName(frame.filePath)}:{frame.line}
            </span>
          )}
        </li>
      ))}
    </ul>
  )
}
