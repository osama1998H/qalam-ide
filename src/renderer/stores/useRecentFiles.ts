import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface RecentFile {
  path: string
  name: string
  openedAt: number // timestamp
}

interface RecentFilesState {
  files: RecentFile[]
  maxFiles: number

  // Actions
  addFile: (path: string, name: string) => void
  removeFile: (path: string) => void
  clearAll: () => void
}

export const useRecentFiles = create<RecentFilesState>()(
  persist(
    (set, get) => ({
      files: [],
      maxFiles: 10,

      addFile: (path: string, name: string) => {
        const { files, maxFiles } = get()

        // Remove if already exists (will be re-added at top)
        const filtered = files.filter(f => f.path !== path)

        // Add to beginning
        const newFile: RecentFile = {
          path,
          name,
          openedAt: Date.now()
        }

        // Keep only maxFiles
        const updated = [newFile, ...filtered].slice(0, maxFiles)

        set({ files: updated })
      },

      removeFile: (path: string) => {
        set(state => ({
          files: state.files.filter(f => f.path !== path)
        }))
      },

      clearAll: () => {
        set({ files: [] })
      }
    }),
    {
      name: 'qalam-recent-files'
    }
  )
)
