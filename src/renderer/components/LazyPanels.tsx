/**
 * Phase 6.1: Lazy-loaded panel components
 *
 * These panels are code-split to reduce initial bundle size and improve startup time.
 * Heavy panels like IRViewerPanel (which imports D3/Dagre-D3) are loaded on-demand.
 */

import React, { lazy, Suspense, ComponentType } from 'react'

// Loading fallback component (RTL-aware)
export function PanelLoadingFallback() {
  return (
    <div className="panel-loading" dir="rtl">
      <div className="panel-loading-spinner" />
      <span>جاري التحميل...</span>
    </div>
  )
}

// Lazy imports - ordered by impact on bundle size
// 1. IRViewerPanel - imports D3/Dagre-D3 (~100KB+)
export const LazyIRViewerPanel = lazy(() => import('./IRViewerPanel'))

// 2. AstViewerPanel - complex recursive rendering
export const LazyAstViewerPanel = lazy(() => import('./AstViewerPanel'))

// 3. PerformanceProfilerPanel - not frequently used
export const LazyPerformanceProfilerPanel = lazy(() => import('./PerformanceProfilerPanel'))

// 4. ManifestEditorPanel - only needed for project editing
export const LazyManifestEditorPanel = lazy(() =>
  import('./manifest-editor').then(module => ({ default: module.ManifestEditorPanel }))
)

// 5. BuildConfigurationPanel - only needed during builds
export const LazyBuildConfigurationPanel = lazy(() =>
  import('./build').then(module => ({ default: module.BuildConfigurationPanel }))
)

// 6. SettingsPanel - occasional use
export const LazySettingsPanel = lazy(() => import('./SettingsPanel'))

// 7. KeyboardShortcutsOverlay - occasional use
export const LazyKeyboardShortcutsOverlay = lazy(() => import('./KeyboardShortcutsOverlay'))

// 8. InteractiveModePanel - optional feature
export const LazyInteractiveModePanel = lazy(() => import('./InteractiveModePanel'))

// 9. DebugSidebar - only needed during debugging
export const LazyDebugSidebar = lazy(() => import('./DebugSidebar'))

// 10. TypeInspectorPanel - optional feature
export const LazyTypeInspectorPanel = lazy(() => import('./TypeInspectorPanel'))

// 11. CompilationPipelinePanel - optional feature
export const LazyCompilationPipelinePanel = lazy(() => import('./CompilationPipelinePanel'))

/**
 * Higher-order component that wraps a lazy component with Suspense
 * Only renders when visible to avoid unnecessary loading
 */
export function withLazySuspense<P extends { visible: boolean }>(
  LazyComponent: ComponentType<P>,
  fallback: React.ReactNode = <PanelLoadingFallback />
): React.FC<P> {
  return function LazyWrapper(props: P) {
    // Don't load the component until it becomes visible
    if (!props.visible) {
      return null
    }

    return (
      <Suspense fallback={fallback}>
        <LazyComponent {...props} />
      </Suspense>
    )
  }
}
