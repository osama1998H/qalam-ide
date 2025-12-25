import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Tab {
  id: string
  filePath: string | null
  fileName: string
  content: string
  savedContent: string
  isDirty: boolean
  cursorPosition: { line: number; col: number }
}

/**
 * Serializable tab state for workspace persistence
 * Only stores file path and cursor - content is loaded from disk
 */
export interface SerializableTab {
  filePath: string
  cursorPosition: { line: number; col: number }
}

export interface SerializableTabState {
  tabs: SerializableTab[]
  activeTabIndex: number
}

interface TabState {
  tabs: Tab[]
  activeTabId: string | null

  // Actions
  createTab: (filePath?: string | null, content?: string) => string
  closeTab: (tabId: string) => boolean // returns false if cancelled due to unsaved
  closeOtherTabs: (tabId: string) => void
  closeTabsToRight: (tabId: string) => void
  closeAllTabs: () => void
  setActiveTab: (tabId: string) => void
  updateTabContent: (tabId: string, content: string) => void
  updateTabCursor: (tabId: string, line: number, col: number) => void
  markTabSaved: (tabId: string, filePath?: string) => void
  getActiveTab: () => Tab | undefined
  getTab: (tabId: string) => Tab | undefined
  hasUnsavedTabs: () => boolean
  nextTab: () => void
  prevTab: () => void

  // Workspace serialization
  getSerializableState: () => SerializableTabState
  restoreFromState: (state: SerializableTabState, loadContent: (path: string) => Promise<string | null>) => Promise<void>
}

let tabCounter = 0

function generateTabId(): string {
  return `tab-${++tabCounter}-${Date.now()}`
}

function getFileName(filePath: string | null): string {
  if (!filePath) return 'ملف جديد'
  const parts = filePath.split('/')
  return parts[parts.length - 1] || 'ملف جديد'
}

