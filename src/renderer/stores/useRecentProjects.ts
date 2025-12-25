import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface RecentProject {
  path: string
  name: string
  lastOpened: number // timestamp
  isProject: boolean // true = has project manifest, false = folder only
}

interface RecentProjectsState {
  projects: RecentProject[]
  maxProjects: number

  // Actions
  addProject: (path: string, name: string, isProject: boolean) => void
  removeProject: (path: string) => void
  clearAll: () => void
  updateProjectStatus: (path: string, isProject: boolean) => void
}

export const useRecentProjects = create<RecentProjectsState>()(
  persist(
    (set, get) => ({
      projects: [],
      maxProjects: 10,

      addProject: (path: string, name: string, isProject: boolean) => {
        const { projects, maxProjects } = get()

        // Remove if already exists (will be re-added at top)
        const filtered = projects.filter(p => p.path !== path)

        // Add to beginning
        const newProject: RecentProject = {
          path,
          name,
          lastOpened: Date.now(),
          isProject
        }

        // Keep only maxProjects
        const updated = [newProject, ...filtered].slice(0, maxProjects)

        set({ projects: updated })
      },

      removeProject: (path: string) => {
        set(state => ({
          projects: state.projects.filter(p => p.path !== path)
        }))
      },

      clearAll: () => {
        set({ projects: [] })
      },

      updateProjectStatus: (path: string, isProject: boolean) => {
        set(state => ({
          projects: state.projects.map(p =>
            p.path === path ? { ...p, isProject } : p
          )
        }))
      }
    }),
    {
      name: 'qalam-recent-projects'
    }
  )
)
