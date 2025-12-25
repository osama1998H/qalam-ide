/**
 * Workspace Types for Qalam IDE
 *
 * Supports VS Code-style multi-root workspaces with Arabic manifest files (.قلم-workspace)
 */

// ============================================================================
// Manifest Types (Arabic keys - stored in .قلم-workspace file)
// ============================================================================

/**
 * Workspace manifest as stored in .قلم-workspace file
 * Uses Arabic keys for user-facing file format
 */
export interface WorkspaceManifest {
  الإصدار: string
  المجلدات: WorkspaceFolderManifest[]
  الإعدادات?: WorkspaceSettingsManifest
  الحالة?: WorkspaceStateManifest
}

export interface WorkspaceFolderManifest {
  المسار: string
  الاسم?: string
}

export interface WorkspaceSettingsManifest {
  حجم_الخط?: number
  عائلة_الخط?: string
  حجم_المسافة_البادئة?: number
  المظهر?: 'dark' | 'light'
  إظهار_أرقام_الأسطر?: boolean
  التفاف_الأسطر?: boolean
}

export interface WorkspaceStateManifest {
  التبويبات_المفتوحة?: OpenTabManifest[]
  التبويب_النشط?: number
  الشريط_الجانبي?: SidebarStateManifest
  اللوحات?: PanelStateManifest
}

export interface OpenTabManifest {
  المسار: string
  موضع_المؤشر?: CursorPositionManifest
}

export interface CursorPositionManifest {
  سطر: number
  عمود: number
}

export interface SidebarStateManifest {
  مرئي: boolean
  التبويب_النشط: string
  عرض?: number
}

export interface PanelStateManifest {
  الإخراج?: { مرئي: boolean }
  المشاكل?: { مرئي: boolean }
  البحث?: { مرئي: boolean }
}

// ============================================================================
// Internal Types (English keys - used in application code)
// ============================================================================

/**
 * Workspace configuration used internally in the application
 */
export interface WorkspaceConfig {
  version: string
  folders: WorkspaceFolder[]
  settings: WorkspaceSettings
  state: WorkspaceState
}

export interface WorkspaceFolder {
  path: string
  name: string
}

export interface WorkspaceSettings {
  fontSize?: number
  fontFamily?: string
  tabSize?: number
  theme?: 'dark' | 'light'
  showLineNumbers?: boolean
  wordWrap?: boolean
}

export interface WorkspaceState {
  openTabs: OpenTab[]
  activeTabIndex: number
  sidebar: SidebarState
  panels: PanelState
}

export interface OpenTab {
  path: string
  cursorPosition?: CursorPosition
}

export interface CursorPosition {
  line: number
  column: number
}

export interface SidebarState {
  visible: boolean
  activeTab: 'files' | 'outline' | 'search'
  width?: number
}

export interface PanelState {
  output: { visible: boolean }
  problems: { visible: boolean }
  search: { visible: boolean }
}

// ============================================================================
// Folder Settings (stored in .qalam/settings.json)
// ============================================================================

export interface FolderSettings {
  fontSize?: number
  fontFamily?: string
  tabSize?: number
  theme?: 'dark' | 'light'
  showLineNumbers?: boolean
  wordWrap?: boolean
}

// ============================================================================
// Conversion Functions
// ============================================================================

/**
 * Default workspace configuration
 */
export const DEFAULT_WORKSPACE_CONFIG: WorkspaceConfig = {
  version: '1.0',
  folders: [],
  settings: {},
  state: {
    openTabs: [],
    activeTabIndex: -1,
    sidebar: {
      visible: true,
      activeTab: 'files',
      width: 250
    },
    panels: {
      output: { visible: false },
      problems: { visible: false },
      search: { visible: false }
    }
  }
}

/**
 * Convert manifest (Arabic) to config (English)
 */
