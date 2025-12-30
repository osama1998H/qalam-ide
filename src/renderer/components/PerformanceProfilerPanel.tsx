import React, { useState, useCallback, useEffect, MouseEvent } from 'react'
import { X, RefreshCw, Clock, Flame, AlertCircle, Loader2, GripHorizontal } from 'lucide-react'
import { useProfilerStore, formatTime, ProfilerViewMode } from '../stores/useProfilerStore'
import '../styles/panels/performance-profiler.css'

interface PerformanceProfilerPanelProps {
  visible: boolean
  onClose: () => void
  filePath: string | null
}

// Tab button component
function TabButton({
  mode,
  currentMode,
  label,
  labelEn,
  icon,
  onClick
}: {
  mode: ProfilerViewMode
  currentMode: ProfilerViewMode
  label: string
  labelEn: string
  icon: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      className={`profiler-tab ${currentMode === mode ? 'active' : ''}`}
      onClick={onClick}
    >
      {icon}
      <span className="tab-label">{label}</span>
      <span className="tab-label-en">{labelEn}</span>
    </button>
  )
}

// Bar component for timing visualization
function TimingBar({
  value,
  maxValue,
  label,
  labelEn
}: {
  value: number
  maxValue: number
  label: string
  labelEn: string
}) {
  const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0
  return (
    <div className="timing-row">
      <div className="timing-label">
        <span className="timing-name">{label}</span>
        <span className="timing-name-en">{labelEn}</span>
      </div>
      <div className="timing-bar-container">
        <div className="timing-bar" style={{ width: `${percentage}%` }} />
        <span className="timing-value">{formatTime(value)}</span>
      </div>
    </div>
  )
}

// Compilation Timing View
function CompilationTimingView({ filePath }: { filePath: string | null }) {
  const {
    compilationTiming,
    isCompiling,
    compilationError,
    startCompilation,
    setCompilationTiming,
    failCompilation
  } = useProfilerStore()

  const runCompilation = useCallback(async () => {
    if (!filePath) {
      failCompilation('يرجى حفظ الملف أولاً')
      return
    }

    startCompilation()

    try {
      const result = await window.qalam.compiler.compileWithTiming(filePath)

      if (result.success && result.timing) {
        setCompilationTiming(result.timing)
      } else if (result.timing) {
        setCompilationTiming(result.timing)
      } else {
        failCompilation(result.errors || 'فشل في الترجمة')
      }
    } catch (e) {
      failCompilation(`خطأ: ${e}`)
    }
  }, [filePath, startCompilation, setCompilationTiming, failCompilation])

  // Auto-run when view opens
  useEffect(() => {
    if (filePath && !isCompiling && !compilationTiming) {
      runCompilation()
    }
  }, [filePath])

  if (!filePath) {
    return (
      <div className="profiler-empty">
        <AlertCircle size={32} />
        <p>يرجى حفظ الملف أولاً</p>
        <p className="profiler-empty-hint">Save the file first</p>
      </div>
    )
  }

  if (isCompiling) {
    return (
      <div className="profiler-loading">
        <Loader2 size={32} className="spinning" />
        <p>جاري الترجمة...</p>
        <p className="profiler-empty-hint">Compiling...</p>
      </div>
    )
  }

  if (compilationError) {
    return (
      <div className="profiler-error">
        <AlertCircle size={32} />
        <p>{compilationError}</p>
        <button className="profiler-retry-btn" onClick={runCompilation}>
          إعادة المحاولة / Retry
        </button>
      </div>
    )
  }

  if (!compilationTiming) {
    return (
      <div className="profiler-empty">
        <Clock size={32} />
        <p>اضغط على التحديث لبدء الترجمة</p>
        <p className="profiler-empty-hint">Click refresh to start compilation</p>
      </div>
    )
  }

  const maxTime = Math.max(
    compilationTiming.lexer,
    compilationTiming.parser,
    compilationTiming.semantic,
    compilationTiming.ir,
    compilationTiming.optimize,
    compilationTiming.codegen
  )

  return (
    <div className="compilation-timing">
      <TimingBar
        value={compilationTiming.lexer}
        maxValue={maxTime}
        label="المحلل اللفظي"
        labelEn="Lexer"
      />
      <TimingBar
        value={compilationTiming.parser}
        maxValue={maxTime}
        label="المحلل النحوي"
        labelEn="Parser"
      />
      <TimingBar
        value={compilationTiming.semantic}
        maxValue={maxTime}
        label="التحليل الدلالي"
        labelEn="Semantic"
      />
      <TimingBar
        value={compilationTiming.ir}
        maxValue={maxTime}
        label="بناء التمثيل الوسيط"
        labelEn="IR Build"
      />
      <TimingBar
        value={compilationTiming.optimize}
        maxValue={maxTime}
        label="التحسين"
        labelEn="Optimize"
      />
      <TimingBar
        value={compilationTiming.codegen}
        maxValue={maxTime}
        label="توليد الكود"
        labelEn="Codegen"
      />

      <div className="timing-total">
        <span className="timing-total-label">الإجمالي / Total</span>
        <span className="timing-total-value">{formatTime(compilationTiming.total)}</span>
      </div>
    </div>
  )
}

