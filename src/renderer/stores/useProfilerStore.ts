import { create } from 'zustand'

// Compilation timing from tarqeem compile --timing
export interface CompilationTiming {
  lexer: number      // microseconds
  parser: number
  semantic: number
  ir: number
  optimize: number
  codegen: number
  total: number
}

// Function profile from tarqeem run --profile
export interface FunctionProfile {
  name: string
  calls: number
}

// Runtime profiling data from tarqeem run --profile
export interface RuntimeProfile {
  total_functions: number
  total_calls: number
  tier_up_count: number
  hot_spots: FunctionProfile[]
  by_tier: Record<string, number>
}

// View mode for the profiler panel
export type ProfilerViewMode = 'compilation' | 'runtime'

interface ProfilerState {
  // View state
  viewMode: ProfilerViewMode

  // Compilation timing
  compilationTiming: CompilationTiming | null
  isCompiling: boolean
  compilationError: string | null

  // Runtime profiling
  runtimeProfile: RuntimeProfile | null
  isProfileRunning: boolean
  profileError: string | null

  // Actions
  setViewMode: (mode: ProfilerViewMode) => void

  // Compilation timing actions
  startCompilation: () => void
  setCompilationTiming: (timing: CompilationTiming) => void
  failCompilation: (error: string) => void
  resetCompilation: () => void

  // Runtime profiling actions
  startProfiling: () => void
  setRuntimeProfile: (profile: RuntimeProfile) => void
  failProfiling: (error: string) => void
  resetProfiling: () => void

  // Reset all
  resetAll: () => void
}

// Helper to format time in microseconds
export function formatTime(us: number): string {
  if (us < 1000) {
    return `${us}µs`
  } else if (us < 1000000) {
    return `${(us / 1000).toFixed(2)}ms`
  } else {
    return `${(us / 1000000).toFixed(2)}s`
  }
}

export const useProfilerStore = create<ProfilerState>()((set) => ({
  // Initial state
  viewMode: 'compilation',

  compilationTiming: null,
  isCompiling: false,
  compilationError: null,

  runtimeProfile: null,
  isProfileRunning: false,
  profileError: null,

  // Actions
  setViewMode: (viewMode) => set({ viewMode }),

  // Compilation timing actions
  startCompilation: () =>
    set({
      isCompiling: true,
      compilationTiming: null,
      compilationError: null
    }),

  setCompilationTiming: (timing) =>
    set({
      compilationTiming: timing,
      isCompiling: false,
      compilationError: null
    }),

  failCompilation: (error) =>
    set({
      isCompiling: false,
      compilationError: error
    }),

  resetCompilation: () =>
    set({
      compilationTiming: null,
      isCompiling: false,
      compilationError: null
    }),

  // Runtime profiling actions
  startProfiling: () =>
    set({
      isProfileRunning: true,
      runtimeProfile: null,
      profileError: null
    }),

  setRuntimeProfile: (profile) =>
    set({
      runtimeProfile: profile,
      isProfileRunning: false,
      profileError: null
    }),

  failProfiling: (error) =>
    set({
      isProfileRunning: false,
      profileError: error
    }),

  resetProfiling: () =>
    set({
      runtimeProfile: null,
      isProfileRunning: false,
      profileError: null
    }),

  // Reset all
  resetAll: () =>
    set({
      compilationTiming: null,
      isCompiling: false,
      compilationError: null,
      runtimeProfile: null,
      isProfileRunning: false,
      profileError: null
    })
}))
