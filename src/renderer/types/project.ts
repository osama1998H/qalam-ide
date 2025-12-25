// Project file name constant
export const PROJECT_FILE_NAME = 'ترقيم.حزمة'

// Project manifest structure (JSON format with Arabic keys)
export interface ProjectManifest {
  // Required fields
  الاسم: string                      // name - project name
  الإصدار: string                    // version - semantic version
  نقطة_البداية: string              // entry point - main file
  مجلد_الإخراج: string              // output directory

  // Compiler settings
  إعدادات_المترجم?: ManifestCompilerSettings

  // Optional fields
  الوصف?: string                    // description
  المؤلف?: string                   // author
  الاعتماديات?: Record<string, string>  // dependencies
}

export interface ManifestCompilerSettings {
  تحسين?: 'لا' | 'أساسي' | 'كامل'           // optimization: none | basic | full
  وضع_التنقيح?: boolean                     // debug mode
  تحذيرات_كأخطاء?: boolean                  // treat warnings as errors
  مستوى_التحذيرات?: 'لا' | 'أساسي' | 'كل'   // warning level: none | basic | all
  أعلام_إضافية?: string[]                   // additional flags
}

// Internal representation for TypeScript code (English keys for convenience)
export interface ProjectConfig {
  name: string
  version: string
  entryPoint: string
  outputDirectory: string
  description?: string
  author?: string
  dependencies?: Record<string, string>
  compilerSettings: CompilerSettings
}

export interface CompilerSettings {
  optimization: 'none' | 'basic' | 'full'
  debugMode: boolean
  warningsAsErrors: boolean
  warningLevel: 'none' | 'basic' | 'all'
  additionalFlags: string[]
}

// Default project manifest
export const DEFAULT_PROJECT_MANIFEST: ProjectManifest = {
  الاسم: '',
  الإصدار: '1.0.0',
  نقطة_البداية: 'main.ترقيم',
  مجلد_الإخراج: 'build/',
  إعدادات_المترجم: {
    تحسين: 'أساسي',
    وضع_التنقيح: true,
    تحذيرات_كأخطاء: false,
    مستوى_التحذيرات: 'أساسي'
  }
}

// Default compiler settings
export const DEFAULT_COMPILER_SETTINGS: CompilerSettings = {
  optimization: 'basic',
  debugMode: true,
  warningsAsErrors: false,
  warningLevel: 'basic',
  additionalFlags: []
}

// Conversion: Arabic manifest → English config
export function manifestToConfig(manifest: ProjectManifest): ProjectConfig {
  const optimizationMap: Record<string, 'none' | 'basic' | 'full'> = {
    'لا': 'none',
    'أساسي': 'basic',
    'كامل': 'full'
  }

  const warningLevelMap: Record<string, 'none' | 'basic' | 'all'> = {
    'لا': 'none',
    'أساسي': 'basic',
    'كل': 'all'
  }

  const compilerSettings = manifest.إعدادات_المترجم

  return {
    name: manifest.الاسم,
    version: manifest.الإصدار,
    entryPoint: manifest.نقطة_البداية,
    outputDirectory: manifest.مجلد_الإخراج,
    description: manifest.الوصف,
    author: manifest.المؤلف,
    dependencies: manifest.الاعتماديات,
    compilerSettings: {
      optimization: optimizationMap[compilerSettings?.تحسين || 'أساسي'] || 'basic',
      debugMode: compilerSettings?.وضع_التنقيح ?? true,
      warningsAsErrors: compilerSettings?.تحذيرات_كأخطاء ?? false,
      warningLevel: warningLevelMap[compilerSettings?.مستوى_التحذيرات || 'أساسي'] || 'basic',
      additionalFlags: compilerSettings?.أعلام_إضافية || []
    }
  }
}

// Conversion: English config → Arabic manifest
export function configToManifest(config: ProjectConfig): ProjectManifest {
  const optimizationMap: Record<string, 'لا' | 'أساسي' | 'كامل'> = {
    'none': 'لا',
    'basic': 'أساسي',
    'full': 'كامل'
  }

  const warningLevelMap: Record<string, 'لا' | 'أساسي' | 'كل'> = {
    'none': 'لا',
    'basic': 'أساسي',
    'all': 'كل'
  }

  const manifest: ProjectManifest = {
    الاسم: config.name,
    الإصدار: config.version,
    نقطة_البداية: config.entryPoint,
    مجلد_الإخراج: config.outputDirectory,
    إعدادات_المترجم: {
      تحسين: optimizationMap[config.compilerSettings.optimization],
      وضع_التنقيح: config.compilerSettings.debugMode,
      تحذيرات_كأخطاء: config.compilerSettings.warningsAsErrors,
      مستوى_التحذيرات: warningLevelMap[config.compilerSettings.warningLevel],
      أعلام_إضافية: config.compilerSettings.additionalFlags.length > 0
        ? config.compilerSettings.additionalFlags
        : undefined
    }
  }

  // Add optional fields if present
  if (config.description) {
    manifest.الوصف = config.description
  }
  if (config.author) {
    manifest.المؤلف = config.author
  }
  if (config.dependencies && Object.keys(config.dependencies).length > 0) {
    manifest.الاعتماديات = config.dependencies
  }

  return manifest
}
