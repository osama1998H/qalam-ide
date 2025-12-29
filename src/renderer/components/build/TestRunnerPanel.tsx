import React from 'react'
import { Play, Loader2, CheckCircle, XCircle, TestTube, RefreshCw } from 'lucide-react'
import { useProjectStore } from '../../stores/useProjectStore'
import { useBuildStore } from '../../stores/useBuildStore'
import { BUILD_LABELS, formatDuration } from '../../types/build'

interface TestRunnerPanelProps {
  onOutput?: (output: string, type: 'normal' | 'error' | 'success') => void
}

export function TestRunnerPanel({ onOutput }: TestRunnerPanelProps) {
  const { projectPath, isProject } = useProjectStore()
  const { isTesting, setTesting, lastTestResult, setLastTestResult } = useBuildStore()

  const handleRunTests = async () => {
    if (!projectPath || isTesting) return

    setTesting(true)
    setLastTestResult(null)
    onOutput?.(`> ${BUILD_LABELS.runTests}...\n`, 'normal')

    try {
      // Set up output listeners
      const removeStdout = window.qalam.build.onStdout((output) => {
        onOutput?.(output, 'normal')
      })
      const removeStderr = window.qalam.build.onStderr((error) => {
        onOutput?.(error, 'error')
      })

      const result = await window.qalam.build.test(projectPath)

      removeStdout()
      removeStderr()

      setLastTestResult(result)

      if (result.success) {
        onOutput?.(`\n✓ جميع الاختبارات ناجحة (${result.passed} ${BUILD_LABELS.testsPassed})\n`, 'success')
      } else {
        onOutput?.(`\n✗ فشلت بعض الاختبارات (${result.passed} ${BUILD_LABELS.testsPassed}, ${result.failed} ${BUILD_LABELS.testsFailed})\n`, 'error')
      }
    } catch (error) {
      onOutput?.(`\n✗ خطأ في تشغيل الاختبارات: ${error}\n`, 'error')
    } finally {
      setTesting(false)
    }
  }

  if (!isProject) {
    return null
  }

  return (
    <div className="test-runner-panel">
      <div className="test-runner-header">
        <div className="test-runner-title">
          <TestTube size={16} />
          <span>{BUILD_LABELS.runTests}</span>
        </div>
        <div className="test-runner-actions">
          <button
            className="test-run-btn"
            onClick={handleRunTests}
            disabled={isTesting}
            title={BUILD_LABELS.runTests}
          >
            {isTesting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>{BUILD_LABELS.testing}</span>
              </>
            ) : (
              <>
                <Play size={14} />
                <span>تشغيل</span>
              </>
            )}
          </button>
        </div>
      </div>

      {lastTestResult && (
        <div className="test-runner-results">
          <div className={`test-summary ${lastTestResult.success ? 'success' : 'error'}`}>
            {lastTestResult.success ? (
              <CheckCircle size={18} />
            ) : (
              <XCircle size={18} />
            )}
            <div className="test-summary-stats">
              <span className="test-passed">{lastTestResult.passed} {BUILD_LABELS.testsPassed}</span>
              <span className="test-failed">{lastTestResult.failed} {BUILD_LABELS.testsFailed}</span>
              <span className="test-total">{lastTestResult.total} {BUILD_LABELS.testsTotal}</span>
            </div>
            <span className="test-duration">{formatDuration(lastTestResult.duration)}</span>
          </div>

          {/* Individual test results would go here */}
          {lastTestResult.results && lastTestResult.results.length > 0 && (
            <div className="test-results-list">
              {/* Render individual test results when tarqeem provides detailed results */}
            </div>
          )}
        </div>
      )}

      {!lastTestResult && !isTesting && (
        <div className="test-runner-empty">
          <TestTube size={24} />
          <span>اضغط على تشغيل لبدء الاختبارات</span>
        </div>
      )}
    </div>
  )
}
