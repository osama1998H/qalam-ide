import { app, BrowserWindow, ipcMain, dialog, Menu, shell, protocol } from 'electron'
import { autoUpdater, UpdateInfo, ProgressInfo } from 'electron-updater'
import { readFile, writeFile, readdir, stat, mkdir, rename, rm, access } from 'fs/promises'
import { constants } from 'fs'
import { spawn } from 'child_process'
import { join, basename, relative, extname, dirname } from 'path'
import { getLSPClient, destroyLSPClient } from './lsp-client'
import { getDAPClient, destroyDAPClient } from './dap-client'
import { getInteractiveModeClient, destroyInteractiveModeClient } from './interactive-mode-client'
import { updateImportPaths } from './refactoring'
import { getWindowState, saveWindowState, saveWindowStateSync } from './window-state'
import {
  discoverCompiler,
  getCompilerPathOrThrow,
  clearCompilerCache,
  getInstallInstructions
} from './compiler-discovery'

// Enable remote debugging for Electron MCP integration (development only)
if (process.env.NODE_ENV === 'development' || process.argv.includes('--enable-mcp')) {
  app.commandLine.appendSwitch('remote-debugging-port', '9222')
}

// Search types
interface SearchMatch {
  lineNumber: number
  lineContent: string
  columnStart: number
  columnEnd: number
}

interface SearchFileResult {
  filePath: string
  fileName: string
  matches: SearchMatch[]
}

interface SearchOptions {
  caseSensitive: boolean
  wholeWord: boolean
  useRegex: boolean
  includePattern: string
  excludePattern: string
}

// User-configured compiler path (empty = auto-discover)
let userCompilerPath: string = ''

/**
 * Get the Tarqeem compiler path, using user config or auto-discovery
 */
