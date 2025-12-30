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
  evaluateCode: (code: string) => Promise<void>
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
    (set, get) => ({
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

      toggleVisible: () => set((state) => ({ isVisible: !state.isVisible })),

      /**
       * Evaluate code from external source (e.g., selected text in editor)
       * Opens the panel and displays the result
       */
      evaluateCode: async (code: string) => {
        const trimmedCode = code.trim()
        if (!trimmedCode || get().isEvaluating) return

        // Show panel and prepare for evaluation
        set({ isVisible: true, isEvaluating: true })

        // Add input to output
        get().addOutput('input', `> ${trimmedCode}`)
        get().addToHistory(trimmedCode)

        try {
          const result = await window.qalam.interactive.evaluate(trimmedCode)

          // Add stdout output
          if (result.output && result.output.trim()) {
            get().addOutput('stdout', result.output)
          }

          // Add return value if present and not void
          if (result.returnValue && result.returnValue !== 'لا_شيء') {
            get().addOutput('result', `=> ${result.returnValue}`)
          }

          // Add error if present
          if (result.error) {
            get().addOutput('error', result.error)
          }
        } catch (err) {
          get().addOutput('error', `خطأ: ${err}`)
        } finally {
          set({ isEvaluating: false })
        }
      }
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
