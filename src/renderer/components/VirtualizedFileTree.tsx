/**
 * Phase 6.1: Virtualized File Tree Component
 *
 * Implements windowing/virtual scrolling for large file trees (1000+ items)
 * to maintain 60fps scrolling performance.
 */

import React, { useRef, useState, useCallback, useEffect, useMemo, memo } from 'react'
import {
  FolderOpen,
  Folder,
  FileText,
  ChevronDown,
  ChevronLeft,
} from 'lucide-react'
import { FileNode } from '../stores/useFileExplorer'

const ITEM_HEIGHT = 24 // Fixed height per item in pixels
const BUFFER_SIZE = 10 // Extra items to render above/below viewport

interface FlattenedNode {
  node: FileNode
  depth: number
  isExpanded: boolean
}

interface VirtualizedFileTreeProps {
  tree: FileNode[]
  expandedPaths: Set<string>
  onToggle: (path: string) => void
  onOpenFile: (path: string) => void
  onContextMenu: (e: React.MouseEvent, node: FileNode) => void
  loadChildren: (path: string) => void
  onDragStart: (e: React.DragEvent, node: FileNode) => void
  onDragOver: (e: React.DragEvent, node: FileNode) => void
  onDrop: (e: React.DragEvent, node: FileNode) => void
  dragOverPath: string | null
  searchQuery: string
  maxHeight?: number
}

// Memoized tree item for performance
const VirtualTreeItem = memo(function VirtualTreeItem({
  node,
  depth,
  isExpanded,
  onToggle,
  onOpenFile,
  onContextMenu,
  loadChildren,
  onDragStart,
  onDragOver,
  onDrop,
  dragOverPath,
  searchQuery,
  style,
}: {
  node: FileNode
  depth: number
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
  style: React.CSSProperties
}) {
  const isDirectory = node.type === 'directory'
  const isDragOver = dragOverPath === node.path && isDirectory

  const handleClick = useCallback(() => {
    if (isDirectory) {
      onToggle(node.path)
      if (!isExpanded && (!node.children || node.children.length === 0)) {
        loadChildren(node.path)
      }
    } else {
      onOpenFile(node.path)
    }
  }, [isDirectory, isExpanded, node, onToggle, loadChildren, onOpenFile])

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
    <div
      className={`file-tree-item ${isDirectory ? 'directory' : 'file'} ${isDragOver ? 'drag-over' : ''}`}
      style={{
        ...style,
        paddingRight: `${12 + depth * 16}px`,
        height: ITEM_HEIGHT,
        display: 'flex',
        alignItems: 'center',
      }}
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
  )
})

export default function VirtualizedFileTree({
  tree,
  expandedPaths,
  onToggle,
  onOpenFile,
  onContextMenu,
  loadChildren,
  onDragStart,
  onDragOver,
  onDrop,
  dragOverPath,
  searchQuery,
  maxHeight = 500,
}: VirtualizedFileTreeProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [containerHeight, setContainerHeight] = useState(maxHeight)

  // Flatten tree for virtualization
  const flattenedNodes = useMemo(() => {
    const result: FlattenedNode[] = []

    function flatten(nodes: FileNode[], depth: number) {
      for (const node of nodes) {
        const isExpanded = expandedPaths.has(node.path)
        result.push({ node, depth, isExpanded })

        if (node.type === 'directory' && isExpanded && node.children) {
          flatten(node.children, depth + 1)
        }
      }
    }

    flatten(tree, 0)
    return result
  }, [tree, expandedPaths])

  // Calculate visible range
  const { startIndex, endIndex, visibleNodes } = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - BUFFER_SIZE)
    const visibleCount = Math.ceil(containerHeight / ITEM_HEIGHT) + BUFFER_SIZE * 2
    const end = Math.min(flattenedNodes.length, start + visibleCount)

    return {
      startIndex: start,
      endIndex: end,
      visibleNodes: flattenedNodes.slice(start, end),
    }
  }, [scrollTop, containerHeight, flattenedNodes])

  // Handle scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])

  // Observe container size
  useEffect(() => {
    if (!containerRef.current) return

    const observer = new ResizeObserver((entries) => {
      const height = entries[0]?.contentRect.height
      if (height && height > 0) {
        setContainerHeight(height)
      }
    })

    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  const totalHeight = flattenedNodes.length * ITEM_HEIGHT
  const offsetY = startIndex * ITEM_HEIGHT

  // If tree is small enough, don't virtualize
  if (flattenedNodes.length < 50) {
    return (
      <div className="file-tree-virtualized file-tree-simple">
        {flattenedNodes.map(({ node, depth, isExpanded }) => (
          <VirtualTreeItem
            key={node.path}
            node={node}
            depth={depth}
            isExpanded={isExpanded}
            onToggle={onToggle}
            onOpenFile={onOpenFile}
            onContextMenu={onContextMenu}
            loadChildren={loadChildren}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDrop={onDrop}
            dragOverPath={dragOverPath}
            searchQuery={searchQuery}
            style={{}}
          />
        ))}
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="file-tree-virtualized"
      onScroll={handleScroll}
      style={{
        height: '100%',
        overflow: 'auto',
        position: 'relative',
      }}
    >
      <div
        style={{
          height: totalHeight,
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: offsetY,
            left: 0,
            right: 0,
          }}
        >
          {visibleNodes.map(({ node, depth, isExpanded }) => (
            <VirtualTreeItem
              key={node.path}
              node={node}
              depth={depth}
              isExpanded={isExpanded}
              onToggle={onToggle}
              onOpenFile={onOpenFile}
              onContextMenu={onContextMenu}
              loadChildren={loadChildren}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDrop={onDrop}
              dragOverPath={dragOverPath}
              searchQuery={searchQuery}
              style={{}}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
