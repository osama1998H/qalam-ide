import React, { useState, useEffect, useCallback } from 'react'
import { X, ChevronDown, ChevronLeft, RefreshCw, FileCode, Braces, Hash, Type, Box, Zap, AlertCircle } from 'lucide-react'

// AST Node types from Tarqeem parser
interface Span {
  start: number
  end: number
  line: number
  column: number
}

interface AstNode {
  kind?: string | Record<string, unknown>
  span?: Span
  [key: string]: unknown
}

interface AstViewerPanelProps {
  visible: boolean
  onClose: () => void
  filePath: string | null
  content: string
  onHighlightRange: (start: number, end: number) => void
}

// Get the node type name for display
function getNodeTypeName(node: unknown): string {
  if (node === null) return 'null'
  if (typeof node !== 'object') return typeof node

  const obj = node as Record<string, unknown>

  // Check for StmtKind or ExprKind
  if (obj.kind) {
    if (typeof obj.kind === 'string') {
      return obj.kind
    }
    if (typeof obj.kind === 'object') {
      const kindObj = obj.kind as Record<string, unknown>
      const keys = Object.keys(kindObj)
      if (keys.length > 0) {
        return keys[0]
      }
    }
  }

  // Check for Literal types
  if ('Int' in obj) return 'Int'
  if ('Float' in obj) return 'Float'
  if ('String' in obj) return 'String'
  if ('Bool' in obj) return 'Bool'
  if ('Null' in obj) return 'Null'

  return 'Object'
}

// Get display value for primitive types
function getDisplayValue(node: unknown): string | null {
  if (node === null) return 'null'
  if (typeof node === 'string') return `"${node}"`
  if (typeof node === 'number') return String(node)
  if (typeof node === 'boolean') return node ? 'true' : 'false'

  if (typeof node === 'object') {
    const obj = node as Record<string, unknown>
    if ('Int' in obj) return String(obj.Int)
    if ('Float' in obj) return String(obj.Float)
    if ('String' in obj) return `"${obj.String}"`
    if ('Bool' in obj) return obj.Bool ? 'true' : 'false'
    if ('Null' in obj) return 'null'
  }

  return null
}

// Get icon for node type
function getNodeIcon(typeName: string): React.ReactNode {
  const iconSize = 14

  switch (typeName) {
    case 'VarDecl':
    case 'Identifier':
      return <Box size={iconSize} className="ast-icon ast-icon-variable" />
    case 'FuncDecl':
    case 'Lambda':
    case 'Call':
      return <Zap size={iconSize} className="ast-icon ast-icon-function" />
    case 'ClassDecl':
    case 'InterfaceDecl':
      return <Type size={iconSize} className="ast-icon ast-icon-class" />
    case 'If':
    case 'While':
    case 'For':
    case 'ForIn':
    case 'Match':
      return <Braces size={iconSize} className="ast-icon ast-icon-control" />
    case 'Int':
    case 'Float':
      return <Hash size={iconSize} className="ast-icon ast-icon-number" />
    case 'String':
      return <FileCode size={iconSize} className="ast-icon ast-icon-string" />
    default:
      return <Braces size={iconSize} className="ast-icon ast-icon-default" />
  }
}

// Tree node component
interface TreeNodeProps {
  label: string
  value: unknown
  depth: number
  onHighlightRange: (start: number, end: number) => void
  defaultExpanded?: boolean
}

