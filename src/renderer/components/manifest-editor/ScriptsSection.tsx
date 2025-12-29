import React, { useState } from 'react'
import { Terminal, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'

interface ScriptsSectionProps {
  scripts: Record<string, string>
  onUpdate: (scripts: Record<string, string>) => void
}

export default function ScriptsSection({ scripts, onUpdate }: ScriptsSectionProps) {
  const [expanded, setExpanded] = useState(true)
  const [newScriptName, setNewScriptName] = useState('')
  const [newScriptCommand, setNewScriptCommand] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)

  const handleAddScript = () => {
    if (!newScriptName.trim() || !newScriptCommand.trim()) return

    onUpdate({
      ...scripts,
      [newScriptName.trim()]: newScriptCommand.trim()
    })

    setNewScriptName('')
    setNewScriptCommand('')
    setShowAddForm(false)
  }

  const handleRemoveScript = (name: string) => {
    const newScripts = { ...scripts }
    delete newScripts[name]
    onUpdate(newScripts)
  }

  const handleUpdateCommand = (name: string, command: string) => {
    onUpdate({
      ...scripts,
      [name]: command
    })
  }

  const scriptsCount = Object.keys(scripts).length

  return (
    <div className="manifest-section">
      <div className="manifest-deps-group">
        <button
          className="manifest-deps-header"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="manifest-deps-title">
            <Terminal size={16} />
            <span>السكربتات</span>
            <span className="manifest-deps-count">{scriptsCount}</span>
          </div>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {expanded && (
          <div className="manifest-deps-content">
            {scriptsCount === 0 && !showAddForm ? (
              <div className="manifest-deps-empty">لا توجد سكربتات</div>
            ) : (
              <div className="manifest-scripts-list">
                {Object.entries(scripts).map(([name, command]) => (
                  <div key={name} className="manifest-script-row">
                    <span className="manifest-script-name">{name}</span>
                    <input
                      type="text"
                      className="manifest-script-command"
                      value={command}
                      onChange={(e) => handleUpdateCommand(name, e.target.value)}
                      placeholder="الأمر..."
                      dir="ltr"
                    />
                    <button
                      className="manifest-script-remove"
                      onClick={() => handleRemoveScript(name)}
                      title="إزالة"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Script Form */}
            {showAddForm ? (
              <div className="manifest-script-add-form">
                <input
                  type="text"
                  className="manifest-script-add-name"
                  value={newScriptName}
                  onChange={(e) => setNewScriptName(e.target.value)}
                  placeholder="اسم السكربت"
                  dir="rtl"
                />
                <input
                  type="text"
                  className="manifest-script-add-command"
                  value={newScriptCommand}
                  onChange={(e) => setNewScriptCommand(e.target.value)}
                  placeholder="tarqeem run رئيسي.ترقيم"
                  dir="ltr"
                />
                <div className="manifest-script-add-actions">
                  <button
                    className="manifest-script-add-cancel"
                    onClick={() => {
                      setShowAddForm(false)
                      setNewScriptName('')
                      setNewScriptCommand('')
                    }}
                  >
                    إلغاء
                  </button>
                  <button
                    className="manifest-script-add-submit"
                    onClick={handleAddScript}
                    disabled={!newScriptName.trim() || !newScriptCommand.trim()}
                  >
                    إضافة
                  </button>
                </div>
              </div>
            ) : (
              <button
                className="manifest-add-dep-btn"
                onClick={() => setShowAddForm(true)}
              >
                <Plus size={14} />
                <span>إضافة سكربت</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