export function manifestToConfig(manifest: WorkspaceManifest): WorkspaceConfig {
  return {
    version: manifest.الإصدار || '1.0',
    folders: (manifest.المجلدات || []).map(f => ({
      path: f.المسار,
      name: f.الاسم || f.المسار.split('/').pop() || ''
    })),
    settings: manifest.الإعدادات ? {
      fontSize: manifest.الإعدادات.حجم_الخط,
      fontFamily: manifest.الإعدادات.عائلة_الخط,
      tabSize: manifest.الإعدادات.حجم_المسافة_البادئة,
      theme: manifest.الإعدادات.المظهر,
      showLineNumbers: manifest.الإعدادات.إظهار_أرقام_الأسطر,
      wordWrap: manifest.الإعدادات.التفاف_الأسطر
    } : {},
    state: manifest.الحالة ? {
      openTabs: (manifest.الحالة.التبويبات_المفتوحة || []).map(t => ({
        path: t.المسار,
        cursorPosition: t.موضع_المؤشر ? {
          line: t.موضع_المؤشر.سطر,
          column: t.موضع_المؤشر.عمود
        } : undefined
      })),
      activeTabIndex: manifest.الحالة.التبويب_النشط ?? -1,
      sidebar: manifest.الحالة.الشريط_الجانبي ? {
        visible: manifest.الحالة.الشريط_الجانبي.مرئي,
        activeTab: mapArabicSidebarTab(manifest.الحالة.الشريط_الجانبي.التبويب_النشط),
        width: manifest.الحالة.الشريط_الجانبي.عرض
      } : DEFAULT_WORKSPACE_CONFIG.state.sidebar,
      panels: manifest.الحالة.اللوحات ? {
        output: { visible: manifest.الحالة.اللوحات.الإخراج?.مرئي ?? false },
        problems: { visible: manifest.الحالة.اللوحات.المشاكل?.مرئي ?? false },
        search: { visible: manifest.الحالة.اللوحات.البحث?.مرئي ?? false }
      } : DEFAULT_WORKSPACE_CONFIG.state.panels
    } : DEFAULT_WORKSPACE_CONFIG.state
  }
}

/**
 * Convert config (English) to manifest (Arabic)
 */
export function configToManifest(config: WorkspaceConfig): WorkspaceManifest {
  return {
    الإصدار: config.version,
    المجلدات: config.folders.map(f => ({
      المسار: f.path,
      الاسم: f.name !== f.path.split('/').pop() ? f.name : undefined
    })),
    الإعدادات: Object.keys(config.settings).length > 0 ? {
      حجم_الخط: config.settings.fontSize,
      عائلة_الخط: config.settings.fontFamily,
      حجم_المسافة_البادئة: config.settings.tabSize,
      المظهر: config.settings.theme,
      إظهار_أرقام_الأسطر: config.settings.showLineNumbers,
      التفاف_الأسطر: config.settings.wordWrap
    } : undefined,
    الحالة: {
      التبويبات_المفتوحة: config.state.openTabs.map(t => ({
        المسار: t.path,
        موضع_المؤشر: t.cursorPosition ? {
          سطر: t.cursorPosition.line,
          عمود: t.cursorPosition.column
        } : undefined
      })),
      التبويب_النشط: config.state.activeTabIndex,
      الشريط_الجانبي: {
        مرئي: config.state.sidebar.visible,
        التبويب_النشط: mapEnglishSidebarTab(config.state.sidebar.activeTab),
        عرض: config.state.sidebar.width
      },
      اللوحات: {
        الإخراج: { مرئي: config.state.panels.output.visible },
        المشاكل: { مرئي: config.state.panels.problems.visible },
        البحث: { مرئي: config.state.panels.search.visible }
      }
    }
  }
}

// Helper functions for sidebar tab mapping
function mapArabicSidebarTab(arabicTab: string): 'files' | 'outline' | 'search' {
  switch (arabicTab) {
    case 'الملفات':
    case 'files':
      return 'files'
    case 'الهيكل':
    case 'outline':
      return 'outline'
    case 'البحث':
    case 'search':
      return 'search'
    default:
      return 'files'
  }
}

function mapEnglishSidebarTab(englishTab: 'files' | 'outline' | 'search'): string {
  switch (englishTab) {
    case 'files':
      return 'الملفات'
    case 'outline':
      return 'الهيكل'
    case 'search':
      return 'البحث'
    default:
      return 'الملفات'
  }
}

/**
 * Create a new workspace config for a single folder
 */
export function createSingleFolderWorkspace(folderPath: string, folderName: string): WorkspaceConfig {
  return {
    ...DEFAULT_WORKSPACE_CONFIG,
    folders: [{ path: folderPath, name: folderName }]
  }
}

/**
 * Workspace file extension
 */
export const WORKSPACE_EXTENSION = '.قلم-workspace'
