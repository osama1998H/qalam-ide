import React, { useCallback } from 'react'
import { FolderTree, List, Search, BookOpen } from 'lucide-react'
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
}

export default function Sidebar({
  onOpenFile,
  activeFilePath,
  activeFileContent,
  onNavigateToSymbol,
  rootPath
}: SidebarProps) {
  const { sidebarActiveTab, setSidebarActiveTab } = useUIStateStore()

  // Wrap navigation to include the active file path
  const handleOutlineNavigate = useCallback((line: number, character: number) => {
    if (activeFilePath) {
      onNavigateToSymbol(activeFilePath, line, character)
    }
  }, [activeFilePath, onNavigateToSymbol])

  return (
    <div className="sidebar">
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
          <FileExplorer onOpenFile={onOpenFile} />
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
  )
}
