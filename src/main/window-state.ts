import Store from 'electron-store'
import { BrowserWindow, screen } from 'electron'

export interface WindowState {
  width: number
  height: number
  x: number | undefined
  y: number | undefined
  isMaximized: boolean
  isFullScreen: boolean
}

const DEFAULT_WINDOW_STATE: WindowState = {
  width: 1200,
  height: 800,
  x: undefined,
  y: undefined,
  isMaximized: false,
  isFullScreen: false
}

interface StoreSchema {
  windowState: WindowState
}

const store = new Store<StoreSchema>({
  name: 'qalam-window-state',
  defaults: {
    windowState: DEFAULT_WINDOW_STATE
  }
})

// Debounce timer for saving state
let saveStateTimer: NodeJS.Timeout | null = null

/**
 * Get the saved window state
 */
export function getWindowState(): WindowState {
  const state = store.get('windowState')

  // Validate that the window would be visible on at least one display
  if (state.x !== undefined && state.y !== undefined) {
    const displays = screen.getAllDisplays()
    const isVisible = displays.some(display => {
      const { x, y, width, height } = display.bounds
      return (
        state.x! >= x &&
        state.x! < x + width &&
        state.y! >= y &&
        state.y! < y + height
      )
    })

    // If not visible on any display, reset position
    if (!isVisible) {
      return {
        ...state,
        x: undefined,
        y: undefined
      }
    }
  }

  return state
}

/**
 * Save the window state (debounced to avoid excessive writes)
 */
export function saveWindowState(win: BrowserWindow): void {
  // Clear any pending save
  if (saveStateTimer) {
    clearTimeout(saveStateTimer)
  }

  // Debounce the save to avoid rapid writes during resize/move
  saveStateTimer = setTimeout(() => {
    if (win.isDestroyed()) return

    const isMaximized = win.isMaximized()
    const isFullScreen = win.isFullScreen()

    // Only save bounds if not maximized or fullscreen
    // (so we restore to the "normal" size when un-maximizing)
    if (!isMaximized && !isFullScreen) {
      const bounds = win.getBounds()
      store.set('windowState', {
        width: bounds.width,
        height: bounds.height,
        x: bounds.x,
        y: bounds.y,
        isMaximized: false,
        isFullScreen: false
      })
    } else {
      // Preserve the non-maximized bounds but update the maximized/fullscreen flags
      const currentState = store.get('windowState')
      store.set('windowState', {
        ...currentState,
        isMaximized,
        isFullScreen
      })
    }
  }, 500)
}

/**
 * Save window state immediately (for use on close)
 */
export function saveWindowStateSync(win: BrowserWindow): void {
  if (saveStateTimer) {
    clearTimeout(saveStateTimer)
    saveStateTimer = null
  }

  if (win.isDestroyed()) return

  const isMaximized = win.isMaximized()
  const isFullScreen = win.isFullScreen()

  if (!isMaximized && !isFullScreen) {
    const bounds = win.getBounds()
    store.set('windowState', {
      width: bounds.width,
      height: bounds.height,
      x: bounds.x,
      y: bounds.y,
      isMaximized: false,
      isFullScreen: false
    })
  } else {
    const currentState = store.get('windowState')
    store.set('windowState', {
      ...currentState,
      isMaximized,
      isFullScreen
    })
  }
}

/**
 * Reset window state to defaults
 */
export function resetWindowState(): void {
  store.set('windowState', DEFAULT_WINDOW_STATE)
}
