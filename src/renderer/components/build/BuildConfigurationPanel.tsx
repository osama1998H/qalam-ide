import React from 'react'
import { X, Settings2, Cpu, Target, Zap, Monitor, Globe } from 'lucide-react'
import { useBuildStore } from '../../stores/useBuildStore'
import {
  BUILD_LABELS,
  OptimizationLevel,
  OutputTarget,
  TARGET_TRIPLES,
  TargetTripleKey
} from '../../types/build'

interface BuildConfigurationPanelProps {
  visible: boolean
  onClose: () => void
}

export function BuildConfigurationPanel({ visible, onClose }: BuildConfigurationPanelProps) {
  const {
    configuration,
    setMode,
    setOptimizationLevel,
    setOutputTarget,
    setTargetTriple,
    setWasmJsBindings,
    setTiming,
    resetConfiguration
  } = useBuildStore()

  // Handle keyboard shortcuts
  React.useEffect(() => {
    if (!visible) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [visible, onClose])

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  if (!visible) return null

  return (
    <div className="build-config-overlay" onClick={handleBackdropClick}>
      <div className="build-config-panel">
        {/* Header */}
        <div className="build-config-header">
          <div className="build-config-title">
            <Settings2 size={20} />
            <span>{BUILD_LABELS.buildConfiguration}</span>
          </div>
          <button className="build-config-close" onClick={onClose} title="إغلاق (Escape)">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="build-config-content">
          {/* Build Mode */}
          <section className="build-config-section">
            <h3 className="build-config-section-title">
              <Cpu size={16} />
              {BUILD_LABELS.buildMode}
            </h3>
            <div className="build-mode-toggle">
              <button
                className={`build-mode-btn ${configuration.mode === 'debug' ? 'active' : ''}`}
                onClick={() => setMode('debug')}
              >
                <span className="mode-label">{BUILD_LABELS.debug}</span>
                <span className="mode-hint">Debug</span>
              </button>
              <button
                className={`build-mode-btn ${configuration.mode === 'release' ? 'active' : ''}`}
                onClick={() => setMode('release')}
              >
                <span className="mode-label">{BUILD_LABELS.release}</span>
                <span className="mode-hint">Release</span>
              </button>
            </div>
          </section>

          {/* Optimization Level */}
          <section className="build-config-section">
            <h3 className="build-config-section-title">
              <Zap size={16} />
              {BUILD_LABELS.optimizationLevel}
            </h3>
            <div className="optimization-selector">
              {(['O0', 'O1', 'O2', 'O3'] as OptimizationLevel[]).map((level) => (
                <button
                  key={level}
                  className={`opt-level-btn ${configuration.optimizationLevel === level ? 'active' : ''}`}
                  onClick={() => setOptimizationLevel(level)}
                >
                  <span className="opt-level">{level}</span>
                  <span className="opt-label">
                    {level === 'O0' && BUILD_LABELS.O0.split(' (')[0]}
                    {level === 'O1' && BUILD_LABELS.O1.split(' (')[0]}
                    {level === 'O2' && BUILD_LABELS.O2.split(' (')[0]}
                    {level === 'O3' && BUILD_LABELS.O3.split(' (')[0]}
                  </span>
                </button>
              ))}
            </div>
          </section>

          {/* Output Target */}
          <section className="build-config-section">
            <h3 className="build-config-section-title">
              <Target size={16} />
              {BUILD_LABELS.outputTarget}
            </h3>
            <div className="output-target-grid">
              {(['native', 'wasm', 'llvm-ir', 'assembly', 'object'] as OutputTarget[]).map((target) => (
                <button
                  key={target}
                  className={`output-target-btn ${configuration.outputTarget === target ? 'active' : ''}`}
                  onClick={() => setOutputTarget(target)}
                >
                  {target === 'native' && <Monitor size={16} />}
                  {target === 'wasm' && <Globe size={16} />}
                  {target === 'llvm-ir' && <span className="target-icon">IR</span>}
                  {target === 'assembly' && <span className="target-icon">ASM</span>}
                  {target === 'object' && <span className="target-icon">OBJ</span>}
                  <span className="target-label">{BUILD_LABELS[target]}</span>
                </button>
              ))}
            </div>

            {/* WASM JS Bindings option */}
            {configuration.outputTarget === 'wasm' && (
              <label className="build-config-checkbox">
                <input
                  type="checkbox"
                  checked={configuration.wasmJsBindings || false}
                  onChange={(e) => setWasmJsBindings(e.target.checked)}
                />
                <span>{BUILD_LABELS.wasmJsBindings}</span>
              </label>
            )}
          </section>

          {/* Target Platform */}
          <section className="build-config-section">
            <h3 className="build-config-section-title">
              <Cpu size={16} />
              {BUILD_LABELS.targetPlatform}
            </h3>
            <select
              className="build-config-select"
              value={configuration.targetTriple || 'native'}
              onChange={(e) => {
                const key = e.target.value as TargetTripleKey
                setTargetTriple(TARGET_TRIPLES[key])
              }}
            >
              <option value="native">{BUILD_LABELS['native-target']}</option>
              <option value="x86_64-linux">{BUILD_LABELS['x86_64-linux']}</option>
              <option value="x86_64-macos">{BUILD_LABELS['x86_64-macos']}</option>
              <option value="aarch64-linux">{BUILD_LABELS['aarch64-linux']}</option>
              <option value="aarch64-macos">{BUILD_LABELS['aarch64-macos']}</option>
              <option value="wasm32-wasi">{BUILD_LABELS['wasm32-wasi']}</option>
              <option value="wasm32-unknown">{BUILD_LABELS['wasm32-unknown']}</option>
            </select>
          </section>

          {/* Advanced Options */}
          <section className="build-config-section">
            <h3 className="build-config-section-title">
              <Settings2 size={16} />
              خيارات متقدمة
            </h3>
            <label className="build-config-checkbox">
              <input
                type="checkbox"
                checked={configuration.timing || false}
                onChange={(e) => setTiming(e.target.checked)}
              />
              <span>{BUILD_LABELS.showTiming}</span>
            </label>
          </section>
        </div>

        {/* Footer */}
        <div className="build-config-footer">
          <button className="build-config-reset" onClick={resetConfiguration}>
            إعادة التعيين
          </button>
          <button className="build-config-done" onClick={onClose}>
            تم
          </button>
        </div>
      </div>
    </div>
  )
}
