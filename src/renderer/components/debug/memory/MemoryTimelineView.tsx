import React, { useMemo } from 'react'
import { Activity, TrendingUp, TrendingDown } from 'lucide-react'
import { useMemoryStore, formatBytes, formatBytesAr } from '../../../stores/useMemoryStore'
import type { MemoryTimelineEvent } from '../../../../preload/index'

// Simple bar chart visualization
function MemoryChart({ events }: { events: MemoryTimelineEvent[] }) {
  const chartData = useMemo(() => {
    if (events.length === 0) return []

    // Group events by time buckets (100ms each)
    const buckets = new Map<number, number>()
    let maxValue = 0

    events.forEach((event) => {
      const bucket = Math.floor(event.timestamp_ms / 100) * 100
      buckets.set(bucket, event.total_after)
      maxValue = Math.max(maxValue, event.total_after)
    })

    // Convert to array and sort by time
    const data = Array.from(buckets.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([time, value]) => ({ time, value }))

    // Limit to last 50 data points
    return data.slice(-50).map((d) => ({
      ...d,
      height: maxValue > 0 ? (d.value / maxValue) * 100 : 0
    }))
  }, [events])

  if (chartData.length === 0) {
    return null
  }

  const maxMemory = Math.max(...chartData.map((d) => d.value))

  return (
    <div className="memory-chart">
      <div className="memory-chart-header">
        <span className="memory-chart-title">استخدام الذاكرة</span>
        <span className="memory-chart-max">الحد الأقصى: {formatBytesAr(maxMemory)}</span>
      </div>
      <div className="memory-chart-container">
        <div className="memory-chart-bars">
          {chartData.map((d, idx) => (
            <div
              key={idx}
              className="memory-chart-bar"
              style={{ height: `${d.height}%` }}
              title={`${formatBytes(d.value)} @ ${d.time}ms`}
            />
          ))}
        </div>
        <div className="memory-chart-axis">
          <span>٠</span>
          <span>{formatBytesAr(maxMemory)}</span>
        </div>
      </div>
    </div>
  )
}

// Event list item
interface EventItemProps {
  event: MemoryTimelineEvent
}

function EventItem({ event }: EventItemProps) {
  const isAlloc = event.event_type === 'alloc'

  return (
    <li className={`timeline-event-item ${isAlloc ? 'event-alloc' : 'event-dealloc'}`}>
      <span className="event-icon">
        {isAlloc ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
      </span>
      <span className="event-type">
        {isAlloc ? 'تخصيص' : 'تحرير'}
      </span>
      <span className="event-size">
        {isAlloc ? '+' : '-'}{formatBytesAr(event.size)}
      </span>
      <span className="event-region">{event.region}</span>
      <span className="event-time">
        {event.timestamp_ms.toString().replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[parseInt(d)])} مللي ثانية
      </span>
      <span className="event-total" title={formatBytes(event.total_after)}>
        → {formatBytesAr(event.total_after)}
      </span>
    </li>
  )
}

// Main component
interface MemoryTimelineViewProps {
  disabled?: boolean
}

export default function MemoryTimelineView({ disabled }: MemoryTimelineViewProps) {
  const events = useMemoryStore((state) => state.timelineEvents)
  const isLoading = useMemoryStore((state) => state.isLoading)
  const error = useMemoryStore((state) => state.error)

  if (disabled) {
    return (
      <div className="memory-empty-state">
        <Activity size={32} />
        <span className="memory-empty-text">ابدأ جلسة التصحيح لعرض الخط الزمني للذاكرة</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="memory-error-state">
        <span className="memory-error-text">{error}</span>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="memory-loading-state">
        <span className="memory-loading-text">جاري التحميل...</span>
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="memory-empty-state">
        <Activity size={32} />
        <span className="memory-empty-text">لا توجد أحداث في الخط الزمني</span>
        <span className="memory-empty-hint">سيتم تسجيل أحداث تخصيص وتحرير الذاكرة هنا</span>
      </div>
    )
  }

  return (
    <div className="memory-timeline-view">
      {/* Memory chart visualization */}
      <MemoryChart events={events} />

      {/* Events list */}
      <div className="timeline-events-section">
        <div className="timeline-events-header">
          <Activity size={14} />
          <span>أحداث الذاكرة ({events.length.toString().replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[parseInt(d)])})</span>
        </div>
        <ul className="timeline-events-list">
          {events.slice().reverse().slice(0, 100).map((event, idx) => (
            <EventItem key={idx} event={event} />
          ))}
        </ul>
        {events.length > 100 && (
          <div className="timeline-events-more">
            ...و {(events.length - 100).toString().replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[parseInt(d)])} أحداث أخرى
          </div>
        )}
      </div>
    </div>
  )
}
