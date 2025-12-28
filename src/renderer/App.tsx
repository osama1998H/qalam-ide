import React, { useState, useCallback, useEffect, useRef } from 'react'
import Editor, { EditorHandle } from './components/Editor'
import Toolbar from './components/Toolbar'
import TabBar from './components/TabBar'
import StatusBar from './components/StatusBar'
import OutputPanel from './components/OutputPanel'
import ProblemsPanel from './components/ProblemsPanel'
import AstViewerPanel from './components/AstViewerPanel'
import TypeInspectorPanel from './components/TypeInspectorPanel'
import FindReplace from './components/FindReplace'
import GoToLineDialog from './components/GoToLineDialog'
import QuickOpen from './components/QuickOpen'
import SettingsPanel from './components/SettingsPanel'
import ConfirmDialog from './components/ConfirmDialog'
import WelcomeScreen from './components/WelcomeScreen'
import FileExplorer from './components/FileExplorer'
import ProjectInitDialog from './components/ProjectInitDialog'
import { useTabStore } from './stores/useTabStore'
import { useEditorSettings } from './stores/useEditorSettings'
import { useRecentFiles } from './stores/useRecentFiles'
import { useRecentProjects } from './stores/useRecentProjects'
import { useProjectStore } from './stores/useProjectStore'
import { useLSPStore, useDiagnosticsForFile, useAllDiagnostics } from './stores/useLSPStore'
import { useFileExplorer } from './stores/useFileExplorer'
import { formatDocument } from './codemirror/lsp-formatting'
import { themes, applyTheme } from './themes'
import { EditorView } from '@codemirror/view'
import { EditorSelection } from '@codemirror/state'

