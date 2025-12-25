// Theme definitions for Qalam IDE

export interface Theme {
  name: string
  label: string
  colors: {
    // Background colors
    bgPrimary: string
    bgSecondary: string
    bgTertiary: string
    bgHover: string
    bgActive: string

    // Text colors
    textPrimary: string
    textSecondary: string
    textMuted: string

    // Border colors
    border: string
    borderLight: string

    // Accent colors
    accent: string
    accentHover: string
    accentText: string

    // Status colors
    success: string
    error: string
    warning: string

    // Editor specific
    editorBg: string
    editorGutterBg: string
    editorGutterText: string
    editorActiveLine: string
    editorActiveLineGutter: string
    editorSelection: string
    editorCursor: string
    editorMatchingBracket: string
    editorSearchMatch: string
    editorSearchMatchSelected: string

    // Scrollbar
    scrollbarTrack: string
    scrollbarThumb: string
    scrollbarThumbHover: string
  }
}

export const darkTheme: Theme = {
  name: 'dark',
  label: 'داكن',
  colors: {
    // Background colors
    bgPrimary: '#1e1e1e',
    bgSecondary: '#252526',
    bgTertiary: '#2d2d2d',
    bgHover: '#3c3c3c',
    bgActive: '#37373d',

    // Text colors
    textPrimary: '#cccccc',
    textSecondary: '#858585',
    textMuted: '#6e6e6e',

    // Border colors
    border: '#3c3c3c',
    borderLight: '#454545',

    // Accent colors
    accent: '#0e639c',
    accentHover: '#1177bb',
    accentText: '#ffffff',

    // Status colors
    success: '#4ec9b0',
    error: '#f14c4c',
    warning: '#cca700',

    // Editor specific
    editorBg: '#1e1e1e',
    editorGutterBg: '#252526',
    editorGutterText: '#858585',
    editorActiveLine: '#2a2d2e',
    editorActiveLineGutter: '#2a2d2e',
    editorSelection: '#264f78',
    editorCursor: '#ffffff',
    editorMatchingBracket: '#0d6939',
    editorSearchMatch: '#613214',
    editorSearchMatchSelected: '#9e6a03',

    // Scrollbar
    scrollbarTrack: '#252526',
    scrollbarThumb: '#3c3c3c',
    scrollbarThumbHover: '#555555'
  }
}

export const lightTheme: Theme = {
  name: 'light',
  label: 'فاتح',
  colors: {
    // Background colors
    bgPrimary: '#ffffff',
    bgSecondary: '#f3f3f3',
    bgTertiary: '#e8e8e8',
    bgHover: '#e0e0e0',
    bgActive: '#d4d4d4',

    // Text colors
    textPrimary: '#1e1e1e',
    textSecondary: '#616161',
    textMuted: '#8e8e8e',

    // Border colors
    border: '#d4d4d4',
    borderLight: '#e0e0e0',

    // Accent colors
    accent: '#0066b8',
    accentHover: '#0078d4',
    accentText: '#ffffff',

    // Status colors
    success: '#16825d',
    error: '#c72e2e',
    warning: '#bf8803',

    // Editor specific
    editorBg: '#ffffff',
    editorGutterBg: '#f5f5f5',
    editorGutterText: '#6e7681',
    editorActiveLine: '#f5f5f5',
    editorActiveLineGutter: '#f0f0f0',
    editorSelection: '#add6ff',
    editorCursor: '#000000',
    editorMatchingBracket: '#b4e8b4',
    editorSearchMatch: '#ffdf5d',
    editorSearchMatchSelected: '#f9c74f',

    // Scrollbar
    scrollbarTrack: '#f3f3f3',
    scrollbarThumb: '#c1c1c1',
    scrollbarThumbHover: '#929292'
  }
}

export const highContrastTheme: Theme = {
  name: 'high-contrast',
  label: 'تباين عالي',
  colors: {
    // Background colors
    bgPrimary: '#000000',
    bgSecondary: '#0a0a0a',
    bgTertiary: '#1a1a1a',
    bgHover: '#2a2a2a',
    bgActive: '#3a3a3a',

    // Text colors
    textPrimary: '#ffffff',
    textSecondary: '#e0e0e0',
    textMuted: '#b0b0b0',

    // Border colors
    border: '#6fc3df',
    borderLight: '#6fc3df',

    // Accent colors
    accent: '#6fc3df',
    accentHover: '#9ed9ea',
    accentText: '#000000',

    // Status colors
    success: '#89d185',
    error: '#ff6b6b',
    warning: '#ffd93d',

    // Editor specific
    editorBg: '#000000',
    editorGutterBg: '#0a0a0a',
    editorGutterText: '#e0e0e0',
    editorActiveLine: '#1a1a1a',
    editorActiveLineGutter: '#1a1a1a',
    editorSelection: '#3a5f7a',
    editorCursor: '#ffffff',
    editorMatchingBracket: '#0e8a0e',
    editorSearchMatch: '#5a3d00',
    editorSearchMatchSelected: '#8a6500',

    // Scrollbar
    scrollbarTrack: '#0a0a0a',
    scrollbarThumb: '#6fc3df',
    scrollbarThumbHover: '#9ed9ea'
  }
}

export const themes: Record<string, Theme> = {
  dark: darkTheme,
  light: lightTheme,
  'high-contrast': highContrastTheme
}

// Apply theme to document
export function applyTheme(theme: Theme): void {
  const root = document.documentElement
  const colors = theme.colors

  // Set CSS variables
  root.style.setProperty('--bg-primary', colors.bgPrimary)
  root.style.setProperty('--bg-secondary', colors.bgSecondary)
  root.style.setProperty('--bg-tertiary', colors.bgTertiary)
  root.style.setProperty('--bg-hover', colors.bgHover)
  root.style.setProperty('--bg-active', colors.bgActive)

  root.style.setProperty('--text-primary', colors.textPrimary)
  root.style.setProperty('--text-secondary', colors.textSecondary)
  root.style.setProperty('--text-muted', colors.textMuted)

  root.style.setProperty('--border', colors.border)
  root.style.setProperty('--border-light', colors.borderLight)

  root.style.setProperty('--accent', colors.accent)
  root.style.setProperty('--accent-hover', colors.accentHover)
  root.style.setProperty('--accent-text', colors.accentText)

  root.style.setProperty('--success', colors.success)
  root.style.setProperty('--error', colors.error)
  root.style.setProperty('--warning', colors.warning)

  root.style.setProperty('--editor-bg', colors.editorBg)
  root.style.setProperty('--editor-gutter-bg', colors.editorGutterBg)
  root.style.setProperty('--editor-gutter-text', colors.editorGutterText)
  root.style.setProperty('--editor-active-line', colors.editorActiveLine)
  root.style.setProperty('--editor-active-line-gutter', colors.editorActiveLineGutter)
  root.style.setProperty('--editor-selection', colors.editorSelection)
  root.style.setProperty('--editor-cursor', colors.editorCursor)
  root.style.setProperty('--editor-matching-bracket', colors.editorMatchingBracket)
  root.style.setProperty('--editor-search-match', colors.editorSearchMatch)
  root.style.setProperty('--editor-search-match-selected', colors.editorSearchMatchSelected)

  root.style.setProperty('--scrollbar-track', colors.scrollbarTrack)
  root.style.setProperty('--scrollbar-thumb', colors.scrollbarThumb)
  root.style.setProperty('--scrollbar-thumb-hover', colors.scrollbarThumbHover)

  // Set data attribute for theme-specific CSS
  root.setAttribute('data-theme', theme.name)
}
