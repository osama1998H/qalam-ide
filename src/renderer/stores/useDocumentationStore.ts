/**
 * Documentation Store
 *
 * Manages state for the Arabic Documentation Browser panel.
 * Provides access to built-in function documentation and project docs.
 */

import { create } from 'zustand'
import {
  BUILTIN_FUNCTIONS,
  BuiltinFunction,
  DocCategory,
  CATEGORY_ORDER,
  getFunctionsByCategory,
  searchFunctions
} from '../data/builtin-docs'

interface DocumentationState {
  // Search
  searchQuery: string
  setSearchQuery: (query: string) => void

  // Selected function
  selectedFunction: BuiltinFunction | null
  setSelectedFunction: (func: BuiltinFunction | null) => void

  // Category expansion state
  expandedCategories: Set<DocCategory>
  toggleCategory: (category: DocCategory) => void
  expandAllCategories: () => void
  collapseAllCategories: () => void

  // Filtered functions based on search
  getFilteredFunctions: () => BuiltinFunction[]
  getFunctionsByCategory: () => Map<DocCategory, BuiltinFunction[]>

  // Helper to get all categories in order
  getCategoryOrder: () => DocCategory[]
}

export const useDocumentationStore = create<DocumentationState>((set, get) => ({
  // Search state
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),

  // Selected function
  selectedFunction: null,
  setSelectedFunction: (func) => set({ selectedFunction: func }),

  // Category expansion - all expanded by default
  expandedCategories: new Set<DocCategory>(CATEGORY_ORDER),

  toggleCategory: (category) => set((state) => {
    const newExpanded = new Set(state.expandedCategories)
    if (newExpanded.has(category)) {
      newExpanded.delete(category)
    } else {
      newExpanded.add(category)
    }
    return { expandedCategories: newExpanded }
  }),

  expandAllCategories: () => set({
    expandedCategories: new Set<DocCategory>(CATEGORY_ORDER)
  }),

  collapseAllCategories: () => set({
    expandedCategories: new Set<DocCategory>()
  }),

  // Get filtered functions based on search query
  getFilteredFunctions: () => {
    const { searchQuery } = get()
    return searchFunctions(searchQuery)
  },

  // Get functions grouped by category (respecting search filter)
  getFunctionsByCategory: () => {
    const { searchQuery } = get()
    const filteredFunctions = searchFunctions(searchQuery)

    const map = new Map<DocCategory, BuiltinFunction[]>()
    for (const category of CATEGORY_ORDER) {
      map.set(category, [])
    }

    for (const func of filteredFunctions) {
      const list = map.get(func.category)
      if (list) {
        list.push(func)
      }
    }

    return map
  },

  // Get category order
  getCategoryOrder: () => CATEGORY_ORDER
}))
