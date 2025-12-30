import React from 'react'
import { ChevronDown, ChevronLeft, Box, Type, List, RotateCcw, Search } from 'lucide-react'
import {
  useMemoryStore,
  useFilteredAllocations,
  formatBytes,
  formatBytesAr
} from '../../../stores/useMemoryStore'
import type { HeapAllocation, HeapChild } from '../../../../preload/index'

// Get icon for allocation type
function getTypeIcon(typeName: string): React.ReactNode {
  const size = 14
  const lower = typeName.toLowerCase()
  if (lower.includes('string') || lower.includes('نص')) {
    return <Type size={size} />
  }
  if (lower.includes('array') || lower.includes('مصفوفة')) {
    return <List size={size} />
  }
  return <Box size={size} />
}

// Get type color class
function getTypeClass(typeName: string): string {
  const lower = typeName.toLowerCase()
  if (lower.includes('string') || lower.includes('نص')) {
    return 'type-string'
  }
  if (lower.includes('array') || lower.includes('مصفوفة')) {
    return 'type-array'
  }
  return 'type-object'
}

// Single allocation item
interface AllocationItemProps {
  allocation: HeapAllocation
  isExpanded: boolean
  isSelected: boolean
  onToggleExpand: () => void
  onSelect: () => void
}

function AllocationItem({
  allocation,
  isExpanded,
  isSelected,
  onToggleExpand,
  onSelect
}: AllocationItemProps) {
  const hasChildren = allocation.children.length > 0
  const typeClass = getTypeClass(allocation.type_name)

  return (
    <>
      <li
        className={`heap-allocation-item ${isSelected ? 'selected' : ''}`}
        onClick={onSelect}
      >
        <span
          className={`allocation-expand ${!hasChildren ? 'hidden' : ''}`}
          onClick={(e) => {
            e.stopPropagation()
            onToggleExpand()
          }}
        >
          {isExpanded ? (
            <ChevronDown size={12} />
          ) : (
            <ChevronLeft size={12} />
          )}
        </span>

        <span className={`allocation-icon ${typeClass}`}>
          {getTypeIcon(allocation.type_name)}
        </span>

        <span className="allocation-type" title={allocation.type_name}>
          {allocation.type_name_ar || allocation.type_name}
        </span>

        <span className="allocation-address" title={allocation.address}>
          {allocation.address}
        </span>

        <span className="allocation-size" title={formatBytes(allocation.size)}>
          {formatBytesAr(allocation.size)}
        </span>

        <span className="allocation-refcount" title={`عدد المراجع: ${allocation.ref_count}`}>
          <RotateCcw size={10} />
          {allocation.ref_count.toString().replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[parseInt(d)])}
        </span>

        {allocation.tag && (
          <span className="allocation-tag" title={allocation.tag}>
            {allocation.tag}
          </span>
        )}
      </li>

      {isExpanded && hasChildren && (
        <ul className="allocation-children">
          {allocation.children.map((child, idx) => (
            <ChildItem key={`${child.name}-${idx}`} child={child} />
          ))}
        </ul>
      )}
    </>
  )
}

// Child item (field or array element)
interface ChildItemProps {
  child: HeapChild
}

function ChildItem({ child }: ChildItemProps) {
  return (
    <li className="heap-child-item">
      <span className="child-name">{child.name}</span>
      <span className="child-separator">:</span>
      <span className={`child-value ${getTypeClass(child.type_name)}`}>
        {child.value}
      </span>
      {child.type_name && (
        <span className="child-type">
          ({child.type_name_ar || child.type_name})
        </span>
      )}
    </li>
  )
}

// Main component
interface HeapAllocationsViewProps {
  disabled?: boolean
}

export default function HeapAllocationsView({ disabled }: HeapAllocationsViewProps) {
  const allocations = useFilteredAllocations()
  const isLoading = useMemoryStore((state) => state.isLoading)
  const error = useMemoryStore((state) => state.error)
  const selectedId = useMemoryStore((state) => state.selectedAllocationId)
  const expandedAllocations = useMemoryStore((state) => state.expandedAllocations)
  const filterText = useMemoryStore((state) => state.filterText)
  const selectAllocation = useMemoryStore((state) => state.selectAllocation)
  const toggleAllocationExpanded = useMemoryStore((state) => state.toggleAllocationExpanded)
  const setFilterText = useMemoryStore((state) => state.setFilterText)

  if (disabled) {
    return (
      <div className="memory-empty-state">
        <Box size={32} />
        <span className="memory-empty-text">ابدأ جلسة التصحيح لعرض تخصيصات الذاكرة</span>
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

  return (
    <div className="heap-allocations-view">
      {/* Filter input */}
      <div className="heap-filter-bar">
        <Search size={14} />
        <input
          type="text"
          className="heap-filter-input"
          placeholder="تصفية حسب النوع..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="memory-loading-state">
          <span className="memory-loading-text">جاري التحميل...</span>
        </div>
      ) : allocations.length === 0 ? (
        <div className="memory-empty-state">
          <Box size={32} />
          <span className="memory-empty-text">
            {filterText ? 'لا توجد نتائج مطابقة' : 'لا توجد تخصيصات في الكومة'}
          </span>
        </div>
      ) : (
        <ul className="heap-allocations-list">
          {allocations.map((allocation) => (
            <AllocationItem
              key={allocation.id}
              allocation={allocation}
              isExpanded={expandedAllocations.has(allocation.id)}
              isSelected={selectedId === allocation.id}
              onToggleExpand={() => toggleAllocationExpanded(allocation.id)}
              onSelect={() => selectAllocation(allocation.id)}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