export default function App() {
  const editorRef = useRef<EditorHandle>(null)
  const {
    tabs,
    activeTabId,
    createTab,
    closeTab,
    setActiveTab,
    updateTabContent,
    updateTabCursor,
    markTabSaved,
    getActiveTab,
    nextTab,
    prevTab
  } = useTabStore()

  const { theme, formatOnSave, tabSize, insertSpaces } = useEditorSettings()
  const { addFile: addRecentFile } = useRecentFiles()
  const { addProject: addRecentProject } = useRecentProjects()

  // Project store
  const {
    loadProject,
    initializeProject,
    closeProject,
    checkForProjectFile
  } = useProjectStore()

  // LSP Store
  const {
    connected: lspConnected,
    connect: lspConnect,
    disconnect: lspDisconnect,
    documentOpened: lspDocumentOpened,
    documentChanged: lspDocumentChanged,
    documentClosed: lspDocumentClosed,
    requestFormatting
  } = useLSPStore()

  // File explorer for workspace root
  // Note: Use `roots` directly instead of `rootPath` getter for reactivity
  // Zustand doesn't track getters, so rootPath wouldn't trigger re-renders on rehydration
  const { roots, setRoot } = useFileExplorer()
  const workspaceRoot = roots.length > 0 ? roots[0].path : null

  // Apply theme on mount and when changed
  useEffect(() => {
    const currentTheme = themes[theme]
    if (currentTheme) {
      applyTheme(currentTheme)
    }
  }, [theme])

  // Initialize LSP when workspace root changes
  useEffect(() => {
    if (workspaceRoot) {
      lspConnect(workspaceRoot)
    }

    return () => {
      // Disconnect when workspace changes
      if (lspConnected) {
        lspDisconnect()
      }
    }
  }, [workspaceRoot])

  // When LSP becomes connected, notify it about all currently open documents
  useEffect(() => {
    if (lspConnected) {
      for (const tab of tabs) {
        if (tab.filePath) {
          lspDocumentOpened(tab.filePath, tab.content)
        }
      }
    }
  }, [lspConnected])

  // Auto-set workspace root when opening a .ترقيم file (enables LSP auto-connect)
  useEffect(() => {
    const activeTab = tabs.find(t => t.id === activeTabId)
    if (activeTab?.filePath && activeTab.filePath.endsWith('.ترقيم')) {
      const parentDir = activeTab.filePath.substring(0, activeTab.filePath.lastIndexOf('/'))
      if (parentDir && !workspaceRoot) {
        // Set workspace root to parent directory of the opened file
        const folderName = parentDir.substring(parentDir.lastIndexOf('/') + 1)
        setRoot(parentDir, folderName)
      }
    }
  }, [tabs, activeTabId, workspaceRoot, setRoot])

  const [output, setOutput] = useState('')
  const [outputType, setOutputType] = useState<'success' | 'error' | 'normal'>('normal')
  const [showOutput, setShowOutput] = useState(false)
  const [isCompiling, setIsCompiling] = useState(false)

  // Find/Replace panel state
  const [showFind, setShowFind] = useState(false)
  const [showReplace, setShowReplace] = useState(false)
  const [showGoToLine, setShowGoToLine] = useState(false)
  const [showQuickOpen, setShowQuickOpen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [editorView, setEditorView] = useState<EditorView | null>(null)

  // Update editor view reference when editor changes
  useEffect(() => {
    // Small delay to ensure Editor has mounted and view is ready
    const timer = setTimeout(() => {
      if (editorRef.current) {
        setEditorView(editorRef.current.getView())
      } else {
        setEditorView(null)
      }
    }, 50)
    return () => clearTimeout(timer)
  }, [activeTabId])

  // Also update view when find panel opens (ensures view is current)
  useEffect(() => {
    if (showFind && editorRef.current) {
      setEditorView(editorRef.current.getView())
    }
  }, [showFind])

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    visible: boolean
    tabId: string
    fileName: string
  }>({ visible: false, tabId: '', fileName: '' })

  // Project init dialog state
  const [projectInitDialog, setProjectInitDialog] = useState<{
    visible: boolean
    folderPath: string
    folderName: string
  }>({ visible: false, folderPath: '', folderName: '' })

  const activeTab = getActiveTab()

  // Get diagnostics for active file
  const diagnostics = useDiagnosticsForFile(activeTab?.filePath || null)

  // Get all diagnostics across all files
  const allDiagnostics = useAllDiagnostics()

  // Count errors and warnings (LSP severity: 1=Error, 2=Warning)
  const errorCount = diagnostics.filter(d => d.severity === 1).length
  const warningCount = diagnostics.filter(d => d.severity === 2).length

  // Problems panel state
  const [showProblems, setShowProblems] = useState(false)

  // AST Viewer panel state
  const [showAstViewer, setShowAstViewer] = useState(false)

  // Type Inspector panel state
  const [showTypeInspector, setShowTypeInspector] = useState(false)

  // Handle content change for active tab
  const handleContentChange = useCallback((newContent: string) => {
    if (activeTabId) {
      updateTabContent(activeTabId, newContent)

      // Notify LSP of document change
      const tab = tabs.find(t => t.id === activeTabId)
      if (tab?.filePath && lspConnected) {
        lspDocumentChanged(tab.filePath, newContent)
      }
    }
  }, [activeTabId, updateTabContent, tabs, lspConnected, lspDocumentChanged])

  // Handle cursor change for active tab
  const handleCursorChange = useCallback((pos: { line: number; col: number }) => {
    if (activeTabId) {
      updateTabCursor(activeTabId, pos.line, pos.col)
    }
  }, [activeTabId, updateTabCursor])

  // File operations
  const handleNew = useCallback(() => {
    createTab()
  }, [createTab])

  const handleOpen = useCallback(async () => {
    const result = await window.qalam.file.open()
    if (result && 'content' in result) {
      // Add to recent files
      const fileName = result.path.split('/').pop() || result.path
      addRecentFile(result.path, fileName)

      // Check if file is already open
      const existingTab = tabs.find(t => t.filePath === result.path)
      if (existingTab) {
        setActiveTab(existingTab.id)
      } else {
        createTab(result.path, result.content)

        // Notify LSP of document opened
        if (lspConnected) {
          lspDocumentOpened(result.path, result.content)
        }
      }
    }
  }, [tabs, createTab, setActiveTab, addRecentFile, lspConnected, lspDocumentOpened])

  // Open a file from path (for recent files)
  const handleOpenPath = useCallback(async (filePath: string) => {
    // Check if file is already open
    const existingTab = tabs.find(t => t.filePath === filePath)
    if (existingTab) {
      setActiveTab(existingTab.id)
      return
    }

    // Read and open the file
    const result = await window.qalam.file.read(filePath)
    if (result && result.content !== undefined) {
      const fileName = filePath.split('/').pop() || filePath
      addRecentFile(filePath, fileName)
      createTab(filePath, result.content)

      // Notify LSP of document opened
      if (lspConnected) {
        lspDocumentOpened(filePath, result.content)
      }
    }
  }, [tabs, createTab, setActiveTab, addRecentFile, lspConnected, lspDocumentOpened])

  const handleSave = useCallback(async () => {
    if (!activeTab) return

    if (!activeTab.filePath) {
      return handleSaveAs()
    }

    let contentToSave = activeTab.content

    // Format on save if enabled and LSP is connected
    if (formatOnSave && lspConnected && activeTab.filePath) {
      const formatted = await formatDocument(
        activeTab.content,
        activeTab.filePath,
        tabSize,
        insertSpaces,
        requestFormatting
      )

      if (formatted !== null) {
        contentToSave = formatted
        // Update the tab content with formatted version
        updateTabContent(activeTab.id, formatted)
        // Notify LSP of the change
        lspDocumentChanged(activeTab.filePath, formatted)
      }
    }

    const result = await window.qalam.file.save(activeTab.filePath, contentToSave)
    if (result.success) {
      markTabSaved(activeTab.id)
    }
  }, [activeTab, markTabSaved, formatOnSave, lspConnected, tabSize, insertSpaces, requestFormatting, updateTabContent, lspDocumentChanged])

  const handleSaveAs = useCallback(async () => {
    if (!activeTab) return

    const result = await window.qalam.file.saveAs(activeTab.content)
    if (result && result.path) {
      markTabSaved(activeTab.id, result.path)
    }
  }, [activeTab, markTabSaved])

  // Handle manual format (Shift+Alt+F)
  const handleFormat = useCallback(async () => {
    if (!activeTab || !activeTab.filePath || !lspConnected) return

    const formatted = await formatDocument(
      activeTab.content,
      activeTab.filePath,
      tabSize,
      insertSpaces,
      requestFormatting
    )

    if (formatted !== null) {
      updateTabContent(activeTab.id, formatted)
      lspDocumentChanged(activeTab.filePath, formatted)
    }
  }, [activeTab, lspConnected, tabSize, insertSpaces, requestFormatting, updateTabContent, lspDocumentChanged])

  // Handle tab close with unsaved changes check
  const handleCloseTab = useCallback((tabId: string, isDirty: boolean) => {
    if (isDirty) {
      const tab = tabs.find(t => t.id === tabId)
      setConfirmDialog({
        visible: true,
        tabId,
        fileName: tab?.fileName || 'ملف جديد'
      })
    } else {
      // Notify LSP of document closed before closing tab
      const tab = tabs.find(t => t.id === tabId)
      if (tab?.filePath && lspConnected) {
        lspDocumentClosed(tab.filePath)
      }
      closeTab(tabId)
    }
  }, [tabs, closeTab, lspConnected, lspDocumentClosed])

  const handleConfirmSave = useCallback(async () => {
    const tab = tabs.find(t => t.id === confirmDialog.tabId)
    if (!tab) return

    // Save the tab
    if (tab.filePath) {
      const result = await window.qalam.file.save(tab.filePath, tab.content)
      if (result.success) {
        markTabSaved(tab.id)
        // Notify LSP of document closed
        if (lspConnected) {
          lspDocumentClosed(tab.filePath)
        }
        closeTab(tab.id)
      }
    } else {
      const result = await window.qalam.file.saveAs(tab.content)
      if (result && result.path) {
        markTabSaved(tab.id, result.path)
        // Notify LSP of document closed (new file path)
        if (lspConnected) {
          lspDocumentClosed(result.path)
        }
        closeTab(tab.id)
      }
    }
    setConfirmDialog({ visible: false, tabId: '', fileName: '' })
  }, [confirmDialog.tabId, tabs, markTabSaved, closeTab, lspConnected, lspDocumentClosed])

  const handleConfirmDiscard = useCallback(() => {
    // Force close without saving
    const state = useTabStore.getState()
    const tab = state.tabs.find(t => t.id === confirmDialog.tabId)
    const tabIndex = state.tabs.findIndex(t => t.id === confirmDialog.tabId)
    const newTabs = state.tabs.filter(t => t.id !== confirmDialog.tabId)

    // Notify LSP of document closed
    if (tab?.filePath && lspConnected) {
      lspDocumentClosed(tab.filePath)
    }

    let newActiveId = state.activeTabId
    if (state.activeTabId === confirmDialog.tabId) {
      if (newTabs.length > 0) {
        const newIndex = Math.min(tabIndex, newTabs.length - 1)
        newActiveId = newTabs[newIndex]?.id || null
      } else {
        newActiveId = null
      }
    }

    useTabStore.setState({ tabs: newTabs, activeTabId: newActiveId })
    setConfirmDialog({ visible: false, tabId: '', fileName: '' })
  }, [confirmDialog.tabId, lspConnected, lspDocumentClosed])

  const handleConfirmCancel = useCallback(() => {
    setConfirmDialog({ visible: false, tabId: '', fileName: '' })
  }, [])

  // Compiler operations
  const handleCompile = useCallback(async () => {
    if (!activeTab) return

    if (!activeTab.filePath) {
      setOutput('يرجى حفظ الملف أولاً قبل الترجمة\nPlease save the file first before compiling')
      setOutputType('error')
      setShowOutput(true)
      return
    }

    // Save before compiling
    if (activeTab.isDirty) {
      await handleSave()
    }

    setIsCompiling(true)
    setOutput('')
    setShowOutput(true)
    setOutputType('normal')

    const result = await window.qalam.compiler.compile(activeTab.filePath)

    setIsCompiling(false)
    if (result.success) {
      setOutput(result.output || 'تمت الترجمة بنجاح!\nCompilation successful!')
      setOutputType('success')
    } else {
      setOutput(result.errors || result.output || 'فشلت الترجمة\nCompilation failed')
      setOutputType('error')
    }
  }, [activeTab, handleSave])

  const handleRun = useCallback(async () => {
    if (!activeTab) return

    if (!activeTab.filePath) {
      setOutput('يرجى حفظ الملف أولاً قبل التشغيل\nPlease save the file first before running')
      setOutputType('error')
      setShowOutput(true)
      return
    }

    // Save before running
    if (activeTab.isDirty) {
      await handleSave()
    }

    setIsCompiling(true)
    setOutput('')
    setShowOutput(true)
    setOutputType('normal')

    const result = await window.qalam.compiler.run(activeTab.filePath)

    setIsCompiling(false)
    if (result.success) {
      setOutput(result.output || 'تم التشغيل بنجاح!\nRun successful!')
      setOutputType('success')
    } else {
      setOutput(result.errors || result.output || 'فشل التشغيل\nRun failed')
      setOutputType('error')
    }
  }, [activeTab, handleSave])

  // Find/Replace handlers
  const handleOpenFind = useCallback(() => {
    if (activeTab) {
      setShowFind(true)
      setShowReplace(false)
    }
  }, [activeTab])

  const handleOpenReplace = useCallback(() => {
    if (activeTab) {
      setShowFind(true)
      setShowReplace(true)
    }
  }, [activeTab])

  const handleCloseFind = useCallback(() => {
    setShowFind(false)
    setShowReplace(false)
  }, [])

  const handleToggleReplace = useCallback(() => {
    setShowReplace(prev => !prev)
  }, [])

  // Navigate to a specific location (from Problems Panel)
  const handleNavigateToLocation = useCallback(async (filePath: string, line: number, character: number) => {
    // Check if file is already open
    const existingTab = tabs.find(t => t.filePath === filePath)

    if (existingTab) {
      // Switch to the tab
      setActiveTab(existingTab.id)
    } else {
      // Open the file first
      await handleOpenPath(filePath)
    }

    // Wait a bit for the editor to mount/switch, then navigate
    setTimeout(() => {
      const view = editorRef.current?.getView()
      if (view) {
        try {
          const lineInfo = view.state.doc.line(line)
          const pos = lineInfo.from + Math.min(character, lineInfo.length)
          view.dispatch({
            selection: EditorSelection.cursor(pos),
            scrollIntoView: true
          })
          view.focus()
        } catch (e) {
          // Line out of bounds, ignore
        }
      }
    }, 100)

    // Close problems panel after navigation
    setShowProblems(false)
  }, [tabs, setActiveTab, handleOpenPath])

  // Toggle problems panel
  const handleToggleProblems = useCallback(() => {
    setShowProblems(prev => !prev)
  }, [])

  // Handle AST node click - highlight the corresponding source range
  const handleHighlightRange = useCallback((start: number, end: number) => {
    const view = editorRef.current?.getView()
    if (view) {
      try {
        // Clamp positions to document bounds
        const docLength = view.state.doc.length
        const safeStart = Math.max(0, Math.min(start, docLength))
        const safeEnd = Math.max(safeStart, Math.min(end, docLength))

        view.dispatch({
          selection: EditorSelection.range(safeStart, safeEnd),
          scrollIntoView: true
        })
        view.focus()
      } catch (e) {
        console.error('Failed to highlight range:', e)
      }
    }
  }, [])

  // Open folder with project detection
  const handleOpenFolder = useCallback(async () => {
    const result = await window.qalam.folder.open()
    if (!result) return

    const { path, name } = result

    // Check if folder has a project file
    const hasProject = await checkForProjectFile(path)

    if (hasProject) {
      // Load existing project
      await loadProject(path)
      addRecentProject(path, name, true)
      // Set root in file explorer
      setRoot(path, name)
    } else {
      // Show dialog to initialize project
      setProjectInitDialog({
        visible: true,
        folderPath: path,
        folderName: name
      })
    }
  }, [checkForProjectFile, loadProject, addRecentProject, setRoot])

  // Initialize project from dialog
  const handleInitializeProject = useCallback(async (projectName: string) => {
    const { folderPath } = projectInitDialog

    await initializeProject(folderPath, projectName)
    addRecentProject(folderPath, projectName, true)

    // Set root in file explorer
    setRoot(folderPath, projectName)

    setProjectInitDialog({ visible: false, folderPath: '', folderName: '' })
  }, [projectInitDialog, initializeProject, addRecentProject, setRoot])

  // Skip project init and open as folder only
  const handleSkipProjectInit = useCallback(() => {
    const { folderPath, folderName } = projectInitDialog

    // Open as folder without project
    addRecentProject(folderPath, folderName, false)
    setRoot(folderPath, folderName)
    closeProject()

    setProjectInitDialog({ visible: false, folderPath: '', folderName: '' })
  }, [projectInitDialog, addRecentProject, setRoot, closeProject])

  // Cancel project init dialog
  const handleCancelProjectInit = useCallback(() => {
    setProjectInitDialog({ visible: false, folderPath: '', folderName: '' })
  }, [])

  // Open project from recent projects list
  const handleOpenProject = useCallback(async (projectPath: string) => {
    const hasProject = await checkForProjectFile(projectPath)

    if (hasProject) {
      await loadProject(projectPath)
    } else {
      closeProject()
    }

    const name = projectPath.split('/').pop() || projectPath
    setRoot(projectPath, name)

    // Update timestamp in recent projects
    addRecentProject(projectPath, name, hasProject)
  }, [checkForProjectFile, loadProject, closeProject, setRoot, addRecentProject])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Tab or Cmd+Tab - next tab
      if ((e.ctrlKey || e.metaKey) && e.key === 'Tab' && !e.shiftKey) {
        e.preventDefault()
        nextTab()
      }
      // Ctrl+Shift+Tab or Cmd+Shift+Tab - previous tab
      if ((e.ctrlKey || e.metaKey) && e.key === 'Tab' && e.shiftKey) {
        e.preventDefault()
        prevTab()
      }
      // Ctrl+W or Cmd+W - close tab
      if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
        e.preventDefault()
        if (activeTab) {
          handleCloseTab(activeTab.id, activeTab.isDirty)
        }
      }
      // Ctrl+N or Cmd+N - new tab
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault()
        handleNew()
      }
      // Ctrl+F or Cmd+F - find
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault()
        handleOpenFind()
      }
      // Ctrl+H or Cmd+H - replace
      if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
        e.preventDefault()
        handleOpenReplace()
      }
      // Ctrl+G or Cmd+G - go to line
      if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
        e.preventDefault()
        if (activeTab) {
          setShowGoToLine(true)
        }
      }
      // Ctrl+Shift+O or Cmd+Shift+O - go to symbol
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'O' || e.key === 'o' || e.code === 'KeyO')) {
        e.preventDefault()
        if (activeTab) {
          setShowQuickOpen(true)
        }
      }
      // Ctrl+, or Cmd+, - settings
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault()
        setShowSettings(true)
      }
      // Ctrl+Shift+M or Cmd+Shift+M - toggle problems panel
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'M' || e.key === 'm')) {
        e.preventDefault()
        setShowProblems(prev => !prev)
      }
      // Ctrl+Shift+A or Cmd+Shift+A - toggle AST viewer
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault()
        if (activeTab) {
          setShowAstViewer(prev => !prev)
        }
      }
      // Ctrl+Shift+T or Cmd+Shift+T - toggle Type Inspector
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'T' || e.key === 't')) {
        e.preventDefault()
        if (activeTab) {
          setShowTypeInspector(prev => !prev)
        }
      }
      // Shift+Alt+F - format document
      if (e.shiftKey && e.altKey && (e.key === 'F' || e.key === 'f')) {
        e.preventDefault()
        handleFormat()
      }
      // Escape - close panels
      if (e.key === 'Escape') {
        if (showSettings) {
          setShowSettings(false)
        } else if (showQuickOpen) {
          setShowQuickOpen(false)
        } else if (showGoToLine) {
          setShowGoToLine(false)
        } else if (showFind) {
          handleCloseFind()
        } else if (showProblems) {
          setShowProblems(false)
        } else if (showAstViewer) {
          setShowAstViewer(false)
        } else if (showTypeInspector) {
          setShowTypeInspector(false)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [nextTab, prevTab, activeTab, handleCloseTab, handleNew, handleOpenFind, handleOpenReplace, handleCloseFind, handleFormat, showFind, showGoToLine, showQuickOpen, showSettings, showProblems, showAstViewer, showTypeInspector])

  // Menu event handlers
  useEffect(() => {
    const removeOpen = window.qalam.menu.onOpen(handleOpen)
    const removeSave = window.qalam.menu.onSave(handleSave)
    const removeSaveAs = window.qalam.menu.onSaveAs(handleSaveAs)
    const removeCompile = window.qalam.menu.onCompile(handleCompile)
    const removeRun = window.qalam.menu.onRun(handleRun)

    // Compiler output streaming
    window.qalam.compiler.onStdout((text) => {
      setOutput(prev => prev + text)
    })
    window.qalam.compiler.onStderr((text) => {
      setOutput(prev => prev + text)
    })

    return () => {
      removeOpen()
      removeSave()
      removeSaveAs()
      removeCompile()
      removeRun()
      window.qalam.compiler.removeListeners()
    }
  }, [handleOpen, handleSave, handleSaveAs, handleCompile, handleRun])

  // Update window title
  useEffect(() => {
    if (activeTab) {
      const dirtyMark = activeTab.isDirty ? '• ' : ''
      document.title = `${dirtyMark}${activeTab.fileName} - Qalam`
    } else {
      document.title = 'Qalam - قلم'
    }
  }, [activeTab])

  return (
    <div className="app">
      <Toolbar
        onNew={handleNew}
        onOpen={handleOpen}
        onSave={handleSave}
        onSaveAs={handleSaveAs}
        onCompile={handleCompile}
        onRun={handleRun}
        canCompile={!!activeTab && (!!activeTab.filePath || activeTab.content.length > 0)}
        isCompiling={isCompiling}
      />

      <div className="app-body">
        <FileExplorer onOpenFile={handleOpenPath} />

        <div className="main-area">
          <TabBar onCloseTab={handleCloseTab} />

          <div className="main-content">
            {activeTab ? (
              <>
                <FindReplace
                  view={editorView}
                  visible={showFind}
                  showReplace={showReplace}
                  onClose={handleCloseFind}
                  onToggleReplace={handleToggleReplace}
                />
                <Editor
                  ref={editorRef}
                  key={activeTab.id}
                  content={activeTab.content}
                  onChange={handleContentChange}
                  onCursorChange={handleCursorChange}
                  diagnostics={diagnostics}
                  filePath={activeTab.filePath}
                  onGotoDefinition={handleNavigateToLocation}
                />
              </>
            ) : (
              <WelcomeScreen
                onNew={handleNew}
                onOpen={handleOpen}
                onOpenPath={handleOpenPath}
                onOpenFolder={handleOpenFolder}
                onOpenProject={handleOpenProject}
              />
            )}

            <OutputPanel
              output={output}
              type={outputType}
              visible={showOutput}
              onClose={() => setShowOutput(false)}
            />

            <ProblemsPanel
              visible={showProblems}
              onClose={() => setShowProblems(false)}
              onNavigate={handleNavigateToLocation}
              allDiagnostics={allDiagnostics}
            />

            <AstViewerPanel
              visible={showAstViewer}
              onClose={() => setShowAstViewer(false)}
              filePath={activeTab?.filePath || null}
              content={activeTab?.content || ''}
              onHighlightRange={handleHighlightRange}
            />

            <TypeInspectorPanel
              visible={showTypeInspector}
              onClose={() => setShowTypeInspector(false)}
              filePath={activeTab?.filePath || null}
              cursorLine={activeTab?.cursorPosition.line || 1}
              cursorCol={activeTab?.cursorPosition.col || 1}
            />
          </div>
        </div>
      </div>

      <StatusBar
        line={activeTab?.cursorPosition.line || 1}
        column={activeTab?.cursorPosition.col || 1}
        filePath={activeTab?.filePath || null}
        isDirty={activeTab?.isDirty || false}
        errorCount={errorCount}
        warningCount={warningCount}
        onToggleProblems={handleToggleProblems}
      />

      <ConfirmDialog
        visible={confirmDialog.visible}
        fileName={confirmDialog.fileName}
        onSave={handleConfirmSave}
        onDiscard={handleConfirmDiscard}
        onCancel={handleConfirmCancel}
      />

      <GoToLineDialog
        view={editorView}
        visible={showGoToLine}
        onClose={() => setShowGoToLine(false)}
        totalLines={editorView?.state.doc.lines || 1}
      />

      <QuickOpen
        view={editorView}
        visible={showQuickOpen}
        onClose={() => setShowQuickOpen(false)}
        content={activeTab?.content || ''}
      />

      <SettingsPanel
        visible={showSettings}
        onClose={() => setShowSettings(false)}
      />

      <ProjectInitDialog
        visible={projectInitDialog.visible}
        folderName={projectInitDialog.folderName}
        folderPath={projectInitDialog.folderPath}
        onInitialize={handleInitializeProject}
        onSkip={handleSkipProjectInit}
        onCancel={handleCancelProjectInit}
      />
    </div>
  )
}
