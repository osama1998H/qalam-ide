import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemeType = 'dark' | 'light' | 'high-contrast'

interface EditorSettings {
  // Display settings
  fontSize: number
  fontFamily: string
  lineNumbers: boolean
  wordWrap: boolean
  minimap: boolean

  // Editing settings
  tabSize: number
  insertSpaces: boolean
  autoCloseBrackets: boolean
  autoIndent: boolean

  // Formatting settings
  formatOnSave: boolean
  formatOnPaste: boolean

  // Theme
  theme: ThemeType

  // Actions
  setFontSize: (size: number) => void
  setFontFamily: (family: string) => void
  toggleLineNumbers: () => void
  toggleWordWrap: () => void
  toggleMinimap: () => void
  setTabSize: (size: number) => void
  toggleInsertSpaces: () => void
  toggleAutoCloseBrackets: () => void
  toggleAutoIndent: () => void
  toggleFormatOnSave: () => void
  toggleFormatOnPaste: () => void
  setTheme: (theme: ThemeType) => void
  resetToDefaults: () => void
}

const defaultSettings = {
  fontSize: 14,
  fontFamily: "'Amiri', 'Cairo', monospace",
  lineNumbers: true,
  wordWrap: true,
  minimap: false,
  tabSize: 2,
  insertSpaces: true,
  autoCloseBrackets: true,
  autoIndent: true,
  formatOnSave: true,
  formatOnPaste: false,
  theme: 'dark' as const
}

export const useEditorSettings = create<EditorSettings>()(
  persist(
    (set) => ({
      ...defaultSettings,

      setFontSize: (size) => set({ fontSize: Math.max(8, Math.min(32, size)) }),

      setFontFamily: (family) => set({ fontFamily: family }),

      toggleLineNumbers: () => set((state) => ({ lineNumbers: !state.lineNumbers })),

      toggleWordWrap: () => set((state) => ({ wordWrap: !state.wordWrap })),

      toggleMinimap: () => set((state) => ({ minimap: !state.minimap })),

      setTabSize: (size) => set({ tabSize: Math.max(1, Math.min(8, size)) }),

      toggleInsertSpaces: () => set((state) => ({ insertSpaces: !state.insertSpaces })),

      toggleAutoCloseBrackets: () => set((state) => ({ autoCloseBrackets: !state.autoCloseBrackets })),

      toggleAutoIndent: () => set((state) => ({ autoIndent: !state.autoIndent })),

      toggleFormatOnSave: () => set((state) => ({ formatOnSave: !state.formatOnSave })),

      toggleFormatOnPaste: () => set((state) => ({ formatOnPaste: !state.formatOnPaste })),

      setTheme: (theme) => set({ theme }),

      resetToDefaults: () => set(defaultSettings)
    }),
    {
      name: 'qalam-ide-settings'
    }
  )
)
