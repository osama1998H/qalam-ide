import React from 'react'
import { User, FileCode, Tag, BookOpen, Globe, GitBranch } from 'lucide-react'
import { ProjectConfig } from '../../types/project'
import VersionInput from './VersionInput'

interface PackageInfoSectionProps {
  config: ProjectConfig
  onUpdate: (updates: Partial<ProjectConfig>) => void
}

interface FormFieldProps {
  icon: React.ReactNode
  label: string
  required?: boolean
  children: React.ReactNode
}

function FormField({ icon, label, required, children }: FormFieldProps) {
  return (
    <div className="manifest-field">
      <label className="manifest-field-label">
        {icon}
        <span>{label}</span>
        {required && <span className="manifest-required">*</span>}
      </label>
      <div className="manifest-field-control">{children}</div>
    </div>
  )
}

export default function PackageInfoSection({ config, onUpdate }: PackageInfoSectionProps) {
  return (
    <div className="manifest-section">
      <h3 className="manifest-section-title">معلومات الحزمة</h3>

      <div className="manifest-section-content">
        {/* Name - Required */}
        <FormField
          icon={<Tag size={16} />}
          label="اسم الحزمة"
          required
        >
          <input
            type="text"
            className="manifest-input"
            value={config.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            placeholder="اسم المشروع"
            dir="rtl"
          />
        </FormField>

        {/* Version - Required */}
        <FormField
          icon={<Tag size={16} />}
          label="الإصدار"
          required
        >
          <VersionInput
            value={config.version}
            onChange={(version) => onUpdate({ version })}
          />
        </FormField>

        {/* Entry Point */}
        <FormField
          icon={<FileCode size={16} />}
          label="نقطة البداية"
        >
          <input
            type="text"
            className="manifest-input"
            value={config.entryPoint}
            onChange={(e) => onUpdate({ entryPoint: e.target.value })}
            placeholder="رئيسي.ترقيم"
            dir="ltr"
          />
        </FormField>

        {/* Description */}
        <FormField
          icon={<BookOpen size={16} />}
          label="الوصف"
        >
          <textarea
            className="manifest-textarea"
            value={config.description || ''}
            onChange={(e) => onUpdate({ description: e.target.value })}
            placeholder="وصف المشروع..."
            rows={2}
            dir="rtl"
          />
        </FormField>

        {/* Author */}
        <FormField
          icon={<User size={16} />}
          label="المؤلف"
        >
          <input
            type="text"
            className="manifest-input"
            value={config.author || ''}
            onChange={(e) => onUpdate({ author: e.target.value })}
            placeholder="اسم المؤلف"
            dir="rtl"
          />
        </FormField>

        {/* License */}
        <FormField
          icon={<BookOpen size={16} />}
          label="الرخصة"
        >
          <select
            className="manifest-select"
            value={config.license || ''}
            onChange={(e) => onUpdate({ license: e.target.value })}
          >
            <option value="">اختر رخصة...</option>
            <option value="MIT">MIT</option>
            <option value="Apache-2.0">Apache 2.0</option>
            <option value="GPL-3.0">GPL 3.0</option>
            <option value="BSD-3-Clause">BSD 3-Clause</option>
            <option value="ISC">ISC</option>
            <option value="UNLICENSED">بدون رخصة</option>
          </select>
        </FormField>

        {/* Repository */}
        <FormField
          icon={<GitBranch size={16} />}
          label="المستودع"
        >
          <input
            type="url"
            className="manifest-input"
            value={config.repository || ''}
            onChange={(e) => onUpdate({ repository: e.target.value })}
            placeholder="https://github.com/..."
            dir="ltr"
          />
        </FormField>

        {/* Homepage */}
        <FormField
          icon={<Globe size={16} />}
          label="الموقع"
        >
          <input
            type="url"
            className="manifest-input"
            value={config.homepage || ''}
            onChange={(e) => onUpdate({ homepage: e.target.value })}
            placeholder="https://..."
            dir="ltr"
          />
        </FormField>
      </div>
    </div>
  )
}
