import React, { useState, useCallback } from 'react'
import { ChevronLeft, ChevronDown, Hash, Type, ToggleRight, Box, List, CircleSlash, Zap } from 'lucide-react'
import { Variable } from '../../stores/useDebugStore'

interface VariablesPanelProps {
  variables: Variable[]
  onExpand: (variablesReference: number) => Promise<Variable[]>
  disabled?: boolean
}

// Determine the type category for styling
function getTypeCategory(variable: Variable): string {
  const value = variable.value.toLowerCase()
  const type = variable.type?.toLowerCase() || ''

  if (type.includes('عدد') || type.includes('int') || type.includes('float') || type.includes('number')) {
    return 'number'
  }
  if (type.includes('نص') || type.includes('string') || value.startsWith('"') || value.startsWith("'")) {
    return 'string'
  }
  if (type.includes('منطقي') || type.includes('bool') || value === 'صحيح' || value === 'خطأ' || value === 'true' || value === 'false') {
    return 'boolean'
  }
  if (value === 'عدم' || value === 'null' || value === 'undefined') {
    return 'null'
  }
  if (type.includes('مصفوفة') || type.includes('array') || value.startsWith('[')) {
    return 'array'
  }
  if (type.includes('دالة') || type.includes('function')) {
    return 'function'
  }
  if (variable.variablesReference > 0) {
    return 'object'
  }
  return 'unknown'
}

// Get icon for variable type
function getTypeIcon(typeCategory: string): React.ReactNode {
  const size = 14
  switch (typeCategory) {
    case 'number':
      return <Hash size={size} />
    case 'string':
      return <Type size={size} />
    case 'boolean':
      return <ToggleRight size={size} />
    case 'object':
      return <Box size={size} />
    case 'array':
      return <List size={size} />
    case 'null':
      return <CircleSlash size={size} />
    case 'function':
      return <Zap size={size} />
    default:
      return <Box size={size} />
  }
}

// Single variable item component
interface VariableItemProps {
  variable: Variable
  depth: number
  onExpand: (variablesReference: number) => Promise<Variable[]>
}

function VariableItem({ variable, depth, onExpand }: VariableItemProps) {
  const [expanded, setExpanded] = useState(false)
  const [children, setChildren] = useState<Variable[]>([])
  const [loading, setLoading] = useState(false)

  const typeCategory = getTypeCategory(variable)
  const hasChildren = variable.variablesReference > 0

  const handleExpand = useCallback(async () => {
    if (!hasChildren) return

    if (expanded) {
      setExpanded(false)
      return
    }

    if (children.length === 0) {
      setLoading(true)
      try {
        const childVars = await onExpand(variable.variablesReference)
        setChildren(childVars)
      } catch (err) {
        console.error('Failed to expand variable:', err)
      } finally {
        setLoading(false)
      }
    }
    setExpanded(true)
  }, [expanded, children.length, hasChildren, variable.variablesReference, onExpand])

  return (
    <>
      <li
        className="variable-item"
        style={{ paddingRight: `${12 + depth * 16}px` }}
      >
        <span
          className={`variable-expand ${!hasChildren ? 'hidden' : ''}`}
          onClick={handleExpand}
        >
          {loading ? (
            <span className="variable-loading">...</span>
          ) : expanded ? (
            <ChevronDown size={12} />
          ) : (
            <ChevronLeft size={12} />
          )}
        </span>

        <span className={`variable-icon type-${typeCategory}`}>
          {getTypeIcon(typeCategory)}
        </span>

        <span className="variable-name">{variable.name}</span>
        <span className="variable-separator">:</span>
        <span className={`variable-value type-${typeCategory}`}>
          {variable.value}
        </span>

        {variable.type && (
          <span className="variable-type">{variable.type}</span>
        )}
      </li>

      {expanded && children.length > 0 && (
        <ul className="variable-children">
          {children.map((child, index) => (
            <VariableItem
              key={`${child.name}-${index}`}
              variable={child}
              depth={depth + 1}
              onExpand={onExpand}
            />
          ))}
        </ul>
      )}
    </>
  )
}

export default function VariablesPanel({ variables, onExpand, disabled }: VariablesPanelProps) {
  if (disabled) {
    return (
      <div className="debug-empty-state">
        <Box size={32} />
        <span className="debug-empty-state-text">ابدأ جلسة التصحيح لعرض المتغيرات</span>
      </div>
    )
  }

  if (variables.length === 0) {
    return (
      <div className="debug-empty-state">
        <Box size={32} />
        <span className="debug-empty-state-text">لا توجد متغيرات محلية</span>
      </div>
    )
  }

  return (
    <ul className="variables-list">
      {variables.map((variable, index) => (
        <VariableItem
          key={`${variable.name}-${index}`}
          variable={variable}
          depth={0}
          onExpand={onExpand}
        />
      ))}
    </ul>
  )
}
