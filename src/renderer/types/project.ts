// Project file name constant
export const PROJECT_FILE_NAME = 'ترقيم.حزمة'

// ============================================================================
// Tarqeem Package Format (matches tarqeem pm module expectations)
// ============================================================================

// Tarqeem package structure (indentation-based format on disk)
export interface TarqeemPackage {
  حزمة: {
    اسم: string           // name (required)
    نسخة: string          // version (required)
    وصف?: string          // description
    مؤلف?: string         // author (single)
    مؤلفون?: string[]     // authors (array)
    رخصة?: string         // license
    مستودع?: string       // repository
    موقع?: string         // homepage
    كلمات?: string[]      // keywords
    مدخل?: string         // entry point
    مكتبة?: string        // lib entry
    ترقيم?: string        // tarqeem version
  }
  اعتماديات?: Record<string, string | DependencySpec>
  اعتماديات_تطوير?: Record<string, string | DependencySpec>
  سكربتات?: Record<string, string>
}

export interface DependencySpec {
  نسخة?: string           // version
  مسار?: string           // path (local)
  git?: string            // git url
  فرع?: string            // branch
  وسم?: string            // tag
  مراجعة?: string         // revision
  اختياري?: boolean       // optional
  ميزات?: string[]        // features
}

// ============================================================================
// Internal TypeScript representation (English keys for convenience)
// ============================================================================

export interface ProjectConfig {
  name: string
  version: string
  entryPoint: string
  description?: string
  author?: string
  authors?: string[]
  license?: string
  repository?: string
  homepage?: string
  keywords?: string[]
  dependencies?: Record<string, string | DependencySpec>
  devDependencies?: Record<string, string | DependencySpec>
  scripts?: Record<string, string>
}

// Default project config
export const DEFAULT_PROJECT_CONFIG: ProjectConfig = {
  name: '',
  version: '1.0.0',
  entryPoint: 'رئيسي.ترقيم'
}

// ============================================================================
// Parser for Tarqeem indentation-based format
// ============================================================================

interface ParsedSection {
  [key: string]: string | string[] | ParsedSection
}

/**
 * Parse Tarqeem package file (indentation-based format)
 */
export function parseTarqeemPackage(content: string): TarqeemPackage | null {
  try {
    const lines = content.split('\n')
    const result: Record<string, ParsedSection> = {}
    let currentSection: string | null = null
    let currentIndent = 0

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      // Skip empty lines and comments
      if (line.trim() === '' || line.trim().startsWith('#')) {
        continue
      }

      // Count leading spaces
      const indent = line.length - line.trimStart().length
      const trimmed = line.trim()

      // Top-level section (no indent, ends with :)
      if (indent === 0 && trimmed.endsWith(':')) {
        currentSection = trimmed.slice(0, -1)
        result[currentSection] = {}
        currentIndent = 0
        continue
      }

      // Key-value pair inside section
      if (currentSection && indent > 0) {
        const colonIndex = trimmed.indexOf(':')
        if (colonIndex > 0) {
          const key = trimmed.slice(0, colonIndex).trim()
          const value = trimmed.slice(colonIndex + 1).trim()

          if (value) {
            // Simple key: value
            (result[currentSection] as Record<string, string>)[key] = value
          }
        } else if (trimmed.startsWith('-')) {
          // Array item - not fully implemented for simplicity
          // Would need to track which key this belongs to
        }
      }
    }

    // Convert to TarqeemPackage structure
    const pkg = result['حزمة'] as ParsedSection
    if (!pkg) {
      return null
    }

    return {
      حزمة: {
        اسم: (pkg['اسم'] as string) || '',
        نسخة: (pkg['نسخة'] as string) || '1.0.0',
        وصف: pkg['وصف'] as string | undefined,
        مؤلف: pkg['مؤلف'] as string | undefined,
        رخصة: pkg['رخصة'] as string | undefined,
        مستودع: pkg['مستودع'] as string | undefined,
        موقع: pkg['موقع'] as string | undefined,
        مدخل: pkg['مدخل'] as string | undefined,
        مكتبة: pkg['مكتبة'] as string | undefined,
        ترقيم: pkg['ترقيم'] as string | undefined
      },
      اعتماديات: result['اعتماديات'] as Record<string, string> | undefined,
      سكربتات: result['سكربتات'] as Record<string, string> | undefined
    }
  } catch (error) {
    console.error('[Project] Failed to parse Tarqeem package:', error)
    return null
  }
}