function getCompilerPath(): string {
  try {
    return getCompilerPathOrThrow(userCompilerPath)
  } catch (error) {
    // Show error dialog if compiler not found
    if (mainWindow) {
      dialog.showErrorBox(
        'Tarqeem Compiler Not Found',
        (error as Error).message || 'Could not find the Tarqeem compiler.'
      )
    }
    throw error
  }
}

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  // Get saved window state
  const windowState = getWindowState()

  mainWindow = new BrowserWindow({
    width: windowState.width,
    height: windowState.height,
    x: windowState.x,
    y: windowState.y,
    minWidth: 800,
    minHeight: 600,
    title: 'Qalam - Tarqeem Editor',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  // Restore maximized/fullscreen state after window is ready
  if (windowState.isMaximized) {
    mainWindow.maximize()
  }
  if (windowState.isFullScreen) {
    mainWindow.setFullScreen(true)
  }

  // Save window state on resize/move (debounced in window-state.ts)
  mainWindow.on('resize', () => {
    if (mainWindow) saveWindowState(mainWindow)
  })

  mainWindow.on('move', () => {
    if (mainWindow) saveWindowState(mainWindow)
  })

  mainWindow.on('maximize', () => {
    if (mainWindow) saveWindowState(mainWindow)
  })

  mainWindow.on('unmaximize', () => {
    if (mainWindow) saveWindowState(mainWindow)
  })

  mainWindow.on('enter-full-screen', () => {
    if (mainWindow) saveWindowState(mainWindow)
  })

  mainWindow.on('leave-full-screen', () => {
    if (mainWindow) saveWindowState(mainWindow)
  })

  // Save state synchronously before close
  mainWindow.on('close', () => {
    if (mainWindow) saveWindowStateSync(mainWindow)
  })

  // Load the renderer
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// Create Arabic application menu
function createMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'ملف',
      submenu: [
        {
          label: 'فتح...',
          accelerator: 'CmdOrCtrl+O',
          click: () => mainWindow?.webContents.send('menu:open')
        },
        {
          label: 'حفظ',
          accelerator: 'CmdOrCtrl+S',
          click: () => mainWindow?.webContents.send('menu:save')
        },
        {
          label: 'حفظ باسم...',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => mainWindow?.webContents.send('menu:save-as')
        },
        { type: 'separator' },
        {
          label: 'خروج',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Alt+F4',
          role: 'quit'
        }
      ]
    },
    {
      label: 'تحرير',
      submenu: [
        { label: 'تراجع', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: 'إعادة', accelerator: 'CmdOrCtrl+Shift+Z', role: 'redo' },
        { type: 'separator' },
        { label: 'قص', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: 'نسخ', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: 'لصق', accelerator: 'CmdOrCtrl+V', role: 'paste' },
        { label: 'تحديد الكل', accelerator: 'CmdOrCtrl+A', role: 'selectAll' },
        { type: 'separator' },
        {
          label: 'تنسيق المستند',
          accelerator: 'CmdOrCtrl+Shift+I',
          click: () => mainWindow?.webContents.send('menu:format-document')
        },
        {
          label: 'تنسيق التحديد',
          click: () => mainWindow?.webContents.send('menu:format-selection')
        }
      ]
    },
    {
      label: 'بناء',
      submenu: [
        {
          label: 'ترجمة',
          accelerator: 'CmdOrCtrl+B',
          click: () => mainWindow?.webContents.send('menu:compile')
        },
        {
          label: 'تشغيل',
          accelerator: 'CmdOrCtrl+R',
          click: () => mainWindow?.webContents.send('menu:run')
        },
        { type: 'separator' },
        {
          label: 'بناء المشروع (تطوير)',
          accelerator: 'CmdOrCtrl+Shift+B',
          click: () => mainWindow?.webContents.send('menu:build-project')
        },
        {
          label: 'بناء المشروع (إصدار)',
          click: () => mainWindow?.webContents.send('menu:build-project-release')
        },
        { type: 'separator' },
        {
          label: 'تشغيل الاختبارات',
          accelerator: 'CmdOrCtrl+Alt+T',
          click: () => mainWindow?.webContents.send('menu:run-tests')
        },
        { type: 'separator' },
        {
          label: 'إعدادات البناء...',
          click: () => mainWindow?.webContents.send('menu:build-config')
        },
        {
          label: 'تنظيف البناء',
          click: () => mainWindow?.webContents.send('menu:clean-build')
        }
      ]
    },
    {
      label: 'عرض',
      submenu: [
        { label: 'تكبير الخط', accelerator: 'CmdOrCtrl+Plus', role: 'zoomIn' },
        { label: 'تصغير الخط', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
        { label: 'حجم افتراضي', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
        { type: 'separator' },
        { label: 'ملء الشاشة', accelerator: 'F11', role: 'togglefullscreen' },
        { type: 'separator' },
        {
          label: 'عارض AST',
          accelerator: 'CmdOrCtrl+Shift+A',
          click: () => mainWindow?.webContents.send('menu:toggleAstViewer')
        },
        {
          label: 'مفتش الأنواع',
          accelerator: 'CmdOrCtrl+Shift+T',
          click: () => mainWindow?.webContents.send('menu:toggleTypeInspector')
        },
        {
          label: 'عارض التمثيل الوسيط',
          accelerator: 'CmdOrCtrl+Shift+I',
          click: () => mainWindow?.webContents.send('menu:toggleIRViewer')
        },
        {
          label: 'حالة خط الترجمة',
          accelerator: 'CmdOrCtrl+Shift+P',
          click: () => mainWindow?.webContents.send('menu:togglePipelineStatus')
        }
      ]
    }
  ]

  // Add macOS app menu
  if (process.platform === 'darwin') {
    template.unshift({
      label: app.name,
      submenu: [
        { label: 'عن قلم', role: 'about' },
        { type: 'separator' },
        { label: 'إخفاء', role: 'hide' },
        { label: 'إخفاء الآخرين', role: 'hideOthers' },
        { label: 'إظهار الكل', role: 'unhide' },
        { type: 'separator' },
        { label: 'خروج', role: 'quit' }
      ]
    })
  }

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

// IPC Handlers for file operations
ipcMain.handle('file:open', async () => {
  const result = await dialog.showOpenDialog({
    title: 'فتح ملف ترقيم',
    filters: [
      { name: 'ملفات ترقيم', extensions: ['ترقيم', 'trq'] },
      { name: 'جميع الملفات', extensions: ['*'] }
    ],
    properties: ['openFile']
  })

  if (result.canceled || !result.filePaths[0]) {
    return null
  }

  try {
    const content = await readFile(result.filePaths[0], 'utf-8')
    return { path: result.filePaths[0], content }
  } catch (error) {
    return { error: `Failed to read file: ${error}` }
  }
})

// Read file by path (for recent files)
ipcMain.handle('file:read', async (_, filePath: string) => {
  try {
    const content = await readFile(filePath, 'utf-8')
    return { content }
  } catch (error) {
    return null
  }
})

// Open folder dialog
ipcMain.handle('folder:open', async () => {
  const result = await dialog.showOpenDialog({
    title: 'فتح مجلد',
    properties: ['openDirectory']
  })

  if (result.canceled || !result.filePaths[0]) {
    return null
  }

  return {
    path: result.filePaths[0],
    name: basename(result.filePaths[0])
  }
})

// Read directory contents
ipcMain.handle('folder:read', async (_, dirPath: string) => {
  try {
    const entries = await readdir(dirPath, { withFileTypes: true })
    const items = await Promise.all(
      entries
        .filter(entry => !entry.name.startsWith('.')) // Hide hidden files
        .map(async (entry) => {
          const fullPath = join(dirPath, entry.name)
          return {
            name: entry.name,
            path: fullPath,
            type: entry.isDirectory() ? 'directory' : 'file'
          }
        })
    )

    // Sort: directories first, then files, alphabetically
    items.sort((a, b) => {
      if (a.type === b.type) {
        return a.name.localeCompare(b.name, 'ar')
      }
      return a.type === 'directory' ? -1 : 1
    })

    return items
  } catch (error) {
    return []
  }
})

// Create new file (with optional content)
ipcMain.handle('folder:createFile', async (_, filePath: string, content: string = '') => {
  try {
    await writeFile(filePath, content, 'utf-8')
    return { success: true }
  } catch (error) {
    return { error: `Failed to create file: ${error}` }
  }
})

// Create new folder
ipcMain.handle('folder:createFolder', async (_, folderPath: string) => {
  try {
    await mkdir(folderPath)
    return { success: true }
  } catch (error) {
    return { error: `Failed to create folder: ${error}` }
  }
})

// Rename file or folder
ipcMain.handle('folder:rename', async (_, oldPath: string, newPath: string) => {
  try {
    await rename(oldPath, newPath)
    return { success: true }
  } catch (error) {
    return { error: `Failed to rename: ${error}` }
  }
})

// Move file with refactoring (update imports in other files)
ipcMain.handle('folder:moveWithRefactor', async (_, oldPath: string, newPath: string, projectRoot: string) => {
  try {
    // First update imports in all files that reference the moved file
    const refactorResult = await updateImportPaths(projectRoot, oldPath, newPath)

    // Then perform the actual move
    await rename(oldPath, newPath)

    return {
      success: true,
      updatedFiles: refactorResult.updatedFiles,
      errors: refactorResult.errors
    }
  } catch (error) {
    return { error: `Failed to move file: ${error}` }
  }
})

// Delete file or folder (move to trash)
ipcMain.handle('folder:delete', async (_, targetPath: string) => {
  try {
    await shell.trashItem(targetPath)
    return { success: true }
  } catch (error) {
    return { error: `Failed to move to trash: ${error}` }
  }
})

// Duplicate file
ipcMain.handle('folder:duplicate', async (_, sourcePath: string) => {
  try {
    const content = await readFile(sourcePath, 'utf-8')
    const dir = sourcePath.substring(0, sourcePath.lastIndexOf('/'))
    const fileName = basename(sourcePath)
    const ext = fileName.includes('.') ? fileName.substring(fileName.lastIndexOf('.')) : ''
    const baseName = fileName.includes('.') ? fileName.substring(0, fileName.lastIndexOf('.')) : fileName

    // Generate new name with " - نسخة" suffix
    let newName = `${baseName} - نسخة${ext}`
    let newPath = join(dir, newName)
    let counter = 2

    // Handle duplicates of duplicates
    while (true) {
      try {
        await access(newPath, constants.F_OK)
        // File exists, try next number
        newName = `${baseName} - نسخة ${counter}${ext}`
        newPath = join(dir, newName)
        counter++
      } catch {
        // File doesn't exist, we can use this name
        break
      }
    }

    await writeFile(newPath, content, 'utf-8')
    return { success: true, newPath }
  } catch (error) {
    return { error: `Failed to duplicate file: ${error}` }
  }
})

// Reveal in file explorer
ipcMain.handle('folder:reveal', async (_, targetPath: string) => {
  shell.showItemInFolder(targetPath)
  return { success: true }
})

// Project file name constant
const PROJECT_FILE_NAME = 'ترقيم.حزمة'

// Check if project file exists in folder
ipcMain.handle('project:exists', async (_, folderPath: string) => {
  try {
    const projectFilePath = join(folderPath, PROJECT_FILE_NAME)
    await access(projectFilePath, constants.F_OK)
    return { exists: true }
  } catch {
    return { exists: false }
  }
})

// Read project manifest (returns raw content for parsing in renderer)
ipcMain.handle('project:read', async (_, folderPath: string) => {
  try {
    const projectFilePath = join(folderPath, PROJECT_FILE_NAME)
    const content = await readFile(projectFilePath, 'utf-8')
    return { success: true, manifest: content }
  } catch (error) {
    return { success: false, error: `فشل في قراءة ملف المشروع: ${error}` }
  }
})

// Write project manifest (accepts raw content string)
ipcMain.handle('project:write', async (_, folderPath: string, content: string) => {
  try {
    const projectFilePath = join(folderPath, PROJECT_FILE_NAME)
    await writeFile(projectFilePath, content, 'utf-8')
    return { success: true }
  } catch (error) {
    return { success: false, error: `فشل في كتابة ملف المشروع: ${error}` }
  }
})

// Initialize new project with default manifest (Tarqeem-compatible format)
ipcMain.handle('project:init', async (_, folderPath: string, projectName: string) => {
  try {
    const projectFilePath = join(folderPath, PROJECT_FILE_NAME)

    // Generate Tarqeem-compatible indentation-based format
    const packageContent = `# ملف حزمة ترقيم
حزمة:
    اسم: ${projectName}
    نسخة: 1.0.0
    مدخل: رئيسي.ترقيم

اعتماديات:

سكربتات:
`

    await writeFile(projectFilePath, packageContent, 'utf-8')

    // Create default entry file (رئيسي.ترقيم)
    const entryFilePath = join(folderPath, 'رئيسي.ترقيم')
    const entryContent = `// ${projectName}
// نقطة البداية الرئيسية

دالة رئيسية() {
    اطبع("مرحباً من ${projectName}!")
}
`
    await writeFile(entryFilePath, entryContent, 'utf-8')

    return { success: true }
  } catch (error) {
    return { success: false, error: `فشل في تهيئة المشروع: ${error}` }
  }
})

ipcMain.handle('file:save', async (_, { path, content }: { path: string; content: string }) => {
  try {
    await writeFile(path, content, 'utf-8')
    return { success: true }
  } catch (error) {
    return { error: `Failed to save file: ${error}` }
  }
})

ipcMain.handle('file:save-as', async (_, content: string) => {
  const result = await dialog.showSaveDialog({
    title: 'حفظ الملف',
    defaultPath: 'untitled.ترقيم',
    filters: [
      { name: 'ملفات ترقيم', extensions: ['ترقيم'] },
      { name: 'جميع الملفات', extensions: ['*'] }
    ]
  })

  if (result.canceled || !result.filePath) {
    return null
  }

  try {
    await writeFile(result.filePath, content, 'utf-8')
    return { path: result.filePath }
  } catch (error) {
    return { error: `Failed to save file: ${error}` }
  }
})

// Search helper: check if file matches include/exclude patterns
function matchesPattern(filePath: string, pattern: string): boolean {
  if (!pattern.trim()) return true

  const patterns = pattern.split(',').map(p => p.trim()).filter(p => p)
  const fileName = basename(filePath)
  const ext = extname(filePath)

  for (const p of patterns) {
    // Handle glob patterns like *.ترقيم
    if (p.startsWith('*.')) {
      const targetExt = p.slice(1) // Get ".ترقيم" from "*.ترقيم"
      if (ext === targetExt) return true
    } else if (p.startsWith('*')) {
      // Pattern like *test*
      const searchPart = p.slice(1)
      if (fileName.includes(searchPart)) return true
    } else if (p.endsWith('*')) {
      // Pattern like test*
      const searchPart = p.slice(0, -1)
      if (fileName.startsWith(searchPart)) return true
    } else {
      // Exact match or contains
      if (fileName === p || fileName.includes(p) || filePath.includes(p)) return true
    }
  }

  return false
}

// Search helper: check if path should be excluded
function shouldExclude(filePath: string, excludePattern: string): boolean {
  if (!excludePattern.trim()) return false

  const patterns = excludePattern.split(',').map(p => p.trim()).filter(p => p)

  for (const pattern of patterns) {
    if (filePath.includes(pattern)) return true
  }

  return false
}

// Search helper: recursively find all files
async function findAllFiles(
  dir: string,
  options: SearchOptions,
  files: string[] = []
): Promise<string[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true })

    for (const entry of entries) {
      // Skip hidden files and directories
      if (entry.name.startsWith('.')) continue

      const fullPath = join(dir, entry.name)

      // Check exclusion
      if (shouldExclude(fullPath, options.excludePattern)) continue

      if (entry.isDirectory()) {
        await findAllFiles(fullPath, options, files)
      } else if (entry.isFile()) {
        // Check inclusion pattern
        if (options.includePattern) {
          if (matchesPattern(fullPath, options.includePattern)) {
            files.push(fullPath)
          }
        } else {
          // Default: include .ترقيم files
          const ext = extname(entry.name)
          if (ext === '.ترقيم') {
            files.push(fullPath)
          }
        }
      }
    }
  } catch (error) {
    // Ignore permission errors etc.
  }

  return files
}

