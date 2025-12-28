import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  Search,
  ChevronDown,
  ChevronRight,
  CaseSensitive,
  WholeWord,
  Regex,
  Replace,
  ReplaceAll,
  FileText,
  Loader2,
  FolderOpen,
  RefreshCw
} from 'lucide-react'
import { useSearchStore, SearchFileResult, SearchMatch } from '../stores/useSearchStore'

interface SearchViewProps {
  rootPath: string | null
  onNavigate: (filePath: string, line: number, column: number) => void
}

export default function SearchView({ rootPath, onNavigate }: SearchViewProps) {
  const searchInputRef = useRef<HTMLInputElement>(null)

  const {
    query,
    setQuery,
    replaceText,
    setReplaceText,
    results,
    isSearching,
    totalMatches,
    totalFiles,
    caseSensitive,
    wholeWord,
    useRegex,
    includePattern,
    excludePattern,
    showReplace,
    expandedFiles,
    toggleOption,
    setIncludePattern,
    setExcludePattern,
    toggleShowReplace,
    toggleFileExpanded,
    expandAllFiles,
    collapseAllFiles,
    search,
    replaceInFiles
  } = useSearchStore()

  const [showFilters, setShowFilters] = useState(false)

  // Focus search input on mount
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [])

  // Handle search
  const handleSearch = useCallback(() => {
    if (rootPath && query.trim()) {
      search(rootPath)
    }
  }, [rootPath, query, search])

  // Handle replace all
  const handleReplaceAll = useCallback(async () => {
    if (rootPath && query.trim()) {
      await replaceInFiles(rootPath)
    }
  }, [rootPath, query, replaceInFiles])

  // Handle key down
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSearch()
    }
  }, [handleSearch])

  // Render match with highlight
  const renderMatchContent = (match: SearchMatch) => {
    const { lineContent, columnStart, columnEnd } = match
    const trimmedContent = lineContent

    const originalLine = match.lineContent
    const trimStart = originalLine.length - originalLine.trimStart().length

    const adjustedStart = Math.max(0, columnStart - trimStart)
    const adjustedEnd = Math.max(adjustedStart, columnEnd - trimStart)

    const before = trimmedContent.slice(0, adjustedStart)
    const highlighted = trimmedContent.slice(adjustedStart, adjustedEnd)
    const after = trimmedContent.slice(adjustedEnd)

    return (
      <span className="search-match-text">
        {before}
        <span className="search-highlight">{highlighted}</span>
        {after}
      </span>
    )
  }

  // Render a file group
  const renderFileGroup = (file: SearchFileResult) => {
    const isExpanded = expandedFiles.has(file.filePath)

    return (
      <div key={file.filePath} className="search-file-group">
        <div
          className="search-file-header"
          onClick={() => toggleFileExpanded(file.filePath)}
        >
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <FileText size={14} />
          <span className="search-file-name">{file.fileName}</span>
          <span className="search-file-count">{file.matches.length}</span>
        </div>

        {isExpanded && (
          <div className="search-matches">
            {file.matches.map((match, index) => (
              <div
                key={`${file.filePath}-${match.lineNumber}-${index}`}
                className="search-match-item"
                onClick={() => onNavigate(file.filePath, match.lineNumber, match.columnStart)}
              >
                <span className="search-line-number">{match.lineNumber}</span>
                {renderMatchContent(match)}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="search-view">
      {/* Header with summary and actions */}
      <div className="search-view-header">
        <span className="search-view-title">البحث</span>
        {totalMatches > 0 && (
          <span className="search-match-summary">
            {totalMatches} في {totalFiles} ملف
          </span>
        )}
        <div className="search-view-actions">
          <button
            className="search-action-btn"
            onClick={() => results.length > 0 && (expandedFiles.size === results.length ? collapseAllFiles() : expandAllFiles())}
            title="طي/توسيع الكل"
            disabled={results.length === 0}
          >
            <FolderOpen size={14} />
          </button>
          <button
            className="search-action-btn"
            onClick={handleSearch}
            title="تحديث البحث"
            disabled={!query.trim() || isSearching}
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Search inputs */}
      <div className="search-view-inputs">
        <div className="search-input-row">
          <input
            ref={searchInputRef}
            type="text"
            className="search-input"
            placeholder="بحث..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            className="search-go-btn"
            onClick={handleSearch}
            disabled={!query.trim() || isSearching || !rootPath}
            title="بحث"
          >
            {isSearching ? <Loader2 size={14} className="spin" /> : <Search size={14} />}
          </button>
        </div>

        <div className="search-options-row">
          <button
            className={`search-option-btn ${caseSensitive ? 'active' : ''}`}
            onClick={() => toggleOption('caseSensitive')}
            title="مطابقة حالة الأحرف"
          >
            <CaseSensitive size={14} />
          </button>
          <button
            className={`search-option-btn ${wholeWord ? 'active' : ''}`}
            onClick={() => toggleOption('wholeWord')}
            title="كلمة كاملة"
          >
            <WholeWord size={14} />
          </button>
          <button
            className={`search-option-btn ${useRegex ? 'active' : ''}`}
            onClick={() => toggleOption('useRegex')}
            title="تعبير نمطي (Regex)"
          >
            <Regex size={14} />
          </button>
          <button
            className={`search-option-btn ${showReplace ? 'active' : ''}`}
            onClick={toggleShowReplace}
            title={showReplace ? 'إخفاء الاستبدال' : 'إظهار الاستبدال'}
          >
            <Replace size={14} />
          </button>
        </div>

        {showReplace && (
          <div className="search-replace-row">
            <input
              type="text"
              className="search-input"
              placeholder="استبدال بـ..."
              value={replaceText}
              onChange={(e) => setReplaceText(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button
              className="search-go-btn"
              onClick={handleReplaceAll}
              disabled={!query.trim() || totalMatches === 0 || isSearching}
              title="استبدال الكل"
            >
              <ReplaceAll size={14} />
            </button>
          </div>
        )}

        <div className="search-filters-toggle">
          <button
            className="search-filters-btn"
            onClick={() => setShowFilters(!showFilters)}
          >
            {showFilters ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            <span>تصفية</span>
          </button>
        </div>

        {showFilters && (
          <div className="search-filters">
            <input
              type="text"
              className="search-filter-input"
              placeholder="تضمين: *.ترقيم"
              value={includePattern}
              onChange={(e) => setIncludePattern(e.target.value)}
            />
            <input
              type="text"
              className="search-filter-input"
              placeholder="استثناء: node_modules"
              value={excludePattern}
              onChange={(e) => setExcludePattern(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* Results */}
      <div className="search-view-results">
        {isSearching ? (
          <div className="search-loading">
            <Loader2 size={20} className="spin" />
            <span>جاري البحث...</span>
          </div>
        ) : results.length > 0 ? (
          results.map(renderFileGroup)
        ) : query.trim() && !isSearching ? (
          <div className="search-no-results">
            <span>لا توجد نتائج</span>
          </div>
        ) : !rootPath ? (
          <div className="search-empty">
            <FolderOpen size={32} />
            <span>افتح مجلداً للبحث</span>
          </div>
        ) : (
          <div className="search-empty">
            <Search size={32} />
            <span>ابحث في الملفات</span>
          </div>
        )}
      </div>
    </div>
  )
}