export const useTabStore = create<TabState>()(
  persist(
    (set, get) => ({
      tabs: [],
      activeTabId: null,

      createTab: (filePath = null, content = '') => {
        const id = generateTabId()
        const newTab: Tab = {
          id,
          filePath,
          fileName: getFileName(filePath),
          content,
          savedContent: content,
          isDirty: false,
          cursorPosition: { line: 1, col: 1 }
        }

        set(state => ({
          tabs: [...state.tabs, newTab],
          activeTabId: id
        }))

        return id
      },

      closeTab: (tabId: string) => {
        const state = get()
        const tab = state.tabs.find(t => t.id === tabId)

        if (!tab) return true

        // Check for unsaved changes - caller should handle confirmation
        if (tab.isDirty) {
          return false // Signal that tab has unsaved changes
        }

        const tabIndex = state.tabs.findIndex(t => t.id === tabId)
        const newTabs = state.tabs.filter(t => t.id !== tabId)

        let newActiveId = state.activeTabId
        if (state.activeTabId === tabId) {
          if (newTabs.length > 0) {
            // Activate the tab to the left, or the first tab
            const newIndex = Math.min(tabIndex, newTabs.length - 1)
            newActiveId = newTabs[newIndex]?.id || null
          } else {
            newActiveId = null
          }
        }

        set({
          tabs: newTabs,
          activeTabId: newActiveId
        })

        return true
      },

      closeOtherTabs: (tabId: string) => {
        const state = get()
        const remainingTabs = state.tabs.filter(t => t.id === tabId || t.isDirty)

        set({
          tabs: remainingTabs,
          activeTabId: tabId
        })
      },

      closeTabsToRight: (tabId: string) => {
        const state = get()
        const tabIndex = state.tabs.findIndex(t => t.id === tabId)
        if (tabIndex === -1) return

        const tabsToKeep = state.tabs.slice(0, tabIndex + 1)
        const tabsToRight = state.tabs.slice(tabIndex + 1)
        const unsavedToRight = tabsToRight.filter(t => t.isDirty)

        // Keep the current tab and any unsaved tabs to the right
        const newTabs = [...tabsToKeep, ...unsavedToRight]

        let newActiveId = state.activeTabId
        if (state.activeTabId && !newTabs.find(t => t.id === state.activeTabId)) {
          newActiveId = tabId
        }

        set({
          tabs: newTabs,
          activeTabId: newActiveId
        })
      },

      closeAllTabs: () => {
        const state = get()
        const unsavedTabs = state.tabs.filter(t => t.isDirty)

        if (unsavedTabs.length > 0) {
          // Keep only unsaved tabs
          set({
            tabs: unsavedTabs,
            activeTabId: unsavedTabs[0]?.id || null
          })
        } else {
          set({
            tabs: [],
            activeTabId: null
          })
        }
      },

      setActiveTab: (tabId: string) => {
        set({ activeTabId: tabId })
      },

      updateTabContent: (tabId: string, content: string) => {
        set(state => ({
          tabs: state.tabs.map(tab =>
            tab.id === tabId
              ? {
                  ...tab,
                  content,
                  isDirty: content !== tab.savedContent
                }
              : tab
          )
        }))
      },

      updateTabCursor: (tabId: string, line: number, col: number) => {
        set(state => ({
          tabs: state.tabs.map(tab =>
            tab.id === tabId
              ? { ...tab, cursorPosition: { line, col } }
              : tab
          )
        }))
      },

      markTabSaved: (tabId: string, filePath?: string) => {
        set(state => ({
          tabs: state.tabs.map(tab =>
            tab.id === tabId
              ? {
                  ...tab,
                  savedContent: tab.content,
                  isDirty: false,
                  filePath: filePath ?? tab.filePath,
                  fileName: getFileName(filePath ?? tab.filePath)
                }
              : tab
          )
        }))
      },

      getActiveTab: () => {
        const state = get()
        return state.tabs.find(t => t.id === state.activeTabId)
      },

      getTab: (tabId: string) => {
        return get().tabs.find(t => t.id === tabId)
      },

      hasUnsavedTabs: () => {
        return get().tabs.some(t => t.isDirty)
      },

      nextTab: () => {
        const state = get()
        if (state.tabs.length <= 1) return

        const currentIndex = state.tabs.findIndex(t => t.id === state.activeTabId)
        const nextIndex = (currentIndex + 1) % state.tabs.length
        set({ activeTabId: state.tabs[nextIndex].id })
      },

      prevTab: () => {
        const state = get()
        if (state.tabs.length <= 1) return

        const currentIndex = state.tabs.findIndex(t => t.id === state.activeTabId)
        const prevIndex = currentIndex === 0 ? state.tabs.length - 1 : currentIndex - 1
        set({ activeTabId: state.tabs[prevIndex].id })
      },

      // Workspace serialization - only persist saved files with their paths
      getSerializableState: () => {
        const state = get()
        const savedTabs = state.tabs
          .filter(t => t.filePath !== null && !t.isDirty) // Only saved files
          .map(t => ({
            filePath: t.filePath!,
            cursorPosition: t.cursorPosition
          }))

        const activeIndex = state.activeTabId
          ? savedTabs.findIndex(t =>
              state.tabs.find(tab => tab.id === state.activeTabId)?.filePath === t.filePath
            )
          : -1

        return {
          tabs: savedTabs,
          activeTabIndex: activeIndex >= 0 ? activeIndex : 0
        }
      },

      restoreFromState: async (
        savedState: SerializableTabState,
        loadContent: (path: string) => Promise<string | null>
      ) => {
        // Clear current tabs
        set({ tabs: [], activeTabId: null })

        const newTabs: Tab[] = []
        let activeId: string | null = null

        for (let i = 0; i < savedState.tabs.length; i++) {
          const savedTab = savedState.tabs[i]
          const content = await loadContent(savedTab.filePath)

          if (content !== null) {
            const id = generateTabId()
            newTabs.push({
              id,
              filePath: savedTab.filePath,
              fileName: getFileName(savedTab.filePath),
              content,
              savedContent: content,
              isDirty: false,
              cursorPosition: savedTab.cursorPosition
            })

            if (i === savedState.activeTabIndex) {
              activeId = id
            }
          }
        }

        set({
          tabs: newTabs,
          activeTabId: activeId || (newTabs.length > 0 ? newTabs[0].id : null)
        })
      }
    }),
    {
      name: 'qalam-tabs',
      partialize: (state) => ({
        // Only persist file paths and cursor positions for saved files
        tabs: state.tabs
          .filter(t => t.filePath !== null)
          .map(t => ({
            filePath: t.filePath,
            cursorPosition: t.cursorPosition
          })),
        activeTabIndex: state.activeTabId
          ? state.tabs.findIndex(t => t.id === state.activeTabId)
          : 0
      }),
      // Don't automatically restore - we need to load file content first
      // Restoration is handled by App.tsx on mount
      skipHydration: true
    }
  )
)
