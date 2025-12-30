import React, { useState, useCallback } from 'react'
import { X, Bug, ChevronLeft, ChevronDown, Box, Eye, Layers, Terminal, MemoryStick } from 'lucide-react'
import { Variable, StackFrame } from '../stores/useDebugStore'
import VariablesPanel from './debug/VariablesPanel'
import CallStackPanel from './debug/CallStackPanel'
import WatchPanel from './debug/WatchPanel'
import DebugConsolePanel, { ConsoleOutput } from './debug/DebugConsolePanel'
import { MemoryInspectorPanel } from './debug/memory'

interface DebugSidebarProps {
  visible: boolean
  onClose: () => void

  // Debug state
  isPaused: boolean
  isDebugging: boolean

  // Variables
  variables: Variable[]
  onExpandVariable: (variablesReference: number) => Promise<Variable[]>

  // Call stack
  callStack: StackFrame[]
  currentFrameId: number | null
  onFrameSelect: (frameId: number) => void
  onNavigate: (filePath: string, line: number) => void

  // Watch expressions
  watchExpressions: string[]
  watchResults: Record<string, { value: string; error?: string }>
  onAddWatch: (expression: string) => void
  onRemoveWatch: (expression: string) => void
  onEvaluateWatch: (expression: string) => Promise<void>

  // Console
  consoleOutput: ConsoleOutput[]
  onEvaluateConsole: (expression: string) => Promise<string>
  onClearConsole: () => void
}

// Collapsible panel section
interface PanelSectionProps {
  title: string
  icon: React.ReactNode
  badge?: number
  defaultExpanded?: boolean
  children: React.ReactNode
}

function PanelSection({ title, icon, badge, defaultExpanded = true, children }: PanelSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  return (
    <div className="debug-panel">
      <div
        className="debug-panel-header"
        onClick={() => setExpanded(!expanded)}
      >
        <span className={`debug-panel-icon ${expanded ? 'expanded' : ''}`}>
          {expanded ? <ChevronDown size={12} /> : <ChevronLeft size={12} />}
        </span>
        <span className="debug-panel-title">{title}</span>
        {icon}
        {badge !== undefined && badge > 0 && (
          <span className="debug-panel-badge">{badge}</span>
        )}
      </div>
      <div className={`debug-panel-content ${expanded ? '' : 'collapsed'}`}>
        {children}
      </div>
    </div>
  )
}

export default function DebugSidebar({
  visible,
  onClose,
  isPaused,
  isDebugging,
  variables,
  onExpandVariable,
  callStack,
  currentFrameId,
  onFrameSelect,
  onNavigate,
  watchExpressions,
  watchResults,
  onAddWatch,
  onRemoveWatch,
  onEvaluateWatch,
  consoleOutput,
  onEvaluateConsole,
  onClearConsole
}: DebugSidebarProps) {
  if (!visible) return null

  const disabled = !isDebugging

  return (
    <div className="debug-sidebar">
      <div className="debug-sidebar-header">
        <div className="debug-sidebar-title">
          <Bug size={16} />
          <span>التصحيح</span>
        </div>
        <button
          className="debug-sidebar-close"
          onClick={onClose}
          title="إغلاق"
        >
          <X size={16} />
        </button>
      </div>

      <div className="debug-sidebar-content">
        {/* Variables Panel */}
        <PanelSection
          title="المتغيرات"
          icon={<Box size={14} />}
          badge={variables.length}
          defaultExpanded={true}
        >
          <VariablesPanel
            variables={variables}
            onExpand={onExpandVariable}
            disabled={disabled}
          />
        </PanelSection>

        {/* Watch Expressions Panel */}
        <PanelSection
          title="المراقبة"
          icon={<Eye size={14} />}
          badge={watchExpressions.length}
          defaultExpanded={true}
        >
          <WatchPanel
            expressions={watchExpressions}
            results={watchResults}
            onAdd={onAddWatch}
            onRemove={onRemoveWatch}
            onEvaluate={onEvaluateWatch}
            isPaused={isPaused}
            disabled={disabled}
          />
        </PanelSection>

        {/* Call Stack Panel */}
        <PanelSection
          title="مكدس الاستدعاءات"
          icon={<Layers size={14} />}
          badge={callStack.length}
          defaultExpanded={true}
        >
          <CallStackPanel
            frames={callStack}
            currentFrameId={currentFrameId}
            onFrameSelect={onFrameSelect}
            onNavigate={onNavigate}
            disabled={disabled}
          />
        </PanelSection>

        {/* Debug Console Panel */}
        <PanelSection
          title="وحدة التحكم"
          icon={<Terminal size={14} />}
          defaultExpanded={true}
        >
          <DebugConsolePanel
            output={consoleOutput}
            onEvaluate={onEvaluateConsole}
            onClear={onClearConsole}
            isPaused={isPaused}
            disabled={disabled}
          />
        </PanelSection>

        {/* Memory Inspector Panel */}
        <PanelSection
          title="فاحص الذاكرة"
          icon={<MemoryStick size={14} />}
          defaultExpanded={false}
        >
          <MemoryInspectorPanel />
        </PanelSection>
      </div>
    </div>
  )
}
