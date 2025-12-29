import React, { useState } from 'react'
import { Package, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { DependencySpec } from '../../types/project'
import DependencyAddDialog from './DependencyAddDialog'

interface DependencySectionProps {
  dependencies: Record<string, string | DependencySpec>
  devDependencies: Record<string, string | DependencySpec>
  onUpdate: (
    deps: Record<string, string | DependencySpec>,
    devDeps: Record<string, string | DependencySpec>
  ) => void
}

export default function DependencySection({
  dependencies,
  devDependencies,
  onUpdate
}: DependencySectionProps) {
  const [showDepsExpanded, setShowDepsExpanded] = useState(true)
  const [showDevDepsExpanded, setShowDevDepsExpanded] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [addingToDev, setAddingToDev] = useState(false)

  const handleAddDependency = (name: string, version: string, isDev: boolean) => {
    if (isDev) {
      onUpdate(dependencies, { ...devDependencies, [name]: version })
    } else {
      onUpdate({ ...dependencies, [name]: version }, devDependencies)
    }
    setShowAddDialog(false)
  }

  const handleRemoveDependency = (name: string, isDev: boolean) => {
    if (isDev) {
      const newDevDeps = { ...devDependencies }
      delete newDevDeps[name]
      onUpdate(dependencies, newDevDeps)
    } else {
      const newDeps = { ...dependencies }
      delete newDeps[name]
      onUpdate(newDeps, devDependencies)
    }
  }

  const handleUpdateVersion = (name: string, version: string, isDev: boolean) => {
    if (isDev) {
      onUpdate(dependencies, { ...devDependencies, [name]: version })
    } else {
      onUpdate({ ...dependencies, [name]: version }, devDependencies)
    }
  }

  const openAddDialog = (isDev: boolean) => {
    setAddingToDev(isDev)
    setShowAddDialog(true)
  }

  const depsCount = Object.keys(dependencies).length
  const devDepsCount = Object.keys(devDependencies).length

  return (
    <div className="manifest-section">
      {/* Production Dependencies */}
      <div className="manifest-deps-group">
        <button
          className="manifest-deps-header"
          onClick={() => setShowDepsExpanded(!showDepsExpanded)}
        >
          <div className="manifest-deps-title">
            <Package size={16} />
            <span>الاعتماديات</span>
            <span className="manifest-deps-count">{depsCount}</span>
          </div>
          {showDepsExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showDepsExpanded && (
          <div className="manifest-deps-content">
            {depsCount === 0 ? (
              <div className="manifest-deps-empty">لا توجد اعتماديات</div>
            ) : (
              <div className="manifest-deps-list">
                {Object.entries(dependencies).map(([name, version]) => (
                  <DependencyRow
                    key={name}
                    name={name}
                    version={typeof version === 'string' ? version : version.نسخة || ''}
                    onVersionChange={(v) => handleUpdateVersion(name, v, false)}
                    onRemove={() => handleRemoveDependency(name, false)}
                  />
                ))}
              </div>
            )}
            <button
              className="manifest-add-dep-btn"
              onClick={() => openAddDialog(false)}
            >
              <Plus size={14} />
              <span>إضافة اعتمادية</span>
            </button>
          </div>
        )}
      </div>

      {/* Dev Dependencies */}
      <div className="manifest-deps-group">
        <button
          className="manifest-deps-header"
          onClick={() => setShowDevDepsExpanded(!showDevDepsExpanded)}
        >
          <div className="manifest-deps-title">
            <Package size={16} />
            <span>اعتماديات التطوير</span>
            <span className="manifest-deps-count">{devDepsCount}</span>
          </div>
          {showDevDepsExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showDevDepsExpanded && (
          <div className="manifest-deps-content">
            {devDepsCount === 0 ? (
              <div className="manifest-deps-empty">لا توجد اعتماديات تطوير</div>
            ) : (
              <div className="manifest-deps-list">
                {Object.entries(devDependencies).map(([name, version]) => (
                  <DependencyRow
                    key={name}
                    name={name}
                    version={typeof version === 'string' ? version : version.نسخة || ''}
                    onVersionChange={(v) => handleUpdateVersion(name, v, true)}
                    onRemove={() => handleRemoveDependency(name, true)}
                  />
                ))}
              </div>
            )}
            <button
              className="manifest-add-dep-btn"
              onClick={() => openAddDialog(true)}
            >
              <Plus size={14} />
              <span>إضافة اعتمادية تطوير</span>
            </button>
          </div>
        )}
      </div>

      {/* Add Dialog */}
      {showAddDialog && (
        <DependencyAddDialog
          isDev={addingToDev}
          onAdd={handleAddDependency}
          onClose={() => setShowAddDialog(false)}
          existingDeps={[
            ...Object.keys(dependencies),
            ...Object.keys(devDependencies)
          ]}
        />
      )}
    </div>
  )
}

// Single dependency row
interface DependencyRowProps {
  name: string
  version: string
  onVersionChange: (version: string) => void
  onRemove: () => void
}

function DependencyRow({ name, version, onVersionChange, onRemove }: DependencyRowProps) {
  return (
    <div className="manifest-dep-row">
      <span className="manifest-dep-name">{name}</span>
      <input
        type="text"
        className="manifest-dep-version"
        value={version}
        onChange={(e) => onVersionChange(e.target.value)}
        placeholder="1.0.0"
        dir="ltr"
      />
      <button
        className="manifest-dep-remove"
        onClick={onRemove}
        title="إزالة"
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}
