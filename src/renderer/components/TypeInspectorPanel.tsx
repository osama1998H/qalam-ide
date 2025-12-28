import React, { useState, useEffect, useCallback } from 'react'
import { X, RefreshCw, Code, Box, Zap, Type, AlertCircle, ChevronDown, ChevronLeft } from 'lucide-react'
import { useLSPStore, LSPHover } from '../stores/useLSPStore'

interface TypeInfo {
  name: string
  kind: 'primitive' | 'class' | 'interface' | 'function' | 'generic' | 'array' | 'map' | 'unknown'
  details?: string
  fields?: FieldInfo[]
  methods?: MethodInfo[]
  typeParams?: string[]
  returnType?: string
  paramTypes?: ParamInfo[]
}

interface FieldInfo {
  name: string
  type: string
  visibility: 'public' | 'private' | 'protected'
}

interface MethodInfo {
  name: string
  signature: string
  visibility: 'public' | 'private' | 'protected'
}

interface ParamInfo {
  name: string
  type: string
}

interface TypeInspectorPanelProps {
  visible: boolean
  onClose: () => void
  filePath: string | null
  cursorLine: number
  cursorCol: number
}

// Parse hover response to extract type information
function parseHoverResponse(hover: LSPHover | null): TypeInfo | null {
  if (!hover) return null

  const contents = hover.contents

  if (!contents) return null

  let text = ''

  // Handle different content formats
  if (typeof contents === 'string') {
    text = contents
  } else if (Array.isArray(contents)) {
    text = contents.map(c => {
      if (typeof c === 'string') return c
      if ('value' in c) return c.value
      return ''
    }).join('\n')
  } else if (typeof contents === 'object' && contents !== null && 'value' in contents) {
    text = (contents as { value: string }).value
  } else if (typeof contents === 'object' && contents !== null && 'language' in contents && 'value' in contents) {
    text = (contents as { value: string }).value
  }

  if (!text) return null

  // Parse the type information from the text
  return parseTypeText(text)
}

