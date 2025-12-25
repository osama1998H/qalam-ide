import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileNode[]
  isExpanded?: boolean
}

/**
 * Represents a workspace folder root
 */
export interface FolderRoot {
  path: string
  name: string
  tree: FileNode[]
  isLoading?: boolean
}

interface FileExplorerState {
  // Multi-root workspace support
  roots: FolderRoot[]
  expandedPaths: Set<string>
  isLoading: boolean

  // Legacy single-root getters (for backward compatibility)
  rootPath: string | null
  rootName: string | null
  tree: FileNode[]

  // Multi-root actions
  addRoot: (path: string, name: string) => void
  removeRoot: (path: string) => void
  setRoots: (roots: { path: string; name: string }[]) => void
  updateRootTree: (rootPath: string, tree: FileNode[]) => void
  setRootLoading: (rootPath: string, loading: boolean) => void

  // Legacy single-root actions (for backward compatibility)
  setRoot: (path: string, name: string) => void
  setTree: (tree: FileNode[]) => void

  // Common actions
  toggleExpanded: (path: string) => void
  setExpanded: (path: string, expanded: boolean) => void
  updateChildren: (path: string, children: FileNode[]) => void
  closeFolder: () => void
  closeAll: () => void
  setLoading: (loading: boolean) => void
}

export const useFileExplorer = create<FileExplorerState>()(
  persist(
    (set, get) => ({
      roots: [],
      expandedPaths: new Set<string>(),
      isLoading: false,

      // Legacy getters - derive from first root for backward compatibility
      get rootPath() {
        const { roots } = get()
        return roots.length > 0 ? roots[0].path : null
      },

      get rootName() {
        const { roots } = get()
        return roots.length > 0 ? roots[0].name : null
      },

      get tree() {
        const { roots } = get()
        return roots.length > 0 ? roots[0].tree : []
      },

      // Multi-root actions
      addRoot: (path: string, name: string) => {
        const { roots } = get()
        // Don't add duplicate roots
        if (roots.some(r => r.path === path)) return

        set({
          roots: [...roots, { path, name, tree: [] }]
        })
      },

      removeRoot: (path: string) => {
        set((state) => ({
          roots: state.roots.filter(r => r.path !== path),
          // Also remove expanded paths for this root
          expandedPaths: new Set(
            Array.from(state.expandedPaths).filter(p => !p.startsWith(path))
          )
        }))
      },

      setRoots: (newRoots: { path: string; name: string }[]) => {
        set({
          roots: newRoots.map(r => ({ ...r, tree: [] })),
          expandedPaths: new Set<string>()
        })
      },

      updateRootTree: (rootPath: string, tree: FileNode[]) => {
        set((state) => ({
          roots: state.roots.map(r =>
            r.path === rootPath ? { ...r, tree } : r
          )
        }))
      },

      setRootLoading: (rootPath: string, loading: boolean) => {
        set((state) => ({
          roots: state.roots.map(r =>
            r.path === rootPath ? { ...r, isLoading: loading } : r
          )
        }))
      },

      // Legacy single-root actions
      setRoot: (path: string, name: string) => {
        set({
          roots: [{ path, name, tree: [] }],
          expandedPaths: new Set<string>()
        })
      },

      setTree: (tree: FileNode[]) => {
        const { roots } = get()
        if (roots.length === 0) return

        set({
          roots: roots.map((r, i) =>
            i === 0 ? { ...r, tree } : r
          )
        })
      },

      // Common actions
      toggleExpanded: (path: string) => {
        const { expandedPaths } = get()
        const newExpanded = new Set(expandedPaths)
        if (newExpanded.has(path)) {
          newExpanded.delete(path)
        } else {
          newExpanded.add(path)
        }
        set({ expandedPaths: newExpanded })
      },

      setExpanded: (path: string, expanded: boolean) => {
        const { expandedPaths } = get()
        const newExpanded = new Set(expandedPaths)
        if (expanded) {
          newExpanded.add(path)
        } else {
          newExpanded.delete(path)
        }
        set({ expandedPaths: newExpanded })
      },

      updateChildren: (path: string, children: FileNode[]) => {
        const updateNode = (nodes: FileNode[]): FileNode[] => {
          return nodes.map(node => {
            if (node.path === path) {
              return { ...node, children }
            }
            if (node.children) {
              return { ...node, children: updateNode(node.children) }
            }
            return node
          })
        }

        set((state) => ({
          roots: state.roots.map(root => ({
            ...root,
            tree: updateNode(root.tree)
          }))
        }))
      },

      closeFolder: () => {
        // Legacy: close single folder (first root)
        const { roots } = get()
        if (roots.length <= 1) {
          set({
            roots: [],
            expandedPaths: new Set<string>()
          })
        } else {
          // Remove first root only
          set({
            roots: roots.slice(1)
          })
        }
      },

      closeAll: () => {
        set({
          roots: [],
          expandedPaths: new Set<string>()
        })
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading })
      }
    }),
    {
      name: 'qalam-file-explorer',
      partialize: (state) => ({
        roots: state.roots.map(r => ({ path: r.path, name: r.name })),
        // Convert Set to Array for serialization
        expandedPaths: Array.from(state.expandedPaths)
      }),
      merge: (persisted: unknown, current) => {
        const p = persisted as { roots?: { path: string; name: string }[]; expandedPaths?: string[] } | null
        return {
          ...current,
          roots: (p?.roots || []).map(r => ({ ...r, tree: [] })),
          // Convert Array back to Set
          expandedPaths: new Set(p?.expandedPaths || [])
        }
      }
    }
  )
)
