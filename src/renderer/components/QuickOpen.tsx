import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Hash, Braces, Box, List } from 'lucide-react'
import { EditorView } from '@codemirror/view'
import { EditorSelection } from '@codemirror/state'

interface Symbol {
  name: string
  type: 'function' | 'class' | 'enum' | 'protocol' | 'variable'
  line: number
  position: number
}

interface QuickOpenProps {
  view: EditorView | null
  visible: boolean
  onClose: () => void
  content: string
}

// Parse content to find symbols
function parseSymbols(content: string): Symbol[] {
  const symbols: Symbol[] = []
  const lines = content.split('\n')

  // Patterns for different symbol types
  const patterns = [
    { regex: /دالة\s+([\u0600-\u06FF_][\u0600-\u06FF\u0660-\u0669_0-9]*)/g, type: 'function' as const },
    { regex: /صنف\s+([\u0600-\u06FF_][\u0600-\u06FF\u0660-\u0669_0-9]*)/g, type: 'class' as const },
    { regex: /تعداد\s+([\u0600-\u06FF_][\u0600-\u06FF\u0660-\u0669_0-9]*)/g, type: 'enum' as const },
    { regex: /ميثاق\s+([\u0600-\u06FF_][\u0600-\u06FF\u0660-\u0669_0-9]*)/g, type: 'protocol' as const },
    { regex: /(?:متغير|ثابت)\s+([\u0600-\u06FF_][\u0600-\u06FF\u0660-\u0669_0-9]*)/g, type: 'variable' as const }
  ]

  let position = 0
  lines.forEach((line, lineIndex) => {
    for (const { regex, type } of patterns) {
      regex.lastIndex = 0
      let match
      while ((match = regex.exec(line)) !== null) {
        symbols.push({
          name: match[1],
          type,
          line: lineIndex + 1,
          position: position + match.index + (match[0].indexOf(match[1]))
        })
      }
    }
    position += line.length + 1 // +1 for newline
  })

  return symbols.sort((a, b) => a.line - b.line)
}

function getSymbolIcon(type: Symbol['type']) {
  switch (type) {
    case 'function':
      return <Braces size={14} className="symbol-icon function" />
    case 'class':
      return <Box size={14} className="symbol-icon class" />
    case 'enum':
      return <List size={14} className="symbol-icon enum" />
    case 'protocol':
      return <Hash size={14} className="symbol-icon protocol" />
    case 'variable':
      return <Hash size={14} className="symbol-icon variable" />
    default:
      return <Hash size={14} />
  }
}

function getSymbolTypeName(type: Symbol['type']) {
  switch (type) {
    case 'function': return 'دالة'
    case 'class': return 'صنف'
    case 'enum': return 'تعداد'
    case 'protocol': return 'ميثاق'
    case 'variable': return 'متغير'
    default: return ''
  }
}

export default function QuickOpen({
  view,
  visible,
  onClose,
  content
}: QuickOpenProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Parse symbols from content
  const symbols = useMemo(() => parseSymbols(content), [content])

  // Filter symbols based on query
  const filteredSymbols = useMemo(() => {
    if (!query) return symbols
    const lowerQuery = query.toLowerCase()
    return symbols.filter(s => s.name.toLowerCase().includes(lowerQuery))
  }, [symbols, query])

  // Focus input when dialog opens
  useEffect(() => {
    if (visible && inputRef.current) {
      setQuery('')
      setSelectedIndex(0)
      inputRef.current.focus()
    }
  }, [visible])

  // Reset selection when filtered results change
  useEffect(() => {
    setSelectedIndex(0)
  }, [filteredSymbols.length])

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedEl = listRef.current.querySelector('.symbol-item.selected')
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [selectedIndex])

  // Navigate to symbol
  const goToSymbol = useCallback((symbol: Symbol) => {
    if (!view) return

    const line = view.state.doc.line(symbol.line)

    view.dispatch({
      selection: EditorSelection.cursor(line.from),
      scrollIntoView: true
    })

    view.focus()
    onClose()
  }, [view, onClose])

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Escape':
        onClose()
        break
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(i => Math.min(i + 1, filteredSymbols.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(i => Math.max(i - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (filteredSymbols[selectedIndex]) {
          goToSymbol(filteredSymbols[selectedIndex])
        }
        break
    }
  }, [onClose, filteredSymbols, selectedIndex, goToSymbol])

  if (!visible) return null

  return (
    <div className="quickopen-overlay" onClick={onClose}>
      <div className="quickopen-dialog" onClick={(e) => e.stopPropagation()} onKeyDown={handleKeyDown}>
        <div className="quickopen-header">
          <span className="quickopen-prefix">@</span>
          <input
            ref={inputRef}
            type="text"
            className="quickopen-input"
            placeholder="الذهاب إلى رمز..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="quickopen-list" ref={listRef}>
          {filteredSymbols.length === 0 ? (
            <div className="quickopen-empty">
              {symbols.length === 0 ? 'لا توجد رموز في الملف' : 'لا توجد نتائج'}
            </div>
          ) : (
            filteredSymbols.map((symbol, index) => (
              <div
                key={`${symbol.name}-${symbol.line}`}
                className={`symbol-item ${index === selectedIndex ? 'selected' : ''}`}
                onClick={() => goToSymbol(symbol)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                {getSymbolIcon(symbol.type)}
                <span className="symbol-name">{symbol.name}</span>
                <span className="symbol-type">{getSymbolTypeName(symbol.type)}</span>
                <span className="symbol-line">:{symbol.line}</span>
              </div>
            ))
          )}
        </div>

        <div className="quickopen-footer">
          <span>↑↓ للتنقل</span>
          <span>Enter للانتقال</span>
          <span>Esc للإغلاق</span>
        </div>
      </div>
    </div>
  )
}