// Search helper: search in a single file
async function searchInFile(
  filePath: string,
  query: string,
  options: SearchOptions
): Promise<SearchFileResult | null> {
  try {
    const content = await readFile(filePath, 'utf-8')
    const lines = content.split('\n')
    const matches: SearchMatch[] = []

    // Build regex
    let searchRegex: RegExp
    try {
      let pattern = query
      if (!options.useRegex) {
        // Escape special regex characters
        pattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      }
      if (options.wholeWord) {
        pattern = `\\b${pattern}\\b`
      }
      searchRegex = new RegExp(pattern, options.caseSensitive ? 'g' : 'gi')
    } catch (e) {
      // Invalid regex
      return null
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      let match: RegExpExecArray | null

      // Reset lastIndex for each line
      searchRegex.lastIndex = 0

      while ((match = searchRegex.exec(line)) !== null) {
        matches.push({
          lineNumber: i + 1,
          lineContent: line.trim(),
          columnStart: match.index,
          columnEnd: match.index + match[0].length
        })

        // Prevent infinite loop for zero-length matches
        if (match[0].length === 0) {
          searchRegex.lastIndex++
        }
      }
    }

    if (matches.length > 0) {
      return {
        filePath,
        fileName: basename(filePath),
        matches
      }
    }

    return null
  } catch (error) {
    return null
  }
}

// Search in files IPC handler
ipcMain.handle('search:inFiles', async (_, {
  rootPath,
  query,
  options
}: {
  rootPath: string
  query: string
  options: SearchOptions
}) => {
  try {
    // Find all matching files
    const files = await findAllFiles(rootPath, options)

    // Search in each file
    const results: SearchFileResult[] = []

    for (const filePath of files) {
      const result = await searchInFile(filePath, query, options)
      if (result) {
        results.push(result)
      }
    }

    // Sort by file path
    results.sort((a, b) => a.filePath.localeCompare(b.filePath, 'ar'))

    return { success: true, results }
  } catch (error) {
    return { success: false, error: `Search failed: ${error}` }
  }
})

