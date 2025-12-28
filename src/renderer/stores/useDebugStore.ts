import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Breakpoint types
export interface Breakpoint {
  id: string
  filePath: string
  line: number
  enabled: boolean
  condition?: string
  hitCondition?: string
  logMessage?: string
  verified: boolean
}

// Stack frame for call stack view
export interface StackFrame {
  id: number
  name: string
  filePath?: string
  line: number
  column: number
}

// Variable in watch/locals view
export interface Variable {
  name: string
  value: string
  type?: string
  variablesReference: number
}

// Debug console output
export interface DebugOutput {
  type: 'stdout' | 'stderr' | 'result' | 'input'
  text: string
  timestamp: number
}

// Debug states
export type DebugState =
  | 'idle'           // Not debugging
  | 'starting'       // Starting debug session
  | 'running'        // Program running
  | 'paused'         // Paused at breakpoint/step
  | 'stopped'        // Debug session ended

// Pause reasons
export type PauseReason =
  | 'breakpoint'
  | 'step'
  | 'pause'
  | 'entry'
  | 'exception'

interface DebugStoreState {
  // Debug state
  debugState: DebugState
  pauseReason?: PauseReason
  pauseLocation?: { filePath: string; line: number; column: number }

  // Breakpoints (persisted)
  breakpoints: Record<string, Breakpoint[]>  // filePath -> breakpoints

  // Call stack (runtime only)
  callStack: StackFrame[]
  currentFrameId: number | null

  // Variables (runtime only)
  localVariables: Variable[]
  watchExpressions: string[]
  watchResults: Record<string, { value: string; error?: string }>

  // Current debug file
  debugFilePath: string | null

  // Thread ID (usually 1 for single-threaded)
  currentThreadId: number

  // Debug console output
  debugOutput: DebugOutput[]

  // Actions - Breakpoints
  addBreakpoint: (filePath: string, line: number, options?: { condition?: string; hitCondition?: string; logMessage?: string }) => Breakpoint
  removeBreakpoint: (filePath: string, line: number) => void
  toggleBreakpoint: (filePath: string, line: number) => void
  updateBreakpoint: (filePath: string, line: number, updates: Partial<Breakpoint>) => void
  clearBreakpoints: (filePath?: string) => void
  setBreakpointVerified: (filePath: string, line: number, verified: boolean, newLine?: number) => void
  getBreakpointsForFile: (filePath: string) => Breakpoint[]

  // Actions - Debug control
  setDebugState: (state: DebugState, reason?: PauseReason) => void
  setPauseLocation: (location: { filePath: string; line: number; column: number } | undefined) => void
  setDebugFilePath: (filePath: string | null) => void

  // Actions - Call stack
  setCallStack: (frames: StackFrame[]) => void
  setCurrentFrame: (frameId: number | null) => void

  // Actions - Variables
  setLocalVariables: (variables: Variable[]) => void
  addWatchExpression: (expression: string) => void
  removeWatchExpression: (expression: string) => void
  setWatchResult: (expression: string, value: string, error?: string) => void

  // Actions - Debug console
  addDebugOutput: (type: DebugOutput['type'], text: string) => void
  clearDebugOutput: () => void

  // Actions - Reset
  resetDebugSession: () => void
}

