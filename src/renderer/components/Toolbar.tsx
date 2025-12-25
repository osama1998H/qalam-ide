import React from 'react'
import { FilePlus, FolderOpen, Save, SaveAll, Hammer, Play } from 'lucide-react'

interface ToolbarProps {
  onNew: () => void
  onOpen: () => void
  onSave: () => void
  onSaveAs: () => void
  onCompile: () => void
  onRun: () => void
  canCompile: boolean
  isCompiling: boolean
}

export default function Toolbar({
  onNew,
  onOpen,
  onSave,
  onSaveAs,
  onCompile,
  onRun,
  canCompile,
  isCompiling
}: ToolbarProps) {
  return (
    <div className="toolbar">
      <div className="toolbar-group">
        <button className="toolbar-button" onClick={onNew} title="ملف جديد (Ctrl+N)">
          <FilePlus size={16} />
          جديد
        </button>
        <button className="toolbar-button" onClick={onOpen} title="فتح ملف (Ctrl+O)">
          <FolderOpen size={16} />
          فتح
        </button>
        <button className="toolbar-button" onClick={onSave} title="حفظ (Ctrl+S)">
          <Save size={16} />
          حفظ
        </button>
        <button className="toolbar-button" onClick={onSaveAs} title="حفظ باسم (Ctrl+Shift+S)">
          <SaveAll size={16} />
          حفظ باسم
        </button>
      </div>

      <div className="toolbar-separator" />

      <div className="toolbar-group">
        <button
          className="toolbar-button primary"
          onClick={onCompile}
          disabled={!canCompile || isCompiling}
          title="ترجمة (Ctrl+B)"
        >
          <Hammer size={16} />
          {isCompiling ? 'جارٍ الترجمة...' : 'ترجمة'}
        </button>
        <button
          className="toolbar-button"
          onClick={onRun}
          disabled={!canCompile || isCompiling}
          title="تشغيل (Ctrl+R)"
        >
          <Play size={16} />
          تشغيل
        </button>
      </div>
    </div>
  )
}
