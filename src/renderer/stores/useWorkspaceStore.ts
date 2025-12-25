import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  WorkspaceConfig,
  WorkspaceFolder,
  WorkspaceSettings,
  WorkspaceManifest,
  manifestToConfig,
  configToManifest,
  DEFAULT_WORKSPACE_CONFIG,
  WORKSPACE_EXTENSION
} from '../types/workspace'

interface WorkspaceState {
  // Current workspace state
  isWorkspace: boolean
  workspacePath: string | null
  folders: WorkspaceFolder[]
  settings: WorkspaceSettings
  isDirty: boolean

  // Recent workspaces
  recentWorkspaces: string[]

  // Actions
  openWorkspace: (path: string) => Promise<boolean>
  saveWorkspace: () => Promise<boolean>
  closeWorkspace: () => void
  createWorkspace: (path: string, folders: string[]) => Promise<boolean>

  // Folder management
  addFolder: (path: string, name?: string) => void
  removeFolder: (path: string) => void
  renameFolder: (path: string, newName: string) => void

  // Settings
  updateSettings: (settings: Partial<WorkspaceSettings>) => void

  // Single folder mode (no workspace file)
  openSingleFolder: (path: string, name: string) => void

  // State tracking
  setDirty: (dirty: boolean) => void

  // Recent workspaces
  addRecentWorkspace: (path: string) => void
  removeRecentWorkspace: (path: string) => void
  clearRecentWorkspaces: () => void
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      // Initial state
      isWorkspace: false,
      workspacePath: null,
      folders: [],
      settings: {},
      isDirty: false,
      recentWorkspaces: [],

      openWorkspace: async (path: string) => {
        try {
          // Read workspace file
          const result = await window.qalam.workspace.openFile(path)
          if (!result || result.error) {
            console.error('[Workspace] Failed to open workspace:', result?.error)
            return false
          }

          // Parse manifest
          const manifest: WorkspaceManifest = JSON.parse(result.content)
          const config = manifestToConfig(manifest)

          set({
            isWorkspace: true,
            workspacePath: path,
            folders: config.folders,
            settings: config.settings,
            isDirty: false
          })

          // Add to recent workspaces
          get().addRecentWorkspace(path)

          return true
        } catch (error) {
          console.error('[Workspace] Error opening workspace:', error)
          return false
        }
      },

      saveWorkspace: async () => {
        const { isWorkspace, workspacePath, folders, settings } = get()

        if (!isWorkspace || !workspacePath) {
          console.warn('[Workspace] No workspace to save')
          return false
        }

        try {
          const config: WorkspaceConfig = {
            ...DEFAULT_WORKSPACE_CONFIG,
            folders,
            settings,
            state: DEFAULT_WORKSPACE_CONFIG.state // State is managed separately
          }

          const manifest = configToManifest(config)
          const content = JSON.stringify(manifest, null, 2)

          const result = await window.qalam.workspace.save(workspacePath, content)
          if (result.success) {
            set({ isDirty: false })
            return true
          }

          console.error('[Workspace] Failed to save workspace:', result.error)
          return false
        } catch (error) {
          console.error('[Workspace] Error saving workspace:', error)
          return false
        }
      },

      closeWorkspace: () => {
        set({
          isWorkspace: false,
          workspacePath: null,
          folders: [],
          settings: {},
          isDirty: false
        })
      },

      createWorkspace: async (path: string, folderPaths: string[]) => {
        try {
          // Ensure path ends with correct extension
          const workspacePath = path.endsWith(WORKSPACE_EXTENSION)
            ? path
            : path + WORKSPACE_EXTENSION

          // Create folder objects
          const folders: WorkspaceFolder[] = folderPaths.map(p => ({
            path: p,
            name: p.split('/').pop() || p
          }))

          const config: WorkspaceConfig = {
            ...DEFAULT_WORKSPACE_CONFIG,
            folders
          }

          const manifest = configToManifest(config)
          const content = JSON.stringify(manifest, null, 2)

          const result = await window.qalam.workspace.save(workspacePath, content)
          if (result.success) {
            set({
              isWorkspace: true,
              workspacePath,
              folders,
              settings: {},
              isDirty: false
            })

            // Add to recent workspaces
            get().addRecentWorkspace(workspacePath)

            return true
          }

          console.error('[Workspace] Failed to create workspace:', result.error)
          return false
        } catch (error) {
          console.error('[Workspace] Error creating workspace:', error)
          return false
        }
      },

      addFolder: (path: string, name?: string) => {
        const folderName = name || path.split('/').pop() || path
        set((state) => ({
          folders: [...state.folders, { path, name: folderName }],
          isDirty: true
        }))
      },

      removeFolder: (path: string) => {
        set((state) => ({
          folders: state.folders.filter(f => f.path !== path),
          isDirty: true
        }))
      },

      renameFolder: (path: string, newName: string) => {
        set((state) => ({
          folders: state.folders.map(f =>
            f.path === path ? { ...f, name: newName } : f
          ),
          isDirty: true
        }))
      },

      updateSettings: (newSettings: Partial<WorkspaceSettings>) => {
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
          isDirty: true
        }))
      },

      openSingleFolder: (path: string, name: string) => {
        set({
          isWorkspace: false,
          workspacePath: null,
          folders: [{ path, name }],
          settings: {},
          isDirty: false
        })
      },

      setDirty: (dirty: boolean) => set({ isDirty: dirty }),

      addRecentWorkspace: (path: string) => {
        set((state) => {
          // Remove if already exists, then add to front
          const filtered = state.recentWorkspaces.filter(p => p !== path)
          const updated = [path, ...filtered].slice(0, 10) // Keep max 10
          return { recentWorkspaces: updated }
        })
      },

      removeRecentWorkspace: (path: string) => {
        set((state) => ({
          recentWorkspaces: state.recentWorkspaces.filter(p => p !== path)
        }))
      },

      clearRecentWorkspaces: () => {
        set({ recentWorkspaces: [] })
      }
    }),
    {
      name: 'qalam-workspace',
      partialize: (state) => ({
        // Only persist recent workspaces, not current workspace state
        recentWorkspaces: state.recentWorkspaces
      })
    }
  )
)

// Type declaration for window.qalam.workspace
declare global {
  interface Window {
    qalam: {
      workspace: {
        open: () => Promise<{ path: string } | null>
        openFile: (path: string) => Promise<{ content: string; error?: string } | null>
        save: (path: string, content: string) => Promise<{ success: boolean; error?: string }>
        readFolderSettings: (folderPath: string) => Promise<{ settings: Record<string, unknown> } | null>
        writeFolderSettings: (folderPath: string, settings: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>
      }
    } & Window['qalam']
  }
}
