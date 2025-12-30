import React, { useEffect } from 'react'
import { RefreshCw, Layers, Activity } from 'lucide-react'
import { useMemoryStore } from '../../../stores/useMemoryStore'
import { useIsPaused } from '../../../stores/useDebugStore'
import MemoryStatsBar from './MemoryStatsBar'
import HeapAllocationsView from './HeapAllocationsView'
import MemoryTimelineView from './MemoryTimelineView'

export default function MemoryInspectorPanel() {
  const isPaused = useIsPaused()
  const viewMode = useMemoryStore((state) => state.viewMode)
  const isLoading = useMemoryStore((state) => state.isLoading)
  const setViewMode = useMemoryStore((state) => state.setViewMode)
  const refreshAll = useMemoryStore((state) => state.refreshAll)
  const resetMemoryData = useMemoryStore((state) => state.resetMemoryData)

  // Auto-refresh when paused
  useEffect(() => {
    if (isPaused) {
      refreshAll()
    } else {
      resetMemoryData()
    }
  }, [isPaused, refreshAll, resetMemoryData])

  const handleRefresh = () => {
    if (!isLoading) {
      refreshAll()
    }
  }

  return (
    <div className="memory-inspector-panel">
      {/* Header */}
      <div className="memory-inspector-header">
        <span className="memory-inspector-title">فاحص الذاكرة</span>
        <button
          className={`memory-refresh-btn ${isLoading ? 'loading' : ''}`}
          onClick={handleRefresh}
          disabled={!isPaused || isLoading}
          title="تحديث"
        >
          <RefreshCw size={14} className={isLoading ? 'spin' : ''} />
        </button>
      </div>

      {/* Tab buttons */}
      <div className="memory-tabs">
        <button
          className={`memory-tab ${viewMode === 'heap' ? 'active' : ''}`}
          onClick={() => setViewMode('heap')}
        >
          <Layers size={14} />
          <span>التخصيصات</span>
        </button>
        <button
          className={`memory-tab ${viewMode === 'timeline' ? 'active' : ''}`}
          onClick={() => setViewMode('timeline')}
        >
          <Activity size={14} />
          <span>الخط الزمني</span>
        </button>
      </div>

      {/* Stats bar */}
      <MemoryStatsBar />

      {/* Content */}
      <div className="memory-content">
        {viewMode === 'heap' ? (
          <HeapAllocationsView disabled={!isPaused} />
        ) : (
          <MemoryTimelineView disabled={!isPaused} />
        )}
      </div>
    </div>
  )
}

// Re-export components for direct use
export { MemoryStatsBar, HeapAllocationsView, MemoryTimelineView }
