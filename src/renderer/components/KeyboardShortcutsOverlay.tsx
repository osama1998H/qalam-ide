import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { X, Search, RotateCcw, ChevronDown, ChevronLeft, Keyboard, AlertCircle } from 'lucide-react'
import {
  useKeyboardShortcuts,
  DEFAULT_SHORTCUTS,
  CATEGORY_LABELS,
  formatKeyBinding,
  ShortcutCategory,
  KeyBinding,
  KeyboardShortcut
} from '../stores/useKeyboardShortcuts'
import '../styles/panels/keyboard-shortcuts-overlay.css'

interface KeyboardShortcutsOverlayProps {
  visible: boolean
  onClose: () => void
}

// Order of categories for display
const CATEGORY_ORDER: ShortcutCategory[] = [
  'file',
  'edit',
  'search',
  'navigation',
  'view',
  'build',
  'debug'
]

export default function KeyboardShortcutsOverlay({ visible, onClose }: KeyboardShortcutsOverlayProps) {
  const {
    customBindings,
    searchQuery,
    setSearchQuery,
    setCustomBinding,
    removeCustomBinding,
    resetAllBindings,
    getBinding,
    findConflict
  } = useKeyboardShortcuts()

  const [expandedCategories, setExpandedCategories] = useState<Set<ShortcutCategory>>(
    new Set(CATEGORY_ORDER)
  )
  const [editingShortcut, setEditingShortcut] = useState<string | null>(null)
  const [recordedBinding, setRecordedBinding] = useState<KeyBinding | null>(null)
  const [conflictWarning, setConflictWarning] = useState<KeyboardShortcut | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)

  // Close on Escape
  useEffect(() => {
    if (!visible) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (editingShortcut) {
          setEditingShortcut(null)
          setRecordedBinding(null)
          setConflictWarning(null)
        } else {
          onClose()
        }
        e.preventDefault()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [visible, editingShortcut, onClose])

  // Focus input when editing
  useEffect(() => {
    if (editingShortcut && inputRef.current) {
      inputRef.current.focus()
    }
  }, [editingShortcut])

  // Filter shortcuts by search query
  const filteredShortcuts = useMemo(() => {
    if (!searchQuery.trim()) {
      return DEFAULT_SHORTCUTS
    }

    const query = searchQuery.toLowerCase()
    return DEFAULT_SHORTCUTS.filter(
      s =>
        s.label.includes(query) ||
        s.description.includes(query) ||
        CATEGORY_LABELS[s.category].includes(query)
    )
  }, [searchQuery])

  // Group shortcuts by category
  const shortcutsByCategory = useMemo(() => {
    const grouped: Record<ShortcutCategory, KeyboardShortcut[]> = {
      file: [],
      edit: [],
      search: [],
      navigation: [],
      view: [],
      build: [],
      debug: []
    }

    for (const shortcut of filteredShortcuts) {
      grouped[shortcut.category].push(shortcut)
    }

    return grouped
  }, [filteredShortcuts])

  // Toggle category expansion
  const toggleCategory = useCallback((category: ShortcutCategory) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }, [])

  // Handle shortcut recording
  const handleKeyRecording = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      e.preventDefault()
      e.stopPropagation()

      // Ignore modifier-only presses
      if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) {
        return
      }

      const binding: KeyBinding = {
        key: e.key,
        ctrl: e.ctrlKey || e.metaKey,
        shift: e.shiftKey,
        alt: e.altKey
      }

      setRecordedBinding(binding)

      // Check for conflicts
      if (editingShortcut) {
        const conflict = findConflict(binding, editingShortcut)
        setConflictWarning(conflict)
      }
    },
    [editingShortcut, findConflict]
  )

  // Start editing a shortcut
  const startEditing = useCallback((shortcutId: string) => {
    setEditingShortcut(shortcutId)
    setRecordedBinding(null)
    setConflictWarning(null)
  }, [])

  // Save the recorded binding
  const saveBinding = useCallback(() => {
    if (editingShortcut && recordedBinding) {
      setCustomBinding(editingShortcut, recordedBinding)
      setEditingShortcut(null)
      setRecordedBinding(null)
      setConflictWarning(null)
    }
  }, [editingShortcut, recordedBinding, setCustomBinding])

  // Cancel editing
  const cancelEditing = useCallback(() => {
    setEditingShortcut(null)
    setRecordedBinding(null)
    setConflictWarning(null)
  }, [])

  // Reset a single shortcut
  const resetShortcut = useCallback(
    (shortcutId: string) => {
      removeCustomBinding(shortcutId)
    },
    [removeCustomBinding]
  )

  // Reset all shortcuts
  const handleResetAll = useCallback(() => {
    resetAllBindings()
  }, [resetAllBindings])

  if (!visible) return null

  return (
    <div className="shortcuts-overlay" onClick={onClose}>
      <div className="shortcuts-panel" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="shortcuts-header">
          <div className="shortcuts-title">
            <Keyboard size={20} />
            <h2>اختصارات لوحة المفاتيح</h2>
          </div>
          <button className="shortcuts-close" onClick={onClose} title="إغلاق">
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="shortcuts-search">
          <Search size={16} className="shortcuts-search-icon" />
          <input
            type="text"
            className="shortcuts-search-input"
            placeholder="بحث في الاختصارات..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className="shortcuts-search-clear"
              onClick={() => setSearchQuery('')}
              title="مسح البحث"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Shortcuts List */}
        <div className="shortcuts-content">
          {CATEGORY_ORDER.map(category => {
            const shortcuts = shortcutsByCategory[category]
            if (shortcuts.length === 0) return null

            const isExpanded = expandedCategories.has(category)

            return (
              <div key={category} className="shortcuts-category">
                <button
                  className="shortcuts-category-header"
                  onClick={() => toggleCategory(category)}
                >
                  {isExpanded ? (
                    <ChevronDown size={16} />
                  ) : (
                    <ChevronLeft size={16} />
                  )}
                  <span className="shortcuts-category-name">
                    {CATEGORY_LABELS[category]}
                  </span>
                  <span className="shortcuts-category-count">
                    {shortcuts.length}
                  </span>
                </button>

                {isExpanded && (
                  <div className="shortcuts-category-items">
                    {shortcuts.map(shortcut => {
                      const binding = getBinding(shortcut.id)
                      const isEditing = editingShortcut === shortcut.id
                      const isCustomized = !!customBindings[shortcut.id]

                      return (
                        <div
                          key={shortcut.id}
                          className={`shortcut-item ${isEditing ? 'editing' : ''} ${isCustomized ? 'customized' : ''}`}
                        >
                          <div className="shortcut-info">
                            <span className="shortcut-label">{shortcut.label}</span>
                            <span className="shortcut-description">
                              {shortcut.description}
                            </span>
                          </div>

                          <div className="shortcut-binding">
                            {isEditing ? (
                              <div className="shortcut-edit">
                                <input
                                  ref={inputRef}
                                  type="text"
                                  className="shortcut-input"
                                  placeholder="اضغط الاختصار..."
                                  value={
                                    recordedBinding
                                      ? formatKeyBinding(recordedBinding)
                                      : ''
                                  }
                                  onKeyDown={handleKeyRecording}
                                  readOnly
                                />
                                <div className="shortcut-edit-actions">
                                  <button
                                    className="shortcut-save"
                                    onClick={saveBinding}
                                    disabled={!recordedBinding}
                                    title="حفظ"
                                  >
                                    ✓
                                  </button>
                                  <button
                                    className="shortcut-cancel"
                                    onClick={cancelEditing}
                                    title="إلغاء"
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <span
                                  className={`shortcut-keys ${shortcut.isCustomizable ? 'editable' : ''}`}
                                  onClick={() =>
                                    shortcut.isCustomizable && startEditing(shortcut.id)
                                  }
                                  title={
                                    shortcut.isCustomizable
                                      ? 'اضغط لتعديل الاختصار'
                                      : 'اختصار غير قابل للتعديل'
                                  }
                                >
                                  {formatKeyBinding(binding)}
                                </span>
                                {isCustomized && shortcut.isCustomizable && (
                                  <button
                                    className="shortcut-reset"
                                    onClick={() => resetShortcut(shortcut.id)}
                                    title="إعادة تعيين للافتراضي"
                                  >
                                    <RotateCcw size={12} />
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}

          {filteredShortcuts.length === 0 && (
            <div className="shortcuts-no-results">
              <Search size={32} />
              <span>لا توجد اختصارات مطابقة</span>
            </div>
          )}
        </div>

        {/* Conflict Warning */}
        {conflictWarning && (
          <div className="shortcuts-conflict">
            <AlertCircle size={16} />
            <span>
              هذا الاختصار مستخدم بالفعل لـ "{conflictWarning.label}"
            </span>
          </div>
        )}

        {/* Footer */}
        <div className="shortcuts-footer">
          <button className="shortcuts-reset-all" onClick={handleResetAll}>
            <RotateCcw size={14} />
            إعادة تعيين الكل
          </button>
          <span className="shortcuts-hint">
            اضغط على الاختصار لتعديله
          </span>
        </div>
      </div>
    </div>
  )
}
