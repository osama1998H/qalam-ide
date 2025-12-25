import React from 'react'
import { FilePlus, FolderOpen, FileText, Clock, X, Trash2, Package, Folder } from 'lucide-react'
import { useRecentFiles } from '../stores/useRecentFiles'
import { useRecentProjects } from '../stores/useRecentProjects'

interface WelcomeScreenProps {
  onNew: () => void
  onOpen: () => void
  onOpenPath: (path: string) => void
  onOpenFolder: () => void
  onOpenProject: (path: string) => void
}

export default function WelcomeScreen({
  onNew,
  onOpen,
  onOpenPath,
  onOpenFolder,
  onOpenProject
}: WelcomeScreenProps) {
  const { files: recentFiles, removeFile, clearAll } = useRecentFiles()
  const {
    projects: recentProjects,
    removeProject,
    clearAll: clearAllProjects
  } = useRecentProjects()

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return 'اليوم'
    } else if (diffDays === 1) {
      return 'أمس'
    } else if (diffDays < 7) {
      return `منذ ${diffDays} أيام`
    } else {
      return date.toLocaleDateString('ar-SA')
    }
  }

  const truncatePath = (path: string, maxLength: number = 50) => {
    if (path.length <= maxLength) return path
    const parts = path.split('/')
    if (parts.length <= 2) return path
    return '.../' + parts.slice(-2).join('/')
  }

  return (
    <div className="welcome-screen">
      <div className="welcome-header">
        <h1>قلم</h1>
        <p>محرر أكواد لغة ترقيم العربية</p>
      </div>

      <div className="welcome-content">
        <div className="welcome-actions">
          <button className="welcome-button primary" onClick={onNew}>
            <FilePlus size={20} />
            ملف جديد
          </button>
          <button className="welcome-button" onClick={onOpen}>
            <FileText size={20} />
            فتح ملف
          </button>
          <button className="welcome-button" onClick={onOpenFolder}>
            <FolderOpen size={20} />
            فتح مجلد
          </button>
        </div>

        {recentProjects.length > 0 && (
          <div className="recent-files-section recent-projects-section">
            <div className="recent-files-header">
              <div className="recent-files-title">
                <Package size={16} />
                <span>المشاريع الأخيرة</span>
              </div>
              <button
                className="clear-recent-button"
                onClick={clearAllProjects}
                title="مسح الكل"
              >
                <Trash2 size={14} />
                مسح الكل
              </button>
            </div>

            <div className="recent-files-list">
              {recentProjects.map((project) => (
                <div
                  key={project.path}
                  className="recent-file-item"
                  onClick={() => onOpenProject(project.path)}
                >
                  {project.isProject ? (
                    <Package size={16} className="recent-file-icon project-icon" />
                  ) : (
                    <Folder size={16} className="recent-file-icon folder-icon" />
                  )}
                  <div className="recent-file-info">
                    <span className="recent-file-name">
                      {project.name}
                      {project.isProject && (
                        <span className="project-badge">مشروع</span>
                      )}
                    </span>
                    <span className="recent-file-path">{truncatePath(project.path)}</span>
                  </div>
                  <span className="recent-file-date">{formatDate(project.lastOpened)}</span>
                  <button
                    className="recent-file-remove"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeProject(project.path)
                    }}
                    title="إزالة من القائمة"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {recentFiles.length > 0 && (
          <div className="recent-files-section">
            <div className="recent-files-header">
              <div className="recent-files-title">
                <Clock size={16} />
                <span>الملفات الأخيرة</span>
              </div>
              <button
                className="clear-recent-button"
                onClick={clearAll}
                title="مسح الكل"
              >
                <Trash2 size={14} />
                مسح الكل
              </button>
            </div>

            <div className="recent-files-list">
              {recentFiles.map((file) => (
                <div
                  key={file.path}
                  className="recent-file-item"
                  onClick={() => onOpenPath(file.path)}
                >
                  <FileText size={16} className="recent-file-icon" />
                  <div className="recent-file-info">
                    <span className="recent-file-name">{file.name}</span>
                    <span className="recent-file-path">{truncatePath(file.path)}</span>
                  </div>
                  <span className="recent-file-date">{formatDate(file.openedAt)}</span>
                  <button
                    className="recent-file-remove"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeFile(file.path)
                    }}
                    title="إزالة من القائمة"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