// Replace in files IPC handler
ipcMain.handle('search:replaceInFiles', async (_, {
  rootPath,
  query,
  replacement,
  options,
  filePaths
}: {
  rootPath: string
  query: string
  replacement: string
  options: SearchOptions
  filePaths?: string[]
}) => {
  try {
    // Determine which files to process
    let files: string[]
    if (filePaths && filePaths.length > 0) {
      files = filePaths
    } else {
      files = await findAllFiles(rootPath, options)
    }

    // Build regex
    let searchRegex: RegExp
    try {
      let pattern = query
      if (!options.useRegex) {
        pattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      }
      if (options.wholeWord) {
        pattern = `\\b${pattern}\\b`
      }
      searchRegex = new RegExp(pattern, options.caseSensitive ? 'g' : 'gi')
    } catch (e) {
      return { success: false, error: 'Invalid regex pattern' }
    }

    let totalReplaced = 0
    const modifiedFiles: string[] = []

    for (const filePath of files) {
      try {
        const content = await readFile(filePath, 'utf-8')
        const newContent = content.replace(searchRegex, replacement)

        if (content !== newContent) {
          await writeFile(filePath, newContent, 'utf-8')
          modifiedFiles.push(filePath)

          // Count replacements
          const matches = content.match(searchRegex)
          totalReplaced += matches ? matches.length : 0
        }
      } catch (error) {
        // Skip files that can't be read/written
      }
    }

    return {
      success: true,
      modifiedFiles,
      replacedCount: totalReplaced
    }
  } catch (error) {
    return { success: false, error: `Replace failed: ${error}` }
  }
})

// Compiler discovery and validation
ipcMain.handle('compiler:validate', async () => {
  const compiler = discoverCompiler(userCompilerPath)
  return {
    found: !!compiler,
    path: compiler?.path || null,
    version: compiler?.version || null,
    installInstructions: compiler ? null : getInstallInstructions()
  }
})

ipcMain.handle('compiler:setPath', async (_, path: string) => {
  userCompilerPath = path
  clearCompilerCache()
  return discoverCompiler(path)
})

ipcMain.handle('compiler:getPath', async () => {
  try {
    return { success: true, path: getCompilerPath() }
  } catch {
    return { success: false, path: null }
  }
})

// Compiler integration
ipcMain.handle('compiler:compile', async (event, filePath: string) => {
  return new Promise((resolve) => {
    const output: string[] = []
    const errors: string[] = []

    const proc = spawn(getCompilerPath(), ['compile', filePath], {
      cwd: filePath.substring(0, filePath.lastIndexOf('/'))
    })

    proc.stdout.on('data', (data) => {
      const text = data.toString()
      output.push(text)
      event.sender.send('compiler:stdout', text)
    })

    proc.stderr.on('data', (data) => {
      const text = data.toString()
      errors.push(text)
      event.sender.send('compiler:stderr', text)
    })

    proc.on('error', (err) => {
      resolve({
        success: false,
        output: output.join(''),
        errors: `Failed to start compiler: ${err.message}`,
        exitCode: -1
      })
    })

    proc.on('close', (code) => {
      resolve({
        success: code === 0,
        output: output.join(''),
        errors: errors.join(''),
        exitCode: code
      })
    })
  })
})

// Parse file and return AST as JSON (for AST Viewer)
ipcMain.handle('compiler:parseAst', async (_, filePath: string) => {
  return new Promise((resolve) => {
    const output: string[] = []
    const errors: string[] = []

    const proc = spawn(getCompilerPath(), ['parse', filePath, '-f', 'json'], {
      cwd: filePath.substring(0, filePath.lastIndexOf('/'))
    })

    proc.stdout.on('data', (data) => {
      output.push(data.toString())
    })

    proc.stderr.on('data', (data) => {
      errors.push(data.toString())
    })

    proc.on('error', (err) => {
      resolve({
        success: false,
        ast: null,
        error: `Failed to parse: ${err.message}`
      })
    })

    proc.on('close', (code) => {
      if (code === 0) {
        try {
          const ast = JSON.parse(output.join(''))
          resolve({ success: true, ast, error: null })
        } catch (e) {
          resolve({
            success: false,
            ast: null,
            error: `Failed to parse AST JSON: ${e}`
          })
        }
      } else {
        resolve({
          success: false,
          ast: null,
          error: errors.join('') || 'Parse failed'
        })
      }
    })
  })
})

// Generate IR from Tarqeem file (for IR Viewer)
ipcMain.handle('compiler:generateIR', async (_, filePath: string) => {
  return new Promise((resolve) => {
    const output: string[] = []
    const errors: string[] = []

    const proc = spawn(getCompilerPath(), ['compile', filePath, '--dump-ir'], {
      cwd: filePath.substring(0, filePath.lastIndexOf('/'))
    })

    proc.stdout.on('data', (data) => {
      output.push(data.toString())
    })

    proc.stderr.on('data', (data) => {
      errors.push(data.toString())
    })

    proc.on('error', (err) => {
      resolve({
        success: false,
        ir: null,
        error: `Failed to generate IR: ${err.message}`
      })
    })

    proc.on('close', (code) => {
      if (code === 0) {
        resolve({
          success: true,
          ir: output.join(''),
          error: null
        })
      } else {
        resolve({
          success: false,
          ir: null,
          error: errors.join('') || 'IR generation failed'
        })
      }
    })
  })
})

ipcMain.handle('compiler:run', async (event, filePath: string) => {
  return new Promise((resolve) => {
    const output: string[] = []
    const errors: string[] = []

    const proc = spawn(getCompilerPath(), ['run', filePath], {
      cwd: filePath.substring(0, filePath.lastIndexOf('/'))
    })

    proc.stdout.on('data', (data) => {
      const text = data.toString()
      output.push(text)
      event.sender.send('compiler:stdout', text)
    })

    proc.stderr.on('data', (data) => {
      const text = data.toString()
      errors.push(text)
      event.sender.send('compiler:stderr', text)
    })

    proc.on('error', (err) => {
      resolve({
        success: false,
        output: output.join(''),
        errors: `Failed to start: ${err.message}`,
        exitCode: -1
      })
    })

    proc.on('close', (code) => {
      resolve({
        success: code === 0,
        output: output.join(''),
        errors: errors.join(''),
        exitCode: code
      })
    })
  })
})

