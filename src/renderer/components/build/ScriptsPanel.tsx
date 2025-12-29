import React from 'react'
import { Play, Terminal, Loader2, CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { useProjectStore } from '../../stores/useProjectStore'
import { useBuildStore } from '../../stores/useBuildStore'
import { BUILD_LABELS } from '../../types/build'

interface ScriptsPanelProps {
  onOutput?: (output: string, type: 'normal' | 'error' | 'success') => void
}

export function ScriptsPanel({ onOutput }: ScriptsPanelProps) {
  const { config, projectPath, isProject } = useProjectStore()
  const { isRunningScript, runningScriptName, setRunningScript } = useBuildStore()
  const [expanded, setExpanded] = React.useState(true)
  const [lastResults, setLastResults] = React.useState<Record<string, { success: boolean; duration: number }>>({})

  // Get scripts from project config
  const scripts = React.useMemo(() => {
    if (!config?.scripts) return []
    return Object.entries(config.scripts).map(([name, command]) => ({
      name,
      command: typeof command === 'string' ? command : ''
    }))
  }, [config?.scripts])

  const handleRunScript = async (name: string, command: string) => {
    if (!projectPath || isRunningScript) return

    setRunningScript(name)
    onOutput?.(`> ${BUILD_LABELS.runScript} ${name}: ${command}\n`, 'normal')

    try {
      // Set up output listeners
      const removeStdout = window.qalam.build.onStdout((output) => {
        onOutput?.(output, 'normal')
      })
      const removeStderr = window.qalam.build.onStderr((error) => {
        onOutput?.(error, 'error')
      })

      const result = await window.qalam.build.runScript(projectPath, command)

      removeStdout()
      removeStderr()

      setLastResults(prev => ({
        ...prev,
        [name]: { success: result.success, duration: result.duration }
      }))

      if (result.success) {
        onOutput?.(`\n✓ ${name} اكتمل بنجاح (${result.duration}ms)\n`, 'success')
      } else {
        onOutput?.(`\n✗ ${name} فشل (رمز الخروج: ${result.exitCode})\n`, 'error')
      }
    } catch (error) {
      onOutput?.(`\n✗ خطأ في تشغيل السكربت: ${error}\n`, 'error')
      setLastResults(prev => ({
        ...prev,
        [name]: { success: false, duration: 0 }
      }))
    } finally {
      setRunningScript(null)
    }
  }

  if (!isProject || scripts.length === 0) {
    return null
  }

  return (
    <div className="scripts-panel">
      <div className="scripts-panel-header" onClick={() => setExpanded(!expanded)}>
        <div className="scripts-panel-title">
          <Terminal size={16} />
          <span>{BUILD_LABELS.scripts}</span>
          <span className="scripts-count">{scripts.length}</span>
        </div>
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </div>

      {expanded && (
        <div className="scripts-panel-content">
          {scripts.map(({ name, command }) => {
            const isRunning = runningScriptName === name
            const lastResult = lastResults[name]

            return (
              <div key={name} className="script-item">
                <div className="script-info">
                  <span className="script-name">{name}</span>
                  <span className="script-command" title={command}>{command}</span>
                </div>
                <div className="script-actions">
                  {lastResult && !isRunning && (
                    <span className={`script-status ${lastResult.success ? 'success' : 'error'}`}>
                      {lastResult.success ? <CheckCircle size={14} /> : <XCircle size={14} />}
                    </span>
                  )}
                  <button
                    className="script-run-btn"
                    onClick={() => handleRunScript(name, command)}
                    disabled={isRunningScript}
                    title={`${BUILD_LABELS.runScript} ${name}`}
                  >
                    {isRunning ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Play size={14} />
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
