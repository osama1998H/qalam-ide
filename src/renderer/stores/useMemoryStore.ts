import { create } from 'zustand'
import type {
  MemoryStats,
  HeapAllocation,
  MemoryTimelineEvent
} from '../../preload/index'

// View modes for Memory Inspector
export type MemoryViewMode = 'heap' | 'timeline'

interface MemoryStoreState {
  // View mode
  viewMode: MemoryViewMode

  // Data
  memoryStats: MemoryStats | null
  heapAllocations: HeapAllocation[]
  timelineEvents: MemoryTimelineEvent[]

  // UI State
  isLoading: boolean
  error: string | null
  selectedAllocationId: number | null
  expandedAllocations: Set<number>

  // Filter
  filterText: string

  // Actions
  setViewMode: (mode: MemoryViewMode) => void
  setMemoryStats: (stats: MemoryStats | null) => void
  setHeapAllocations: (allocations: HeapAllocation[]) => void
  setTimelineEvents: (events: MemoryTimelineEvent[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  selectAllocation: (id: number | null) => void
  toggleAllocationExpanded: (id: number) => void
  setFilterText: (text: string) => void
  resetMemoryData: () => void

  // Async actions (fetch from DAP)
  fetchMemoryStats: () => Promise<void>
  fetchHeapAllocations: () => Promise<void>
  fetchMemoryTimeline: () => Promise<void>
  refreshAll: () => Promise<void>
}

export const useMemoryStore = create<MemoryStoreState>()((set, get) => ({
  // Initial state
  viewMode: 'heap',
  memoryStats: null,
  heapAllocations: [],
  timelineEvents: [],
  isLoading: false,
  error: null,
  selectedAllocationId: null,
  expandedAllocations: new Set(),
  filterText: '',

  // Actions
  setViewMode: (viewMode) => set({ viewMode }),
  setMemoryStats: (memoryStats) => set({ memoryStats }),
  setHeapAllocations: (heapAllocations) => set({ heapAllocations }),
  setTimelineEvents: (timelineEvents) => set({ timelineEvents }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  selectAllocation: (selectedAllocationId) => set({ selectedAllocationId }),

  toggleAllocationExpanded: (id) => {
    set((state) => {
      const expanded = new Set(state.expandedAllocations)
      if (expanded.has(id)) {
        expanded.delete(id)
      } else {
        expanded.add(id)
      }
      return { expandedAllocations: expanded }
    })
  },

  setFilterText: (filterText) => set({ filterText }),

  resetMemoryData: () => {
    set({
      memoryStats: null,
      heapAllocations: [],
      timelineEvents: [],
      error: null,
      selectedAllocationId: null,
      expandedAllocations: new Set()
    })
  },

  // Async actions
  fetchMemoryStats: async () => {
    set({ isLoading: true, error: null })
    try {
      const result = await window.qalam.dap.memoryStats()
      if (result.success && result.stats) {
        set({ memoryStats: result.stats })
      } else {
        set({ error: result.error || 'فشل في جلب إحصائيات الذاكرة' })
      }
    } catch (err) {
      set({ error: (err as Error).message })
    } finally {
      set({ isLoading: false })
    }
  },

  fetchHeapAllocations: async () => {
    const { filterText } = get()
    set({ isLoading: true, error: null })
    try {
      const options = filterText ? { filter: filterText } : undefined
      const result = await window.qalam.dap.heapAllocations(options)
      if (result.success && result.allocations) {
        set({ heapAllocations: result.allocations })
      } else {
        set({ error: result.error || 'فشل في جلب تخصيصات الكومة' })
      }
    } catch (err) {
      set({ error: (err as Error).message })
    } finally {
      set({ isLoading: false })
    }
  },

  fetchMemoryTimeline: async () => {
    set({ isLoading: true, error: null })
    try {
      const result = await window.qalam.dap.memoryTimeline()
      if (result.success && result.events) {
        set({ timelineEvents: result.events })
      } else {
        set({ error: result.error || 'فشل في جلب الخط الزمني للذاكرة' })
      }
    } catch (err) {
      set({ error: (err as Error).message })
    } finally {
      set({ isLoading: false })
    }
  },

  refreshAll: async () => {
    const { viewMode } = get()
    set({ isLoading: true, error: null })
    try {
      // Always fetch stats
      const statsResult = await window.qalam.dap.memoryStats()
      if (statsResult.success && statsResult.stats) {
        set({ memoryStats: statsResult.stats })
      }

      // Fetch view-specific data
      if (viewMode === 'heap') {
        const { filterText } = get()
        const options = filterText ? { filter: filterText } : undefined
        const heapResult = await window.qalam.dap.heapAllocations(options)
        if (heapResult.success && heapResult.allocations) {
          set({ heapAllocations: heapResult.allocations })
        }
      } else {
        const timelineResult = await window.qalam.dap.memoryTimeline()
        if (timelineResult.success && timelineResult.events) {
          set({ timelineEvents: timelineResult.events })
        }
      }
    } catch (err) {
      set({ error: (err as Error).message })
    } finally {
      set({ isLoading: false })
    }
  }
}))

// Helper hook to check if memory data is available
export function useHasMemoryData(): boolean {
  return useMemoryStore((state) =>
    state.memoryStats !== null || state.heapAllocations.length > 0
  )
}

// Helper hook to get filtered allocations
export function useFilteredAllocations(): HeapAllocation[] {
  const allocations = useMemoryStore((state) => state.heapAllocations)
  const filterText = useMemoryStore((state) => state.filterText)

  if (!filterText.trim()) {
    return allocations
  }

  const filter = filterText.toLowerCase()
  return allocations.filter((a) =>
    a.type_name.toLowerCase().includes(filter) ||
    a.type_name_ar.includes(filter) ||
    a.tag.toLowerCase().includes(filter)
  )
}

// Format bytes to human readable string
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

// Format bytes with Arabic units
export function formatBytesAr(bytes: number): string {
  if (bytes === 0) return '٠ بايت'
  const k = 1024
  const sizes = ['بايت', 'ك.ب', 'م.ب', 'ج.ب']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  const value = parseFloat((bytes / Math.pow(k, i)).toFixed(2))
  // Convert to Arabic numerals
  const arabicNumerals = value.toString().replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[parseInt(d)])
  return `${arabicNumerals} ${sizes[i]}`
}
