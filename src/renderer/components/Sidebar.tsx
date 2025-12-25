import React, { useState } from 'react'
import { FolderTree, List } from 'lucide-react'
import FileExplorer from './FileExplorer'
import OutlineView from './OutlineView'

type SidebarTab = 'files' | 'outline'

interface SidebarProps {
  onOpenFile: (path: string) => void
  activeFilePath: string | null
  activeFileContent: string
  onNavigateToSymbol: (line: number, character: number) => void
}

export default function Sidebar({
  onOpenFile,
  activeFilePath,
  activeFileContent,
  onNavigateToSymbol
}: SidebarProps) {
  const [activeTab, setActiveTab] = useState<SidebarTab>('files')

  return (
    <div className="sidebar">
      <div className="sidebar-tabs">
        <button
          className={`sidebar-tab ${activeTab === 'files' ? 'active' : ''}`}
          onClick={() => setActiveTab('files')}
          title="الملفات"
        >
          <FolderTree size={18} />
        </button>
        <button
          className={`sidebar-tab ${activeTab === 'outline' ? 'active' : ''}`}
          onClick={() => setActiveTab('outline')}
          title="المخطط"
        >
          <List size={18} />
        </button>
      </div>

      <div className="sidebar-content">
        {activeTab === 'files' ? (
          <FileExplorer onOpenFile={onOpenFile} />
        ) : (
          <OutlineView
            filePath={activeFilePath}
            content={activeFileContent}
            onNavigate={onNavigateToSymbol}
          />
        )}
      </div>
    </div>
  )
}
