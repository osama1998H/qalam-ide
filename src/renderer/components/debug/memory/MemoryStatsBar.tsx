import React from 'react'
import { Database, TrendingUp, Layers } from 'lucide-react'
import { useMemoryStore, formatBytes, formatBytesAr } from '../../../stores/useMemoryStore'

export default function MemoryStatsBar() {
  const memoryStats = useMemoryStore((state) => state.memoryStats)
  const isLoading = useMemoryStore((state) => state.isLoading)

  if (!memoryStats && !isLoading) {
    return null
  }

  if (isLoading) {
    return (
      <div className="memory-stats-bar memory-stats-loading">
        <span className="memory-stats-loading-text">جاري تحميل الإحصائيات...</span>
      </div>
    )
  }

  if (!memoryStats) return null

  return (
    <div className="memory-stats-bar">
      <div className="memory-stat-item">
        <Database size={14} />
        <span className="memory-stat-label">الإجمالي</span>
        <span className="memory-stat-value" title={formatBytes(memoryStats.total_allocated)}>
          {formatBytesAr(memoryStats.total_allocated)}
        </span>
      </div>

      <div className="memory-stat-item">
        <TrendingUp size={14} />
        <span className="memory-stat-label">الذروة</span>
        <span className="memory-stat-value" title={formatBytes(memoryStats.total_peak)}>
          {formatBytesAr(memoryStats.total_peak)}
        </span>
      </div>

      <div className="memory-stat-item">
        <Layers size={14} />
        <span className="memory-stat-label">حية</span>
        <span className="memory-stat-value">
          {memoryStats.live_allocations.toString().replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[parseInt(d)])}
        </span>
      </div>
    </div>
  )
}
