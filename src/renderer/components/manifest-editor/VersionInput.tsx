import React, { useState, useEffect } from 'react'
import { Check, X } from 'lucide-react'

interface VersionInputProps {
  value: string
  onChange: (value: string) => void
}

interface ValidationResult {
  valid: boolean
  normalized?: string
  error?: string
}

export default function VersionInput({ value, onChange }: VersionInputProps) {
  const [validation, setValidation] = useState<ValidationResult>({ valid: true })

  // Debounced validation
  useEffect(() => {
    const timer = setTimeout(() => {
      const result = validateVersion(value)
      setValidation(result)
    }, 300)

    return () => clearTimeout(timer)
  }, [value])

  return (
    <div className="version-input-container">
      <input
        type="text"
        className={`manifest-input version-input ${validation.valid ? '' : 'invalid'}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="1.0.0"
        dir="ltr"
      />
      <div className="version-indicator">
        {validation.valid ? (
          <Check size={14} className="version-valid" />
        ) : (
          <X size={14} className="version-invalid" />
        )}
      </div>
      {!validation.valid && validation.error && (
        <div className="version-error">{validation.error}</div>
      )}
    </div>
  )
}

function validateVersion(version: string): ValidationResult {
  if (!version || version.trim() === '') {
    return { valid: false, error: 'الإصدار مطلوب' }
  }

  // Normalize Arabic-Indic numerals to ASCII
  const normalized = version.replace(/[٠-٩]/g, (d) =>
    String.fromCharCode(d.charCodeAt(0) - 0x0660 + 48)
  )

  // Full semver: X.Y.Z
  const fullPattern = /^(\d+)\.(\d+)\.(\d+)$/
  if (fullPattern.test(normalized)) {
    return { valid: true, normalized }
  }

  // Partial: X.Y (auto-pad to X.Y.0)
  const partialPattern = /^(\d+)\.(\d+)$/
  if (partialPattern.test(normalized)) {
    return { valid: true, normalized: `${normalized}.0` }
  }

  // Single: X (auto-pad to X.0.0)
  const singlePattern = /^(\d+)$/
  if (singlePattern.test(normalized)) {
    return { valid: true, normalized: `${normalized}.0.0` }
  }

  // Version with constraint prefix: ^, ~, >=, <=, >, <
  const constraintPattern = /^[\^~]?\d+(\.\d+)?(\.\d+)?$|^[<>=]{1,2}\d+(\.\d+)?(\.\d+)?$/
  if (constraintPattern.test(normalized)) {
    return { valid: true, normalized }
  }

  return {
    valid: false,
    error: 'صيغة غير صالحة (مثال: 1.0.0)'
  }
}
