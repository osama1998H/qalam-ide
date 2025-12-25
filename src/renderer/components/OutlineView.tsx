import React, { useEffect, useMemo, useCallback } from 'react'
import {
  ChevronDown,
  ChevronLeft,
  Braces,
  Box,
  Hash,
  Variable,
  ListTree,
  ArrowDownAZ,
  ArrowDown01,
  FolderOpen,
  RefreshCw,
  FileText
} from 'lucide-react'
import {
  useOutlineStore,
  DocumentSymbol,
  SymbolKind,
  getSymbolIcon,
  getSymbolKindLabel,
  getSymbolId
} from '../stores/useOutlineStore'

interface OutlineViewProps {
  filePath: string | null
  content: string
  onNavigate: (line: number, character: number) => void
}

interface SymbolItemProps {
  symbol: DocumentSymbol
  level: number
  parentId?: string
  onNavigate: (line: number, character: number) => void
}

// Get icon component for symbol kind
function getSymbolIconComponent(kind: SymbolKind) {
  const iconType = getSymbolIcon(kind)
  switch (iconType) {
    case 'function':
      return <Braces size={14} className="outline-icon function" />
    case 'class':
      return <Box size={14} className="outline-icon class" />
    case 'interface':
      return <Hash size={14} className="outline-icon interface" />
    case 'enum':
      return <ListTree size={14} className="outline-icon enum" />
    case 'variable':
      return <Variable size={14} className="outline-icon variable" />
    case 'constant':
      return <Hash size={14} className="outline-icon constant" />
    case 'property':
      return <Hash size={14} className="outline-icon property" />
    case 'constructor':
      return <Braces size={14} className="outline-icon constructor" />
    default:
      return <Hash size={14} className="outline-icon" />
  }
}

