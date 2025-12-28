/**
 * Documentation Browser Panel
 *
 * Arabic documentation browser for Tarqeem's standard library.
 * Displays built-in functions organized by category with search functionality.
 */

import React, { useCallback, useMemo } from 'react'
import {
  Search,
  ChevronDown,
  ChevronRight,
  BookOpen,
  FolderOpen,
  Code,
  AlertTriangle,
  Info,
  ArrowRight,
  X
} from 'lucide-react'
import { useDocumentationStore } from '../stores/useDocumentationStore'
import { BuiltinFunction, DocCategory, CATEGORY_DESCRIPTIONS } from '../data/builtin-docs'
import '../styles/panels/doc-browser.css'

// Category icons
const CATEGORY_ICONS: Record<DocCategory, React.ReactNode> = {
  'إدخال/إخراج': <Code size={14} />,
  'رياضيات': <span className="doc-category-icon-text">∑</span>,
  'نصوص': <span className="doc-category-icon-text">""</span>,
  'مصفوفات': <span className="doc-category-icon-text">[]</span>,
  'ملفات': <FolderOpen size={14} />,
  'تحويلات': <ArrowRight size={14} />,
  'أنواع': <span className="doc-category-icon-text">؟</span>,
  'نظام': <span className="doc-category-icon-text">⚙</span>
}

