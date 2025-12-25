import React, { useState, useRef, useEffect } from 'react'
import { X, FileCode, ChevronLeft, ChevronRight } from 'lucide-react'
import { useTabStore, Tab } from '../stores/useTabStore'

interface TabBarProps {
  onCloseTab: (tabId: string, isDirty: boolean) => void
}

export default function TabBar({ onCloseTab }: TabBarProps) {
  const { tabs, activeTabId, setActiveTab, closeOtherTabs, closeTabsToRight } = useTabStore()
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; tabId: string } | null>(null)
  const [showScrollButtons, setShowScrollButtons] = useState(false)
  const tabsContainerRef = useRef<HTMLDivElement>(null)

  // Check if scroll buttons are needed
  useEffect(() => {
    const checkScroll = () => {
      if (tabsContainerRef.current) {
        const { scrollWidth, clientWidth } = tabsContainerRef.current
        setShowScrollButtons(scrollWidth > clientWidth)
      }
    }

    checkScroll()
    window.addEventListener('resize', checkScroll)
    return () => window.removeEventListener('resize', checkScroll)
  }, [tabs.length])

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId)
  }

  const handleCloseClick = (e: React.MouseEvent, tab: Tab) => {
    e.stopPropagation()
    onCloseTab(tab.id, tab.isDirty)
  }

  const handleContextMenu = (e: React.MouseEvent, tabId: string) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, tabId })
  }

  const handleCloseContextMenu = () => {
    setContextMenu(null)
  }

  const handleContextAction = (action: 'close' | 'closeOthers' | 'closeRight') => {
    if (!contextMenu) return

    const tab = tabs.find(t => t.id === contextMenu.tabId)
    if (!tab) return

    switch (action) {
      case 'close':
        onCloseTab(contextMenu.tabId, tab.isDirty)
        break
      case 'closeOthers':
        closeOtherTabs(contextMenu.tabId)
        break
      case 'closeRight':
        closeTabsToRight(contextMenu.tabId)
        break
    }

    setContextMenu(null)
  }

  const scrollTabs = (direction: 'left' | 'right') => {
    if (tabsContainerRef.current) {
      const scrollAmount = 200
      // RTL: scroll direction is reversed
      const delta = direction === 'left' ? scrollAmount : -scrollAmount
      tabsContainerRef.current.scrollBy({ left: delta, behavior: 'smooth' })
    }
  }

  // Close context menu on click outside
  useEffect(() => {
    if (contextMenu) {
      const handleClick = () => setContextMenu(null)
      window.addEventListener('click', handleClick)
      return () => window.removeEventListener('click', handleClick)
    }
  }, [contextMenu])

  if (tabs.length === 0) {
    return null
  }

  return (
    <div className="tab-bar">
      {showScrollButtons && (
        <button
          className="tab-scroll-button"
          onClick={() => scrollTabs('right')}
          title="تمرير لليمين"
        >
          <ChevronRight size={16} />
        </button>
      )}

      <div className="tabs-container" ref={tabsContainerRef}>
        {tabs.map(tab => (
          <div
            key={tab.id}
            className={`tab ${activeTabId === tab.id ? 'active' : ''} ${tab.isDirty ? 'dirty' : ''}`}
            onClick={() => handleTabClick(tab.id)}
            onContextMenu={(e) => handleContextMenu(e, tab.id)}
            title={tab.filePath || tab.fileName}
          >
            <FileCode size={14} className="tab-icon" />
            <span className="tab-name">
              {tab.isDirty && <span className="dirty-indicator">●</span>}
              {tab.fileName}
            </span>
            <button
              className="tab-close"
              onClick={(e) => handleCloseClick(e, tab)}
              title="إغلاق"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {showScrollButtons && (
        <button
          className="tab-scroll-button"
          onClick={() => scrollTabs('left')}
          title="تمرير لليسار"
        >
          <ChevronLeft size={16} />
        </button>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="tab-context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button onClick={() => handleContextAction('close')}>
            إغلاق
          </button>
          <button onClick={() => handleContextAction('closeOthers')}>
            إغلاق الآخرين
          </button>
          <button onClick={() => handleContextAction('closeRight')}>
            إغلاق علامات التبويب على اليسار
          </button>
        </div>
      )}
    </div>
  )
}
