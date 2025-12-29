import React, { useState, useEffect, useCallback } from 'react'
import { X, RefreshCw, Cpu, GitBranch, Network, AlertCircle, ChevronDown } from 'lucide-react'
import { parseIR, IRModule, IRFunction } from '../utils/tarqeemIRParser'
import ThreeAddressView from './ir-viewer/ThreeAddressView'
import SSAFormView from './ir-viewer/SSAFormView'
import ControlFlowView from './ir-viewer/ControlFlowView'
import '../styles/panels/ir-viewer.css'

type ViewMode = 'tac' | 'ssa' | 'cfg'

interface IRViewerPanelProps {
  visible: boolean
  onClose: () => void
  filePath: string | null
  content: string
  onHighlightRange?: (start: number, end: number) => void
}

export default function IRViewerPanel({
  visible,
  onClose,
  filePath,
  content,
  onHighlightRange
}: IRViewerPanelProps) {
  const [irModule, setIrModule] = useState<IRModule | null>(null)
  const [rawIR, setRawIR] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [lastParsedContent, setLastParsedContent] = useState<string>('')
  const [viewMode, setViewMode] = useState<ViewMode>('tac')
  const [selectedFunction, setSelectedFunction] = useState<string>('')
  const [showFunctionDropdown, setShowFunctionDropdown] = useState(false)

  // Generate IR when panel becomes visible or file changes
  const generateIR = useCallback(async () => {
    if (!filePath) {
      setError('يرجى حفظ الملف أولاً')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await window.qalam.compiler.generateIR(filePath)

      if (result.success && result.ir) {
        setRawIR(result.ir)
        const parsed = parseIR(result.ir)
        setIrModule(parsed)
        setLastParsedContent(content)
        setError(null)

        // Select first function by default
        if (parsed.functions.length > 0 && !selectedFunction) {
          setSelectedFunction(parsed.functions[0].name)
        }
      } else {
        setError(result.error || 'فشل في توليد التمثيل الوسيط')
      }
    } catch (e) {
      setError(`خطأ: ${e}`)
    } finally {
      setLoading(false)
    }
  }, [filePath, content, selectedFunction])

  // Generate when panel becomes visible or file changes
  useEffect(() => {
    if (visible && filePath) {
      generateIR()
    }
  }, [visible, filePath])

  // Get current function
  const currentFunction = irModule?.functions.find((f) => f.name === selectedFunction)

  // Check if content has changed since last parse
  const contentChanged = content !== lastParsedContent && irModule !== null

  // Mode labels
  const modeLabels: Record<ViewMode, { ar: string; en: string; icon: React.ReactNode }> = {
    tac: { ar: 'كود ثلاثي العناوين', en: 'TAC', icon: <Cpu size={14} /> },
    ssa: { ar: 'صيغة التعيين الوحيد', en: 'SSA', icon: <GitBranch size={14} /> },
    cfg: { ar: 'مخطط تدفق التحكم', en: 'CFG', icon: <Network size={14} /> }
  }

  if (!visible) {
    return null
  }

  return (
    <div className="ir-viewer-panel">
      <div className="ir-viewer-header">
        <div className="ir-viewer-title">
          <Cpu size={16} />
          <span>عارض التمثيل الوسيط (IR)</span>
          {contentChanged && (
            <span className="ir-stale-indicator" title="المحتوى تغيّر - اضغط للتحديث">
              *
            </span>
          )}
        </div>
        <div className="ir-viewer-actions">
          <button
            className="ir-refresh-btn"
            onClick={generateIR}
            disabled={loading || !filePath}
            title="تحديث"
          >
            <RefreshCw size={14} className={loading ? 'ir-spinning' : ''} />
          </button>
          <button className="ir-close-btn" onClick={onClose} title="إغلاق">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Mode Selector */}
      <div className="ir-mode-selector">
        {(Object.keys(modeLabels) as ViewMode[]).map((mode) => (
          <button
            key={mode}
            className={`ir-mode-btn ${viewMode === mode ? 'active' : ''}`}
            onClick={() => setViewMode(mode)}
            title={modeLabels[mode].ar}
          >
            {modeLabels[mode].icon}
            <span>{modeLabels[mode].en}</span>
          </button>
        ))}
      </div>

      {/* Function Selector */}
      {irModule && irModule.functions.length > 0 && (
        <div className="ir-function-selector">
          <button
            className="ir-function-dropdown-btn"
            onClick={() => setShowFunctionDropdown(!showFunctionDropdown)}
          >
            <span className="ir-function-label">دالة:</span>
            <span className="ir-function-name">@{selectedFunction || 'اختر دالة'}</span>
            <ChevronDown size={14} />
          </button>
          {showFunctionDropdown && (
            <div className="ir-function-dropdown">
              {irModule.functions.map((func) => (
                <button
                  key={func.name}
                  className={`ir-function-option ${func.name === selectedFunction ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedFunction(func.name)
                    setShowFunctionDropdown(false)
                  }}
                >
                  <span className="ir-fn-name">@{func.name}</span>
                  <span className="ir-fn-meta">
                    ({func.params.length} params, {func.blocks.length} blocks)
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="ir-viewer-content">
        {loading && (
          <div className="ir-loading">
            <RefreshCw size={24} className="ir-spinning" />
            <span>جاري توليد التمثيل الوسيط...</span>
          </div>
        )}

        {error && !loading && (
          <div className="ir-error">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {irModule !== null && !loading && !error && (
          <>
            {viewMode === 'tac' && (
              <ThreeAddressView
                irModule={irModule}
                rawIR={rawIR}
                selectedFunction={selectedFunction}
                onHighlightRange={onHighlightRange}
              />
            )}
            {viewMode === 'ssa' && (
              <SSAFormView
                func={currentFunction || null}
                onHighlightRange={onHighlightRange}
              />
            )}
            {viewMode === 'cfg' && (
              <ControlFlowView
                func={currentFunction || null}
                onHighlightRange={onHighlightRange}
              />
            )}
          </>
        )}

        {!irModule && !loading && !error && (
          <div className="ir-empty">
            <Cpu size={32} />
            <span>لا يوجد تمثيل وسيط</span>
            <span className="ir-empty-hint">افتح ملف .ترقيم لتوليد التمثيل الوسيط</span>
          </div>
        )}
      </div>
    </div>
  )
}