// Compile with timing information (for Pipeline Status panel)
ipcMain.handle('compiler:compileWithTiming', async (event, filePath: string) => {
  return new Promise((resolve) => {
    const output: string[] = []
    const errors: string[] = []

    // Use --timing to get JSON timing data, --emit-llvm for faster compilation
    const proc = spawn(getCompilerPath(), ['compile', filePath, '--timing', '--emit-llvm'], {
      cwd: filePath.substring(0, filePath.lastIndexOf('/'))
    })

    proc.stdout.on('data', (data) => {
      const text = data.toString()
      output.push(text)
      event.sender.send('compiler:stdout', text)
    })

    proc.stderr.on('data', (data) => {
      const text = data.toString()
      errors.push(text)
      event.sender.send('compiler:stderr', text)
    })

    proc.on('error', (err) => {
      resolve({
        success: false,
        timing: null,
        output: output.join(''),
        errors: `Failed to start compiler: ${err.message}`,
        exitCode: -1
      })
    })

    proc.on('close', (code) => {
      // Parse timing JSON from the last line of output
      const fullOutput = output.join('')
      const lines = fullOutput.trim().split('\n')
      let timing = null

      // Look for JSON timing data in the output (last line with JSON)
      for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i].trim()
        if (line.startsWith('{') && line.includes('"lexer":')) {
          try {
            timing = JSON.parse(line)
            break
          } catch {
            // Not valid JSON, continue searching
          }
        }
      }

      resolve({
        success: code === 0,
        timing,
        output: fullOutput,
        errors: errors.join(''),
        exitCode: code
      })
    })
  })
})

// ============================================================================
// Profiler Integration (Phase 5.1)
// ============================================================================

// Run with profiling to get runtime metrics
ipcMain.handle('profiler:run', async (event, filePath: string) => {
  return new Promise((resolve) => {
    const output: string[] = []
    const errors: string[] = []

    // Use --profile to get JSON profiling data (automatically enables JIT)
    const proc = spawn(getCompilerPath(), ['run', '--profile', filePath], {
      cwd: filePath.substring(0, filePath.lastIndexOf('/'))
    })

    proc.stdout.on('data', (data) => {
      const text = data.toString()
      output.push(text)
      event.sender.send('profiler:stdout', text)
    })

    proc.stderr.on('data', (data) => {
      const text = data.toString()
      errors.push(text)
      event.sender.send('profiler:stderr', text)
    })

    proc.on('error', (err) => {
      resolve({
        success: false,
        profile: null,
        output: output.join(''),
        error: `Failed to start profiler: ${err.message}`
      })
    })

    proc.on('close', (code) => {
      // Parse profiling JSON from the last line of output
      const fullOutput = output.join('')
      const lines = fullOutput.trim().split('\n')
      let profile = null

      // Look for JSON profiling data in the output (last line with JSON)
      for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i].trim()
        if (line.startsWith('{') && line.includes('"total_functions":')) {
          try {
            profile = JSON.parse(line)
            break
          } catch {
            // Not valid JSON, continue searching
          }
        }
      }

      resolve({
        success: code === 0 && profile !== null,
        profile,
        output: fullOutput,
        error: code !== 0 ? errors.join('') : null
      })
    })
  })
})

// ============================================================================
// Build System Integration (Phase 4.3)
// ============================================================================

// Build configuration type (matches renderer/types/build.ts)
interface BuildConfiguration {
  mode: 'debug' | 'release'
  optimizationLevel: 'O0' | 'O1' | 'O2' | 'O3'
  outputTarget: 'native' | 'llvm-ir' | 'assembly' | 'object' | 'wasm'
  targetTriple?: string
  wasmJsBindings?: boolean
  timing?: boolean
}

// Enhanced compile with build configuration
ipcMain.handle('build:compile', async (event, filePath: string, config: BuildConfiguration) => {
  return new Promise((resolve) => {
    const output: string[] = []
    const errors: string[] = []

    // Build command arguments
    const args = ['compile', filePath]

    // Add optimization level
    args.push('-O', config.optimizationLevel.replace('O', ''))

    // Add output target flags
    switch (config.outputTarget) {
      case 'llvm-ir':
        args.push('--emit-llvm')
        break
      case 'assembly':
        args.push('--emit-asm')
        break
      case 'object':
        args.push('-c')
        break
      case 'wasm':
        args.push('--emit-wasm')
        if (config.wasmJsBindings) {
          args.push('--wasm-js-bindings')
        }
        break
      // 'native' is the default, no flag needed
    }

    // Add target triple if specified
    if (config.targetTriple) {
      args.push('--target', config.targetTriple)
    }

    // Add timing flag if requested
    if (config.timing) {
      args.push('--timing')
    }

    const proc = spawn(getCompilerPath(), args, {
      cwd: filePath.substring(0, filePath.lastIndexOf('/'))
    })

    proc.stdout.on('data', (data) => {
      const text = data.toString()
      output.push(text)
      event.sender.send('build:stdout', text)
    })

    proc.stderr.on('data', (data) => {
      const text = data.toString()
      errors.push(text)
      event.sender.send('build:stderr', text)
    })

    proc.on('error', (err) => {
      resolve({
        success: false,
        output: output.join(''),
        errors: `Failed to start compiler: ${err.message}`,
        exitCode: -1
      })
    })

    proc.on('close', (code) => {
      // Parse timing JSON if present
      let timing = null
      if (config.timing) {
        const fullOutput = output.join('')
        const lines = fullOutput.trim().split('\n')
        for (let i = lines.length - 1; i >= 0; i--) {
          const line = lines[i].trim()
          if (line.startsWith('{') && line.includes('"lexer":')) {
            try {
              timing = JSON.parse(line)
              break
            } catch {
              // Not valid JSON
            }
          }
        }
      }

      resolve({
        success: code === 0,
        output: output.join(''),
        errors: errors.join(''),
        exitCode: code,
        timing
      })
    })
  })
})

// Build project using tarqeem pkg build
ipcMain.handle('build:project', async (event, projectPath: string, release: boolean) => {
  return new Promise((resolve) => {
    const output: string[] = []
    const errors: string[] = []

    const args = ['pkg', 'build']
    if (release) {
      args.push('--release')
    }

    const proc = spawn(getCompilerPath(), args, {
      cwd: projectPath
    })

    proc.stdout.on('data', (data) => {
      const text = data.toString()
      output.push(text)
      event.sender.send('build:stdout', text)
    })

    proc.stderr.on('data', (data) => {
      const text = data.toString()
      errors.push(text)
      event.sender.send('build:stderr', text)
    })

    proc.on('error', (err) => {
      resolve({
        success: false,
        output: output.join(''),
        errors: `Failed to start build: ${err.message}`,
        exitCode: -1
      })
    })

    proc.on('close', (code) => {
      resolve({
        success: code === 0,
        output: output.join(''),
        errors: errors.join(''),
        exitCode: code
      })
    })
  })
})

// Run script from manifest (shell execution)
ipcMain.handle('build:runScript', async (event, projectPath: string, command: string) => {
  return new Promise((resolve) => {
    const output: string[] = []
    const errors: string[] = []
    const startTime = Date.now()

    // Use shell to execute the command
    const proc = spawn(command, [], {
      cwd: projectPath,
      shell: true
    })

    proc.stdout.on('data', (data) => {
      const text = data.toString()
      output.push(text)
      event.sender.send('build:stdout', text)
    })

    proc.stderr.on('data', (data) => {
      const text = data.toString()
      errors.push(text)
      event.sender.send('build:stderr', text)
    })

    proc.on('error', (err) => {
      resolve({
        success: false,
        output: output.join(''),
        errors: `Failed to run script: ${err.message}`,
        exitCode: -1,
        duration: Date.now() - startTime
      })
    })

    proc.on('close', (code) => {
      resolve({
        success: code === 0,
        output: output.join(''),
        errors: errors.join(''),
        exitCode: code,
        duration: Date.now() - startTime
      })
    })
  })
})

