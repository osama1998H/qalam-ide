import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Output line type for the interactive mode panel
 */
export type InteractiveModeOutputType = 'input' | 'stdout' | 'result' | 'error'

/**
 * A single line of output in the interactive mode panel
 */
export interface InteractiveModeOutput {
  type: InteractiveModeOutputType
  text: string
  timestamp: number
}

/**
 * State for the Interactive Mode (الوضع التفاعلي) panel
 */
interface InteractiveModeState {
  // Output history
  output: InteractiveModeOutput[]

  // Command history for arrow key navigation
  history: string[]

  // Current evaluation state
  isEvaluating: boolean

  // Panel visibility
  isVisible: boolean

  // Actions
  addOutput: (type: InteractiveModeOutputType, text: string) => void
  addToHistory: (command: string) => void
  clearOutput: () => void
  setEvaluating: (value: boolean) => void
  setVisible: (value: boolean) => void
  toggleVisible: () => void
}

/**
 * Zustand store for Interactive Mode state
 *
 * Features:
 * - Output history with timestamps
 * - Command history for arrow key navigation (persisted)
 * - Evaluation state tracking
 * - Panel visibility state
 */
export const useInteractiveModeStore = create<InteractiveModeState>()(
  persist(
    (set) => ({
      output: [],
      history: [],
      isEvaluating: false,
      isVisible: false,

      addOutput: (type, text) =>
        set((state) => ({
          output: [
            ...state.output,
            {
              type,
              text,
              timestamp: Date.now()
            }
          ]
        })),

      addToHistory: (command) =>
        set((state) => ({
          // Keep last 100 commands, avoid duplicates of the last command
          history:
            state.history[state.history.length - 1] === command
              ? state.history
              : [...state.history, command].slice(-100)
        })),

      clearOutput: () => set({ output: [] }),

      setEvaluating: (value) => set({ isEvaluating: value }),

      setVisible: (value) => set({ isVisible: value }),

      toggleVisible: () => set((state) => ({ isVisible: !state.isVisible }))
    }),
    {
      name: 'qalam-interactive-mode-store',
      // Only persist command history, not output or state
      partialize: (state) => ({
        history: state.history
      })
    }
  )
)
