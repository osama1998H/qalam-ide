import { app, BrowserWindow, ipcMain, dialog, Menu, shell } from 'electron'
import { readFile, writeFile, readdir, stat, mkdir, rename, rm, access } from 'fs/promises'
import { constants } from 'fs'
import { spawn } from 'child_process'
import { join, basename, relative, extname, dirname } from 'path'
import { getLSPClient, destroyLSPClient } from './lsp-client'
import { updateImportPaths } from './refactoring'
import { getWindowState, saveWindowState, saveWindowStateSync } from './window-state'

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
        { label: 'ملء الشاشة', accelerator: 'F11', role: 'togglefullscreen' }
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

// Read project manifest
ipcMain.handle('project:read', async (_, folderPath: string) => {
  try {
    const projectFilePath = join(folderPath, PROJECT_FILE_NAME)
    const content = await readFile(projectFilePath, 'utf-8')
    const manifest = JSON.parse(content)
    return { success: true, manifest }
  } catch (error) {
    return { success: false, error: `فشل في قراءة ملف المشروع: ${error}` }
  }
})

// Write project manifest
ipcMain.handle('project:write', async (_, folderPath: string, manifest: unknown) => {
  try {
    const projectFilePath = join(folderPath, PROJECT_FILE_NAME)
    const content = JSON.stringify(manifest, null, 2)
    await writeFile(projectFilePath, content, 'utf-8')
    return { success: true }
  } catch (error) {
    return { success: false, error: `فشل في كتابة ملف المشروع: ${error}` }
  }
})

// Initialize new project with default manifest
ipcMain.handle('project:init', async (_, folderPath: string, projectName: string) => {
  try {
    const projectFilePath = join(folderPath, PROJECT_FILE_NAME)

    // Create default manifest with Arabic keys
    const defaultManifest = {
      'الاسم': projectName,
      'الإصدار': '1.0.0',
      'نقطة_البداية': 'main.ترقيم',
      'مجلد_الإخراج': 'build/',
      'إعدادات_المترجم': {
        'تحسين': 'أساسي',
        'وضع_التنقيح': true,
        'تحذيرات_كأخطاء': false,
        'مستوى_التحذيرات': 'أساسي'
      }
    }

    const content = JSON.stringify(defaultManifest, null, 2)
    await writeFile(projectFilePath, content, 'utf-8')
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
          // Default: include .ترقيم and .trq files
          const ext = extname(entry.name)
          if (ext === '.ترقيم' || ext === '.trq') {
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

// Compiler integration
ipcMain.handle('compiler:compile', async (event, filePath: string) => {
  return new Promise((resolve) => {
    const output: string[] = []
    const errors: string[] = []

    const proc = spawn('tarqeem', ['compile', filePath], {
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

ipcMain.handle('compiler:run', async (event, filePath: string) => {
  return new Promise((resolve) => {
    const output: string[] = []
    const errors: string[] = []

    const proc = spawn('tarqeem', ['run', filePath], {
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

// App lifecycle
app.whenReady().then(() => {
  createMenu()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  // Clean up LSP client before quitting
  destroyLSPClient()

  if (process.platform !== 'darwin') {
    app.quit()
  }
})
