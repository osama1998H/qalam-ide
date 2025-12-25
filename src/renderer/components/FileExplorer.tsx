import React, { useEffect, useState, useCallback, useMemo } from 'react'
import {
  FolderOpen,
  Folder,
  FileText,
  ChevronDown,
  ChevronLeft,
  Plus,
  FolderPlus,
  RefreshCw,
  X,
  Trash2,
  Edit3,
  ExternalLink,
  Search,
  Package,
  Copy,
  MoreVertical
} from 'lucide-react'
import { useFileExplorer, FileNode, FolderRoot } from '../stores/useFileExplorer'
import { useProjectStore } from '../stores/useProjectStore'
import { useWorkspaceStore } from '../stores/useWorkspaceStore'
import NewFileDialog from './NewFileDialog'

interface FileExplorerProps {
  onOpenFile: (path: string) => void
}

interface FileTreeItemProps {
  node: FileNode
  level: number
  isExpanded: boolean
  onToggle: (path: string) => void
  onOpenFile: (path: string) => void
  onContextMenu: (e: React.MouseEvent, node: FileNode) => void
  loadChildren: (path: string) => void
  onDragStart: (e: React.DragEvent, node: FileNode) => void
  onDragOver: (e: React.DragEvent, node: FileNode) => void
  onDrop: (e: React.DragEvent, node: FileNode) => void
  dragOverPath: string | null
  searchQuery: string
}

function FileTreeItem({
  node,
  level,
  isExpanded,
  onToggle,
  onOpenFile,
  onContextMenu,
  loadChildren,
  onDragStart,
  onDragOver,
  onDrop,
  dragOverPath,
  searchQuery
}: FileTreeItemProps) {
  const isDirectory = node.type === 'directory'
  const isDragOver = dragOverPath === node.path && isDirectory

  const handleClick = () => {
    if (isDirectory) {
      onToggle(node.path)
      if (!isExpanded && (!node.children || node.children.length === 0)) {
        loadChildren(node.path)
      }
    } else {
      onOpenFile(node.path)
    }
  }

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase()
    if (ext === 'ترقيم' || ext === 'trq') {
      return <FileText size={16} className="file-icon tarqeem" />
    }
    return <FileText size={16} className="file-icon" />
  }

  // Highlight matching text
  const highlightMatch = (text: string) => {
    if (!searchQuery) return text
    const index = text.toLowerCase().indexOf(searchQuery.toLowerCase())
    if (index === -1) return text
    return (
      <>
        {text.slice(0, index)}
        <mark className="search-highlight">{text.slice(index, index + searchQuery.length)}</mark>
        {text.slice(index + searchQuery.length)}
      </>
    )
  }

  return (
    <>
      <div
        className={`file-tree-item ${isDirectory ? 'directory' : 'file'} ${isDragOver ? 'drag-over' : ''}`}
        style={{ paddingRight: `${12 + level * 16}px` }}
        onClick={handleClick}
        onContextMenu={(e) => onContextMenu(e, node)}
        draggable
        onDragStart={(e) => onDragStart(e, node)}
        onDragOver={(e) => onDragOver(e, node)}
        onDrop={(e) => onDrop(e, node)}
      >
        {isDirectory && (
          <span className="folder-chevron">
            {isExpanded ? <ChevronDown size={14} /> : <ChevronLeft size={14} />}
          </span>
        )}
        {isDirectory ? (
          isExpanded ? (
            <FolderOpen size={16} className="folder-icon open" />
          ) : (
            <Folder size={16} className="folder-icon" />
          )
        ) : (
          getFileIcon(node.name)
        )}
        <span className="file-tree-name">{highlightMatch(node.name)}</span>
      </div>

      {isDirectory && isExpanded && node.children && (
        <div className="file-tree-children">
          {node.children.map((child) => (
            <FileTreeItem
              key={child.path}
              node={child}
              level={level + 1}
              isExpanded={useFileExplorer.getState().expandedPaths.has(child.path)}
              onToggle={onToggle}
              onOpenFile={onOpenFile}
              onContextMenu={onContextMenu}
              loadChildren={loadChildren}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDrop={onDrop}
              dragOverPath={dragOverPath}
              searchQuery={searchQuery}
            />
          ))}
        </div>
      )}
    </>
  )
}

