import { gutter, GutterMarker, gutters } from '@codemirror/view'
import { StateField, StateEffect, RangeSet, Range, EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'

// Types for breakpoints
export interface BreakpointInfo {
  line: number
  enabled: boolean
  verified: boolean
  condition?: string
  hitCondition?: string
  logMessage?: string
}

// Effects to add/remove breakpoints
export const addBreakpointEffect = StateEffect.define<{ line: number; info: BreakpointInfo }>()
export const removeBreakpointEffect = StateEffect.define<{ line: number }>()
export const toggleBreakpointEffect = StateEffect.define<{ line: number }>()
export const updateBreakpointsEffect = StateEffect.define<BreakpointInfo[]>()
export const clearBreakpointsEffect = StateEffect.define<void>()

// Effect for setting current execution line (when debugging)
export const setExecutionLineEffect = StateEffect.define<number | null>()

// Breakpoint marker for the gutter
class BreakpointMarker extends GutterMarker {
  private breakpoint: BreakpointInfo

  constructor(breakpoint: BreakpointInfo) {
    super()
    this.breakpoint = breakpoint
  }

  toDOM(): HTMLElement {
    const wrapper = document.createElement('div')
    wrapper.className = 'breakpoint-marker'

    if (!this.breakpoint.enabled) {
      wrapper.classList.add('disabled')
    }
    if (!this.breakpoint.verified) {
      wrapper.classList.add('unverified')
    }
    if (this.breakpoint.condition) {
      wrapper.classList.add('conditional')
    }
    if (this.breakpoint.logMessage) {
      wrapper.classList.add('logpoint')
    }

    // Create the visual dot
    const dot = document.createElement('span')
    dot.className = 'breakpoint-dot'
    wrapper.appendChild(dot)

    // Add tooltip with condition/logMessage
    if (this.breakpoint.condition) {
      wrapper.title = `شرط: ${this.breakpoint.condition}`
    } else if (this.breakpoint.logMessage) {
      wrapper.title = `سجل: ${this.breakpoint.logMessage}`
    } else if (this.breakpoint.hitCondition) {
      wrapper.title = `عدد التكرار: ${this.breakpoint.hitCondition}`
    }

    return wrapper
  }

  eq(other: GutterMarker): boolean {
    return other instanceof BreakpointMarker &&
      this.breakpoint.line === other.breakpoint.line &&
      this.breakpoint.enabled === other.breakpoint.enabled &&
      this.breakpoint.verified === other.breakpoint.verified &&
      this.breakpoint.condition === other.breakpoint.condition
  }
}

// Execution line marker (current line when debugging)
class ExecutionLineMarker extends GutterMarker {
  toDOM(): HTMLElement {
    const wrapper = document.createElement('div')
    wrapper.className = 'execution-marker'

    // Arrow pointing to current line
    wrapper.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`

    return wrapper
  }
}

// State field to track breakpoints
export const breakpointField = StateField.define<Map<number, BreakpointInfo>>({
  create() {
    return new Map()
  },
  update(breakpoints, tr) {
    let newBreakpoints = breakpoints

    for (const effect of tr.effects) {
      if (effect.is(addBreakpointEffect)) {
        newBreakpoints = new Map(newBreakpoints)
        newBreakpoints.set(effect.value.line, effect.value.info)
      } else if (effect.is(removeBreakpointEffect)) {
        newBreakpoints = new Map(newBreakpoints)
        newBreakpoints.delete(effect.value.line)
      } else if (effect.is(toggleBreakpointEffect)) {
        newBreakpoints = new Map(newBreakpoints)
        if (newBreakpoints.has(effect.value.line)) {
          newBreakpoints.delete(effect.value.line)
        } else {
          newBreakpoints.set(effect.value.line, {
            line: effect.value.line,
            enabled: true,
            verified: false
          })
        }
      } else if (effect.is(updateBreakpointsEffect)) {
        newBreakpoints = new Map()
        for (const bp of effect.value) {
          newBreakpoints.set(bp.line, bp)
        }
      } else if (effect.is(clearBreakpointsEffect)) {
        newBreakpoints = new Map()
      }
    }

    // Handle document changes - update line numbers
    if (tr.docChanged && newBreakpoints.size > 0) {
      const mappedBreakpoints = new Map<number, BreakpointInfo>()

      for (const [line, bp] of newBreakpoints) {
        // Find the position at the start of this line
        const lineInfo = tr.startState.doc.line(Math.min(line, tr.startState.doc.lines))
        const pos = lineInfo.from

        // Map through the changes
        const newPos = tr.changes.mapPos(pos, 1)
        const newLine = tr.state.doc.lineAt(newPos).number

        mappedBreakpoints.set(newLine, { ...bp, line: newLine })
      }

      return mappedBreakpoints
    }

    return newBreakpoints
  }
})

// State field to track current execution line
export const executionLineField = StateField.define<number | null>({
  create() {
    return null
  },
  update(line, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setExecutionLineEffect)) {
        return effect.value
      }
    }
    return line
  }
})

// Callback type for breakpoint changes
export type BreakpointChangeCallback = (line: number, action: 'add' | 'remove') => void
export type BreakpointContextMenuCallback = (line: number, event: MouseEvent) => void

let onBreakpointChange: BreakpointChangeCallback | null = null
let onBreakpointContextMenu: BreakpointContextMenuCallback | null = null

export function setBreakpointChangeCallback(callback: BreakpointChangeCallback | null) {
  onBreakpointChange = callback
}

export function setBreakpointContextMenuCallback(callback: BreakpointContextMenuCallback | null) {
  onBreakpointContextMenu = callback
}

// Create the breakpoint gutter
const breakpointGutter = gutter({
  class: 'cm-breakpoint-gutter',
  markers: (view) => {
    const markers: Range<GutterMarker>[] = []
    const breakpoints = view.state.field(breakpointField)
    const executionLine = view.state.field(executionLineField)

    // Add breakpoint markers
    for (const [line, bp] of breakpoints) {
      if (line <= view.state.doc.lines) {
        const lineInfo = view.state.doc.line(line)
        markers.push(new BreakpointMarker(bp).range(lineInfo.from))
      }
    }

    // Add execution line marker
    if (executionLine !== null && executionLine <= view.state.doc.lines) {
      const lineInfo = view.state.doc.line(executionLine)
      markers.push(new ExecutionLineMarker().range(lineInfo.from))
    }

    return RangeSet.of(markers, true)
  },
  domEventHandlers: {
    click(view, line, event) {
      // Get line number from position
      const lineNumber = view.state.doc.lineAt(line.from).number

      // Toggle breakpoint
      const breakpoints = view.state.field(breakpointField)
      const hasBreakpoint = breakpoints.has(lineNumber)

      view.dispatch({
        effects: toggleBreakpointEffect.of({ line: lineNumber })
      })

      // Notify callback
      if (onBreakpointChange) {
        onBreakpointChange(lineNumber, hasBreakpoint ? 'remove' : 'add')
      }

      return true
    },
    contextmenu(view, line, event) {
      const lineNumber = view.state.doc.lineAt(line.from).number

      // Notify callback for context menu
      if (onBreakpointContextMenu) {
        event.preventDefault()
        onBreakpointContextMenu(lineNumber, event)
        return true
      }

      return false
    }
  }
})

// Theme for breakpoint gutter
const breakpointTheme = EditorView.baseTheme({
  '.cm-breakpoint-gutter': {
    width: '16px',
    cursor: 'pointer',
    userSelect: 'none'
  },
  '.breakpoint-marker': {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '16px',
    height: '100%'
  },
  '.breakpoint-dot': {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    backgroundColor: '#e51400', // VS Code red
    boxShadow: '0 0 2px rgba(0, 0, 0, 0.3)'
  },
  '.breakpoint-marker.disabled .breakpoint-dot': {
    backgroundColor: '#808080',
    opacity: 0.5
  },
  '.breakpoint-marker.unverified .breakpoint-dot': {
    backgroundColor: '#848484',
    border: '2px solid #e51400'
  },
  '.breakpoint-marker.conditional .breakpoint-dot': {
    backgroundColor: '#e51400',
    position: 'relative'
  },
  '.breakpoint-marker.conditional .breakpoint-dot::after': {
    content: '"?"',
    position: 'absolute',
    color: 'white',
    fontSize: '8px',
    fontWeight: 'bold',
    top: '-1px',
    left: '2px'
  },
  '.breakpoint-marker.logpoint .breakpoint-dot': {
    backgroundColor: '#ff4500',
    width: '10px',
    height: '10px',
    borderRadius: '2px' // Diamond-like shape for logpoints
  },
  '.execution-marker': {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '16px',
    height: '100%',
    color: '#ffcc00' // Yellow arrow for current execution
  },
  '.execution-marker svg': {
    width: '12px',
    height: '12px'
  },
  // Execution line highlighting
  '.cm-activeLine': {
    // Will be applied by CodeMirror's highlightActiveLine
  }
})

// Extension that combines all breakpoint functionality
export function breakpointExtension() {
  return [
    breakpointField,
    executionLineField,
    gutters(),
    breakpointGutter,
    breakpointTheme
  ]
}

// Helper functions to manipulate breakpoints from outside
export function getBreakpoints(view: EditorView): BreakpointInfo[] {
  const breakpoints = view.state.field(breakpointField)
  return Array.from(breakpoints.values())
}

export function setBreakpoints(view: EditorView, breakpoints: BreakpointInfo[]) {
  view.dispatch({
    effects: updateBreakpointsEffect.of(breakpoints)
  })
}

export function addBreakpoint(view: EditorView, line: number, info?: Partial<BreakpointInfo>) {
  view.dispatch({
    effects: addBreakpointEffect.of({
      line,
      info: {
        line,
        enabled: true,
        verified: false,
        ...info
      }
    })
  })
}

export function removeBreakpoint(view: EditorView, line: number) {
  view.dispatch({
    effects: removeBreakpointEffect.of({ line })
  })
}

export function clearAllBreakpoints(view: EditorView) {
  view.dispatch({
    effects: clearBreakpointsEffect.of()
  })
}

export function setExecutionLine(view: EditorView, line: number | null) {
  view.dispatch({
    effects: setExecutionLineEffect.of(line)
  })
}
