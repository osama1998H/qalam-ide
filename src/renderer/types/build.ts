// Build System Types for Qalam-IDE
// Phase 4.3: Build System Integration

// ============================================================================
// Build Configuration Types
// ============================================================================

export type OptimizationLevel = 'O0' | 'O1' | 'O2' | 'O3'

export type OutputTarget = 'native' | 'llvm-ir' | 'assembly' | 'object' | 'wasm'

export type BuildMode = 'debug' | 'release'

export interface BuildConfiguration {
  mode: BuildMode
  optimizationLevel: OptimizationLevel
  outputTarget: OutputTarget
  targetTriple?: string
  wasmJsBindings?: boolean
  timing?: boolean
}

export const DEFAULT_BUILD_CONFIG: BuildConfiguration = {
  mode: 'debug',
  optimizationLevel: 'O0',
  outputTarget: 'native',
  timing: false
}

// ============================================================================
// Build Result Types
// ============================================================================

export interface BuildResult {
  success: boolean
  output: string
  errors: string
  exitCode: number
  outputPath?: string
  timing?: CompilationTiming
}

export interface CompilationTiming {
  lexer: number
  parser: number
  semantic: number
  ir: number
  optimize: number
  codegen: number
  total: number
}

// ============================================================================
// Build Artifact Types
// ============================================================================

export type ArtifactType = 'executable' | 'object' | 'llvm-ir' | 'assembly' | 'wasm' | 'js-bindings' | 'unknown'

export interface BuildArtifact {
  name: string
  path: string
  type: ArtifactType
  size: number
  modifiedTime: number
}

export interface ArtifactDirectory {
  name: string
  path: string
  artifacts: BuildArtifact[]
}

// ============================================================================
// Test Result Types
// ============================================================================

export interface TestResult {
  success: boolean
  passed: number
  failed: number
  total: number
  duration: number
  results: TestFileResult[]
}

export interface TestFileResult {
  filePath: string
  name: string
  passed: boolean
  duration: number
  error?: string
  assertions?: TestAssertion[]
}

export interface TestAssertion {
  name: string
  passed: boolean
  message?: string
  line?: number
}

// ============================================================================
// Script Types
// ============================================================================

export interface Script {
  name: string
  command: string
}

export interface ScriptRunResult {
  success: boolean
  output: string
  errors: string
  exitCode: number
  duration: number
}

// ============================================================================
// Target Triple Constants
// ============================================================================

export const TARGET_TRIPLES = {
  native: undefined,
  'x86_64-linux': 'x86_64-unknown-linux-gnu',
  'x86_64-macos': 'x86_64-apple-darwin',
  'aarch64-linux': 'aarch64-unknown-linux-gnu',
  'aarch64-macos': 'aarch64-apple-darwin',
  'wasm32-wasi': 'wasm32-wasi-wasi',
  'wasm32-unknown': 'wasm32-unknown-unknown'
} as const

export type TargetTripleKey = keyof typeof TARGET_TRIPLES

// ============================================================================
// Arabic Labels
// ============================================================================

export const BUILD_LABELS = {
  // Build modes
  debug: 'تطوير',
  release: 'إصدار',

  // Optimization levels
  O0: 'بدون تحسين (O0)',
  O1: 'تحسين خفيف (O1)',
  O2: 'تحسين قياسي (O2)',
  O3: 'تحسين مكثف (O3)',

  // Output targets
  native: 'أصلي',
  'llvm-ir': 'تمثيل LLVM',
  assembly: 'تجميع',
  object: 'ملف كائن',
  wasm: 'ويب أسمبلي',

  // Target triples
  'native-target': 'المنصة الحالية',
  'x86_64-linux': 'لينكس x86-64',
  'x86_64-macos': 'ماك x86-64',
  'aarch64-linux': 'لينكس ARM64',
  'aarch64-macos': 'ماك ARM64 (Apple Silicon)',
  'wasm32-wasi': 'ويب أسمبلي (WASI)',
  'wasm32-unknown': 'ويب أسمبلي (متصفح)',

  // UI Labels
  buildConfiguration: 'إعدادات البناء',
  buildMode: 'وضع البناء',
  optimizationLevel: 'مستوى التحسين',
  outputTarget: 'هدف الإخراج',
  targetPlatform: 'المنصة المستهدفة',
  wasmJsBindings: 'روابط JavaScript',
  showTiming: 'إظهار التوقيت',
  buildProject: 'بناء المشروع',
  buildFile: 'ترجمة الملف',
  runTests: 'تشغيل الاختبارات',
  scripts: 'سكربتات',
  runScript: 'تشغيل',
  buildArtifacts: 'مخرجات البناء',
  cleanBuild: 'تنظيف البناء',
  refresh: 'تحديث',

  // Test results
  testsPassed: 'ناجحة',
  testsFailed: 'فاشلة',
  testsTotal: 'إجمالي',

  // Status
  building: 'جاري البناء...',
  testing: 'جاري الاختبار...',
  running: 'جاري التشغيل...',
  cleaning: 'جاري التنظيف...',

  // Artifact types
  executable: 'ملف تنفيذي',
  objectFile: 'ملف كائن',
  llvmIrFile: 'ملف LLVM IR',
  assemblyFile: 'ملف تجميع',
  wasmFile: 'ملف WebAssembly',
  jsBindingsFile: 'روابط JavaScript',
  unknownFile: 'ملف غير معروف'
} as const

// ============================================================================
// Utility Functions
// ============================================================================

export function getArtifactTypeFromExtension(filename: string): ArtifactType {
  const ext = filename.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'll':
      return 'llvm-ir'
    case 's':
    case 'asm':
      return 'assembly'
    case 'o':
    case 'obj':
      return 'object'
    case 'wasm':
      return 'wasm'
    case 'js':
      return 'js-bindings'
    default:
      // Check if it's an executable (no extension or common executable extensions)
      if (!ext || ext === 'exe' || ext === 'out') {
        return 'executable'
      }
      return 'unknown'
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  const minutes = Math.floor(ms / 60000)
  const seconds = ((ms % 60000) / 1000).toFixed(0)
  return `${minutes}m ${seconds}s`
}
