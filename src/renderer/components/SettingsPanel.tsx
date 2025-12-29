import React from 'react'
import { X, RotateCcw, Type, Hash, WrapText, Brackets, Palette, FileText, Keyboard } from 'lucide-react'
import { useEditorSettings, ThemeType } from '../stores/useEditorSettings'

interface SettingsPanelProps {
  visible: boolean
  onClose: () => void
  onOpenKeyboardShortcuts: () => void
}

interface ToggleSwitchProps {
  checked: boolean
  onChange: () => void
}

function ToggleSwitch({ checked, onChange }: ToggleSwitchProps) {
  return (
    <button
      className={`toggle-switch ${checked ? 'checked' : ''}`}
      onClick={onChange}
      role="switch"
      aria-checked={checked}
    >
      <span className="toggle-thumb" />
    </button>
  )
}

interface SettingRowProps {
  icon: React.ReactNode
  label: string
  description?: string
  children: React.ReactNode
}

function SettingRow({ icon, label, description, children }: SettingRowProps) {
  return (
    <div className="setting-row">
      <div className="setting-info">
        <div className="setting-icon">{icon}</div>
        <div className="setting-text">
          <span className="setting-label">{label}</span>
          {description && <span className="setting-description">{description}</span>}
        </div>
      </div>
      <div className="setting-control">{children}</div>
    </div>
  )
}

export default function SettingsPanel({ visible, onClose, onOpenKeyboardShortcuts }: SettingsPanelProps) {
  const settings = useEditorSettings()

  if (!visible) return null

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>الإعدادات</h2>
          <div className="settings-header-actions">
            <button
              className="settings-reset-button"
              onClick={settings.resetToDefaults}
              title="إعادة التعيين للافتراضي"
            >
              <RotateCcw size={16} />
            </button>
            <button className="settings-close-button" onClick={onClose} title="إغلاق">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="settings-content">
          {/* Appearance Section */}
          <div className="settings-section">
            <h3 className="settings-section-title">المظهر</h3>

            <SettingRow
              icon={<Palette size={18} />}
              label="السمة"
              description="اختر مظهر المحرر"
            >
              <select
                className="settings-select"
                value={settings.theme}
                onChange={(e) => settings.setTheme(e.target.value as ThemeType)}
              >
                <option value="dark">داكن</option>
                <option value="light">فاتح</option>
                <option value="high-contrast">تباين عالي</option>
              </select>
            </SettingRow>
          </div>

          {/* Font Section */}
          <div className="settings-section">
            <h3 className="settings-section-title">الخط</h3>

            <SettingRow
              icon={<Type size={18} />}
              label="حجم الخط"
              description="حجم الخط في المحرر (8-32)"
            >
              <div className="font-size-control">
                <button
                  className="font-size-button"
                  onClick={() => settings.setFontSize(settings.fontSize - 1)}
                  disabled={settings.fontSize <= 8}
                >
                  −
                </button>
                <span className="font-size-value">{settings.fontSize}px</span>
                <button
                  className="font-size-button"
                  onClick={() => settings.setFontSize(settings.fontSize + 1)}
                  disabled={settings.fontSize >= 32}
                >
                  +
                </button>
              </div>
            </SettingRow>

            <SettingRow
              icon={<Type size={18} />}
              label="نوع الخط"
              description="خط المحرر"
            >
              <select
                className="settings-select"
                value={settings.fontFamily}
                onChange={(e) => settings.setFontFamily(e.target.value)}
              >
                <option value="'Amiri', 'Cairo', monospace">Amiri</option>
                <option value="'Cairo', 'Amiri', monospace">Cairo</option>
                <option value="'Noto Sans Arabic', monospace">Noto Sans Arabic</option>
                <option value="monospace">Monospace</option>
              </select>
            </SettingRow>
          </div>

          {/* Editor Section */}
          <div className="settings-section">
            <h3 className="settings-section-title">المحرر</h3>

            <SettingRow
              icon={<Hash size={18} />}
              label="أرقام الأسطر"
              description="إظهار أرقام الأسطر"
            >
              <ToggleSwitch
                checked={settings.lineNumbers}
                onChange={settings.toggleLineNumbers}
              />
            </SettingRow>

            <SettingRow
              icon={<WrapText size={18} />}
              label="التفاف النص"
              description="التفاف الأسطر الطويلة"
            >
              <ToggleSwitch
                checked={settings.wordWrap}
                onChange={settings.toggleWordWrap}
              />
            </SettingRow>

            <SettingRow
              icon={<Brackets size={18} />}
              label="إغلاق الأقواس تلقائياً"
              description="إغلاق الأقواس والعلامات تلقائياً"
            >
              <ToggleSwitch
                checked={settings.autoCloseBrackets}
                onChange={settings.toggleAutoCloseBrackets}
              />
            </SettingRow>
          </div>

          {/* Indentation Section */}
          <div className="settings-section">
            <h3 className="settings-section-title">المسافة البادئة</h3>

            <SettingRow
              icon={<Hash size={18} />}
              label="حجم المسافة البادئة"
              description="عدد المسافات لكل مستوى"
            >
              <select
                className="settings-select"
                value={settings.tabSize}
                onChange={(e) => settings.setTabSize(Number(e.target.value))}
              >
                <option value={2}>2 مسافات</option>
                <option value={4}>4 مسافات</option>
                <option value={8}>8 مسافات</option>
              </select>
            </SettingRow>
          </div>

          {/* Formatting Section */}
          <div className="settings-section">
            <h3 className="settings-section-title">التنسيق</h3>

            <SettingRow
              icon={<FileText size={18} />}
              label="تنسيق عند الحفظ"
              description="تنسيق الكود تلقائياً عند الحفظ"
            >
              <ToggleSwitch
                checked={settings.formatOnSave}
                onChange={settings.toggleFormatOnSave}
              />
            </SettingRow>

            <SettingRow
              icon={<FileText size={18} />}
              label="تنسيق عند اللصق"
              description="تنسيق الكود تلقائياً عند اللصق"
            >
              <ToggleSwitch
                checked={settings.formatOnPaste}
                onChange={settings.toggleFormatOnPaste}
              />
            </SettingRow>
          </div>

          {/* Keyboard Shortcuts */}
          <div className="settings-section">
            <h3 className="settings-section-title">اختصارات لوحة المفاتيح</h3>
            <button
              className="shortcuts-open-button"
              onClick={() => {
                onClose()
                onOpenKeyboardShortcuts()
              }}
            >
              <Keyboard size={18} />
              <span>عرض وتخصيص الاختصارات</span>
              <span className="shortcuts-open-hint">Ctrl+Shift+/</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