// Run tests using tarqeem pkg test
ipcMain.handle('build:test', async (event, projectPath: string, filter?: string) => {
  return new Promise((resolve) => {
    const output: string[] = []
    const errors: string[] = []
    const startTime = Date.now()

    const args = ['pkg', 'test']
    if (filter) {
      args.push(filter)
    }

    const proc = spawn(getCompilerPath(), args, {
      cwd: projectPath
    })

    proc.stdout.on('data', (data) => {
      const text = data.toString()
      output.push(text)
      event.sender.send('build:stdout', text)
    })

    proc.stderr.on('data', (data) => {
      const text = data.toString()
      errors.push(text)
      event.sender.send('build:stderr', text)
    })

    proc.on('error', (err) => {
      resolve({
        success: false,
        passed: 0,
        failed: 0,
        total: 0,
        duration: Date.now() - startTime,
        results: [],
        error: `Failed to run tests: ${err.message}`
      })
    })

    proc.on('close', (code) => {
      // Parse test results from output
      // Format: test results may vary, basic parsing
      const fullOutput = output.join('')
      let passed = 0
      let failed = 0

      // Try to parse test summary from output
      const passMatch = fullOutput.match(/(\d+)\s*(?:passed|ناجحة)/i)
      const failMatch = fullOutput.match(/(\d+)\s*(?:failed|فاشلة)/i)

      if (passMatch) passed = parseInt(passMatch[1], 10)
      if (failMatch) failed = parseInt(failMatch[1], 10)

      resolve({
        success: code === 0 && failed === 0,
        passed,
        failed,
        total: passed + failed,
        duration: Date.now() - startTime,
        results: [], // Detailed results parsing would need tarqeem-specific format
        output: fullOutput,
        errors: errors.join('')
      })
    })
  })
})

// Clean build artifacts using tarqeem pkg clean
ipcMain.handle('build:clean', async (_, projectPath: string) => {
  return new Promise((resolve) => {
    const proc = spawn(getCompilerPath(), ['pkg', 'clean'], {
      cwd: projectPath
    })

    let output = ''
    let errors = ''

    proc.stdout.on('data', (data) => {
      output += data.toString()
    })

    proc.stderr.on('data', (data) => {
      errors += data.toString()
    })

    proc.on('error', (err) => {
      resolve({
        success: false,
        error: `Failed to clean: ${err.message}`
      })
    })

    proc.on('close', (code) => {
      resolve({
        success: code === 0,
        output,
        error: code !== 0 ? errors : undefined
      })
    })
  })
})

// List build artifacts in بناء/ directory
ipcMain.handle('build:listArtifacts', async (_, projectPath: string) => {
  try {
    const buildDir = join(projectPath, 'بناء')
    const artifacts: Array<{
      name: string
      path: string
      type: string
      size: number
      modifiedTime: number
    }> = []

    // Helper function to determine artifact type from extension
    const getArtifactType = (filename: string): string => {
      const ext = filename.split('.').pop()?.toLowerCase()
      switch (ext) {
        case 'll': return 'llvm-ir'
        case 's':
        case 'asm': return 'assembly'
        case 'o':
        case 'obj': return 'object'
        case 'wasm': return 'wasm'
        case 'js': return 'js-bindings'
        default:
          // Check if it's an executable (no extension)
          if (!ext || ext === 'exe' || ext === 'out') {
            return 'executable'
          }
          return 'unknown'
      }
    }

    // Helper function to recursively scan directory
    const scanDir = async (dir: string): Promise<void> => {
      try {
        const entries = await readdir(dir, { withFileTypes: true })
        for (const entry of entries) {
          const fullPath = join(dir, entry.name)
          if (entry.isDirectory()) {
            await scanDir(fullPath)
          } else if (entry.isFile()) {
            const fileStat = await stat(fullPath)
            artifacts.push({
              name: entry.name,
              path: fullPath,
              type: getArtifactType(entry.name),
              size: fileStat.size,
              modifiedTime: fileStat.mtimeMs
            })
          }
        }
      } catch {
        // Directory doesn't exist or can't be read
      }
    }

    await scanDir(buildDir)

    // Sort by modified time (newest first)
    artifacts.sort((a, b) => b.modifiedTime - a.modifiedTime)

    return { success: true, artifacts }
  } catch (error) {
    return { success: false, artifacts: [], error: `Failed to list artifacts: ${error}` }
  }
})

