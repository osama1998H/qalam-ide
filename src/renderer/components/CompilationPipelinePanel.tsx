import React, { useCallback, useEffect } from 'react'
import { X, Play, RefreshCw, CheckCircle, Clock, AlertCircle, Loader2 } from 'lucide-react'
import { useCompilationPipelineStore, formatTime, PipelineStage, StageStatus } from '../stores/useCompilationPipelineStore'
import '../styles/panels/compilation-pipeline.css'

interface CompilationPipelinePanelProps {
  visible: boolean
  onClose: () => void
  filePath: string | null
}

// Stage icon based on status
function StageIcon({ status }: { status: StageStatus }) {
  switch (status) {
    case 'completed':
      return <CheckCircle size={16} className="stage-icon completed" />
    case 'running':
      return <Loader2 size={16} className="stage-icon running" />
    case 'failed':
      return <AlertCircle size={16} className="stage-icon failed" />
    default:
      return <Clock size={16} className="stage-icon pending" />
  }
}

// Single stage component
function PipelineStageItem({ stage, isLast }: { stage: PipelineStage; isLast: boolean }) {
  return (
    <div className={`pipeline-stage ${stage.status}`}>
      <div className="stage-connector-left" />
      <div className="stage-content">
        <StageIcon status={stage.status} />
        <div className="stage-info">
          <span className="stage-name">{stage.nameAr}</span>
          <span className="stage-name-en">{stage.name}</span>
          {stage.timeUs !== undefined && stage.status === 'completed' && (
            <span className="stage-time">{formatTime(stage.timeUs)}</span>
          )}
        </div>
      </div>
      {!isLast && <div className="stage-connector-right" />}
    </div>
  )
}

export default function CompilationPipelinePanel({
  visible,
  onClose,
  filePath
}: CompilationPipelinePanelProps) {
  const {
    stages,
    isCompiling,
    totalTimeUs,
    lastError,
    startCompilation,
    completeCompilation,
    failCompilation,
    reset
  } = useCompilationPipelineStore()

  // Run compilation with timing
  const runCompilation = useCallback(async () => {
    if (!filePath) {
      failCompilation('يرجى حفظ الملف أولاً')
      return
    }

    startCompilation(filePath)

    try {
      const result = await window.qalam.compiler.compileWithTiming(filePath)

      if (result.success && result.timing) {
        completeCompilation(result.timing, true)
      } else if (result.timing) {
        // Partial success - got timing but compilation failed
        completeCompilation(result.timing, false)
        if (result.errors) {
          failCompilation(result.errors)
        }
      } else {
        failCompilation(result.errors || 'فشل في الترجمة')
      }
    } catch (e) {
      failCompilation(`خطأ: ${e}`)
    }
  }, [filePath, startCompilation, completeCompilation, failCompilation])

  // Auto-run when panel opens with a file
  useEffect(() => {
    if (visible && filePath && !isCompiling && totalTimeUs === 0) {
      runCompilation()
    }
  }, [visible, filePath])

  if (!visible) {
    return null
  }

  return (
    <div className="pipeline-panel">
      <div className="pipeline-header">
        <div className="pipeline-title">
          <Play size={16} />
          <span>خط أنابيب الترجمة</span>
          <span className="pipeline-title-en">Compilation Pipeline</span>
        </div>
        <div className="pipeline-actions">
          <button
            className="pipeline-btn"
            onClick={runCompilation}
            disabled={isCompiling || !filePath}
            title="إعادة الترجمة / Recompile"
          >
            <RefreshCw size={14} className={isCompiling ? 'spinning' : ''} />
          </button>
          <button className="pipeline-btn" onClick={onClose} title="إغلاق / Close">
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="pipeline-content">
        {!filePath ? (
          <div className="pipeline-empty">
            <AlertCircle size={32} />
            <p>يرجى حفظ الملف أولاً</p>
            <p className="pipeline-empty-hint">Save the file first to see compilation timing</p>
          </div>
        ) : (
          <>
            {/* Stage Pipeline Visualization */}
            <div className="pipeline-stages">
              {stages.map((stage, index) => (
                <PipelineStageItem
                  key={stage.id}
                  stage={stage}
                  isLast={index === stages.length - 1}
                />
              ))}
            </div>

            {/* Total Time */}
            {totalTimeUs > 0 && (
              <div className="pipeline-summary">
                <div className="summary-row">
                  <span className="summary-label">الوقت الكلي / Total Time</span>
                  <span className="summary-value">{formatTime(totalTimeUs)}</span>
                </div>
              </div>
            )}

            {/* Error Display */}
            {lastError && (
              <div className="pipeline-error">
                <AlertCircle size={14} />
                <span>{lastError}</span>
              </div>
            )}

            {/* Reset button */}
            {(totalTimeUs > 0 || lastError) && (
              <button className="pipeline-reset-btn" onClick={reset}>
                مسح / Reset
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
