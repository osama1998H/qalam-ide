import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type SidebarTab = 'files' | 'outline' | 'search' | 'docs'

interface UIState {
  // Sidebar
  sidebarVisible: boolean
  sidebarWidth: number
  sidebarActiveTab: SidebarTab

  // Panels
  outputPanelVisible: boolean
  problemsPanelVisible: boolean
  searchPanelVisible: boolean
  panelHeight: number

  // File explorer
  expandedFolders: string[]

  // Sidebar actions
  setSidebarVisible: (visible: boolean) => void
  toggleSidebar: () => void
  setSidebarWidth: (width: number) => void
  setSidebarActiveTab: (tab: SidebarTab) => void

  // Panel actions
  setOutputPanelVisible: (visible: boolean) => void
  toggleOutputPanel: () => void
  setProblemsPanelVisible: (visible: boolean) => void
  toggleProblemsPanel: () => void
  setSearchPanelVisible: (visible: boolean) => void
  toggleSearchPanel: () => void
  setPanelHeight: (height: number) => void

  // File explorer actions
  setExpandedFolders: (folders: string[]) => void
  toggleFolderExpanded: (path: string) => void
  expandFolder: (path: string) => void
  collapseFolder: (path: string) => void
  collapseAllFolders: () => void

  // Serialization for workspace
  getSerializableState: () => SerializableUIState
  restoreFromState: (state: Partial<SerializableUIState>) => void

  // Reset
  resetToDefaults: () => void
}

export interface SerializableUIState {
  sidebarVisible: boolean
  sidebarWidth: number
  sidebarActiveTab: SidebarTab
  outputPanelVisible: boolean
  problemsPanelVisible: boolean
  searchPanelVisible: boolean
  panelHeight: number
  expandedFolders: string[]
}

const defaultState: SerializableUIState = {
  sidebarVisible: true,
  sidebarWidth: 250,
  sidebarActiveTab: 'files',
  outputPanelVisible: false,
  problemsPanelVisible: false,
  searchPanelVisible: false,
  panelHeight: 200,
  expandedFolders: []
}

export const useUIStateStore = create<UIState>()(
  persist(
    (set, get) => ({
      ...defaultState,

      // Sidebar actions
      setSidebarVisible: (visible) => set({ sidebarVisible: visible }),

      toggleSidebar: () => set((state) => ({ sidebarVisible: !state.sidebarVisible })),

      setSidebarWidth: (width) => set({ sidebarWidth: Math.max(150, Math.min(500, width)) }),

      setSidebarActiveTab: (tab) => set({ sidebarActiveTab: tab }),

      // Panel actions
      setOutputPanelVisible: (visible) => set({ outputPanelVisible: visible }),

      toggleOutputPanel: () => set((state) => ({ outputPanelVisible: !state.outputPanelVisible })),

      setProblemsPanelVisible: (visible) => set({ problemsPanelVisible: visible }),

      toggleProblemsPanel: () => set((state) => ({ problemsPanelVisible: !state.problemsPanelVisible })),

      setSearchPanelVisible: (visible) => set({ searchPanelVisible: visible }),

      toggleSearchPanel: () => set((state) => ({ searchPanelVisible: !state.searchPanelVisible })),

      setPanelHeight: (height) => set({ panelHeight: Math.max(100, Math.min(500, height)) }),

      // File explorer actions
      setExpandedFolders: (folders) => set({ expandedFolders: folders }),

      toggleFolderExpanded: (path) => set((state) => {
        const isExpanded = state.expandedFolders.includes(path)
        if (isExpanded) {
          return { expandedFolders: state.expandedFolders.filter(p => p !== path) }
        } else {
          return { expandedFolders: [...state.expandedFolders, path] }
        }
      }),

      expandFolder: (path) => set((state) => {
        if (state.expandedFolders.includes(path)) return state
        return { expandedFolders: [...state.expandedFolders, path] }
      }),

      collapseFolder: (path) => set((state) => ({
        expandedFolders: state.expandedFolders.filter(p => p !== path)
      })),

      collapseAllFolders: () => set({ expandedFolders: [] }),

      // Serialization
      getSerializableState: () => {
        const state = get()
        return {
          sidebarVisible: state.sidebarVisible,
          sidebarWidth: state.sidebarWidth,
          sidebarActiveTab: state.sidebarActiveTab,
          outputPanelVisible: state.outputPanelVisible,
          problemsPanelVisible: state.problemsPanelVisible,
          searchPanelVisible: state.searchPanelVisible,
          panelHeight: state.panelHeight,
          expandedFolders: state.expandedFolders
        }
      },

      restoreFromState: (newState) => set((currentState) => ({
        ...currentState,
        ...newState
      })),

      // Reset
      resetToDefaults: () => set(defaultState)
    }),
    {
      name: 'qalam-ui-state'
    }
  )
)