// Runtime Profiling View
function RuntimeProfilingView({ filePath }: { filePath: string | null }) {
  const {
    runtimeProfile,
    isProfileRunning,
    profileError,
    startProfiling,
    setRuntimeProfile,
    failProfiling
  } = useProfilerStore()

  const runProfile = useCallback(async () => {
    if (!filePath) {
      failProfiling('يرجى حفظ الملف أولاً')
      return
    }

    startProfiling()

    try {
      const result = await window.qalam.profiler.run(filePath)

      if (result.success && result.profile) {
        setRuntimeProfile(result.profile)
      } else {
        failProfiling(result.error || 'فشل في التنميط')
      }
    } catch (e) {
      failProfiling(`خطأ: ${e}`)
    }
  }, [filePath, startProfiling, setRuntimeProfile, failProfiling])

  // Auto-run when view opens
  useEffect(() => {
    if (filePath && !isProfileRunning && !runtimeProfile) {
      runProfile()
    }
  }, [filePath])

  if (!filePath) {
    return (
      <div className="profiler-empty">
        <AlertCircle size={32} />
        <p>يرجى حفظ الملف أولاً</p>
        <p className="profiler-empty-hint">Save the file first</p>
      </div>
    )
  }

  if (isProfileRunning) {
    return (
      <div className="profiler-loading">
        <Loader2 size={32} className="spinning" />
        <p>جاري التشغيل والتنميط...</p>
        <p className="profiler-empty-hint">Running with profiler...</p>
      </div>
    )
  }

  if (profileError) {
    return (
      <div className="profiler-error">
        <AlertCircle size={32} />
        <p>{profileError}</p>
        <button className="profiler-retry-btn" onClick={runProfile}>
          إعادة المحاولة / Retry
        </button>
      </div>
    )
  }

  if (!runtimeProfile) {
    return (
      <div className="profiler-empty">
        <Flame size={32} />
        <p>اضغط على التحديث لبدء التنميط</p>
        <p className="profiler-empty-hint">Click refresh to start profiling</p>
      </div>
    )
  }

  const maxCalls = Math.max(...runtimeProfile.hot_spots.map((f) => f.calls), 1)

  return (
    <div className="runtime-profiling">
      {/* Summary Stats */}
      <div className="profiler-stats">
        <div className="stat-item">
          <span className="stat-value">{runtimeProfile.total_functions}</span>
          <span className="stat-label">دوال / Functions</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{runtimeProfile.total_calls}</span>
          <span className="stat-label">استدعاءات / Calls</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{runtimeProfile.tier_up_count}</span>
          <span className="stat-label">ترقيات / Tier-ups</span>
        </div>
      </div>

      {/* Hot Spots */}
      <div className="hot-spots">
        <div className="hot-spots-header">
          <Flame size={14} />
          <span>النقاط الساخنة</span>
          <span className="hot-spots-header-en">Hot Spots</span>
        </div>

        {runtimeProfile.hot_spots.length === 0 ? (
          <div className="hot-spots-empty">لا توجد دوال / No functions</div>
        ) : (
          <div className="hot-spots-list">
            {runtimeProfile.hot_spots.map((func, index) => (
              <div key={func.name} className="hot-spot-item">
                <span className="hot-spot-rank">#{index + 1}</span>
                <span className="hot-spot-name">{func.name}</span>
                <div className="hot-spot-bar-container">
                  <div
                    className="hot-spot-bar"
                    style={{ width: `${(func.calls / maxCalls) * 100}%` }}
                  />
                  <span className="hot-spot-calls">{func.calls}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tier Distribution */}
      {Object.keys(runtimeProfile.by_tier).length > 0 && (
        <div className="tier-distribution">
          <div className="tier-header">توزيع المستويات / Tier Distribution</div>
          <div className="tier-items">
            {Object.entries(runtimeProfile.by_tier).map(([tier, count]) => (
              <div key={tier} className="tier-item">
                <span className="tier-name">{tier}</span>
                <span className="tier-count">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Main Panel Component
export default function PerformanceProfilerPanel({
  visible,
  onClose,
  filePath
}: PerformanceProfilerPanelProps) {
  const { viewMode, setViewMode, resetAll } = useProfilerStore()
  const [panelHeight, setPanelHeight] = useState(300)
  const [isResizing, setIsResizing] = useState(false)

  const handleRefresh = useCallback(() => {
    if (viewMode === 'compilation') {
      useProfilerStore.getState().resetCompilation()
    } else {
      useProfilerStore.getState().resetProfiling()
    }
  }, [viewMode])

  // Handle resize drag
  const handleResizeStart = useCallback((e: MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }, [])

  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: globalThis.MouseEvent) => {
      const windowHeight = window.innerHeight
      const newHeight = windowHeight - e.clientY - 24 // 24px for status bar
      setPanelHeight(Math.min(Math.max(newHeight, 200), windowHeight - 150))
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
      className={`profiler-panel ${isResizing ? 'resizing' : ''}`}
      style={{ height: panelHeight }}
    >
      {/* Resize Handle */}
      <div className="profiler-resize-handle" onMouseDown={handleResizeStart}>
        <GripHorizontal size={16} />
      </div>

      <div className="profiler-header">
        <div className="profiler-title">
          <Clock size={16} />
          <span>محلل الأداء</span>
          <span className="profiler-title-en">Performance Profiler</span>
        </div>
        <div className="profiler-actions">
          <button
            className="profiler-btn"
            onClick={handleRefresh}
            title="تحديث / Refresh"
          >
            <RefreshCw size={14} />
          </button>
          <button
            className="profiler-btn"
            onClick={onClose}
            title="إغلاق / Close"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Tab Buttons */}
      <div className="profiler-tabs">
        <TabButton
          mode="compilation"
          currentMode={viewMode}
          label="توقيت الترجمة"
          labelEn="Compilation"
          icon={<Clock size={14} />}
          onClick={() => setViewMode('compilation')}
        />
        <TabButton
          mode="runtime"
          currentMode={viewMode}
          label="تنميط التنفيذ"
          labelEn="Runtime"
          icon={<Flame size={14} />}
          onClick={() => setViewMode('runtime')}
        />
      </div>

      {/* Content */}
      <div className="profiler-content">
        {viewMode === 'compilation' ? (
          <CompilationTimingView filePath={filePath} />
        ) : (
          <RuntimeProfilingView filePath={filePath} />
        )}
      </div>
    </div>
  )
}
