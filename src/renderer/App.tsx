import React, { useState, useCallback, useEffect, useRef } from 'react'
import Editor, { EditorHandle } from './components/Editor'
import Toolbar from './components/Toolbar'
import DebugToolbar from './components/DebugToolbar'
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
import Sidebar from './components/Sidebar'
import ProjectInitDialog from './components/ProjectInitDialog'
import DebugSidebar from './components/DebugSidebar'
import { ConsoleOutput } from './components/debug/DebugConsolePanel'
import { useTabStore } from './stores/useTabStore'
import { useEditorSettings } from './stores/useEditorSettings'
import { useRecentFiles } from './stores/useRecentFiles'
import { useRecentProjects } from './stores/useRecentProjects'
import { useProjectStore } from './stores/useProjectStore'
import { useLSPStore, useDiagnosticsForFile, useAllDiagnostics } from './stores/useLSPStore'
import { useFileExplorer } from './stores/useFileExplorer'
import { useDebugStore } from './stores/useDebugStore'
import { useUIStateStore } from './stores/useUIStateStore'
import { BreakpointInfo } from './codemirror/breakpoint-gutter'
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

  // Debug store
  const {
    debugState,
    breakpoints: allBreakpoints,
    pauseLocation,
    callStack,
    currentFrameId,
    localVariables,
    watchExpressions,
    watchResults,
    debugOutput,
    addBreakpoint,
    removeBreakpoint,
    setBreakpointVerified,
    setDebugState,
    setPauseLocation,
    setCallStack,
    setCurrentFrame,
    setLocalVariables,
    addWatchExpression,
    removeWatchExpression,
    setWatchResult,
    addDebugOutput,
    clearDebugOutput,
    resetDebugSession
  } = useDebugStore()

  // UI state store for panels
  const {
    setSidebarActiveTab
  } = useUIStateStore()

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

  // Debug sidebar state - auto-show when debugging starts
  const [showDebugSidebar, setShowDebugSidebar] = useState(false)

  // Auto-show debug sidebar when debugging starts
  useEffect(() => {
    if (debugState === 'starting' || debugState === 'running' || debugState === 'paused') {
      setShowDebugSidebar(true)
    }
  }, [debugState])

  // Get breakpoints for active file
  const activeFileBreakpoints: BreakpointInfo[] = activeTab?.filePath
    ? (allBreakpoints[activeTab.filePath] || []).map(bp => ({
        line: bp.line,
        enabled: bp.enabled,
        verified: bp.verified,
        condition: bp.condition,
        hitCondition: bp.hitCondition,
        logMessage: bp.logMessage
      }))
    : []

  // Execution line (current paused line)
  const executionLine = pauseLocation && pauseLocation.filePath === activeTab?.filePath
    ? pauseLocation.line
    : null

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

  // Debug handlers
  const handleStartDebug = useCallback(async () => {
    if (!activeTab?.filePath) {
      setOutput('يرجى حفظ الملف أولاً قبل التصحيح\nPlease save the file first before debugging')
      setOutputType('error')
      setShowOutput(true)
      return
    }

    // Save before debugging
    if (activeTab.isDirty) {
      await handleSave()
    }

    try {
      setDebugState('starting')
      setShowOutput(true)
      setOutput('جارٍ بدء جلسة التصحيح...\nStarting debug session...\n')
      setOutputType('normal')

      // Start DAP session
      const result = await window.qalam.dap.start(activeTab.filePath)

      // Set breakpoints for the file
      const fileBreakpoints = allBreakpoints[activeTab.filePath] || []
      if (fileBreakpoints.length > 0) {
        const bpResult = await window.qalam.dap.setBreakpoints(
          activeTab.filePath,
          fileBreakpoints.map(bp => ({
            line: bp.line,
            condition: bp.condition,
            hitCondition: bp.hitCondition,
            logMessage: bp.logMessage
          }))
        )

        // Update verified status
        const verifiedBreakpoints = bpResult.breakpoints || []
        for (const bp of verifiedBreakpoints) {
          if (bp.verified && bp.line !== undefined) {
            setBreakpointVerified(activeTab.filePath, bp.line, true)
          }
        }
      }

      // Launch the program
      await window.qalam.dap.launch()
      setDebugState('running')
      setOutput(prev => prev + 'تم بدء البرنامج\nProgram started\n')
    } catch (error) {
      setDebugState('idle')
      setOutput(`فشل بدء التصحيح: ${error}\nFailed to start debugging: ${error}`)
      setOutputType('error')
    }
  }, [activeTab, handleSave, allBreakpoints, setDebugState, setBreakpointVerified])

  const handleStopDebug = useCallback(async () => {
    try {
      await window.qalam.dap.stop()
      resetDebugSession()
      setOutput(prev => prev + '\nتم إيقاف جلسة التصحيح\nDebug session stopped\n')
    } catch (error) {
      console.error('Failed to stop debug session:', error)
    }
  }, [resetDebugSession])

  const handleContinue = useCallback(async () => {
    try {
      setDebugState('running')
      await window.qalam.dap.continue()
    } catch (error) {
      console.error('Continue failed:', error)
    }
  }, [setDebugState])

  const handlePause = useCallback(async () => {
    try {
      await window.qalam.dap.pause()
    } catch (error) {
      console.error('Pause failed:', error)
    }
  }, [])

  const handleStepOver = useCallback(async () => {
    try {
      setDebugState('running')
      await window.qalam.dap.stepOver()
    } catch (error) {
      console.error('Step over failed:', error)
    }
  }, [setDebugState])

  const handleStepInto = useCallback(async () => {
    try {
      setDebugState('running')
      await window.qalam.dap.stepInto()
    } catch (error) {
      console.error('Step into failed:', error)
    }
  }, [setDebugState])

  const handleStepOut = useCallback(async () => {
    try {
      setDebugState('running')
      await window.qalam.dap.stepOut()
    } catch (error) {
      console.error('Step out failed:', error)
    }
  }, [setDebugState])

  const handleRestartDebug = useCallback(async () => {
    try {
      setDebugState('starting')
      await window.qalam.dap.restart()
      setDebugState('running')
    } catch (error) {
      console.error('Restart failed:', error)
      // If restart fails, try stopping and starting again
      await handleStopDebug()
      await handleStartDebug()
    }
  }, [setDebugState, handleStopDebug, handleStartDebug])

  // Debug sidebar handlers
  const handleExpandVariable = useCallback(async (variablesReference: number) => {
    try {
      const result = await window.qalam.dap.variables(variablesReference)
      if (!result.success || !result.variables) {
        console.error('Failed to expand variable:', result.error)
        return []
      }
      return result.variables.map((v: { name: string; value: string; type?: string; variablesReference: number }) => ({
        name: v.name,
        value: v.value,
        type: v.type || '',
        variablesReference: v.variablesReference
      }))
    } catch (err) {
      console.error('Failed to expand variable:', err)
      return []
    }
  }, [])

  const handleFrameSelect = useCallback(async (frameId: number) => {
    setCurrentFrame(frameId)
    // Load variables for the selected frame
    try {
      const scopesResult = await window.qalam.dap.scopes(frameId)
      if (scopesResult.success && scopesResult.scopes && scopesResult.scopes.length > 0) {
        const variablesResult = await window.qalam.dap.variables(scopesResult.scopes[0].variablesReference)
        if (variablesResult.success && variablesResult.variables) {
          setLocalVariables(variablesResult.variables.map((v: { name: string; value: string; type?: string; variablesReference: number }) => ({
            name: v.name,
            value: v.value,
            type: v.type || '',
            variablesReference: v.variablesReference
          })))
        }
      }
    } catch (err) {
      console.error('Failed to load frame variables:', err)
    }
  }, [setCurrentFrame, setLocalVariables])

  const handleDebugNavigate = useCallback((filePath: string, line: number) => {
    handleOpenPath(filePath)
    // Navigate to line after file opens
    setTimeout(() => {
      const view = editorRef.current?.getView()
      if (view) {
        try {
          const lineInfo = view.state.doc.line(line)
          view.dispatch({
            selection: EditorSelection.cursor(lineInfo.from),
            scrollIntoView: true
          })
          view.focus()
        } catch (e) {
          // Line out of bounds, ignore
        }
      }
    }, 100)
  }, [handleOpenPath])

  const handleEvaluateWatch = useCallback(async (expression: string) => {
    if (debugState !== 'paused') return
    try {
      const response = await window.qalam.dap.evaluate(expression, currentFrameId || undefined)
      if (response.success && response.result) {
        setWatchResult(expression, response.result.result)
      } else {
        setWatchResult(expression, '', response.error || 'Unknown error')
      }
    } catch (err) {
      setWatchResult(expression, '', String(err))
    }
  }, [debugState, currentFrameId, setWatchResult])

  const handleEvaluateConsole = useCallback(async (expression: string): Promise<string> => {
    if (debugState !== 'paused') return 'التقييم متاح فقط عند التوقف'
    addDebugOutput('input', expression)
    try {
      const response = await window.qalam.dap.evaluate(expression, currentFrameId || undefined)
      if (response.success && response.result) {
        const resultStr = response.result.result
        addDebugOutput('result', resultStr)
        return resultStr
      } else {
        const errorMsg = response.error || 'Unknown error'
        addDebugOutput('stderr', errorMsg)
        return errorMsg
      }
    } catch (err) {
      const errorMsg = String(err)
      addDebugOutput('stderr', errorMsg)
      return errorMsg
    }
  }, [debugState, currentFrameId, addDebugOutput])

  // Convert debugOutput to ConsoleOutput format
  const consoleOutput: ConsoleOutput[] = debugOutput.map(o => ({
    type: o.type,
    text: o.text,
    timestamp: o.timestamp
  }))

  // Handle breakpoint change from editor gutter click
  const handleBreakpointChange = useCallback((line: number, action: 'add' | 'remove') => {
    if (!activeTab?.filePath) return

    if (action === 'add') {
      addBreakpoint(activeTab.filePath, line)
    } else {
      removeBreakpoint(activeTab.filePath, line)
    }

    // If debugging, update breakpoints in DAP
    if (debugState !== 'idle') {
      const fileBreakpoints = action === 'add'
        ? [...(allBreakpoints[activeTab.filePath] || []), { line, enabled: true, verified: false, id: `${activeTab.filePath}:${line}`, filePath: activeTab.filePath }]
        : (allBreakpoints[activeTab.filePath] || []).filter(bp => bp.line !== line)

      window.qalam.dap.setBreakpoints(
        activeTab.filePath,
        fileBreakpoints.map(bp => ({ line: bp.line, condition: bp.condition }))
      ).catch(console.error)
    }
  }, [activeTab, debugState, allBreakpoints, addBreakpoint, removeBreakpoint])

  // Handle breakpoint context menu (for conditional breakpoints)
  const handleBreakpointContextMenu = useCallback((line: number, event: MouseEvent) => {
    // TODO: Show context menu for editing breakpoint condition
    console.log('Breakpoint context menu at line', line, event)
  }, [])

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
      // Ctrl+Shift+F or Cmd+Shift+F - Find in Files (switch to search tab)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'F' || e.key === 'f')) {
        e.preventDefault()
        setSidebarActiveTab('search')
      }
      // Shift+Alt+F - format document
      if (e.shiftKey && e.altKey && (e.key === 'F' || e.key === 'f')) {
        e.preventDefault()
        handleFormat()
      }
      // F5 - Start/Continue debugging
      if (e.key === 'F5' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        if (debugState === 'idle') {
          handleStartDebug()
        } else if (debugState === 'paused') {
          handleContinue()
        }
      }
      // Shift+F5 - Stop debugging
      if (e.key === 'F5' && e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        if (debugState !== 'idle') {
          handleStopDebug()
        }
      }
      // Ctrl+Shift+F5 - Restart debugging
      if (e.key === 'F5' && (e.ctrlKey || e.metaKey) && e.shiftKey) {
        e.preventDefault()
        if (debugState !== 'idle') {
          handleRestartDebug()
        }
      }
      // F6 - Pause debugging
      if (e.key === 'F6' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        if (debugState === 'running') {
          handlePause()
        }
      }
      // F10 - Step Over
      if (e.key === 'F10' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        if (debugState === 'paused') {
          handleStepOver()
        }
      }
      // F11 - Step Into
      if (e.key === 'F11' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        if (debugState === 'paused') {
          handleStepInto()
        }
      }
      // Shift+F11 - Step Out
      if (e.key === 'F11' && e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        if (debugState === 'paused') {
          handleStepOut()
        }
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
  }, [nextTab, prevTab, activeTab, handleCloseTab, handleNew, handleOpenFind, handleOpenReplace, handleCloseFind, handleFormat, showFind, showGoToLine, showQuickOpen, showSettings, showProblems, showAstViewer, showTypeInspector, debugState, handleStartDebug, handleStopDebug, handleContinue, handlePause, handleStepOver, handleStepInto, handleStepOut, handleRestartDebug])

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

  // DAP event handlers
  useEffect(() => {
    // Listen for debug stopped events (breakpoint hit, step completed, etc.)
    const removeStoppedListener = window.qalam.dap.onStopped(async (event) => {
      setDebugState('paused')

      // Get stack trace to find current location
      try {
        const stackTrace = await window.qalam.dap.stackTrace(event.threadId)
        const frames = stackTrace.stackFrames || []

        if (frames.length > 0) {
          const topFrame = frames[0]
          setPauseLocation({
            filePath: topFrame.source?.path || '',
            line: topFrame.line,
            column: topFrame.column
          })
          setCallStack(frames.map(f => ({
            id: f.id,
            name: f.name,
            filePath: f.source?.path || '',
            line: f.line,
            column: f.column
          })))

          // Navigate to the paused location
          if (topFrame.source?.path) {
            handleNavigateToLocation(topFrame.source.path, topFrame.line, topFrame.column || 0)
          }

          // Get variables for the top frame
          const scopes = await window.qalam.dap.scopes(topFrame.id)
          const scopesList = scopes.scopes || []
          if (scopesList.length > 0) {
            const localScope = scopesList.find(s => s.name === 'المحلية' || s.name === 'Locals') || scopesList[0]
            const variables = await window.qalam.dap.variables(localScope.variablesReference)
            const variablesList = variables.variables || []
            setLocalVariables(variablesList.map(v => ({
              name: v.name,
              value: v.value,
              type: v.type || '',
              variablesReference: v.variablesReference
            })))
          }
        }

        // Show pause reason
        const reasonMap: Record<string, string> = {
          'breakpoint': 'نقطة توقف',
          'step': 'خطوة',
          'pause': 'إيقاف مؤقت',
          'entry': 'نقطة البداية',
          'exception': 'استثناء'
        }
        const reason = reasonMap[event.reason] || event.reason
        setOutput(prev => prev + `\n⏸ متوقف: ${reason}\n`)
      } catch (error) {
        console.error('Failed to get debug info:', error)
      }
    })

    // Listen for debug output events
    const removeOutputListener = window.qalam.dap.onOutput((event) => {
      const prefix = event.category === 'stderr' ? '⚠ ' : ''
      setOutput(prev => prev + prefix + event.output)
    })

    // Listen for debug terminated events
    const removeTerminatedListener = window.qalam.dap.onTerminated(() => {
      resetDebugSession()
      setOutput(prev => prev + '\n✓ انتهى تنفيذ البرنامج\nProgram execution completed\n')
    })

    // Listen for debug exited events
    const removeExitedListener = window.qalam.dap.onExited((event) => {
      resetDebugSession()
      setOutput(prev => prev + `\n✓ انتهى البرنامج برمز: ${event.exitCode}\nProgram exited with code: ${event.exitCode}\n`)
    })

    return () => {
      removeStoppedListener()
      removeOutputListener()
      removeTerminatedListener()
      removeExitedListener()
    }
  }, [setDebugState, setPauseLocation, setCallStack, setLocalVariables, resetDebugSession, handleNavigateToLocation])

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

      <DebugToolbar
        onStartDebug={handleStartDebug}
        onStopDebug={handleStopDebug}
        onContinue={handleContinue}
        onPause={handlePause}
        onStepOver={handleStepOver}
        onStepInto={handleStepInto}
        onStepOut={handleStepOut}
        onRestart={handleRestartDebug}
        canDebug={!!activeTab?.filePath}
      />

      <div className="app-body">
        <Sidebar
          onOpenFile={handleOpenPath}
          activeFilePath={activeTab?.filePath || null}
          activeFileContent={activeTab?.content || ''}
          onNavigateToSymbol={handleNavigateToLocation}
          rootPath={workspaceRoot}
        />

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
                  breakpoints={activeFileBreakpoints}
                  executionLine={executionLine}
                  onBreakpointChange={handleBreakpointChange}
                  onBreakpointContextMenu={handleBreakpointContextMenu}
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

        <DebugSidebar
          visible={showDebugSidebar}
          onClose={() => setShowDebugSidebar(false)}
          isPaused={debugState === 'paused'}
          isDebugging={debugState !== 'idle'}
          variables={localVariables}
          onExpandVariable={handleExpandVariable}
          callStack={callStack}
          currentFrameId={currentFrameId}
          onFrameSelect={handleFrameSelect}
          onNavigate={handleDebugNavigate}
          watchExpressions={watchExpressions}
          watchResults={watchResults}
          onAddWatch={addWatchExpression}
          onRemoveWatch={removeWatchExpression}
          onEvaluateWatch={handleEvaluateWatch}
          consoleOutput={consoleOutput}
          onEvaluateConsole={handleEvaluateConsole}
          onClearConsole={clearDebugOutput}
        />
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
