import React, { useState, useRef, useEffect } from 'react'
import { X, Package, AlertCircle } from 'lucide-react'

interface DependencyAddDialogProps {
  isDev: boolean
  onAdd: (name: string, version: string, isDev: boolean) => void
  onClose: () => void
  existingDeps: string[]
}

// Standard library modules for autocomplete
const STDLIB_MODULES = [
  'مجموعات',
  'رياضيات',
  'نص',
  'ملفات',
  'شبكة',
  'وقت',
  'أخطاء',
  'تشفير'
]

export default function DependencyAddDialog({
  isDev,
  onAdd,
  onClose,
  existingDeps
}: DependencyAddDialogProps) {
  const [name, setName] = useState('')
  const [version, setVersion] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus name input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Filter suggestions as user types
  useEffect(() => {
    if (name.trim() === '') {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    // Filter stdlib modules that match and aren't already added
    const filtered = STDLIB_MODULES.filter(
      (mod) =>
        mod.includes(name) &&
        !existingDeps.includes(mod)
    )
    setSuggestions(filtered)
    setShowSuggestions(filtered.length > 0)
    setSelectedIndex(-1)
  }, [name, existingDeps])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate name
    if (!name.trim()) {
      setError('اسم الحزمة مطلوب')
      return
    }

    // Check for duplicates
    if (existingDeps.includes(name.trim())) {
      setError('هذه الاعتمادية موجودة بالفعل')
      return
    }

    // Default version if empty
    const finalVersion = version.trim() || '1.0.0'

    onAdd(name.trim(), finalVersion, isDev)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Escape') {
        onClose()
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1))
        break
      case 'Enter':
        if (selectedIndex >= 0) {
          e.preventDefault()
          setName(suggestions[selectedIndex])
          setShowSuggestions(false)
        }
        break
      case 'Escape':
        if (showSuggestions) {
          setShowSuggestions(false)
        } else {
          onClose()
        }
        break
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    setName(suggestion)
    setShowSuggestions(false)
    // Focus version input after selecting
    setTimeout(() => {
      const versionInput = document.querySelector('.dep-add-version') as HTMLInputElement
      versionInput?.focus()
    }, 0)
  }

  return (
    <div className="dep-add-overlay" onClick={onClose}>
      <div className="dep-add-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dep-add-header">
          <div className="dep-add-title">
            <Package size={18} />
            <span>
              {isDev ? 'إضافة اعتمادية تطوير' : 'إضافة اعتمادية'}
            </span>
          </div>
          <button className="dep-add-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="dep-add-form">
          {error && (
            <div className="dep-add-error">
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}

          <div className="dep-add-field">
            <label>اسم الحزمة</label>
            <div className="dep-add-autocomplete">
              <input
                ref={inputRef}
                type="text"
                className="dep-add-input dep-add-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                placeholder="اسم الحزمة..."
                autoComplete="off"
                dir="rtl"
              />
              {showSuggestions && (
                <ul className="dep-add-suggestions">
                  {suggestions.map((suggestion, index) => (
                    <li
                      key={suggestion}
                      className={`dep-add-suggestion ${index === selectedIndex ? 'selected' : ''}`}
                      onClick={() => handleSuggestionClick(suggestion)}
                    >
                      <Package size={14} />
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="dep-add-field">
            <label>الإصدار</label>
            <input
              type="text"
              className="dep-add-input dep-add-version"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="1.0.0"
              dir="ltr"
            />
          </div>

          <div className="dep-add-actions">
            <button type="button" className="dep-add-cancel" onClick={onClose}>
              إلغاء
            </button>
            <button type="submit" className="dep-add-submit">
              إضافة
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