function TreeNode({ label, value, depth, onHighlightRange, defaultExpanded = false }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(defaultExpanded || depth < 2)

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()

    // Get span from the value if available
    if (typeof value === 'object' && value !== null) {
      const obj = value as Record<string, unknown>
      if (obj.span && typeof obj.span === 'object') {
        const span = obj.span as Span
        if (typeof span.start === 'number' && typeof span.end === 'number') {
          onHighlightRange(span.start, span.end)
        }
      }
    }
  }, [value, onHighlightRange])

  // Handle primitive values
  if (value === null || typeof value !== 'object') {
    const displayValue = getDisplayValue(value)
    return (
      <div
        className="ast-tree-node ast-tree-leaf"
        style={{ paddingRight: `${depth * 16}px` }}
      >
        <span className="ast-node-label">{label}:</span>
        <span className="ast-node-value">{displayValue || String(value)}</span>
      </div>
    )
  }

  // Handle arrays
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return (
        <div
          className="ast-tree-node ast-tree-leaf"
          style={{ paddingRight: `${depth * 16}px` }}
        >
          <span className="ast-node-label">{label}:</span>
          <span className="ast-node-value ast-value-empty">[]</span>
        </div>
      )
    }

    return (
      <div className="ast-tree-node">
        <div
          className="ast-tree-header"
          style={{ paddingRight: `${depth * 16}px` }}
          onClick={() => setExpanded(!expanded)}
        >
          <span className="ast-expand-icon">
            {expanded ? <ChevronDown size={12} /> : <ChevronLeft size={12} />}
          </span>
          <span className="ast-node-label">{label}</span>
          <span className="ast-node-count">[{value.length}]</span>
        </div>
        {expanded && (
          <div className="ast-tree-children">
            {value.map((item, index) => (
              <TreeNode
                key={index}
                label={`[${index}]`}
                value={item}
                depth={depth + 1}
                onHighlightRange={onHighlightRange}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  // Handle objects
  const obj = value as Record<string, unknown>
  const typeName = getNodeTypeName(value)
  const displayValue = getDisplayValue(value)
  const hasSpan = obj.span !== undefined

  // Filter out internal fields for display
  const displayKeys = Object.keys(obj).filter(key =>
    key !== 'span' && key !== 'leading_comments' && key !== 'trailing_comment'
  )

  // Simple object with just a value (like Literal)
  if (displayValue !== null && displayKeys.length <= 1) {
    return (
      <div
        className={`ast-tree-node ast-tree-leaf ${hasSpan ? 'ast-clickable' : ''}`}
        style={{ paddingRight: `${depth * 16}px` }}
        onClick={hasSpan ? handleClick : undefined}
      >
        {getNodeIcon(typeName)}
        <span className="ast-node-label">{label}:</span>
        <span className="ast-node-type">{typeName}</span>
        <span className="ast-node-value">{displayValue}</span>
      </div>
    )
  }

  return (
    <div className="ast-tree-node">
      <div
        className={`ast-tree-header ${hasSpan ? 'ast-clickable' : ''}`}
        style={{ paddingRight: `${depth * 16}px` }}
        onClick={(e) => {
          if (hasSpan) handleClick(e)
          setExpanded(!expanded)
        }}
      >
        <span className="ast-expand-icon">
          {expanded ? <ChevronDown size={12} /> : <ChevronLeft size={12} />}
        </span>
        {getNodeIcon(typeName)}
        <span className="ast-node-label">{label}</span>
        {typeName !== 'Object' && (
          <span className="ast-node-type">{typeName}</span>
        )}
        {obj.name && typeof obj.name === 'string' && (
          <span className="ast-node-name">{obj.name}</span>
        )}
      </div>
      {expanded && (
        <div className="ast-tree-children">
          {displayKeys.map(key => (
            <TreeNode
              key={key}
              label={key}
              value={obj[key]}
              depth={depth + 1}
              onHighlightRange={onHighlightRange}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function AstViewerPanel({
  visible,
  onClose,
  filePath,
  content,
  onHighlightRange
}: AstViewerPanelProps) {
  const [ast, setAst] = useState<unknown>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [lastParsedContent, setLastParsedContent] = useState<string>('')

  // Parse AST when content changes
  const parseAst = useCallback(async () => {
    if (!filePath) {
      setError('يرجى حفظ الملف أولاً')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await window.qalam.compiler.parseAst(filePath)

      if (result.success && result.ast) {
        setAst(result.ast)
        setLastParsedContent(content)
        setError(null)
      } else {
        setError(result.error || 'فشل في تحليل الملف')
      }
    } catch (e) {
      setError(`خطأ: ${e}`)
    } finally {
      setLoading(false)
    }
  }, [filePath, content])

  // Parse when panel becomes visible or file changes
  useEffect(() => {
    if (visible && filePath) {
      parseAst()
    }
  }, [visible, filePath])

  // Check if content has changed since last parse
  const contentChanged = content !== lastParsedContent && ast !== null

  if (!visible) {
    return null
  }

  return (
    <div className="ast-viewer-panel">
      <div className="ast-viewer-header">
        <div className="ast-viewer-title">
          <FileCode size={16} />
          <span>الشجرة النحوية (AST)</span>
          {contentChanged && (
            <span className="ast-stale-indicator" title="المحتوى تغيّر - اضغط للتحديث">
              *
            </span>
          )}
        </div>
        <div className="ast-viewer-actions">
          <button
            className="ast-refresh-btn"
            onClick={parseAst}
            disabled={loading || !filePath}
            title="تحديث (F5)"
          >
            <RefreshCw size={14} className={loading ? 'ast-spinning' : ''} />
          </button>
          <button className="ast-close-btn" onClick={onClose} title="إغلاق">
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="ast-viewer-content">
        {loading && (
          <div className="ast-loading">
            <RefreshCw size={24} className="ast-spinning" />
            <span>جاري التحليل...</span>
          </div>
        )}

        {error && !loading && (
          <div className="ast-error">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {ast && !loading && !error && (
          <div className="ast-tree">
            <TreeNode
              label="AST"
              value={ast}
              depth={0}
              onHighlightRange={onHighlightRange}
              defaultExpanded={true}
            />
          </div>
        )}

        {!ast && !loading && !error && (
          <div className="ast-empty">
            <FileCode size={32} />
            <span>لا توجد شجرة نحوية</span>
            <span className="ast-empty-hint">افتح ملف .ترقيم لعرض الشجرة النحوية</span>
          </div>
        )}
      </div>
    </div>
  )
}
