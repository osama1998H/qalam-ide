import React, { useState, useEffect } from 'react'
import { FileText, Play, Box, TestTube, X } from 'lucide-react'

interface Template {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  content: string
}

const templates: Template[] = [
  {
    id: 'empty',
    name: 'ملف فارغ',
    description: 'ملف ترقيم فارغ مع تعليق',
    icon: <FileText size={24} />,
    content: `بسم_الله

// ملف جديد

الحمد_لله
`
  },
  {
    id: 'main',
    name: 'برنامج رئيسي',
    description: 'دالة رئيسية مع مثال بسيط',
    icon: <Play size={24} />,
    content: `بسم_الله

// برنامج رئيسي

دالة رئيسية() {
    اطبع("مرحباً بالعالم!")
}

الحمد_لله
`
  },
  {
    id: 'class',
    name: 'صنف/وحدة',
    description: 'هيكل صنف مع منشئ ودوال',
    icon: <Box size={24} />,
    content: `بسم_الله

// صنف جديد

صنف اسم_الصنف {
    خاص _قيمة: عدد

    منشئ() {
        هذا._قيمة = 0
    }

    عام دالة احصل_قيمة() -> عدد {
        أرجع هذا._قيمة
    }

    عام دالة عيّن_قيمة(قيمة: عدد) {
        هذا._قيمة = قيمة
    }
}

صدّر اسم_الصنف

الحمد_لله
`
  },
  {
    id: 'test',
    name: 'ملف اختبار',
    description: 'ملف اختبارات مع دوال اختبار',
    icon: <TestTube size={24} />,
    content: `بسم_الله

// ملف اختبار

استورد { اختبر، تأكد، تساوي } من "اختبار"

اختبر("اختبار أساسي") {
    تأكد(صحيح)
}

اختبر("اختبار المساواة") {
    متغير نتيجة = 2 + 2
    تساوي(نتيجة، 4)
}

اختبر("اختبار النص") {
    متغير نص = "مرحباً"
    تأكد(نص.الطول > 0)
}

الحمد_لله
`
  }
]

interface NewFileDialogProps {
  visible: boolean
  parentPath: string
  onClose: () => void
  onConfirm: (filePath: string, content: string) => void
}

export default function NewFileDialog({
  visible,
  parentPath,
  onClose,
  onConfirm
}: NewFileDialogProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('empty')
  const [fileName, setFileName] = useState('')

  // Reset state when dialog opens
  useEffect(() => {
    if (visible) {
      setSelectedTemplate('empty')
      setFileName('')
    }
  }, [visible])

  if (!visible) return null

  const selectedTemplateData = templates.find((t) => t.id === selectedTemplate)

  const handleConfirm = () => {
    if (!fileName.trim()) return

    // Auto-add .ترقيم extension if not present
    let finalName = fileName.trim()
    if (!finalName.endsWith('.ترقيم')) {
      finalName += '.ترقيم'
    }

    const filePath = `${parentPath}/${finalName}`
    const content = selectedTemplateData?.content || ''
    onConfirm(filePath, content)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConfirm()
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog new-file-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h3>ملف جديد</h3>
          <button className="dialog-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="template-grid">
          {templates.map((template) => (
            <button
              key={template.id}
              className={`template-card ${selectedTemplate === template.id ? 'selected' : ''}`}
              onClick={() => setSelectedTemplate(template.id)}
            >
              <div className="template-icon">{template.icon}</div>
              <div className="template-info">
                <span className="template-name">{template.name}</span>
                <span className="template-description">{template.description}</span>
              </div>
            </button>
          ))}
        </div>

        {selectedTemplateData && (
          <div className="template-preview">
            <div className="template-preview-header">معاينة القالب</div>
            <pre className="template-preview-content">
              {selectedTemplateData.content}
            </pre>
          </div>
        )}

        <div className="new-file-input-section">
          <label htmlFor="new-file-name">اسم الملف</label>
          <div className="new-file-input-wrapper">
            <input
              id="new-file-name"
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="اسم_الملف"
              autoFocus
            />
            <span className="file-extension">.ترقيم</span>
          </div>
        </div>

        <div className="dialog-actions">
          <button onClick={handleConfirm} className="primary" disabled={!fileName.trim()}>
            إنشاء
          </button>
          <button onClick={onClose}>إلغاء</button>
        </div>
      </div>
    </div>
  )
}
