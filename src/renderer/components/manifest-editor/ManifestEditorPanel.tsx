import React, { useState, useEffect, useCallback } from 'react'
import { X, Save, Package, AlertCircle, Check } from 'lucide-react'
import { useProjectStore } from '../../stores/useProjectStore'
import { ProjectConfig } from '../../types/project'
import PackageInfoSection from './PackageInfoSection'
import DependencySection from './DependencySection'
import ScriptsSection from './ScriptsSection'

interface ManifestEditorPanelProps {
  visible: boolean
  onClose: () => void
}

export default function ManifestEditorPanel({ visible, onClose }: ManifestEditorPanelProps) {
  const { config, isDirty, projectPath, updateConfig, saveConfig, isProject } = useProjectStore()

  // Local copy for editing
  const [localConfig, setLocalConfig] = useState<ProjectConfig | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  // Sync local config when store config changes
  useEffect(() => {
    if (config) {
      setLocalConfig({ ...config })
    }
  }, [config])

  // Reset save status after delay
  useEffect(() => {
    if (saveStatus !== 'idle') {
      const timer = setTimeout(() => setSaveStatus('idle'), 2000)
      return () => clearTimeout(timer)
    }
  }, [saveStatus])

  // Validate the manifest
  const validate = useCallback((): string[] => {
    const errors: string[] = []

    if (!localConfig) return errors

    if (!localConfig.name || localConfig.name.trim() === '') {
      errors.push('اسم الحزمة مطلوب')
    }

    if (!localConfig.version || localConfig.version.trim() === '') {
      errors.push('رقم الإصدار مطلوب')
    } else if (!isValidVersion(localConfig.version)) {
      errors.push('صيغة الإصدار غير صالحة (استخدم X.Y.Z)')
    }

    return errors
  }, [localConfig])

  // Handle field updates
  const handleUpdate = useCallback((updates: Partial<ProjectConfig>) => {
    if (!localConfig) return

    const newConfig = { ...localConfig, ...updates }
    setLocalConfig(newConfig)
    updateConfig(newConfig)

    // Clear validation errors on edit
    setValidationErrors([])
  }, [localConfig, updateConfig])

  // Handle save
  const handleSave = useCallback(async () => {
    const errors = validate()
    if (errors.length > 0) {
      setValidationErrors(errors)
      return
    }

    setIsSaving(true)
    setSaveStatus('idle')

    try {
      const success = await saveConfig()
      setSaveStatus(success ? 'success' : 'error')
    } catch {
      setSaveStatus('error')
    } finally {
      setIsSaving(false)
    }
  }, [validate, saveConfig])

  // Keyboard shortcuts
  useEffect(() => {
    if (!visible) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
      if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [visible, handleSave, onClose])

  if (!visible) return null

  if (!isProject || !localConfig) {
    return (
      <div className="manifest-editor-overlay" onClick={onClose}>
        <div className="manifest-editor-panel" onClick={(e) => e.stopPropagation()}>
          <div className="manifest-editor-header">
            <div className="manifest-editor-title">
              <Package size={20} />
              <h2>محرر الحزمة</h2>
            </div>
            <button className="manifest-close-btn" onClick={onClose} title="إغلاق">
              <X size={18} />
            </button>
          </div>
          <div className="manifest-editor-empty">
            <Package size={48} />
            <p>لا يوجد ملف حزمة مفتوح</p>
            <span>افتح مجلد مشروع يحتوي على ملف ترقيم.حزمة</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="manifest-editor-overlay" onClick={onClose}>
      <div className="manifest-editor-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="manifest-editor-header">
          <div className="manifest-editor-title">
            <Package size={20} />
            <h2>محرر الحزمة</h2>
            {isDirty && <span className="manifest-unsaved-indicator">*</span>}
          </div>
          <div className="manifest-header-actions">
            <button
              className={`manifest-save-btn ${saveStatus}`}
              onClick={handleSave}
              disabled={isSaving}
              title="حفظ (Ctrl+S)"
            >
              {isSaving ? (
                <span className="manifest-saving-spinner" />
              ) : saveStatus === 'success' ? (
                <Check size={16} />
              ) : (
                <Save size={16} />
              )}
              <span>{isSaving ? 'جارٍ الحفظ...' : 'حفظ'}</span>
            </button>
            <button className="manifest-close-btn" onClick={onClose} title="إغلاق">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="manifest-validation-errors">
            <AlertCircle size={16} />
            <ul>
              {validationErrors.map((error, i) => (
                <li key={i}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Content */}
        <div className="manifest-editor-content">
          <PackageInfoSection config={localConfig} onUpdate={handleUpdate} />
          <DependencySection
            dependencies={localConfig.dependencies || {}}
            devDependencies={localConfig.devDependencies || {}}
            onUpdate={(deps, devDeps) =>
              handleUpdate({ dependencies: deps, devDependencies: devDeps })
            }
          />
          <ScriptsSection
            scripts={localConfig.scripts || {}}
            onUpdate={(scripts) => handleUpdate({ scripts })}
          />
        </div>

        {/* Footer */}
        <div className="manifest-editor-footer">
          <span className="manifest-path" title={projectPath || ''}>
            {projectPath ? `${projectPath}/ترقيم.حزمة` : ''}
          </span>
        </div>
      </div>
    </div>
  )
}

// Version validation helper
function isValidVersion(version: string): boolean {
  // Support Arabic-Indic numerals
  const normalized = version
    .replace(/[٠-٩]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0x0660 + 48))

  // Basic semver pattern: X.Y.Z or X.Y or X
  const semverPattern = /^\d+(\.\d+)?(\.\d+)?$/
  return semverPattern.test(normalized)
}
