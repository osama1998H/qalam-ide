import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type SidebarTab = 'files' | 'outline' | 'search' | 'docs'

interface UIState {
  // Sidebar
  sidebarVisible: boolean
  sidebarWidth: number
  sidebarActiveTab: SidebarTab

  // Bottom panels
  outputPanelVisible: boolean
  problemsPanelVisible: boolean
  searchPanelVisible: boolean
  panelHeight: number

  // Dialog/overlay panels (Phase 6.1: centralized panel state)
  showFind: boolean
  showReplace: boolean
  showGoToLine: boolean
  showQuickOpen: boolean
  showSettings: boolean
  showKeyboardShortcuts: boolean
  showAstViewer: boolean
  showTypeInspector: boolean
  showIRViewer: boolean
  showPipelineStatus: boolean
  showManifestEditor: boolean
  showBuildConfig: boolean
  showProfiler: boolean
  showDebugSidebar: boolean

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

  // Dialog/overlay panel actions (Phase 6.1)
  setShowFind: (visible: boolean) => void
  toggleFind: () => void
  setShowReplace: (visible: boolean) => void
  toggleReplace: () => void
  setShowGoToLine: (visible: boolean) => void
  toggleGoToLine: () => void
  setShowQuickOpen: (visible: boolean) => void
  toggleQuickOpen: () => void
  setShowSettings: (visible: boolean) => void
  toggleSettings: () => void
  setShowKeyboardShortcuts: (visible: boolean) => void
  toggleKeyboardShortcuts: () => void
  setShowAstViewer: (visible: boolean) => void
  toggleAstViewer: () => void
  setShowTypeInspector: (visible: boolean) => void
  toggleTypeInspector: () => void
  setShowIRViewer: (visible: boolean) => void
  toggleIRViewer: () => void
  setShowPipelineStatus: (visible: boolean) => void
  togglePipelineStatus: () => void
  setShowManifestEditor: (visible: boolean) => void
  toggleManifestEditor: () => void
  setShowBuildConfig: (visible: boolean) => void
  toggleBuildConfig: () => void
  setShowProfiler: (visible: boolean) => void
  toggleProfiler: () => void
  setShowDebugSidebar: (visible: boolean) => void
  toggleDebugSidebar: () => void

  // Close all panels (for Escape key)
  closeAllOverlays: () => boolean

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

const defaultState = {
  sidebarVisible: true,
  sidebarWidth: 250,
  sidebarActiveTab: 'files' as SidebarTab,
  outputPanelVisible: false,
  problemsPanelVisible: false,
  searchPanelVisible: false,
  panelHeight: 200,
  expandedFolders: [] as string[],
  // Dialog/overlay panels default to closed
  showFind: false,
  showReplace: false,
  showGoToLine: false,
  showQuickOpen: false,
  showSettings: false,
  showKeyboardShortcuts: false,
  showAstViewer: false,
  showTypeInspector: false,
  showIRViewer: false,
  showPipelineStatus: false,
  showManifestEditor: false,
  showBuildConfig: false,
  showProfiler: false,
  showDebugSidebar: false,
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

      // Dialog/overlay panel actions (Phase 6.1)
      setShowFind: (visible) => set({ showFind: visible }),
      toggleFind: () => set((state) => ({ showFind: !state.showFind })),

      setShowReplace: (visible) => set({ showReplace: visible }),
      toggleReplace: () => set((state) => ({ showReplace: !state.showReplace })),

      setShowGoToLine: (visible) => set({ showGoToLine: visible }),
      toggleGoToLine: () => set((state) => ({ showGoToLine: !state.showGoToLine })),

      setShowQuickOpen: (visible) => set({ showQuickOpen: visible }),
      toggleQuickOpen: () => set((state) => ({ showQuickOpen: !state.showQuickOpen })),

      setShowSettings: (visible) => set({ showSettings: visible }),
      toggleSettings: () => set((state) => ({ showSettings: !state.showSettings })),

      setShowKeyboardShortcuts: (visible) => set({ showKeyboardShortcuts: visible }),
      toggleKeyboardShortcuts: () => set((state) => ({ showKeyboardShortcuts: !state.showKeyboardShortcuts })),

      setShowAstViewer: (visible) => set({ showAstViewer: visible }),
      toggleAstViewer: () => set((state) => ({ showAstViewer: !state.showAstViewer })),

      setShowTypeInspector: (visible) => set({ showTypeInspector: visible }),
      toggleTypeInspector: () => set((state) => ({ showTypeInspector: !state.showTypeInspector })),

      setShowIRViewer: (visible) => set({ showIRViewer: visible }),
      toggleIRViewer: () => set((state) => ({ showIRViewer: !state.showIRViewer })),

      setShowPipelineStatus: (visible) => set({ showPipelineStatus: visible }),
      togglePipelineStatus: () => set((state) => ({ showPipelineStatus: !state.showPipelineStatus })),

      setShowManifestEditor: (visible) => set({ showManifestEditor: visible }),
      toggleManifestEditor: () => set((state) => ({ showManifestEditor: !state.showManifestEditor })),

      setShowBuildConfig: (visible) => set({ showBuildConfig: visible }),
      toggleBuildConfig: () => set((state) => ({ showBuildConfig: !state.showBuildConfig })),

      setShowProfiler: (visible) => set({ showProfiler: visible }),
      toggleProfiler: () => set((state) => ({ showProfiler: !state.showProfiler })),

      setShowDebugSidebar: (visible) => set({ showDebugSidebar: visible }),
      toggleDebugSidebar: () => set((state) => ({ showDebugSidebar: !state.showDebugSidebar })),

      // Close all overlays in priority order (returns true if something was closed)
      closeAllOverlays: () => {
        const state = get()
        // Priority order for Escape key - close one at a time
        if (state.showKeyboardShortcuts) {
          set({ showKeyboardShortcuts: false })
          return true
        }
        if (state.showManifestEditor) {
          set({ showManifestEditor: false })
          return true
        }
        if (state.showBuildConfig) {
          set({ showBuildConfig: false })
          return true
        }
        if (state.showProfiler) {
          set({ showProfiler: false })
          return true
        }
        if (state.showSettings) {
          set({ showSettings: false })
          return true
        }
        if (state.showQuickOpen) {
          set({ showQuickOpen: false })
          return true
        }
        if (state.showGoToLine) {
          set({ showGoToLine: false })
          return true
        }
        if (state.showFind) {
          set({ showFind: false, showReplace: false })
          return true
        }
        if (state.problemsPanelVisible) {
          set({ problemsPanelVisible: false })
          return true
        }
        if (state.showAstViewer) {
          set({ showAstViewer: false })
          return true
        }
        if (state.showTypeInspector) {
          set({ showTypeInspector: false })
          return true
        }
        if (state.showIRViewer) {
          set({ showIRViewer: false })
          return true
        }
        if (state.showPipelineStatus) {
          set({ showPipelineStatus: false })
          return true
        }
        return false
      },

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
      name: 'qalam-ui-state',
      // Only persist certain fields, not panel visibility
      partialize: (state) => ({
        sidebarVisible: state.sidebarVisible,
        sidebarWidth: state.sidebarWidth,
        sidebarActiveTab: state.sidebarActiveTab,
        panelHeight: state.panelHeight,
        expandedFolders: state.expandedFolders,
      })
    }
  )
)
