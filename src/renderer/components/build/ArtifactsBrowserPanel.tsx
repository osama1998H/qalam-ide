import React from 'react'
import {
  Package,
  RefreshCw,
  Trash2,
  Loader2,
  FileCode,
  FileOutput,
  Globe,
  File,
  FolderOpen
} from 'lucide-react'
import { useProjectStore } from '../../stores/useProjectStore'
import { useBuildStore } from '../../stores/useBuildStore'
import { BUILD_LABELS, BuildArtifact, formatFileSize } from '../../types/build'

interface ArtifactsBrowserPanelProps {
  onOutput?: (output: string, type: 'normal' | 'error' | 'success') => void
}

export function ArtifactsBrowserPanel({ onOutput }: ArtifactsBrowserPanelProps) {
  const { projectPath, isProject } = useProjectStore()
  const { artifacts, setArtifacts, isLoadingArtifacts, setLoadingArtifacts } = useBuildStore()
  const [isCleaning, setIsCleaning] = React.useState(false)

  // Load artifacts when panel mounts or project changes
  React.useEffect(() => {
    if (projectPath && isProject) {
      loadArtifacts()
    }
  }, [projectPath, isProject])

  const loadArtifacts = async () => {
    if (!projectPath) return

    setLoadingArtifacts(true)
    try {
      const result = await window.qalam.build.listArtifacts(projectPath)
      if (result.success) {
        setArtifacts(result.artifacts)
      } else {
        setArtifacts([])
      }
    } catch (error) {
      setArtifacts([])
    } finally {
      setLoadingArtifacts(false)
    }
  }

  const handleClean = async () => {
    if (!projectPath || isCleaning) return

    setIsCleaning(true)
    onOutput?.(`> ${BUILD_LABELS.cleanBuild}...\n`, 'normal')

    try {
      const result = await window.qalam.build.clean(projectPath)
      if (result.success) {
        onOutput?.(`✓ تم تنظيف مخرجات البناء بنجاح\n`, 'success')
        setArtifacts([])
      } else {
        onOutput?.(`✗ فشل في تنظيف مخرجات البناء: ${result.error}\n`, 'error')
      }
    } catch (error) {
      onOutput?.(`✗ خطأ: ${error}\n`, 'error')
    } finally {
      setIsCleaning(false)
    }
  }

  const getArtifactIcon = (type: string) => {
    switch (type) {
      case 'executable':
        return <FileOutput size={16} />
      case 'llvm-ir':
        return <FileCode size={16} />
      case 'assembly':
        return <FileCode size={16} />
      case 'object':
        return <Package size={16} />
      case 'wasm':
        return <Globe size={16} />
      case 'js-bindings':
        return <FileCode size={16} />
      default:
        return <File size={16} />
    }
  }

  const getArtifactTypeLabel = (type: string) => {
    switch (type) {
      case 'executable':
        return BUILD_LABELS.executable
      case 'llvm-ir':
        return BUILD_LABELS.llvmIrFile
      case 'assembly':
        return BUILD_LABELS.assemblyFile
      case 'object':
        return BUILD_LABELS.objectFile
      case 'wasm':
        return BUILD_LABELS.wasmFile
      case 'js-bindings':
        return BUILD_LABELS.jsBindingsFile
      default:
        return BUILD_LABELS.unknownFile
    }
  }

  // Group artifacts by directory (تطوير/إصدار)
  const groupedArtifacts = React.useMemo(() => {
    const groups: Record<string, BuildArtifact[]> = {
      'تطوير': [],
      'إصدار': [],
      'أخرى': []
    }

    artifacts.forEach(artifact => {
      if (artifact.path.includes('/تطوير/') || artifact.path.includes('/تطوير\\')) {
        groups['تطوير'].push(artifact)
      } else if (artifact.path.includes('/إصدار/') || artifact.path.includes('/إصدار\\')) {
        groups['إصدار'].push(artifact)
      } else {
        groups['أخرى'].push(artifact)
      }
    })

    return groups
  }, [artifacts])

  if (!isProject) {
    return null
  }

  return (
    <div className="artifacts-panel">
      <div className="artifacts-panel-header">
        <div className="artifacts-panel-title">
          <Package size={16} />
          <span>{BUILD_LABELS.buildArtifacts}</span>
          {artifacts.length > 0 && (
            <span className="artifacts-count">{artifacts.length}</span>
          )}
        </div>
        <div className="artifacts-panel-actions">
          <button
            className="artifacts-btn"
            onClick={loadArtifacts}
            disabled={isLoadingArtifacts}
            title={BUILD_LABELS.refresh}
          >
            <RefreshCw size={14} className={isLoadingArtifacts ? 'animate-spin' : ''} />
          </button>
          <button
            className="artifacts-btn danger"
            onClick={handleClean}
            disabled={isCleaning || artifacts.length === 0}
            title={BUILD_LABELS.cleanBuild}
          >
            {isCleaning ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Trash2 size={14} />
            )}
          </button>
        </div>
      </div>

      <div className="artifacts-panel-content">
        {isLoadingArtifacts ? (
          <div className="artifacts-loading">
            <Loader2 size={24} className="animate-spin" />
            <span>جاري التحميل...</span>
          </div>
        ) : artifacts.length === 0 ? (
          <div className="artifacts-empty">
            <FolderOpen size={24} />
            <span>لا توجد مخرجات بناء</span>
            <span className="artifacts-hint">ستظهر الملفات هنا بعد البناء</span>
          </div>
        ) : (
          <>
            {Object.entries(groupedArtifacts).map(([group, items]) => {
              if (items.length === 0) return null
              return (
                <div key={group} className="artifacts-group">
                  <div className="artifacts-group-header">
                    <FolderOpen size={14} />
                    <span>{group}</span>
                    <span className="artifacts-group-count">{items.length}</span>
                  </div>
                  <div className="artifacts-list">
                    {items.map((artifact) => (
                      <div key={artifact.path} className="artifact-item">
                        <div className="artifact-icon">
                          {getArtifactIcon(artifact.type)}
                        </div>
                        <div className="artifact-info">
                          <span className="artifact-name">{artifact.name}</span>
                          <div className="artifact-meta">
                            <span className="artifact-type">{getArtifactTypeLabel(artifact.type)}</span>
                            <span className="artifact-size">{formatFileSize(artifact.size)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}