// LSP Integration
ipcMain.handle('lsp:start', async (event, workspacePath: string) => {
  try {
    const lspClient = getLSPClient()

    // Set up notification forwarding to renderer
    lspClient.on('diagnostics', (params) => {
      event.sender.send('lsp:diagnostics', params)
    })

    lspClient.on('log', (params) => {
      event.sender.send('lsp:log', params)
    })

    lspClient.on('showMessage', (params) => {
      event.sender.send('lsp:showMessage', params)
    })

    lspClient.on('error', (err) => {
      event.sender.send('lsp:error', { message: err.message })
    })

    lspClient.on('close', (code) => {
      event.sender.send('lsp:close', { code })
    })

    const result = await lspClient.start(workspacePath)
    return { success: true, capabilities: result.capabilities }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('lsp:stop', async () => {
  try {
    destroyLSPClient()
    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('lsp:request', async (_, method: string, params: unknown) => {
  try {
    const lspClient = getLSPClient()
    if (!lspClient.isRunning()) {
      return { success: false, error: 'LSP server not running' }
    }
    const result = await lspClient.request(method, params)
    return { success: true, result }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('lsp:notify', async (_, method: string, params: unknown) => {
  try {
    const lspClient = getLSPClient()
    if (!lspClient.isRunning()) {
      return { success: false, error: 'LSP server not running' }
    }
    lspClient.notify(method, params)
    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('lsp:isRunning', async () => {
  const lspClient = getLSPClient()
  return { running: lspClient.isRunning() }
})

// DAP (Debug Adapter Protocol) Integration
ipcMain.handle('dap:start', async (event, filePath: string) => {
  try {
    const dapClient = getDAPClient()

    // Set up event forwarding to renderer
    dapClient.on('stopped', (body) => {
      event.sender.send('dap:stopped', body)
    })

    dapClient.on('continued', (body) => {
      event.sender.send('dap:continued', body)
    })

    dapClient.on('terminated', (body) => {
      event.sender.send('dap:terminated', body)
    })

    dapClient.on('exited', (body) => {
      event.sender.send('dap:exited', body)
    })

    dapClient.on('output', (body) => {
      event.sender.send('dap:output', body)
    })

    dapClient.on('breakpoint', (body) => {
      event.sender.send('dap:breakpoint', body)
    })

    dapClient.on('error', (err) => {
      event.sender.send('dap:error', { message: err.message })
    })

    dapClient.on('close', (code) => {
      event.sender.send('dap:close', { code })
    })

    const capabilities = await dapClient.start(filePath)
    return { success: true, capabilities }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('dap:stop', async () => {
  try {
    destroyDAPClient()
    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('dap:launch', async () => {
  try {
    const dapClient = getDAPClient()
    if (!dapClient.isRunning()) {
      return { success: false, error: 'Debug adapter not running' }
    }
    await dapClient.launch()
    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('dap:setBreakpoints', async (_, filePath: string, breakpoints: Array<{ line: number; condition?: string; hitCondition?: string; logMessage?: string }>) => {
  try {
    const dapClient = getDAPClient()
    if (!dapClient.isRunning()) {
      return { success: false, error: 'Debug adapter not running' }
    }
    const result = await dapClient.setBreakpoints(filePath, breakpoints)
    return { success: true, breakpoints: result }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('dap:continue', async (_, threadId?: number) => {
  try {
    const dapClient = getDAPClient()
    if (!dapClient.isRunning()) {
      return { success: false, error: 'Debug adapter not running' }
    }
    await dapClient.continue(threadId)
    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('dap:stepOver', async (_, threadId?: number) => {
  try {
    const dapClient = getDAPClient()
    if (!dapClient.isRunning()) {
      return { success: false, error: 'Debug adapter not running' }
    }
    await dapClient.stepOver(threadId)
    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('dap:stepInto', async (_, threadId?: number) => {
  try {
    const dapClient = getDAPClient()
    if (!dapClient.isRunning()) {
      return { success: false, error: 'Debug adapter not running' }
    }
    await dapClient.stepInto(threadId)
    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('dap:stepOut', async (_, threadId?: number) => {
  try {
    const dapClient = getDAPClient()
    if (!dapClient.isRunning()) {
      return { success: false, error: 'Debug adapter not running' }
    }
    await dapClient.stepOut(threadId)
    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('dap:pause', async (_, threadId?: number) => {
  try {
    const dapClient = getDAPClient()
    if (!dapClient.isRunning()) {
      return { success: false, error: 'Debug adapter not running' }
    }
    await dapClient.pause(threadId)
    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('dap:restart', async () => {
  try {
    const dapClient = getDAPClient()
    if (!dapClient.isRunning()) {
      return { success: false, error: 'Debug adapter not running' }
    }
    await dapClient.restart()
    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('dap:stackTrace', async (_, threadId?: number) => {
  try {
    const dapClient = getDAPClient()
    if (!dapClient.isRunning()) {
      return { success: false, error: 'Debug adapter not running' }
    }
    const stackFrames = await dapClient.stackTrace(threadId)
    return { success: true, stackFrames }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('dap:scopes', async (_, frameId: number) => {
  try {
    const dapClient = getDAPClient()
    if (!dapClient.isRunning()) {
      return { success: false, error: 'Debug adapter not running' }
    }
    const scopes = await dapClient.scopes(frameId)
    return { success: true, scopes }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('dap:variables', async (_, variablesReference: number) => {
  try {
    const dapClient = getDAPClient()
    if (!dapClient.isRunning()) {
      return { success: false, error: 'Debug adapter not running' }
    }
    const variables = await dapClient.variables(variablesReference)
    return { success: true, variables }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('dap:evaluate', async (_, expression: string, frameId?: number) => {
  try {
    const dapClient = getDAPClient()
    if (!dapClient.isRunning()) {
      return { success: false, error: 'Debug adapter not running' }
    }
    const result = await dapClient.evaluate(expression, frameId)
    return { success: true, result }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('dap:isRunning', async () => {
  const dapClient = getDAPClient()
  return { running: dapClient.isRunning() }
})

// ============================================================================
// Memory Inspector (فاحص الذاكرة) DAP Extensions
// ============================================================================

ipcMain.handle('dap:memoryStats', async () => {
  try {
    const dapClient = getDAPClient()
    if (!dapClient.isRunning()) {
      return { success: false, error: 'Debug adapter not running / المصحح غير مشغل' }
    }
    const stats = await dapClient.memoryStats()
    return { success: true, stats }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('dap:heapAllocations', async (_, options?: { filter?: string; maxItems?: number }) => {
  try {
    const dapClient = getDAPClient()
    if (!dapClient.isRunning()) {
      return { success: false, error: 'Debug adapter not running / المصحح غير مشغل' }
    }
    const allocations = await dapClient.heapAllocations(options)
    return { success: true, allocations }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('dap:memoryTimeline', async (_, options?: { startTime?: number; endTime?: number }) => {
  try {
    const dapClient = getDAPClient()
    if (!dapClient.isRunning()) {
      return { success: false, error: 'Debug adapter not running / المصحح غير مشغل' }
    }
    const events = await dapClient.memoryTimeline(options)
    return { success: true, events }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

// ============================================================================
// Interactive Mode (الوضع التفاعلي) Integration
// ============================================================================

ipcMain.handle('interactive:start', async (event) => {
  try {
    const client = getInteractiveModeClient()

    // Set up event forwarding to renderer
    client.on('output', (text) => {
      event.sender.send('interactive:output', text)
    })

    client.on('stderr', (text) => {
      event.sender.send('interactive:stderr', text)
    })

    client.on('error', (err) => {
      event.sender.send('interactive:error', { message: err.message })
    })

    client.on('close', (code) => {
      event.sender.send('interactive:close', { code })
    })

    await client.start()
    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('interactive:stop', async () => {
  try {
    await destroyInteractiveModeClient()
    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('interactive:evaluate', async (_, code: string) => {
  try {
    const client = getInteractiveModeClient()
    if (!client.isRunning()) {
      // Auto-start if not running
      await client.start()
    }
    const result = await client.evaluate(code)
    return result
  } catch (error) {
    return {
      success: false,
      output: '',
      error: (error as Error).message
    }
  }
})

ipcMain.handle('interactive:isRunning', async () => {
  const client = getInteractiveModeClient()
  return { running: client.isRunning() }
})

// Workspace file extension
const WORKSPACE_EXTENSION = '.قلم-workspace'
const FOLDER_SETTINGS_DIR = '.qalam'
const FOLDER_SETTINGS_FILE = 'settings.json'

// Workspace IPC Handlers
ipcMain.handle('workspace:open', async () => {
  const result = await dialog.showOpenDialog({
    title: 'فتح مساحة عمل',
    filters: [
      { name: 'ملفات مساحة العمل', extensions: ['قلم-workspace'] },
      { name: 'جميع الملفات', extensions: ['*'] }
    ],
    properties: ['openFile']
  })

  if (result.canceled || !result.filePaths[0]) {
    return null
  }

  return { path: result.filePaths[0] }
})

ipcMain.handle('workspace:openFile', async (_, path: string) => {
  try {
    const content = await readFile(path, 'utf-8')
    return { content }
  } catch (error) {
    return { error: `Failed to read workspace file: ${error}` }
  }
})

ipcMain.handle('workspace:save', async (_, path: string, content: string) => {
  try {
    // Ensure directory exists
    const dir = dirname(path)
    try {
      await access(dir, constants.F_OK)
    } catch {
      await mkdir(dir, { recursive: true })
    }

    await writeFile(path, content, 'utf-8')
    return { success: true }
  } catch (error) {
    return { success: false, error: `Failed to save workspace: ${error}` }
  }
})

ipcMain.handle('workspace:saveAs', async (_, content: string) => {
  const result = await dialog.showSaveDialog({
    title: 'حفظ مساحة العمل',
    defaultPath: `مساحة-عمل${WORKSPACE_EXTENSION}`,
    filters: [
      { name: 'ملفات مساحة العمل', extensions: ['قلم-workspace'] }
    ]
  })

  if (result.canceled || !result.filePath) {
    return null
  }

  try {
    await writeFile(result.filePath, content, 'utf-8')
    return { path: result.filePath }
  } catch (error) {
    return { error: `Failed to save workspace: ${error}` }
  }
})

ipcMain.handle('workspace:readFolderSettings', async (_, folderPath: string) => {
  try {
    const settingsPath = join(folderPath, FOLDER_SETTINGS_DIR, FOLDER_SETTINGS_FILE)
    const content = await readFile(settingsPath, 'utf-8')
    const settings = JSON.parse(content)
    return { settings }
  } catch {
    // No settings file exists, return null
    return null
  }
})

ipcMain.handle('workspace:writeFolderSettings', async (_, folderPath: string, settings: Record<string, unknown>) => {
  try {
    const settingsDir = join(folderPath, FOLDER_SETTINGS_DIR)
    const settingsPath = join(settingsDir, FOLDER_SETTINGS_FILE)

    // Ensure .qalam directory exists
    try {
      await access(settingsDir, constants.F_OK)
    } catch {
      await mkdir(settingsDir, { recursive: true })
    }

    const content = JSON.stringify(settings, null, 2)
    await writeFile(settingsPath, content, 'utf-8')
    return { success: true }
  } catch (error) {
    return { success: false, error: `Failed to write folder settings: ${error}` }
  }
})

ipcMain.handle('workspace:addFolder', async () => {
  const result = await dialog.showOpenDialog({
    title: 'إضافة مجلد إلى مساحة العمل',
    properties: ['openDirectory']
  })

  if (result.canceled || !result.filePaths[0]) {
    return null
  }

  return {
    path: result.filePaths[0],
    name: basename(result.filePaths[0])
  }
})

// ============================================================================
// Auto-Update Integration (Phase 6.3)
// ============================================================================

// Configure auto-updater
autoUpdater.autoDownload = false
autoUpdater.autoInstallOnAppQuit = true

// Set up auto-updater event handlers
function setupAutoUpdater(): void {
  autoUpdater.on('checking-for-update', () => {
    mainWindow?.webContents.send('updater:checking')
  })

  autoUpdater.on('update-available', (info: UpdateInfo) => {
    mainWindow?.webContents.send('updater:available', {
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: info.releaseNotes
    })
  })

  autoUpdater.on('update-not-available', () => {
    mainWindow?.webContents.send('updater:not-available')
  })

  autoUpdater.on('download-progress', (progress: ProgressInfo) => {
    mainWindow?.webContents.send('updater:progress', {
      percent: progress.percent,
      bytesPerSecond: progress.bytesPerSecond,
      transferred: progress.transferred,
      total: progress.total
    })
  })

  autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
    mainWindow?.webContents.send('updater:downloaded', {
      version: info.version
    })
  })

  autoUpdater.on('error', (err: Error) => {
    mainWindow?.webContents.send('updater:error', {
      message: err.message
    })
  })
}

// Auto-updater IPC handlers
ipcMain.handle('updater:check', async () => {
  try {
    const result = await autoUpdater.checkForUpdates()
    return {
      success: true,
      updateAvailable: result?.updateInfo != null,
      version: result?.updateInfo?.version
    }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('updater:download', async () => {
  try {
    await autoUpdater.downloadUpdate()
    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('updater:install', async () => {
  try {
    autoUpdater.quitAndInstall(false, true)
    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('updater:getVersion', async () => {
  return { version: app.getVersion() }
})

// ============================================================================
// Error Code Explanation (شرح رموز الأخطاء)
// ============================================================================

ipcMain.handle('error:explain', async (_, errorCode: string) => {
  return new Promise((resolve) => {
    const output: string[] = []
    const errors: string[] = []

    const proc = spawn(getCompilerPath(), ['اشرح', errorCode])

    proc.stdout.on('data', (data) => {
      output.push(data.toString())
    })

    proc.stderr.on('data', (data) => {
      errors.push(data.toString())
    })

    proc.on('error', (err) => {
      resolve({
        success: false,
        explanation: null,
        error: `فشل في تشغيل الأمر: ${err.message}`
      })
    })

    proc.on('close', (code) => {
      if (code === 0) {
        resolve({
          success: true,
          explanation: output.join(''),
          error: null
        })
      } else {
        resolve({
          success: false,
          explanation: null,
          error: errors.join('') || 'فشل في الحصول على شرح الخطأ'
        })
      }
    })
  })
})

// App lifecycle
app.whenReady().then(() => {
  // Register tarqeem:// protocol for error explanation URLs
  protocol.registerStringProtocol('tarqeem', (request, callback) => {
    const url = new URL(request.url)
    if (url.pathname.startsWith('//explain/')) {
      // Extract error code from URL: tarqeem://explain/د/د٠٣٠١
      const parts = url.pathname.replace('//explain/', '').split('/')
      const errorCode = parts[1] || parts[0]
      // Send to renderer to show explanation panel
      mainWindow?.webContents.send('error:showExplanation', errorCode)
    }
    callback('')
  })

  createMenu()
  createWindow()

  // Set up auto-updater (only in production)
  if (process.env.NODE_ENV !== 'development') {
    setupAutoUpdater()

    // Check for updates after a short delay (5 seconds after startup)
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch(() => {
        // Silently ignore update check errors on startup
      })
    }, 5000)
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  // Clean up LSP, DAP, and Interactive Mode clients before quitting
  destroyLSPClient()
  destroyDAPClient()
  destroyInteractiveModeClient()

  if (process.platform !== 'darwin') {
    app.quit()
  }
})
