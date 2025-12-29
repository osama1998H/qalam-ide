import { create } from 'zustand'

// Compilation timing data from Tarqeem (in microseconds)
export interface CompilationTiming {
  lexer: number
  parser: number
  semantic: number
  ir: number
  optimize: number
  codegen: number
  total: number
}

// Stage status for visualization
export type StageStatus = 'pending' | 'running' | 'completed' | 'failed'

// Pipeline stage definition
export interface PipelineStage {
  id: string
  name: string
  nameAr: string
  status: StageStatus
  timeUs?: number // Time in microseconds
  errors: number
  warnings: number
}

// All pipeline stages
const createInitialStages = (): PipelineStage[] => [
  { id: 'lexer', name: 'Lexer', nameAr: 'المحلل اللغوي', status: 'pending', errors: 0, warnings: 0 },
  { id: 'parser', name: 'Parser', nameAr: 'المحلل النحوي', status: 'pending', errors: 0, warnings: 0 },
  { id: 'semantic', name: 'Semantic', nameAr: 'التحليل الدلالي', status: 'pending', errors: 0, warnings: 0 },
  { id: 'ir', name: 'IR Build', nameAr: 'بناء التمثيل الوسيط', status: 'pending', errors: 0, warnings: 0 },
  { id: 'optimize', name: 'Optimize', nameAr: 'التحسين', status: 'pending', errors: 0, warnings: 0 },
  { id: 'codegen', name: 'Codegen', nameAr: 'توليد الكود', status: 'pending', errors: 0, warnings: 0 }
]

interface CompilationPipelineState {
  // State
  stages: PipelineStage[]
  isCompiling: boolean
  totalTimeUs: number
  lastError: string | null
  filePath: string | null

  // Actions
  startCompilation: (filePath: string) => void
  updateStageStatus: (stageId: string, status: StageStatus) => void
  completeCompilation: (timing: CompilationTiming, success: boolean) => void
  failCompilation: (error: string, failedStage?: string) => void
  reset: () => void
}

export const useCompilationPipelineStore = create<CompilationPipelineState>((set, get) => ({
  // Initial state
  stages: createInitialStages(),
  isCompiling: false,
  totalTimeUs: 0,
  lastError: null,
  filePath: null,

  // Start compilation - reset all stages to pending
  startCompilation: (filePath: string) => {
    set({
      stages: createInitialStages().map((stage, index) => ({
        ...stage,
        status: index === 0 ? 'running' : 'pending'
      })),
      isCompiling: true,
      totalTimeUs: 0,
      lastError: null,
      filePath
    })
  },

  // Update a single stage status
  updateStageStatus: (stageId: string, status: StageStatus) => {
    set((state) => ({
      stages: state.stages.map((stage) =>
        stage.id === stageId ? { ...stage, status } : stage
      )
    }))
  },

  // Complete compilation with timing data
  completeCompilation: (timing: CompilationTiming, success: boolean) => {
    const stages = get().stages

    // Map timing data to stages
    const timingMap: Record<string, number> = {
      lexer: timing.lexer,
      parser: timing.parser,
      semantic: timing.semantic,
      ir: timing.ir,
      optimize: timing.optimize,
      codegen: timing.codegen
    }

    set({
      stages: stages.map((stage) => ({
        ...stage,
        status: success ? 'completed' : (timingMap[stage.id] !== undefined ? 'completed' : 'failed'),
        timeUs: timingMap[stage.id] ?? stage.timeUs
      })),
      isCompiling: false,
      totalTimeUs: timing.total,
      lastError: null
    })
  },

  // Fail compilation at a specific stage
  failCompilation: (error: string, failedStage?: string) => {
    const stages = get().stages
    let foundFailed = false

    set({
      stages: stages.map((stage) => {
        if (foundFailed) {
          return { ...stage, status: 'pending' }
        }
        if (stage.id === failedStage || (failedStage === undefined && stage.status === 'running')) {
          foundFailed = true
          return { ...stage, status: 'failed' }
        }
        return stage.status === 'running' ? { ...stage, status: 'completed' } : stage
      }),
      isCompiling: false,
      lastError: error
    })
  },

  // Reset to initial state
  reset: () => {
    set({
      stages: createInitialStages(),
      isCompiling: false,
      totalTimeUs: 0,
      lastError: null,
      filePath: null
    })
  }
}))

// Helper to format microseconds to human-readable format
export function formatTime(microseconds: number): string {
  if (microseconds < 1000) {
    return `${microseconds}μs`
  } else if (microseconds < 1000000) {
    return `${(microseconds / 1000).toFixed(1)}ms`
  } else {
    return `${(microseconds / 1000000).toFixed(2)}s`
  }
}
