import React from 'react'
import { Play, Pause, Square, RotateCcw, ArrowDown, ArrowRight, ArrowUp, Bug } from 'lucide-react'
import { useDebugStore } from '../stores/useDebugStore'

interface DebugToolbarProps {
  onStartDebug: () => void
  onStopDebug: () => void
  onContinue: () => void
  onPause: () => void
  onStepOver: () => void
  onStepInto: () => void
  onStepOut: () => void
  onRestart: () => void
  canDebug: boolean
}

export default function DebugToolbar({
  onStartDebug,
  onStopDebug,
  onContinue,
  onPause,
  onStepOver,
  onStepInto,
  onStepOut,
  onRestart,
  canDebug
}: DebugToolbarProps) {
  const debugState = useDebugStore((state) => state.debugState)

  const isDebugging = debugState !== 'idle'
  const isPaused = debugState === 'paused'
  const isRunning = debugState === 'running'
  const isStarting = debugState === 'starting'

  return (
    <div className="debug-toolbar">
      {/* Start/Continue/Pause button */}
      {!isDebugging ? (
        <button
          className="debug-button primary"
          onClick={onStartDebug}
          disabled={!canDebug}
          title="بدء التصحيح (F5)"
        >
          <Bug size={16} />
          <span>تصحيح</span>
        </button>
      ) : isPaused ? (
        <button
          className="debug-button primary"
          onClick={onContinue}
          title="متابعة (F5)"
        >
          <Play size={16} />
          <span>متابعة</span>
        </button>
      ) : (
        <button
          className="debug-button"
          onClick={onPause}
          disabled={isStarting}
          title="إيقاف مؤقت (F6)"
        >
          <Pause size={16} />
          <span>إيقاف مؤقت</span>
        </button>
      )}

      {/* Stop button */}
      <button
        className="debug-button stop"
        onClick={onStopDebug}
        disabled={!isDebugging}
        title="إيقاف (Shift+F5)"
      >
        <Square size={16} />
        <span>إيقاف</span>
      </button>

      {/* Restart button */}
      <button
        className="debug-button"
        onClick={onRestart}
        disabled={!isDebugging}
        title="إعادة التشغيل (Ctrl+Shift+F5)"
      >
        <RotateCcw size={16} />
        <span>إعادة</span>
      </button>

      <div className="debug-toolbar-separator" />

      {/* Step Over */}
      <button
        className="debug-button"
        onClick={onStepOver}
        disabled={!isPaused}
        title="الخطوة التالية (F10)"
      >
        <ArrowRight size={16} />
        <span>التالي</span>
      </button>

      {/* Step Into */}
      <button
        className="debug-button"
        onClick={onStepInto}
        disabled={!isPaused}
        title="الدخول للدالة (F11)"
      >
        <ArrowDown size={16} />
        <span>دخول</span>
      </button>

      {/* Step Out */}
      <button
        className="debug-button"
        onClick={onStepOut}
        disabled={!isPaused}
        title="الخروج من الدالة (Shift+F11)"
      >
        <ArrowUp size={16} />
        <span>خروج</span>
      </button>

      {/* Debug state indicator */}
      <div className="debug-state">
        {isStarting && <span className="state starting">جارٍ البدء...</span>}
        {isRunning && <span className="state running">قيد التشغيل</span>}
        {isPaused && <span className="state paused">متوقف</span>}
      </div>
    </div>
  )
}
