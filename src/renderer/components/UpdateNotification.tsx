import React, { useState, useEffect, useCallback } from 'react'
import { Download, RefreshCw, X, CheckCircle, AlertCircle } from 'lucide-react'

interface UpdateInfo {
  version: string
  releaseDate?: string
  releaseNotes?: string
}

interface DownloadProgress {
  percent: number
  bytesPerSecond: number
  transferred: number
  total: number
}

type UpdateStatus = 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'error'

interface UpdateNotificationProps {
  onDismiss?: () => void
}

export default function UpdateNotification({ onDismiss }: UpdateNotificationProps) {
  const [status, setStatus] = useState<UpdateStatus>('idle')
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [progress, setProgress] = useState<DownloadProgress | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [visible, setVisible] = useState(false)
  const [currentVersion, setCurrentVersion] = useState<string>('')

  // Get current version on mount
  useEffect(() => {
    window.qalam.updater.getVersion().then(({ version }) => {
      setCurrentVersion(version)
    })
  }, [])

  // Set up event listeners
  useEffect(() => {
    const removeChecking = window.qalam.updater.onChecking(() => {
      setStatus('checking')
    })

    const removeAvailable = window.qalam.updater.onAvailable((info) => {
      setUpdateInfo(info)
      setStatus('available')
      setVisible(true)
    })

    const removeNotAvailable = window.qalam.updater.onNotAvailable(() => {
      setStatus('idle')
    })

    const removeProgress = window.qalam.updater.onProgress((prog) => {
      setProgress(prog)
      setStatus('downloading')
    })

    const removeDownloaded = window.qalam.updater.onDownloaded((info) => {
      setUpdateInfo(info)
      setStatus('downloaded')
    })

    const removeError = window.qalam.updater.onError((err) => {
      setError(err.message)
      setStatus('error')
    })

    return () => {
      removeChecking()
      removeAvailable()
      removeNotAvailable()
      removeProgress()
      removeDownloaded()
      removeError()
    }
  }, [])

  const handleDownload = useCallback(async () => {
    setStatus('downloading')
    setProgress({ percent: 0, bytesPerSecond: 0, transferred: 0, total: 0 })
    await window.qalam.updater.downloadUpdate()
  }, [])

  const handleInstall = useCallback(async () => {
    await window.qalam.updater.installUpdate()
  }, [])

  const handleDismiss = useCallback(() => {
    setVisible(false)
    onDismiss?.()
  }, [onDismiss])

  const handleCheckForUpdates = useCallback(async () => {
    setStatus('checking')
    setError(null)
    await window.qalam.updater.checkForUpdates()
  }, [])

  // Format bytes to human readable
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 ب'
    const k = 1024
    const sizes = ['ب', 'ك.ب', 'م.ب', 'ج.ب']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
  }

  // Don't render if not visible
  if (!visible && status !== 'checking') {
    return null
  }

  return (
    <div className="update-notification" dir="rtl">
      <div className="update-notification-content">
        {/* Close button */}
        {status !== 'downloading' && (
          <button className="update-close-btn" onClick={handleDismiss} title="إغلاق">
            <X size={16} />
          </button>
        )}

        {/* Icon based on status */}
        <div className="update-icon">
          {status === 'checking' && <RefreshCw size={24} className="update-spinning" />}
          {status === 'available' && <Download size={24} />}
          {status === 'downloading' && <RefreshCw size={24} className="update-spinning" />}
          {status === 'downloaded' && <CheckCircle size={24} className="update-success" />}
          {status === 'error' && <AlertCircle size={24} className="update-error" />}
        </div>

        {/* Content based on status */}
        <div className="update-text">
          {status === 'checking' && (
            <span className="update-message">جاري البحث عن تحديثات...</span>
          )}

          {status === 'available' && updateInfo && (
            <>
              <span className="update-title">تحديث متاح</span>
              <span className="update-version">
                الإصدار {updateInfo.version} متاح للتنزيل
              </span>
              <span className="update-current">
                الإصدار الحالي: {currentVersion}
              </span>
            </>
          )}

          {status === 'downloading' && progress && (
            <>
              <span className="update-title">جاري التنزيل...</span>
              <div className="update-progress-bar">
                <div
                  className="update-progress-fill"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
              <span className="update-progress-text">
                {progress.percent.toFixed(1)}% • {formatBytes(progress.transferred)} / {formatBytes(progress.total)}
              </span>
            </>
          )}

          {status === 'downloaded' && updateInfo && (
            <>
              <span className="update-title">التحديث جاهز</span>
              <span className="update-version">
                الإصدار {updateInfo.version} جاهز للتثبيت
              </span>
              <span className="update-hint">
                سيتم تثبيت التحديث عند إعادة تشغيل البرنامج
              </span>
            </>
          )}

          {status === 'error' && (
            <>
              <span className="update-title update-error-text">خطأ في التحديث</span>
              <span className="update-error-message">{error}</span>
            </>
          )}
        </div>

        {/* Actions based on status */}
        <div className="update-actions">
          {status === 'available' && (
            <button className="update-btn update-btn-primary" onClick={handleDownload}>
              تنزيل التحديث
            </button>
          )}

          {status === 'downloaded' && (
            <button className="update-btn update-btn-primary" onClick={handleInstall}>
              إعادة التشغيل الآن
            </button>
          )}

          {status === 'error' && (
            <button className="update-btn update-btn-secondary" onClick={handleCheckForUpdates}>
              إعادة المحاولة
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