// Generate unique breakpoint ID
function generateBreakpointId(): string {
  return `bp_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
}

export const useDebugStore = create<DebugStoreState>()(
  persist(
    (set, get) => ({
      // Initial state
      debugState: 'idle',
      pauseReason: undefined,
      pauseLocation: undefined,
      breakpoints: {},
      callStack: [],
      currentFrameId: null,
      localVariables: [],
      watchExpressions: [],
      watchResults: {},
      debugFilePath: null,
      currentThreadId: 1,
      debugOutput: [],

      // Breakpoint actions
      addBreakpoint: (filePath, line, options = {}) => {
        const bp: Breakpoint = {
          id: generateBreakpointId(),
          filePath,
          line,
          enabled: true,
          verified: false,
          ...options
        }

        set((state) => {
          const fileBreakpoints = state.breakpoints[filePath] || []
          // Check if breakpoint already exists at this line
          const existing = fileBreakpoints.find(b => b.line === line)
          if (existing) {
            return state // Don't add duplicate
          }
          return {
            breakpoints: {
              ...state.breakpoints,
              [filePath]: [...fileBreakpoints, bp]
            }
          }
        })

        return bp
      },

      removeBreakpoint: (filePath, line) => {
        set((state) => {
          const fileBreakpoints = state.breakpoints[filePath] || []
          const filtered = fileBreakpoints.filter(b => b.line !== line)
          if (filtered.length === 0) {
            const { [filePath]: _, ...rest } = state.breakpoints
            return { breakpoints: rest }
          }
          return {
            breakpoints: {
              ...state.breakpoints,
              [filePath]: filtered
            }
          }
        })
      },

      toggleBreakpoint: (filePath, line) => {
        const state = get()
        const fileBreakpoints = state.breakpoints[filePath] || []
        const existing = fileBreakpoints.find(b => b.line === line)

        if (existing) {
          state.removeBreakpoint(filePath, line)
        } else {
          state.addBreakpoint(filePath, line)
        }
      },

      updateBreakpoint: (filePath, line, updates) => {
        set((state) => {
          const fileBreakpoints = state.breakpoints[filePath] || []
          const updated = fileBreakpoints.map(b =>
            b.line === line ? { ...b, ...updates } : b
          )
          return {
            breakpoints: {
              ...state.breakpoints,
              [filePath]: updated
            }
          }
        })
      },

      clearBreakpoints: (filePath) => {
        if (filePath) {
          set((state) => {
            const { [filePath]: _, ...rest } = state.breakpoints
            return { breakpoints: rest }
          })
        } else {
          set({ breakpoints: {} })
        }
      },

      setBreakpointVerified: (filePath, line, verified, newLine) => {
        set((state) => {
          const fileBreakpoints = state.breakpoints[filePath] || []
          const updated = fileBreakpoints.map(b => {
            if (b.line === line) {
              return {
                ...b,
                verified,
                line: newLine !== undefined ? newLine : b.line
              }
            }
            return b
          })
          return {
            breakpoints: {
              ...state.breakpoints,
              [filePath]: updated
            }
          }
        })
      },

      getBreakpointsForFile: (filePath) => {
        return get().breakpoints[filePath] || []
      },

      // Debug control actions
      setDebugState: (debugState, pauseReason) => {
        set({ debugState, pauseReason })
      },

      setPauseLocation: (pauseLocation) => {
        set({ pauseLocation })
      },

      setDebugFilePath: (debugFilePath) => {
        set({ debugFilePath })
      },

      // Call stack actions
      setCallStack: (callStack) => {
        set({ callStack })
      },

      setCurrentFrame: (currentFrameId) => {
        set({ currentFrameId })
      },

      // Variables actions
      setLocalVariables: (localVariables) => {
        set({ localVariables })
      },

      addWatchExpression: (expression) => {
        set((state) => {
          if (state.watchExpressions.includes(expression)) {
            return state
          }
          return {
            watchExpressions: [...state.watchExpressions, expression]
          }
        })
      },

      removeWatchExpression: (expression) => {
        set((state) => ({
          watchExpressions: state.watchExpressions.filter(e => e !== expression),
          watchResults: Object.fromEntries(
            Object.entries(state.watchResults).filter(([k]) => k !== expression)
          )
        }))
      },

      setWatchResult: (expression, value, error) => {
        set((state) => ({
          watchResults: {
            ...state.watchResults,
            [expression]: { value, error }
          }
        }))
      },

      // Debug console actions
      addDebugOutput: (type, text) => {
        set((state) => ({
          debugOutput: [
            ...state.debugOutput,
            { type, text, timestamp: Date.now() }
          ]
        }))
      },

      clearDebugOutput: () => {
        set({ debugOutput: [] })
      },

      // Reset session
      resetDebugSession: () => {
        set({
          debugState: 'idle',
          pauseReason: undefined,
          pauseLocation: undefined,
          callStack: [],
          currentFrameId: null,
          localVariables: [],
          watchResults: {},
          debugFilePath: null,
          debugOutput: []
          // Note: breakpoints and watchExpressions are preserved
        })
      }
    }),
    {
      name: 'qalam-debug-store',
      // Only persist breakpoints and watch expressions
      partialize: (state) => ({
        breakpoints: state.breakpoints,
        watchExpressions: state.watchExpressions
      })
    }
  )
)

// Helper hook to get breakpoints for current file
export function useBreakpointsForFile(filePath: string | null): Breakpoint[] {
  const breakpoints = useDebugStore((state) => state.breakpoints)
  if (!filePath) return []
  return breakpoints[filePath] || []
}

// Helper hook to check if a line has a breakpoint
export function useHasBreakpoint(filePath: string | null, line: number): boolean {
  const breakpoints = useDebugStore((state) => state.breakpoints)
  if (!filePath) return false
  const fileBreakpoints = breakpoints[filePath] || []
  return fileBreakpoints.some(b => b.line === line)
}

// Helper hook to check if debugging is active
export function useIsDebugging(): boolean {
  return useDebugStore((state) => state.debugState !== 'idle')
}

// Helper hook to check if paused
export function useIsPaused(): boolean {
  return useDebugStore((state) => state.debugState === 'paused')
}