function SymbolItem({ symbol, level, parentId, onNavigate }: SymbolItemProps) {
  const { expandedSymbols, toggleExpanded } = useOutlineStore()
  const symbolId = getSymbolId(symbol, parentId)
  const isExpanded = expandedSymbols.has(symbolId)
  const hasChildren = symbol.children && symbol.children.length > 0

  const handleClick = useCallback(() => {
    // Navigate to symbol (line is 0-indexed in LSP, but we pass as-is and App.tsx handles it)
    onNavigate(symbol.selectionRange.start.line + 1, symbol.selectionRange.start.character)
  }, [symbol, onNavigate])

  const handleChevronClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    toggleExpanded(symbolId)
  }, [symbolId, toggleExpanded])

  return (
    <>
      <div
        className="outline-item"
        style={{ paddingRight: `${12 + level * 16}px` }}
        onClick={handleClick}
      >
        {hasChildren ? (
          <span className="outline-chevron" onClick={handleChevronClick}>
            {isExpanded ? <ChevronDown size={14} /> : <ChevronLeft size={14} />}
          </span>
        ) : (
          <span className="outline-chevron-placeholder" />
        )}
        {getSymbolIconComponent(symbol.kind)}
        <span className="outline-name">{symbol.name}</span>
        <span className="outline-kind">{getSymbolKindLabel(symbol.kind)}</span>
      </div>

      {hasChildren && isExpanded && (
        <div className="outline-children">
          {symbol.children!.map((child, index) => (
            <SymbolItem
              key={`${child.name}-${child.range.start.line}-${index}`}
              symbol={child}
              level={level + 1}
              parentId={symbolId}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </>
  )
}

export default function OutlineView({ filePath, content, onNavigate }: OutlineViewProps) {
  const {
    symbols,
    isLoading,
    filterType,
    sortBy,
    refreshSymbols,
    setFilterType,
    setSortBy,
    expandAll,
    collapseAll,
    expandedSymbols
  } = useOutlineStore()

  // Refresh symbols when file changes
  useEffect(() => {
    if (filePath && content) {
      refreshSymbols(filePath, content)
    }
  }, [filePath, content, refreshSymbols])

  // Handle manual refresh
  const handleRefresh = useCallback(() => {
    if (filePath && content) {
      refreshSymbols(filePath, content)
    }
  }, [filePath, content, refreshSymbols])

  // Filter and sort symbols
  const displaySymbols = useMemo(() => {
    let result = [...symbols]

    // Filter by type
    if (filterType !== null) {
      const filterRecursive = (syms: DocumentSymbol[]): DocumentSymbol[] => {
        return syms.reduce<DocumentSymbol[]>((acc, s) => {
          if (s.kind === filterType) {
            acc.push({ ...s, children: s.children ? filterRecursive(s.children) : undefined })
          } else if (s.children) {
            const filteredChildren = filterRecursive(s.children)
            if (filteredChildren.length > 0) {
              acc.push({ ...s, children: filteredChildren })
            }
          }
          return acc
        }, [])
      }
      result = filterRecursive(result)
    }

    // Sort
    if (sortBy === 'name') {
      const sortRecursive = (syms: DocumentSymbol[]): DocumentSymbol[] => {
        return [...syms]
          .sort((a, b) => a.name.localeCompare(b.name, 'ar'))
          .map(s => ({
            ...s,
            children: s.children ? sortRecursive(s.children) : undefined
          }))
      }
      result = sortRecursive(result)
    }

    return result
  }, [symbols, filterType, sortBy])

  // Check if any symbols have children (to show expand/collapse buttons)
  const hasNestedSymbols = symbols.some(s => s.children && s.children.length > 0)

  // Handle filter change
  const handleFilterChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    setFilterType(value ? Number(value) as SymbolKind : null)
  }, [setFilterType])

  // Toggle sort
  const handleSortToggle = useCallback(() => {
    setSortBy(sortBy === 'position' ? 'name' : 'position')
  }, [sortBy, setSortBy])

  // Toggle expand/collapse all
  const handleToggleAll = useCallback(() => {
    if (expandedSymbols.size > 0) {
      collapseAll()
    } else {
      expandAll()
    }
  }, [expandedSymbols.size, expandAll, collapseAll])

  return (
    <div className="outline-view">
      <div className="outline-header">
        <span className="outline-title">المخطط</span>
        <div className="outline-actions">
          {hasNestedSymbols && (
            <button
              className="outline-action-btn"
              onClick={handleToggleAll}
              title={expandedSymbols.size > 0 ? 'طي الكل' : 'توسيع الكل'}
            >
              <FolderOpen size={14} />
            </button>
          )}
          <button
            className="outline-action-btn"
            onClick={handleRefresh}
            title="تحديث"
            disabled={!filePath}
          >
            <RefreshCw size={14} />
          </button>
          <button
            className={`outline-action-btn ${sortBy === 'name' ? 'active' : ''}`}
            onClick={handleSortToggle}
            title={sortBy === 'position' ? 'ترتيب أبجدي' : 'ترتيب حسب الموضع'}
          >
            {sortBy === 'position' ? <ArrowDownAZ size={14} /> : <ArrowDown01 size={14} />}
          </button>
        </div>
      </div>

      <div className="outline-filter">
        <select value={filterType ?? ''} onChange={handleFilterChange}>
          <option value="">الكل</option>
          <option value={SymbolKind.Function}>دوال</option>
          <option value={SymbolKind.Class}>أصناف</option>
          <option value={SymbolKind.Constructor}>منشئات</option>
          <option value={SymbolKind.Interface}>مواثيق</option>
          <option value={SymbolKind.Enum}>تعدادات</option>
          <option value={SymbolKind.Variable}>متغيرات</option>
        </select>
      </div>

      <div className="outline-content">
        {isLoading ? (
          <div className="outline-loading">
            <RefreshCw size={16} className="spin" />
            <span>جاري التحميل...</span>
          </div>
        ) : !filePath ? (
          <div className="outline-empty">
            <FileText size={32} />
            <span>لا يوجد ملف مفتوح</span>
          </div>
        ) : displaySymbols.length > 0 ? (
          <div className="outline-tree">
            {displaySymbols.map((symbol, index) => (
              <SymbolItem
                key={`${symbol.name}-${symbol.range.start.line}-${index}`}
                symbol={symbol}
                level={0}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        ) : (
          <div className="outline-empty">
            <ListTree size={32} />
            <span>لا توجد رموز</span>
          </div>
        )}
      </div>
    </div>
  )
}