export default function FileExplorer({ onOpenFile }: FileExplorerProps) {
  const {
    roots,
    expandedPaths,
    setRoot,
    addRoot,
    removeRoot,
    updateRootTree,
    setRootLoading,
    toggleExpanded,
    setExpanded,
    updateChildren,
    closeFolder,
    closeAll,
    setLoading
  } = useFileExplorer()

  const { isWorkspace, folders: workspaceFolders } = useWorkspaceStore()
  const { isProject, config: projectConfig } = useProjectStore()

  // Get first root for backward compatibility
  const rootPath = roots.length > 0 ? roots[0].path : null
  const rootName = roots.length > 0 ? roots[0].name : null

  const [contextMenu, setContextMenu] = useState<{
    visible: boolean
    x: number
    y: number
    node: FileNode | null
  }>({ visible: false, x: 0, y: 0, node: null })

  const [newFileDialog, setNewFileDialog] = useState<{
    visible: boolean
    parentPath: string
  }>({ visible: false, parentPath: '' })

  const [newFolderDialog, setNewFolderDialog] = useState<{
    visible: boolean
    parentPath: string
  }>({ visible: false, parentPath: '' })

  const [renameDialog, setRenameDialog] = useState<{
    visible: boolean
    node: FileNode | null
  }>({ visible: false, node: null })

  const [newItemName, setNewItemName] = useState('')
  const [renameName, setRenameName] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [draggedNode, setDraggedNode] = useState<FileNode | null>(null)
  const [dragOverPath, setDragOverPath] = useState<string | null>(null)

  // Filter tree based on search query
  const filterTree = useCallback((nodes: FileNode[], query: string): FileNode[] => {
    if (!query) return nodes

    return nodes.reduce<FileNode[]>((acc, node) => {
      const matchesQuery = node.name.toLowerCase().includes(query.toLowerCase())

      if (node.type === 'directory' && node.children) {
        const filteredChildren = filterTree(node.children, query)
        if (filteredChildren.length > 0 || matchesQuery) {
          acc.push({ ...node, children: filteredChildren })
        }
      } else if (matchesQuery) {
        acc.push(node)
      }

      return acc
    }, [])
  }, [])

  // Filter trees for all roots
  const filteredRoots = useMemo(() => {
    return roots.map(root => ({
      ...root,
      tree: filterTree(root.tree, searchQuery)
    }))
  }, [roots, searchQuery, filterTree])

  // Load root folder contents
  const loadRootFolder = useCallback(async (rootPath: string) => {
    setRootLoading(rootPath, true)
    const items = await window.qalam.folder.read(rootPath)
    updateRootTree(rootPath, items as FileNode[])
    setRootLoading(rootPath, false)
  }, [updateRootTree, setRootLoading])

  // Legacy loadFolder for single root (backward compatibility)
  const loadFolder = useCallback(async (path: string) => {
    if (roots.length > 0) {
      await loadRootFolder(roots[0].path)
    }
  }, [roots, loadRootFolder])

  // Load children of a folder
  const loadChildren = useCallback(async (path: string) => {
    const items = await window.qalam.folder.read(path)
    updateChildren(path, items as FileNode[])
  }, [updateChildren])

  // Open folder dialog
  const handleOpenFolder = useCallback(async () => {
    const result = await window.qalam.folder.open()
    if (result) {
      setRoot(result.path, result.name)
      loadFolder(result.path)
    }
  }, [setRoot, loadFolder])

  // Reload all roots
  const handleRefresh = useCallback(() => {
    roots.forEach(root => {
      loadRootFolder(root.path)
    })
  }, [roots, loadRootFolder])

  // Refresh a specific root
  const handleRefreshRoot = useCallback((rootPath: string) => {
    loadRootFolder(rootPath)
  }, [loadRootFolder])

  // Restore folders on mount if previously opened
  // Use a ref to track which roots have been loaded to prevent infinite loops
  const loadedRootsRef = React.useRef<Set<string>>(new Set())

  useEffect(() => {
    roots.forEach(root => {
      if (root.tree.length === 0 && !loadedRootsRef.current.has(root.path)) {
        loadedRootsRef.current.add(root.path)
        loadRootFolder(root.path)
      }
    })
  }, [roots, loadRootFolder])

  // Clear loaded roots tracking when roots are removed
  useEffect(() => {
    const currentPaths = new Set(roots.map(r => r.path))
    loadedRootsRef.current.forEach(path => {
      if (!currentPaths.has(path)) {
        loadedRootsRef.current.delete(path)
      }
    })
  }, [roots])

  // Add folder to workspace
  const handleAddFolder = useCallback(async () => {
    const result = await window.qalam.workspace.addFolder()
    if (result) {
      addRoot(result.path, result.name)
      loadRootFolder(result.path)
    }
  }, [addRoot, loadRootFolder])

  // Remove folder from workspace
  const handleRemoveRoot = useCallback((path: string) => {
    removeRoot(path)
  }, [removeRoot])

  // Context menu handlers
  const handleContextMenu = (e: React.MouseEvent, node: FileNode) => {
    e.preventDefault()
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      node
    })
  }

  const closeContextMenu = () => {
    setContextMenu({ visible: false, x: 0, y: 0, node: null })
  }

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => closeContextMenu()
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, node: FileNode) => {
    setDraggedNode(node)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', node.path)
  }

  const handleDragOver = (e: React.DragEvent, node: FileNode) => {
    e.preventDefault()
    if (node.type === 'directory' && draggedNode && draggedNode.path !== node.path) {
      // Prevent dropping into itself or its children
      if (!draggedNode.path.startsWith(node.path + '/')) {
        e.dataTransfer.dropEffect = 'move'
        setDragOverPath(node.path)
      }
    }
  }

  const handleDragLeave = () => {
    setDragOverPath(null)
  }

  const handleDrop = async (e: React.DragEvent, targetNode: FileNode) => {
    e.preventDefault()
    setDragOverPath(null)

    if (!draggedNode || targetNode.type !== 'directory') return
    if (draggedNode.path === targetNode.path) return
    if (draggedNode.path.startsWith(targetNode.path + '/')) return

    const fileName = draggedNode.name
    const newPath = `${targetNode.path}/${fileName}`
    const oldParentPath = draggedNode.path.substring(0, draggedNode.path.lastIndexOf('/'))

    // Check if it's a .ترقيم file and we have a project root
    const isTarqeemFile = draggedNode.type === 'file' &&
      (fileName.endsWith('.ترقيم') || fileName.endsWith('.trq'))

    if (isTarqeemFile && rootPath) {
      // Use move with refactoring for Tarqeem files
      const result = await window.qalam.folder.moveWithRefactor(draggedNode.path, newPath, rootPath)
      if (result.updatedFiles && result.updatedFiles.length > 0) {
        console.log(`تم تحديث الاستيرادات في ${result.updatedFiles.length} ملف`)
      }
    } else {
      // Simple rename for other files
      await window.qalam.folder.rename(draggedNode.path, newPath)
    }

    // Refresh both source and target folders
    if (oldParentPath === rootPath) {
      handleRefresh()
    } else {
      loadChildren(oldParentPath)
    }

    if (targetNode.path === rootPath) {
      handleRefresh()
    } else {
      loadChildren(targetNode.path)
      setExpanded(targetNode.path, true)
    }

    setDraggedNode(null)
  }

  // Create new file (open template dialog)
  const handleNewFile = () => {
    const parentPath = contextMenu.node?.type === 'directory'
      ? contextMenu.node.path
      : rootPath

    if (parentPath) {
      setNewFileDialog({ visible: true, parentPath })
    }
    closeContextMenu()
  }

  // Create new folder
  const handleNewFolder = () => {
    const parentPath = contextMenu.node?.type === 'directory'
      ? contextMenu.node.path
      : rootPath

    if (parentPath) {
      setNewFolderDialog({ visible: true, parentPath })
      setNewItemName('')
    }
    closeContextMenu()
  }

  // Confirm new file creation with template
  const confirmNewFile = async (filePath: string, content: string) => {
    await window.qalam.folder.createFile(filePath, content)

    const parentPath = filePath.substring(0, filePath.lastIndexOf('/'))
    if (parentPath === rootPath) {
      handleRefresh()
    } else {
      loadChildren(parentPath)
    }

    setNewFileDialog({ visible: false, parentPath: '' })
  }

  // Confirm new folder creation
  const confirmNewFolder = async () => {
    if (!newItemName.trim()) return

    const fullPath = `${newFolderDialog.parentPath}/${newItemName}`
    await window.qalam.folder.createFolder(fullPath)

    if (newFolderDialog.parentPath === rootPath) {
      handleRefresh()
    } else {
      loadChildren(newFolderDialog.parentPath)
    }

    setNewFolderDialog({ visible: false, parentPath: '' })
  }

  // Rename
  const handleRename = () => {
    if (contextMenu.node) {
      setRenameDialog({ visible: true, node: contextMenu.node })
      setRenameName(contextMenu.node.name)
    }
    closeContextMenu()
  }

  const confirmRename = async () => {
    if (!renameName.trim() || !renameDialog.node) return

    const oldPath = renameDialog.node.path
    const parentPath = oldPath.substring(0, oldPath.lastIndexOf('/'))
    const newPath = `${parentPath}/${renameName}`

    await window.qalam.folder.rename(oldPath, newPath)

    // Refresh
    if (parentPath === rootPath) {
      handleRefresh()
    } else {
      loadChildren(parentPath)
    }

    setRenameDialog({ visible: false, node: null })
  }

  // Delete (move to trash)
  const handleDelete = async () => {
    if (!contextMenu.node) return

    const confirmed = window.confirm(`هل تريد نقل "${contextMenu.node.name}" إلى سلة المهملات؟`)
    if (confirmed) {
      await window.qalam.folder.delete(contextMenu.node.path)

      const parentPath = contextMenu.node.path.substring(0, contextMenu.node.path.lastIndexOf('/'))
      if (parentPath === rootPath) {
        handleRefresh()
      } else {
        loadChildren(parentPath)
      }
    }
    closeContextMenu()
  }

  // Reveal in Finder/Explorer
  const handleReveal = () => {
    if (contextMenu.node) {
      window.qalam.folder.reveal(contextMenu.node.path)
    }
    closeContextMenu()
  }

  // Duplicate file
  const handleDuplicate = async () => {
    if (!contextMenu.node || contextMenu.node.type !== 'file') return

    await window.qalam.folder.duplicate(contextMenu.node.path)

    const parentPath = contextMenu.node.path.substring(0, contextMenu.node.path.lastIndexOf('/'))
    if (parentPath === rootPath) {
      handleRefresh()
    } else {
      loadChildren(parentPath)
    }
    closeContextMenu()
  }

  return (
    <div className="file-explorer" onDragLeave={handleDragLeave}>
      <div className="file-explorer-header">
        <span className="file-explorer-title">المستكشف</span>
        <div className="file-explorer-actions">
          <button
            className="file-explorer-action"
            onClick={() => {
              if (rootPath) {
                setNewFileDialog({ visible: true, parentPath: rootPath })
              }
            }}
            title="ملف جديد"
            disabled={!rootPath}
          >
            <Plus size={14} />
          </button>
          <button
            className="file-explorer-action"
            onClick={() => {
              if (rootPath) {
                setNewFolderDialog({ visible: true, parentPath: rootPath })
                setNewItemName('')
              }
            }}
            title="مجلد جديد"
            disabled={!rootPath}
          >
            <FolderPlus size={14} />
          </button>
          <button
            className="file-explorer-action"
            onClick={handleRefresh}
            title="تحديث"
            disabled={!rootPath}
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {rootPath && (
        <div className="file-explorer-search">
          <Search size={14} className="search-icon" />
          <input
            type="text"
            placeholder="بحث في الملفات..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          {searchQuery && (
            <button
              className="search-clear"
              onClick={() => setSearchQuery('')}
            >
              <X size={12} />
            </button>
          )}
        </div>
      )}

      {roots.length > 0 ? (
        <div className="file-explorer-content">
          {filteredRoots.map((root, index) => (
            <div key={root.path} className="file-explorer-root-section">
              <div className={`file-explorer-root ${isProject && index === 0 ? 'is-project' : ''}`}>
                {isProject && index === 0 ? (
                  <Package size={16} className="project-icon" />
                ) : (
                  <FolderOpen size={16} />
                )}
                <span className="file-explorer-root-name">
                  {isProject && index === 0 && projectConfig ? projectConfig.name : root.name}
                </span>
                {isProject && index === 0 && (
                  <span className="project-badge">مشروع</span>
                )}
                <div className="file-explorer-root-actions">
                  <button
                    className="file-explorer-action-small"
                    onClick={() => handleRefreshRoot(root.path)}
                    title="تحديث"
                  >
                    <RefreshCw size={12} />
                  </button>
                  {roots.length > 1 && (
                    <button
                      className="file-explorer-action-small"
                      onClick={() => handleRemoveRoot(root.path)}
                      title="إزالة من مساحة العمل"
                    >
                      <X size={12} />
                    </button>
                  )}
                  {roots.length === 1 && (
                    <button
                      className="file-explorer-close"
                      onClick={closeFolder}
                      title="إغلاق المجلد"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              <div className="file-tree">
                {root.isLoading ? (
                  <div className="file-tree-loading">جاري التحميل...</div>
                ) : root.tree.length > 0 ? (
                  root.tree.map((node) => (
                    <FileTreeItem
                      key={node.path}
                      node={node}
                      level={0}
                      isExpanded={expandedPaths.has(node.path)}
                      onToggle={toggleExpanded}
                      onOpenFile={onOpenFile}
                      onContextMenu={handleContextMenu}
                      loadChildren={loadChildren}
                      onDragStart={handleDragStart}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      dragOverPath={dragOverPath}
                      searchQuery={searchQuery}
                    />
                  ))
                ) : searchQuery ? (
                  <div className="file-tree-empty">لا توجد نتائج</div>
                ) : null}
              </div>
            </div>
          ))}

          {/* Add folder button for multi-root workspace */}
          {isWorkspace && (
            <button
              className="add-folder-button"
              onClick={handleAddFolder}
              title="إضافة مجلد"
            >
              <Plus size={14} />
              إضافة مجلد
            </button>
          )}
        </div>
      ) : (
        <div className="file-explorer-empty">
          <p>لم يتم فتح أي مجلد</p>
          <button className="open-folder-button" onClick={handleOpenFolder}>
            <FolderOpen size={16} />
            فتح مجلد
          </button>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu.visible && (
        <div
          className="context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          {contextMenu.node?.type === 'directory' && (
            <>
              <button onClick={handleNewFile}>
                <Plus size={14} />
                ملف جديد
              </button>
              <button onClick={handleNewFolder}>
                <FolderPlus size={14} />
                مجلد جديد
              </button>
              <div className="context-menu-separator" />
            </>
          )}
          <button onClick={handleRename}>
            <Edit3 size={14} />
            إعادة التسمية
          </button>
          {contextMenu.node?.type === 'file' && (
            <button onClick={handleDuplicate}>
              <Copy size={14} />
              نسخ الملف
            </button>
          )}
          <button onClick={handleReveal}>
            <ExternalLink size={14} />
            إظهار في المجلد
          </button>
          <div className="context-menu-separator" />
          <button onClick={handleDelete} className="danger">
            <Trash2 size={14} />
            نقل إلى السلة
          </button>
        </div>
      )}

      {/* New File Dialog with Templates */}
      <NewFileDialog
        visible={newFileDialog.visible}
        parentPath={newFileDialog.parentPath}
        onClose={() => setNewFileDialog({ visible: false, parentPath: '' })}
        onConfirm={confirmNewFile}
      />

      {/* New Folder Dialog */}
      {newFolderDialog.visible && (
        <div className="dialog-overlay" onClick={() => setNewFolderDialog({ visible: false, parentPath: '' })}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <h3>مجلد جديد</h3>
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder="اسم المجلد"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmNewFolder()
                if (e.key === 'Escape') setNewFolderDialog({ visible: false, parentPath: '' })
              }}
            />
            <div className="dialog-actions">
              <button onClick={confirmNewFolder} className="primary">إنشاء</button>
              <button onClick={() => setNewFolderDialog({ visible: false, parentPath: '' })}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Dialog */}
      {renameDialog.visible && (
        <div className="dialog-overlay" onClick={() => setRenameDialog({ visible: false, node: null })}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <h3>إعادة التسمية</h3>
            <input
              type="text"
              value={renameName}
              onChange={(e) => setRenameName(e.target.value)}
              placeholder="الاسم الجديد"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmRename()
                if (e.key === 'Escape') setRenameDialog({ visible: false, node: null })
              }}
            />
            <div className="dialog-actions">
              <button onClick={confirmRename} className="primary">تغيير</button>
              <button onClick={() => setRenameDialog({ visible: false, node: null })}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
