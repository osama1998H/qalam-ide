import React, { useState, useRef, useEffect, useCallback } from 'react'
import { X, ChevronUp, ChevronDown, Replace, ReplaceAll, CaseSensitive, WholeWord, Regex } from 'lucide-react'
import { EditorView } from '@codemirror/view'
import { EditorSelection } from '@codemirror/state'
import {
  SearchQuery,
  setSearchQuery,
  getSearchQuery,
  findNext,
  findPrevious,
  replaceNext,
  replaceAll,
  searchKeymap
} from '@codemirror/search'

interface FindReplaceProps {
  view: EditorView | null
  visible: boolean
  showReplace: boolean
  onClose: () => void
  onToggleReplace: () => void
}

export default function FindReplace({
  view,
  visible,
  showReplace,
  onClose,
  onToggleReplace
}: FindReplaceProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [replaceTerm, setReplaceTerm] = useState('')
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [wholeWord, setWholeWord] = useState(false)
  const [useRegex, setUseRegex] = useState(false)
  const [matchInfo, setMatchInfo] = useState<{ current: number; total: number } | null>(null)

  const searchInputRef = useRef<HTMLInputElement>(null)

  // Focus search input when panel opens
  useEffect(() => {
    if (visible && searchInputRef.current) {
      searchInputRef.current.focus()
      searchInputRef.current.select()
    }
  }, [visible])

  // Create search query
  const createQuery = useCallback(() => {
    return new SearchQuery({
      search: searchTerm,
      caseSensitive,
      literal: !useRegex,
      wholeWord,
      replace: replaceTerm
    })
  }, [searchTerm, replaceTerm, caseSensitive, wholeWord, useRegex])

  // Count matches and find current position
  const updateMatchInfo = useCallback(() => {
    if (!view || !searchTerm) {
      setMatchInfo(null)
      return
    }

    try {
      const query = createQuery()
      const cursor = query.getCursor(view.state.doc)
      let total = 0
      let current = 0
      const selectionFrom = view.state.selection.main.from
      const selectionTo = view.state.selection.main.to

      while (!cursor.next().done) {
        total++
        // Check if this match is the current selection
        if (cursor.value.from === selectionFrom && cursor.value.to === selectionTo) {
          current = total
        } else if (current === 0 && cursor.value.from <= selectionFrom) {
          current = total
        }
      }

      setMatchInfo(total > 0 ? { current: current || 1, total } : null)
    } catch (e) {
      setMatchInfo(null)
    }
  }, [view, searchTerm, createQuery])

  // Update search query in editor when parameters change
  useEffect(() => {
    if (!view || !searchTerm) {
      if (view) {
        // Clear search when empty
        view.dispatch({
          effects: setSearchQuery.of(new SearchQuery({ search: '' }))
        })
      }
      setMatchInfo(null)
      return
    }

    try {
      const query = createQuery()
      view.dispatch({ effects: setSearchQuery.of(query) })
      updateMatchInfo()
    } catch (e) {
      // Invalid regex
      setMatchInfo(null)
    }
  }, [view, searchTerm, replaceTerm, caseSensitive, wholeWord, useRegex, createQuery, updateMatchInfo])

  // Find next match
  const handleFindNext = useCallback(() => {
    if (!view || !searchTerm) return

    // First ensure query is set
    try {
      const query = createQuery()
      view.dispatch({ effects: setSearchQuery.of(query) })
    } catch (e) {
      return
    }

    // Execute find next
    findNext(view)

    // Focus the editor to show the selection
    view.focus()

    // Update match info after a small delay
    setTimeout(updateMatchInfo, 20)
  }, [view, searchTerm, createQuery, updateMatchInfo])

  // Find previous match
  const handleFindPrevious = useCallback(() => {
    if (!view || !searchTerm) return

    // First ensure query is set
    try {
      const query = createQuery()
      view.dispatch({ effects: setSearchQuery.of(query) })
    } catch (e) {
      return
    }

    // Execute find previous
    findPrevious(view)

    // Focus the editor to show the selection
    view.focus()

    // Update match info after a small delay
    setTimeout(updateMatchInfo, 20)
  }, [view, searchTerm, createQuery, updateMatchInfo])

  // Replace current match
  const handleReplaceNext = useCallback(() => {
    if (!view || !searchTerm) return

    try {
      // Set query with replace term
      const query = createQuery()
      view.dispatch({ effects: setSearchQuery.of(query) })

      // Get current selection
      const { from, to } = view.state.selection.main
      const selectedText = view.state.doc.sliceString(from, to)

      // Check if current selection matches search
      let matches = false
      if (useRegex) {
        try {
          const regex = new RegExp(searchTerm, caseSensitive ? '' : 'i')
          matches = regex.test(selectedText)
        } catch (e) {
          matches = false
        }
      } else {
        if (caseSensitive) {
          matches = selectedText === searchTerm
        } else {
          matches = selectedText.toLowerCase() === searchTerm.toLowerCase()
        }
      }

      if (matches && from !== to) {
        // Replace the selection directly
        view.dispatch({
          changes: { from, to, insert: replaceTerm },
          selection: EditorSelection.cursor(from + replaceTerm.length)
        })
        // Find next after replace
        setTimeout(() => {
          findNext(view)
          view.focus()
          updateMatchInfo()
        }, 10)
      } else {
        // Find next first, then user can replace
        findNext(view)
        view.focus()
        setTimeout(updateMatchInfo, 20)
      }
    } catch (e) {
      console.error('Replace error:', e)
    }
  }, [view, searchTerm, replaceTerm, caseSensitive, useRegex, createQuery, updateMatchInfo])

  // Replace all matches
  const handleReplaceAll = useCallback(() => {
    if (!view || !searchTerm) return

    try {
      const query = createQuery()
      const cursor = query.getCursor(view.state.doc)
      const changes: { from: number; to: number; insert: string }[] = []

      // Collect all matches
      while (!cursor.next().done) {
        changes.push({
          from: cursor.value.from,
          to: cursor.value.to,
          insert: replaceTerm
        })
      }

      if (changes.length > 0) {
        // Apply all changes at once (in reverse order to maintain positions)
        view.dispatch({
          changes: changes.reverse()
        })
        view.focus()
      }

      setTimeout(updateMatchInfo, 20)
    } catch (e) {
      console.error('Replace all error:', e)
    }
  }, [view, searchTerm, replaceTerm, createQuery, updateMatchInfo])

  // Handle keyboard events
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (e.shiftKey) {
        handleFindPrevious()
      } else {
        handleFindNext()
      }
    } else if (e.key === 'F3') {
      e.preventDefault()
      if (e.shiftKey) {
        handleFindPrevious()
      } else {
        handleFindNext()
      }
    }
  }, [onClose, handleFindNext, handleFindPrevious])

  if (!visible) return null

  return (
    <div className="find-replace-panel" onKeyDown={handleKeyDown}>
      <div className="find-replace-row">
        <div className="find-input-wrapper">
          <input
            ref={searchInputRef}
            type="text"
            className="find-input"
            placeholder="بحث..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {matchInfo && (
            <span className="match-count">
              {matchInfo.current} / {matchInfo.total}
            </span>
          )}
          {searchTerm && !matchInfo && (
            <span className="match-count no-results">لا نتائج</span>
          )}
        </div>

        <div className="find-options">
          <button
            className={`find-option-button ${caseSensitive ? 'active' : ''}`}
            onClick={() => setCaseSensitive(!caseSensitive)}
            title="مطابقة حالة الأحرف"
          >
            <CaseSensitive size={14} />
          </button>
          <button
            className={`find-option-button ${wholeWord ? 'active' : ''}`}
            onClick={() => setWholeWord(!wholeWord)}
            title="كلمة كاملة"
          >
            <WholeWord size={14} />
          </button>
          <button
            className={`find-option-button ${useRegex ? 'active' : ''}`}
            onClick={() => setUseRegex(!useRegex)}
            title="تعبير نمطي (Regex)"
          >
            <Regex size={14} />
          </button>
        </div>

        <div className="find-actions">
          <button
            className="find-action-button"
            onClick={handleFindPrevious}
            title="السابق (Shift+Enter)"
            disabled={!searchTerm || !matchInfo}
          >
            <ChevronUp size={16} />
          </button>
          <button
            className="find-action-button"
            onClick={handleFindNext}
            title="التالي (Enter)"
            disabled={!searchTerm || !matchInfo}
          >
            <ChevronDown size={16} />
          </button>
          <button
            className="find-toggle-replace"
            onClick={onToggleReplace}
            title={showReplace ? 'إخفاء الاستبدال' : 'إظهار الاستبدال'}
          >
            <Replace size={14} />
          </button>
          <button
            className="find-close-button"
            onClick={onClose}
            title="إغلاق (Esc)"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {showReplace && (
        <div className="find-replace-row">
          <div className="find-input-wrapper">
            <input
              type="text"
              className="find-input"
              placeholder="استبدال بـ..."
              value={replaceTerm}
              onChange={(e) => setReplaceTerm(e.target.value)}
            />
          </div>

          <div className="replace-actions">
            <button
              className="replace-action-button"
              onClick={handleReplaceNext}
              title="استبدال التالي"
              disabled={!searchTerm || !matchInfo}
            >
              <Replace size={14} />
              <span>استبدال</span>
            </button>
            <button
              className="replace-action-button"
              onClick={handleReplaceAll}
              title="استبدال الكل"
              disabled={!searchTerm || !matchInfo}
            >
              <ReplaceAll size={14} />
              <span>استبدال الكل</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
