import React from 'react'

interface ConfirmDialogProps {
  visible: boolean
  fileName: string
  onSave: () => void
  onDiscard: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  visible,
  fileName,
  onSave,
  onDiscard,
  onCancel
}: ConfirmDialogProps) {
  if (!visible) return null

  return (
    <div className="confirm-dialog-overlay" onClick={onCancel}>
      <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <h3>حفظ التغييرات؟</h3>
        <p>
          هل تريد حفظ التغييرات في "{fileName}" قبل الإغلاق؟
          <br />
          <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
            سيتم فقدان التغييرات غير المحفوظة إذا لم تحفظ.
          </span>
        </p>
        <div className="confirm-dialog-actions">
          <button className="primary" onClick={onSave}>
            حفظ
          </button>
          <button className="danger" onClick={onDiscard}>
            تجاهل
          </button>
          <button onClick={onCancel}>
            إلغاء
          </button>
        </div>
      </div>
    </div>
  )
}
