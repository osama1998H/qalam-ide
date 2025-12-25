import { create } from 'zustand'
import {
  ProjectConfig,
  ProjectManifest,
  manifestToConfig,
  configToManifest,
  DEFAULT_COMPILER_SETTINGS
} from '../types/project'

interface ProjectState {
  // Current project state
  isProject: boolean
  projectPath: string | null
  config: ProjectConfig | null
  isDirty: boolean

  // Actions
  loadProject: (folderPath: string) => Promise<boolean>
  initializeProject: (folderPath: string, name: string) => Promise<boolean>
  updateConfig: (updates: Partial<ProjectConfig>) => void
  saveConfig: () => Promise<boolean>
  closeProject: () => void
  checkForProjectFile: (folderPath: string) => Promise<boolean>
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  isProject: false,
  projectPath: null,
  config: null,
  isDirty: false,

  loadProject: async (folderPath: string) => {
    try {
      const result = await window.qalam.project.read(folderPath)

      if (result.success && result.manifest) {
        const config = manifestToConfig(result.manifest as ProjectManifest)
        set({
          isProject: true,
          projectPath: folderPath,
          config,
          isDirty: false
        })
        return true
      }

      // Failed to load - reset to non-project state
      set({
        isProject: false,
        projectPath: folderPath,
        config: null,
        isDirty: false
      })
      return false
    } catch (error) {
      console.error('[Project] Failed to load project:', error)
      set({
        isProject: false,
        projectPath: folderPath,
        config: null,
        isDirty: false
      })
      return false
    }
  },

  initializeProject: async (folderPath: string, name: string) => {
    try {
      const result = await window.qalam.project.init(folderPath, name)

      if (result.success) {
        // Load the newly created project
        return get().loadProject(folderPath)
      }

      console.error('[Project] Failed to initialize:', result.error)
      return false
    } catch (error) {
      console.error('[Project] Failed to initialize project:', error)
      return false
    }
  },

  updateConfig: (updates: Partial<ProjectConfig>) => {
    const { config } = get()
    if (!config) return

    // Merge updates with existing config
    const newConfig: ProjectConfig = {
      ...config,
      ...updates,
      // Handle nested compilerSettings separately if provided
      compilerSettings: updates.compilerSettings
        ? { ...config.compilerSettings, ...updates.compilerSettings }
        : config.compilerSettings
    }

    set({
      config: newConfig,
      isDirty: true
    })
  },

  saveConfig: async () => {
    const { projectPath, config } = get()
    if (!projectPath || !config) return false

    try {
      const manifest = configToManifest(config)
      const result = await window.qalam.project.write(projectPath, manifest)

      if (result.success) {
        set({ isDirty: false })
        return true
      }

      console.error('[Project] Failed to save:', result.error)
      return false
    } catch (error) {
      console.error('[Project] Failed to save project:', error)
      return false
    }
  },

  closeProject: () => {
    set({
      isProject: false,
      projectPath: null,
      config: null,
      isDirty: false
    })
  },

  checkForProjectFile: async (folderPath: string) => {
    try {
      const result = await window.qalam.project.exists(folderPath)
      return result.exists
    } catch {
      return false
    }
  }
}))
