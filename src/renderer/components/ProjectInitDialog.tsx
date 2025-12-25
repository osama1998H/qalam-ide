import React, { useState } from 'react'
import { Package, FolderOpen, X } from 'lucide-react'

interface ProjectInitDialogProps {
  visible: boolean
  folderName: string
  folderPath: string
  onInitialize: (projectName: string) => void
  onSkip: () => void
  onCancel: () => void
}

export default function ProjectInitDialog({
  visible,
  folderName,
  folderPath,
  onInitialize,
  onSkip,
  onCancel
}: ProjectInitDialogProps) {
  const [projectName, setProjectName] = useState(folderName)

  // Update project name when folder name changes
  React.useEffect(() => {
    setProjectName(folderName)
  }, [folderName])

  if (!visible) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (projectName.trim()) {
      onInitialize(projectName.trim())
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel()
    }
  }

  // Truncate long paths for display
  const displayPath = folderPath.length > 50
    ? '...' + folderPath.slice(-47)
    : folderPath

  return (
    <div className="dialog-overlay" onClick={onCancel} onKeyDown={handleKeyDown}>
      <div className="dialog project-init-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <Package size={24} className="dialog-icon" />
          <h3>تهيئة مشروع جديد</h3>
          <button className="dialog-close" onClick={onCancel} title="إغلاق">
            <X size={18} />
          </button>
        </div>

        <div className="dialog-content">
          <p className="dialog-message">
            المجلد "<strong>{folderName}</strong>" لا يحتوي على ملف مشروع.
            <br />
            هل تريد تهيئة مشروع ترقيم جديد؟
          </p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="project-name">اسم المشروع</label>
              <input
                id="project-name"
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="أدخل اسم المشروع"
                autoFocus
                dir="rtl"
              />
            </div>

            <div className="form-info">
              <FolderOpen size={14} />
              <span>سيتم إنشاء ملف <code>ترقيم.حزمة</code> في: {displayPath}</span>
            </div>
          </form>
        </div>

        <div className="dialog-actions">
          <button
            className="btn btn-primary"
            onClick={() => projectName.trim() && onInitialize(projectName.trim())}
            disabled={!projectName.trim()}
          >
            <Package size={16} />
            تهيئة المشروع
          </button>
          <button className="btn btn-secondary" onClick={onSkip}>
            <FolderOpen size={16} />
            فتح كمجلد فقط
          </button>
          <button className="btn btn-ghost" onClick={onCancel}>
            إلغاء
          </button>
        </div>
      </div>
    </div>
  )
}