/**
 * Convert TarqeemPackage to ProjectConfig (for internal use)
 */
export function tarqeemPackageToConfig(pkg: TarqeemPackage): ProjectConfig {
  const info = pkg.حزمة
  return {
    name: info.اسم,
    version: info.نسخة,
    entryPoint: info.مدخل || 'رئيسي.ترقيم',
    description: info.وصف,
    author: info.مؤلف,
    authors: info.مؤلفون,
    license: info.رخصة,
    repository: info.مستودع,
    homepage: info.موقع,
    keywords: info.كلمات,
    dependencies: pkg.اعتماديات,
    devDependencies: pkg.اعتماديات_تطوير,
    scripts: pkg.سكربتات
  }
}

/**
 * Generate Tarqeem package file content
 */
export function generateTarqeemPackage(config: ProjectConfig): string {
  let content = `# ملف حزمة ترقيم
حزمة:
    اسم: ${config.name}
    نسخة: ${config.version}
    مدخل: ${config.entryPoint}
`

  if (config.description) {
    content += `    وصف: ${config.description}\n`
  }
  if (config.author) {
    content += `    مؤلف: ${config.author}\n`
  }
  if (config.license) {
    content += `    رخصة: ${config.license}\n`
  }

  content += `
اعتماديات:
`

  if (config.dependencies) {
    for (const [name, version] of Object.entries(config.dependencies)) {
      if (typeof version === 'string') {
        content += `    ${name}: ${version}\n`
      }
    }
  }

  content += `
سكربتات:
`

  if (config.scripts) {
    for (const [name, command] of Object.entries(config.scripts)) {
      content += `    ${name}: ${command}\n`
    }
  }

  return content
}

// ============================================================================
// Legacy JSON format support (backward compatibility)
// ============================================================================

// Old project manifest structure (JSON format with Arabic keys)
export interface LegacyProjectManifest {
  الاسم: string
  الإصدار: string
  نقطة_البداية: string
  مجلد_الإخراج: string
  إعدادات_المترجم?: LegacyCompilerSettings
  الوصف?: string
  المؤلف?: string
  الاعتماديات?: Record<string, string>
}

export interface LegacyCompilerSettings {
  تحسين?: 'لا' | 'أساسي' | 'كامل'
  وضع_التنقيح?: boolean
  تحذيرات_كأخطاء?: boolean
  مستوى_التحذيرات?: 'لا' | 'أساسي' | 'كل'
  أعلام_إضافية?: string[]
}

/**
 * Convert legacy JSON manifest to ProjectConfig
 */
export function legacyManifestToConfig(manifest: LegacyProjectManifest): ProjectConfig {
  return {
    name: manifest.الاسم,
    version: manifest.الإصدار,
    entryPoint: manifest.نقطة_البداية,
    description: manifest.الوصف,
    author: manifest.المؤلف,
    dependencies: manifest.الاعتماديات
  }
}

/**
 * Detect and parse package file (supports both formats)
 */
export function parsePackageFile(content: string): ProjectConfig | null {
  // Try JSON first (legacy format)
  try {
    const json = JSON.parse(content)
    if (json.الاسم !== undefined) {
      return legacyManifestToConfig(json as LegacyProjectManifest)
    }
  } catch {
    // Not JSON, try indentation-based format
  }

  // Try Tarqeem format
  const pkg = parseTarqeemPackage(content)
  if (pkg) {
    return tarqeemPackageToConfig(pkg)
  }

  return null
}