// Parse type text to extract structured type info
function parseTypeText(text: string): TypeInfo {
  // Remove markdown code fences if present
  text = text.replace(/```\w*\n?/g, '').trim()

  // Check for function type
  const funcMatch = text.match(/^دالة\s+(\w+)\s*\((.*?)\)(?:\s*->\s*(.+))?/)
  if (funcMatch) {
    const params = funcMatch[2] ? funcMatch[2].split(/،|,/).map(p => {
      const parts = p.trim().split(':')
      return {
        name: parts[0]?.trim() || '',
        type: parts[1]?.trim() || 'أي'
      }
    }) : []

    return {
      name: funcMatch[1],
      kind: 'function',
      returnType: funcMatch[3]?.trim() || undefined,
      paramTypes: params,
      details: text
    }
  }

  // Check for class/type declaration
  const classMatch = text.match(/^صنف\s+(\w+)(?:<(.+?)>)?/)
  if (classMatch) {
    return {
      name: classMatch[1],
      kind: 'class',
      typeParams: classMatch[2]?.split(/،|,/).map(t => t.trim()),
      details: text
    }
  }

  // Check for interface/contract
  const interfaceMatch = text.match(/^ميثاق\s+(\w+)/)
  if (interfaceMatch) {
    return {
      name: interfaceMatch[1],
      kind: 'interface',
      details: text
    }
  }

  // Check for variable type annotation
  const varMatch = text.match(/^(?:متغير|ثابت)\s+\w+:\s*(.+)/)
  if (varMatch) {
    const typeName = varMatch[1].trim()
    return {
      name: typeName,
      kind: getKindFromTypeName(typeName),
      details: text
    }
  }

  // Check for simple type
  const typeMatch = text.match(/^النوع:\s*(.+)/) || text.match(/^Type:\s*(.+)/i)
  if (typeMatch) {
    const typeName = typeMatch[1].trim()
    return {
      name: typeName,
      kind: getKindFromTypeName(typeName),
      details: text
    }
  }

  // Fallback - just use the text as type name
  return {
    name: text.split('\n')[0] || 'مجهول',
    kind: 'unknown',
    details: text
  }
}

function getKindFromTypeName(typeName: string): TypeInfo['kind'] {
  if (['عدد', 'عدد_عشري', 'نص', 'منطقي', 'int', 'float', 'string', 'bool'].includes(typeName)) {
    return 'primitive'
  }
  if (typeName.startsWith('مصفوفة<') || typeName.startsWith('array<')) {
    return 'array'
  }
  if (typeName.startsWith('قاموس<') || typeName.startsWith('map<')) {
    return 'map'
  }
  if (typeName.includes('<')) {
    return 'generic'
  }
  if (typeName.includes('->') || typeName.includes('(')) {
    return 'function'
  }
  return 'class'
}

// Get icon for type kind
function getTypeIcon(kind: TypeInfo['kind']): React.ReactNode {
  const iconSize = 16
  switch (kind) {
    case 'primitive':
      return <Box size={iconSize} className="type-icon type-icon-primitive" />
    case 'function':
      return <Zap size={iconSize} className="type-icon type-icon-function" />
    case 'class':
    case 'interface':
      return <Type size={iconSize} className="type-icon type-icon-class" />
    case 'array':
    case 'map':
    case 'generic':
      return <Code size={iconSize} className="type-icon type-icon-generic" />
    default:
      return <Box size={iconSize} className="type-icon type-icon-unknown" />
  }
}

// Collapsible section component
interface CollapsibleSectionProps {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}

function CollapsibleSection({ title, children, defaultOpen = true }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="type-section">
      <div className="type-section-header" onClick={() => setOpen(!open)}>
        <span className="type-section-icon">
          {open ? <ChevronDown size={12} /> : <ChevronLeft size={12} />}
        </span>
        <span className="type-section-title">{title}</span>
      </div>
      {open && <div className="type-section-content">{children}</div>}
    </div>
  )
}

export default function TypeInspectorPanel({
  visible,
  onClose,
  filePath,
  cursorLine,
  cursorCol
}: TypeInspectorPanelProps) {
  const [typeInfo, setTypeInfo] = useState<TypeInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { connected, requestHover } = useLSPStore()

  // Fetch type information when cursor changes
  const fetchTypeInfo = useCallback(async () => {
    if (!filePath || !connected) {
      setError(!connected ? 'LSP غير متصل' : 'يرجى فتح ملف')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // LSP uses 0-based line/character, but editor uses 1-based
      const result = await requestHover(filePath, cursorLine - 1, cursorCol - 1)

      if (result) {
        const parsed = parseHoverResponse(result)
        if (parsed) {
          setTypeInfo(parsed)
        } else {
          setTypeInfo(null)
          setError('لا توجد معلومات نوع في هذا الموقع')
        }
      } else {
        setTypeInfo(null)
        setError('لا توجد معلومات نوع في هذا الموقع')
      }
    } catch (e) {
      setError(`خطأ: ${e}`)
    } finally {
      setLoading(false)
    }
  }, [filePath, cursorLine, cursorCol, connected, requestHover])

  // Fetch when panel becomes visible or cursor changes
  useEffect(() => {
    if (visible && filePath) {
      fetchTypeInfo()
    }
  }, [visible, filePath, cursorLine, cursorCol, fetchTypeInfo])

  if (!visible) {
    return null
  }

  return (
    <div className="type-inspector-panel">
      <div className="type-inspector-header">
        <div className="type-inspector-title">
          <Type size={16} />
          <span>مفتش الأنواع</span>
          <span className="type-inspector-position">
            ({cursorLine}:{cursorCol})
          </span>
        </div>
        <div className="type-inspector-actions">
          <button
            className="type-refresh-btn"
            onClick={fetchTypeInfo}
            disabled={loading || !filePath}
            title="تحديث (F5)"
          >
            <RefreshCw size={14} className={loading ? 'type-spinning' : ''} />
          </button>
          <button className="type-close-btn" onClick={onClose} title="إغلاق">
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="type-inspector-content">
        {loading && (
          <div className="type-loading">
            <RefreshCw size={24} className="type-spinning" />
            <span>جاري التحليل...</span>
          </div>
        )}

        {error && !loading && (
          <div className="type-error">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {typeInfo && !loading && !error && (
          <div className="type-info">
            <div className="type-main">
              {getTypeIcon(typeInfo.kind)}
              <span className="type-name">{typeInfo.name}</span>
              <span className="type-kind">{getKindLabel(typeInfo.kind)}</span>
            </div>

            {typeInfo.typeParams && typeInfo.typeParams.length > 0 && (
              <CollapsibleSection title="معاملات النوع">
                <div className="type-params-list">
                  {typeInfo.typeParams.map((param, i) => (
                    <span key={i} className="type-param">{param}</span>
                  ))}
                </div>
              </CollapsibleSection>
            )}

            {typeInfo.paramTypes && typeInfo.paramTypes.length > 0 && (
              <CollapsibleSection title="معاملات الدالة">
                <div className="type-params-list">
                  {typeInfo.paramTypes.map((param, i) => (
                    <div key={i} className="type-func-param">
                      <span className="param-name">{param.name}</span>
                      <span className="param-sep">:</span>
                      <span className="param-type">{param.type}</span>
                    </div>
                  ))}
                </div>
              </CollapsibleSection>
            )}

            {typeInfo.returnType && (
              <CollapsibleSection title="نوع الإرجاع">
                <div className="type-return">
                  <span className="return-type">{typeInfo.returnType}</span>
                </div>
              </CollapsibleSection>
            )}

            {typeInfo.fields && typeInfo.fields.length > 0 && (
              <CollapsibleSection title="الحقول">
                <div className="type-fields-list">
                  {typeInfo.fields.map((field, i) => (
                    <div key={i} className="type-field">
                      <span className={`field-visibility ${field.visibility}`}>
                        {getVisibilityIcon(field.visibility)}
                      </span>
                      <span className="field-name">{field.name}</span>
                      <span className="field-type">{field.type}</span>
                    </div>
                  ))}
                </div>
              </CollapsibleSection>
            )}

            {typeInfo.methods && typeInfo.methods.length > 0 && (
              <CollapsibleSection title="الدوال">
                <div className="type-methods-list">
                  {typeInfo.methods.map((method, i) => (
                    <div key={i} className="type-method">
                      <span className={`method-visibility ${method.visibility}`}>
                        {getVisibilityIcon(method.visibility)}
                      </span>
                      <span className="method-name">{method.name}</span>
                      <span className="method-sig">{method.signature}</span>
                    </div>
                  ))}
                </div>
              </CollapsibleSection>
            )}

            {typeInfo.details && (
              <CollapsibleSection title="التفاصيل" defaultOpen={false}>
                <pre className="type-details">{typeInfo.details}</pre>
              </CollapsibleSection>
            )}
          </div>
        )}

        {!typeInfo && !loading && !error && (
          <div className="type-empty">
            <Type size={32} />
            <span>لا توجد معلومات نوع</span>
            <span className="type-empty-hint">ضع المؤشر على متغير أو تعبير</span>
          </div>
        )}
      </div>
    </div>
  )
}

function getKindLabel(kind: TypeInfo['kind']): string {
  switch (kind) {
    case 'primitive': return 'أساسي'
    case 'class': return 'صنف'
    case 'interface': return 'ميثاق'
    case 'function': return 'دالة'
    case 'generic': return 'معمم'
    case 'array': return 'مصفوفة'
    case 'map': return 'قاموس'
    default: return 'مجهول'
  }
}

function getVisibilityIcon(visibility: 'public' | 'private' | 'protected'): string {
  switch (visibility) {
    case 'public': return '○'
    case 'private': return '●'
    case 'protected': return '◐'
  }
}