export default function DocBrowserPanel() {
  const {
    searchQuery,
    setSearchQuery,
    selectedFunction,
    setSelectedFunction,
    expandedCategories,
    toggleCategory,
    getFunctionsByCategory,
    getCategoryOrder
  } = useDocumentationStore()

  const functionsByCategory = useMemo(() => getFunctionsByCategory(), [searchQuery])
  const categoryOrder = getCategoryOrder()

  // Handle search input
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }, [setSearchQuery])

  // Clear search
  const handleClearSearch = useCallback(() => {
    setSearchQuery('')
  }, [setSearchQuery])

  // Handle function click
  const handleFunctionClick = useCallback((func: BuiltinFunction) => {
    setSelectedFunction(selectedFunction?.name === func.name ? null : func)
  }, [selectedFunction, setSelectedFunction])

  // Render function signature
  const renderSignature = (func: BuiltinFunction) => {
    const params = func.params.map(p => {
      let paramStr = p.name
      if (p.type) paramStr += `: ${p.type}`
      if (p.optional) paramStr += '؟'
      return paramStr
    }).join('، ')

    return `دالة ${func.name}(${params})${func.returns.type !== 'عدم' ? ` -> ${func.returns.type}` : ''}`
  }

  // Render detail view for selected function
  const renderDetailView = () => {
    if (!selectedFunction) return null

    return (
      <div className="doc-detail-view">
        <div className="doc-detail-header">
          <span className="doc-detail-title">تفاصيل الدالة</span>
          <button
            className="doc-detail-close"
            onClick={() => setSelectedFunction(null)}
            title="إغلاق"
          >
            <X size={14} />
          </button>
        </div>

        {/* Signature */}
        <div className="doc-detail-signature">
          <code>{renderSignature(selectedFunction)}</code>
        </div>

        {/* Description */}
        <div className="doc-detail-description">
          {selectedFunction.description}
        </div>

        {/* Parameters */}
        {selectedFunction.params.length > 0 && (
          <div className="doc-detail-section">
            <h4 className="doc-detail-section-title">المعاملات</h4>
            <table className="doc-params-table">
              <thead>
                <tr>
                  <th>الاسم</th>
                  <th>النوع</th>
                  <th>الوصف</th>
                </tr>
              </thead>
              <tbody>
                {selectedFunction.params.map((param, index) => (
                  <tr key={index}>
                    <td className="doc-param-name">
                      {param.name}
                      {param.optional && <span className="doc-param-optional">اختياري</span>}
                    </td>
                    <td className="doc-param-type">{param.type}</td>
                    <td className="doc-param-desc">{param.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Return type */}
        {selectedFunction.returns.type !== 'عدم' && (
          <div className="doc-detail-section">
            <h4 className="doc-detail-section-title">القيمة المُرجَعة</h4>
            <div className="doc-return-info">
              <span className="doc-return-type">{selectedFunction.returns.type}</span>
              {selectedFunction.returns.description && (
                <span className="doc-return-desc"> - {selectedFunction.returns.description}</span>
              )}
            </div>
          </div>
        )}

        {/* Notes */}
        {selectedFunction.notes && (
          <div className="doc-detail-section doc-notes">
            <Info size={14} />
            <span>{selectedFunction.notes}</span>
          </div>
        )}

        {/* Warning */}
        {selectedFunction.warning && (
          <div className="doc-detail-section doc-warning">
            <AlertTriangle size={14} />
            <span>{selectedFunction.warning}</span>
          </div>
        )}

        {/* Examples */}
        {selectedFunction.examples.length > 0 && (
          <div className="doc-detail-section">
            <h4 className="doc-detail-section-title">أمثلة</h4>
            {selectedFunction.examples.map((example, index) => (
              <pre key={index} className="doc-example-code">
                <code>{example}</code>
              </pre>
            ))}
          </div>
        )}

        {/* See also */}
        {selectedFunction.seeAlso.length > 0 && (
          <div className="doc-detail-section">
            <h4 className="doc-detail-section-title">انظر أيضاً</h4>
            <div className="doc-see-also">
              {selectedFunction.seeAlso.map((name, index) => (
                <button
                  key={index}
                  className="doc-see-also-link"
                  onClick={() => {
                    const func = functionsByCategory.get(selectedFunction.category)?.find(f => f.name === name)
                      || Array.from(functionsByCategory.values()).flat().find(f => f.name === name)
                    if (func) setSelectedFunction(func)
                  }}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Count total visible functions
  const totalFunctions = useMemo(() => {
    return Array.from(functionsByCategory.values()).reduce((sum, funcs) => sum + funcs.length, 0)
  }, [functionsByCategory])

  return (
    <div className="doc-browser-panel">
      {/* Header */}
      <div className="doc-browser-header">
        <div className="doc-browser-title">
          <BookOpen size={16} />
          <span>المكتبة القياسية</span>
        </div>
        {searchQuery && (
          <span className="doc-browser-count">{totalFunctions} دالة</span>
        )}
      </div>

      {/* Search */}
      <div className="doc-browser-search">
        <Search size={14} className="doc-search-icon" />
        <input
          type="text"
          className="doc-search-input"
          placeholder="بحث في الدوال..."
          value={searchQuery}
          onChange={handleSearchChange}
        />
        {searchQuery && (
          <button className="doc-search-clear" onClick={handleClearSearch}>
            <X size={14} />
          </button>
        )}
      </div>

      {/* Function list by category */}
      <div className="doc-browser-list">
        {categoryOrder.map(category => {
          const functions = functionsByCategory.get(category) || []
          if (functions.length === 0) return null

          const isExpanded = expandedCategories.has(category)

          return (
            <div key={category} className="doc-category">
              <button
                className="doc-category-header"
                onClick={() => toggleCategory(category)}
              >
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                {CATEGORY_ICONS[category]}
                <span className="doc-category-name">{category}</span>
                <span className="doc-category-count">{functions.length}</span>
              </button>

              {isExpanded && (
                <div className="doc-category-functions">
                  {functions.map(func => (
                    <button
                      key={func.name}
                      className={`doc-function-item ${selectedFunction?.name === func.name ? 'selected' : ''}`}
                      onClick={() => handleFunctionClick(func)}
                    >
                      <span className="doc-function-name">{func.name}</span>
                      <span className="doc-function-brief">
                        {func.description.length > 30
                          ? func.description.slice(0, 30) + '...'
                          : func.description}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {totalFunctions === 0 && searchQuery && (
          <div className="doc-no-results">
            <Search size={24} />
            <span>لا توجد نتائج</span>
          </div>
        )}
      </div>

      {/* Detail view */}
      {renderDetailView()}
    </div>
  )
}
