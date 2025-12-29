import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  BuildConfiguration,
  BuildMode,
  OptimizationLevel,
  OutputTarget,
  BuildResult,
  TestResult,
  BuildArtifact,
  DEFAULT_BUILD_CONFIG
} from '../types/build'

interface BuildState {
  // Configuration (persisted)
  configuration: BuildConfiguration

  // Build state (not persisted)
  isBuilding: boolean
  isTesting: boolean
  isRunningScript: boolean
  runningScriptName: string | null

  // Results (not persisted)
  lastBuildResult: BuildResult | null
  lastTestResult: TestResult | null

  // Artifacts (not persisted)
  artifacts: BuildArtifact[]
  isLoadingArtifacts: boolean

  // Configuration actions
  setConfiguration: (config: Partial<BuildConfiguration>) => void
  setMode: (mode: BuildMode) => void
  setOptimizationLevel: (level: OptimizationLevel) => void
  setOutputTarget: (target: OutputTarget) => void
  setTargetTriple: (triple: string | undefined) => void
  setWasmJsBindings: (enabled: boolean) => void
  setTiming: (enabled: boolean) => void
  resetConfiguration: () => void

  // State actions
  setBuilding: (building: boolean) => void
  setTesting: (testing: boolean) => void
  setRunningScript: (name: string | null) => void
  setLastBuildResult: (result: BuildResult | null) => void
  setLastTestResult: (result: TestResult | null) => void
  setArtifacts: (artifacts: BuildArtifact[]) => void
  setLoadingArtifacts: (loading: boolean) => void

  // Utility actions
  clearResults: () => void
}

export const useBuildStore = create<BuildState>()(
  persist(
    (set) => ({
      // Initial configuration
      configuration: DEFAULT_BUILD_CONFIG,

      // Initial state
      isBuilding: false,
      isTesting: false,
      isRunningScript: false,
      runningScriptName: null,

      // Initial results
      lastBuildResult: null,
      lastTestResult: null,

      // Initial artifacts
      artifacts: [],
      isLoadingArtifacts: false,

      // Configuration actions
      setConfiguration: (config) =>
        set((state) => ({
          configuration: { ...state.configuration, ...config }
        })),

      setMode: (mode) =>
        set((state) => ({
          configuration: {
            ...state.configuration,
            mode,
            // Auto-adjust optimization level based on mode
            optimizationLevel: mode === 'release' ? 'O2' : state.configuration.optimizationLevel
          }
        })),

      setOptimizationLevel: (optimizationLevel) =>
        set((state) => ({
          configuration: { ...state.configuration, optimizationLevel }
        })),

      setOutputTarget: (outputTarget) =>
        set((state) => ({
          configuration: {
            ...state.configuration,
            outputTarget,
            // Clear WASM-specific options if not targeting WASM
            wasmJsBindings: outputTarget === 'wasm' ? state.configuration.wasmJsBindings : false
          }
        })),

      setTargetTriple: (targetTriple) =>
        set((state) => ({
          configuration: { ...state.configuration, targetTriple }
        })),

      setWasmJsBindings: (wasmJsBindings) =>
        set((state) => ({
          configuration: { ...state.configuration, wasmJsBindings }
        })),

      setTiming: (timing) =>
        set((state) => ({
          configuration: { ...state.configuration, timing }
        })),

      resetConfiguration: () =>
        set({ configuration: DEFAULT_BUILD_CONFIG }),

      // State actions
      setBuilding: (isBuilding) => set({ isBuilding }),

      setTesting: (isTesting) => set({ isTesting }),

      setRunningScript: (runningScriptName) =>
        set({
          isRunningScript: runningScriptName !== null,
          runningScriptName
        }),

      setLastBuildResult: (lastBuildResult) => set({ lastBuildResult }),

      setLastTestResult: (lastTestResult) => set({ lastTestResult }),

      setArtifacts: (artifacts) => set({ artifacts }),

      setLoadingArtifacts: (isLoadingArtifacts) => set({ isLoadingArtifacts }),

      // Utility actions
      clearResults: () =>
        set({
          lastBuildResult: null,
          lastTestResult: null
        })
    }),
    {
      name: 'qalam-ide-build-config',
      // Only persist configuration, not runtime state
      partialize: (state) => ({
        configuration: state.configuration
      })
    }
  )
)
