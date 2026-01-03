import React, { useCallback, memo, useState, useEffect } from 'react'
import { FolderTree, List, Search, BookOpen, GripVertical } from 'lucide-react'
import FileExplorer from './FileExplorer'
import OutlineView from './OutlineView'
import SearchView from './SearchView'
import DocBrowserPanel from './DocBrowserPanel'
import { useUIStateStore, SidebarTab } from '../stores/useUIStateStore'

interface SidebarProps {
  onOpenFile: (path: string) => void
  activeFilePath: string | null
  activeFileContent: string
  onNavigateToSymbol: (filePath: string, line: number, character: number) => void
  rootPath: string | null
  onOpenManifestEditor?: () => void
}

// Phase 6.1: Memoized Sidebar to prevent unnecessary re-renders
const Sidebar = memo(function Sidebar({
  onOpenFile,
  activeFilePath,
  activeFileContent,
  onNavigateToSymbol,
  rootPath,
  onOpenManifestEditor
}: SidebarProps) {
  const { sidebarActiveTab, setSidebarActiveTab } = useUIStateStore()
  const [sidebarWidth, setSidebarWidth] = useState(250)
  const [isResizing, setIsResizing] = useState(false)

  // Handle horizontal resize
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }, [])

  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: globalThis.MouseEvent) => {
      const newWidth = window.innerWidth - e.clientX
      setSidebarWidth(Math.min(Math.max(newWidth, 200), 600))
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing])

  // Wrap navigation to include the active file path
  const handleOutlineNavigate = useCallback((line: number, character: number) => {
    if (activeFilePath) {
      onNavigateToSymbol(activeFilePath, line, character)
    }
  }, [activeFilePath, onNavigateToSymbol])

  return (
    <div
      className={`sidebar ${isResizing ? 'resizing' : ''}`}
      style={{ width: sidebarWidth }}
    >
      <div
        className="sidebar-resize-handle"
        onMouseDown={handleResizeStart}
      >
        <GripVertical size={16} />
      </div>
      <div className="sidebar-main">
        <div className="sidebar-tabs">
          <button
            className={`sidebar-tab ${sidebarActiveTab === 'files' ? 'active' : ''}`}
            onClick={() => setSidebarActiveTab('files')}
            title="الملفات"
          >
            <FolderTree size={18} />
          </button>
          <button
            className={`sidebar-tab ${sidebarActiveTab === 'outline' ? 'active' : ''}`}
            onClick={() => setSidebarActiveTab('outline')}
            title="المخطط"
          >
            <List size={18} />
          </button>
          <button
            className={`sidebar-tab ${sidebarActiveTab === 'search' ? 'active' : ''}`}
            onClick={() => setSidebarActiveTab('search')}
            title="البحث"
          >
            <Search size={18} />
          </button>
          <button
            className={`sidebar-tab ${sidebarActiveTab === 'docs' ? 'active' : ''}`}
            onClick={() => setSidebarActiveTab('docs')}
            title="التوثيق"
          >
            <BookOpen size={18} />
          </button>
        </div>

        <div className="sidebar-content">
          {sidebarActiveTab === 'files' && (
            <FileExplorer onOpenFile={onOpenFile} onOpenManifestEditor={onOpenManifestEditor} />
          )}
          {sidebarActiveTab === 'outline' && (
            <OutlineView
              filePath={activeFilePath}
              content={activeFileContent}
              onNavigate={handleOutlineNavigate}
            />
          )}
          {sidebarActiveTab === 'search' && (
            <SearchView
              rootPath={rootPath}
              onNavigate={onNavigateToSymbol}
            />
          )}
          {sidebarActiveTab === 'docs' && (
            <DocBrowserPanel />
          )}
        </div>
      </div>
    </div>
  )
})

export default Sidebar
