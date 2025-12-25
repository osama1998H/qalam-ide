import { create } from 'zustand'

// Search match within a line
export interface SearchMatch {
  lineNumber: number
  lineContent: string
  columnStart: number
  columnEnd: number
}

// Search results grouped by file
export interface SearchFileResult {
  filePath: string
  fileName: string
  matches: SearchMatch[]
}

// Search options
export interface SearchOptions {
  caseSensitive: boolean
  wholeWord: boolean
  useRegex: boolean
  includePattern: string
  excludePattern: string
}

interface SearchState {
  // Search query
  query: string
  replaceText: string

  // Results
  results: SearchFileResult[]
  isSearching: boolean
  totalMatches: number
  totalFiles: number

  // Options
  caseSensitive: boolean
  wholeWord: boolean
  useRegex: boolean
  includePattern: string
  excludePattern: string

  // UI state
  showReplace: boolean
  expandedFiles: Set<string>

  // Actions
  setQuery: (query: string) => void
  setReplaceText: (text: string) => void
  setResults: (results: SearchFileResult[]) => void
  setSearching: (isSearching: boolean) => void
  toggleOption: (option: 'caseSensitive' | 'wholeWord' | 'useRegex') => void
  setIncludePattern: (pattern: string) => void
  setExcludePattern: (pattern: string) => void
  toggleShowReplace: () => void
  toggleFileExpanded: (filePath: string) => void
  expandAllFiles: () => void
  collapseAllFiles: () => void
  clearResults: () => void
  reset: () => void

  // Search operations
  search: (rootPath: string) => Promise<void>
  replaceInFiles: (rootPath: string, filePaths?: string[]) => Promise<{ success: boolean; count: number }>
}

export const useSearchStore = create<SearchState>((set, get) => ({
  // Initial state
  query: '',
  replaceText: '',
  results: [],
  isSearching: false,
  totalMatches: 0,
  totalFiles: 0,
  caseSensitive: false,
  wholeWord: false,
  useRegex: false,
  includePattern: '',
  excludePattern: 'node_modules',
  showReplace: false,
  expandedFiles: new Set<string>(),

  // Actions
  setQuery: (query: string) => set({ query }),

  setReplaceText: (text: string) => set({ replaceText: text }),

  setResults: (results: SearchFileResult[]) => {
    const totalMatches = results.reduce((sum, file) => sum + file.matches.length, 0)
    const expandedFiles = new Set(results.map(r => r.filePath))

    set({
      results,
      totalMatches,
      totalFiles: results.length,
      expandedFiles
    })
  },

  setSearching: (isSearching: boolean) => set({ isSearching }),

  toggleOption: (option: 'caseSensitive' | 'wholeWord' | 'useRegex') => {
    set((state) => ({ [option]: !state[option] }))
  },

  setIncludePattern: (pattern: string) => set({ includePattern: pattern }),

  setExcludePattern: (pattern: string) => set({ excludePattern: pattern }),

  toggleShowReplace: () => set((state) => ({ showReplace: !state.showReplace })),

  toggleFileExpanded: (filePath: string) => {
    set((state) => {
      const newExpanded = new Set(state.expandedFiles)
      if (newExpanded.has(filePath)) {
        newExpanded.delete(filePath)
      } else {
        newExpanded.add(filePath)
      }
      return { expandedFiles: newExpanded }
    })
  },

  expandAllFiles: () => {
    set((state) => ({
      expandedFiles: new Set(state.results.map(r => r.filePath))
    }))
  },

  collapseAllFiles: () => {
    set({ expandedFiles: new Set() })
  },

  clearResults: () => {
    set({
      results: [],
      totalMatches: 0,
      totalFiles: 0,
      expandedFiles: new Set()
    })
  },

  reset: () => {
    set({
      query: '',
      replaceText: '',
      results: [],
      isSearching: false,
      totalMatches: 0,
      totalFiles: 0,
      expandedFiles: new Set()
    })
  },

  // Search operation
  search: async (rootPath: string) => {
    const state = get()
    if (!state.query.trim() || !rootPath) return

    set({ isSearching: true })

    try {
      const result = await window.qalam.search.inFiles(rootPath, state.query, {
        caseSensitive: state.caseSensitive,
        wholeWord: state.wholeWord,
        useRegex: state.useRegex,
        includePattern: state.includePattern,
        excludePattern: state.excludePattern
      })

      if (result.success && result.results) {
        get().setResults(result.results)
      } else {
        get().clearResults()
      }
    } catch (error) {
      console.error('[Search] Error:', error)
      get().clearResults()
    } finally {
      set({ isSearching: false })
    }
  },

  // Replace in files operation
  replaceInFiles: async (rootPath: string, filePaths?: string[]) => {
    const state = get()
    if (!state.query.trim() || !rootPath) {
      return { success: false, count: 0 }
    }

    try {
      const result = await window.qalam.search.replaceInFiles(
        rootPath,
        state.query,
        state.replaceText,
        {
          caseSensitive: state.caseSensitive,
          wholeWord: state.wholeWord,
          useRegex: state.useRegex,
          includePattern: state.includePattern,
          excludePattern: state.excludePattern
        },
        filePaths
      )

      if (result.success) {
        // Re-run search to update results
        await get().search(rootPath)
        return { success: true, count: result.replacedCount || 0 }
      }

      return { success: false, count: 0 }
    } catch (error) {
      console.error('[Search] Replace error:', error)
      return { success: false, count: 0 }
    }
  }
}))
