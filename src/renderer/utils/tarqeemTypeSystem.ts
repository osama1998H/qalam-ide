/**
 * Tarqeem Type System Utilities
 *
 * Contains static type compatibility rules and helpers for
 * extracting type information from LSP hover responses.
 */

// Type compatibility interfaces
export interface ConversionTarget {
  type: string
  conversionType: 'implicit' | 'explicit' | 'unsafe'
  description: string
}

export interface AssignableType {
  type: string
  description: string
}

export interface TypeCompatibility {
  convertsTo: ConversionTarget[]
  assignableFrom: AssignableType[]
}

export interface ClassHierarchy {
  parent?: string
  interfaces?: string[]
}

export interface TypeArgument {
  parameterName: string
  actualType: string
  constraint?: string
}

export interface GenericInstantiation {
  baseType: string
  typeArguments: TypeArgument[]
}

// Tarqeem primitive type compatibility rules
const PRIMITIVE_COMPATIBILITY: Record<string, TypeCompatibility> = {
  'عدد': {
    convertsTo: [
      { type: 'عدد_عشري', conversionType: 'implicit', description: 'ترقية ضمنية' },
      { type: 'نص', conversionType: 'explicit', description: 'يتطلب إلى_نص()' },
      { type: 'عدد?', conversionType: 'implicit', description: 'تغليف في اختياري' }
    ],
    assignableFrom: [
      { type: 'عدد', description: 'نفس النوع' }
    ]
  },
  'عدد_عشري': {
    convertsTo: [
      { type: 'نص', conversionType: 'explicit', description: 'يتطلب إلى_نص()' },
      { type: 'عدد_عشري?', conversionType: 'implicit', description: 'تغليف في اختياري' }
    ],
    assignableFrom: [
      { type: 'عدد', description: 'ترقية ضمنية من عدد صحيح' },
      { type: 'عدد_عشري', description: 'نفس النوع' }
    ]
  },
  'نص': {
    convertsTo: [
      { type: 'نص?', conversionType: 'implicit', description: 'تغليف في اختياري' }
    ],
    assignableFrom: [
      { type: 'نص', description: 'نفس النوع' },
      { type: 'عدد', description: 'دمج نصي تلقائي' },
      { type: 'عدد_عشري', description: 'دمج نصي تلقائي' },
      { type: 'منطقي', description: 'دمج نصي تلقائي' }
    ]
  },
  'منطقي': {
    convertsTo: [
      { type: 'نص', conversionType: 'explicit', description: 'يتطلب إلى_نص()' },
      { type: 'منطقي?', conversionType: 'implicit', description: 'تغليف في اختياري' }
    ],
    assignableFrom: [
      { type: 'منطقي', description: 'نفس النوع' }
    ]
  },
  'لا_شيء': {
    convertsTo: [],
    assignableFrom: []
  },
  'أي': {
    convertsTo: [],
    assignableFrom: [
      { type: '(جميع الأنواع)', description: 'يقبل أي نوع' }
    ]
  },
  'أبداً': {
    convertsTo: [
      { type: '(جميع الأنواع)', conversionType: 'implicit', description: 'نوع القاع - يتوافق مع كل شيء' }
    ],
    assignableFrom: []
  }
}

// Generic type parameter definitions
export interface GenericTypeInfo {
  params: string[]
  defaultConstraints?: Record<string, string>
}

export const KNOWN_GENERICS: Record<string, GenericTypeInfo> = {
  'مصفوفة': { params: ['T'] },
  'قاموس': {
    params: ['K', 'V'],
    defaultConstraints: { 'K': 'قابل_للمقارنة' }
  },
  'اختياري': { params: ['T'] },
  'نتيجة': { params: ['T', 'E'] },
  'مستقبل': { params: ['T'] },
  'مولد': { params: ['T'] }
}

/**
 * Get compatibility rules for a primitive type
 */
export function getPrimitiveCompatibility(typeName: string): TypeCompatibility | undefined {
  return PRIMITIVE_COMPATIBILITY[typeName]
}

/**
 * Get compatibility for optional types (T?)
 */
export function getOptionalTypeCompatibility(baseType: string): TypeCompatibility {
  return {
    convertsTo: [],
    assignableFrom: [
      { type: baseType, description: 'القيمة الفعلية' },
      { type: 'لا_شيء', description: 'قيمة معدومة' }
    ]
  }
}

/**
 * Get compatibility for array types (مصفوفة<T>)
 */
export function getArrayTypeCompatibility(elementType: string): TypeCompatibility {
  return {
    convertsTo: [
      { type: `مصفوفة<${elementType}>?`, conversionType: 'implicit', description: 'تغليف في اختياري' }
    ],
    assignableFrom: [
      { type: `مصفوفة<${elementType}>`, description: 'نفس النوع' },
      { type: '[]', description: 'مصفوفة فارغة' }
    ]
  }
}

/**
 * Get compatibility for map types (قاموس<K,V>)
 */
export function getMapTypeCompatibility(keyType: string, valueType: string): TypeCompatibility {
  return {
    convertsTo: [
      { type: `قاموس<${keyType},${valueType}>?`, conversionType: 'implicit', description: 'تغليف في اختياري' }
    ],
    assignableFrom: [
      { type: `قاموس<${keyType},${valueType}>`, description: 'نفس النوع' },
      { type: '{}', description: 'قاموس فارغ' }
    ]
  }
}

/**
 * Get generic type info (parameter names and constraints)
 */
export function getGenericInfo(baseType: string): GenericTypeInfo | undefined {
  return KNOWN_GENERICS[baseType]
}

/**
 * Parse generic instantiation from type string like "مصفوفة<عدد>"
 */
export function parseGenericInstantiation(typeString: string): GenericInstantiation | null {
  const match = typeString.match(/^(\w+)<(.+?)>$/)
  if (!match) return null

  const baseType = match[1]
  const argsString = match[2]
  const genericInfo = KNOWN_GENERICS[baseType]

  if (!genericInfo) {
    // Unknown generic - use default T param
    return {
      baseType,
      typeArguments: [{
        parameterName: 'T',
        actualType: argsString.trim()
      }]
    }
  }

  // Parse multiple type arguments separated by ، or ,
  const args = argsString.split(/[،,]/).map(a => a.trim())
  const typeArguments: TypeArgument[] = genericInfo.params.map((param, i) => ({
    parameterName: param,
    actualType: args[i] || 'أي',
    constraint: genericInfo.defaultConstraints?.[param]
  }))

  return {
    baseType,
    typeArguments
  }
}

/**
 * Parse class hierarchy from hover text
 * Pattern: صنف اسم يرث الأب يلتزم ميثاق١، ميثاق٢
 */
export function parseClassHierarchy(text: string): ClassHierarchy | null {
  const match = text.match(/يرث\s+(\w+)|يلتزم\s+(.+?)(?:\s*\{|$)/g)
  if (!match) return null

  const hierarchy: ClassHierarchy = {}

  for (const m of match) {
    const parentMatch = m.match(/يرث\s+(\w+)/)
    if (parentMatch) {
      hierarchy.parent = parentMatch[1]
    }

    const interfaceMatch = m.match(/يلتزم\s+(.+?)(?:\s*\{|$)/)
    if (interfaceMatch) {
      hierarchy.interfaces = interfaceMatch[1].split(/[،,]/).map(i => i.trim())
    }
  }

  return (hierarchy.parent || hierarchy.interfaces) ? hierarchy : null
}

/**
 * Get type compatibility based on type kind and name
 */
export function getTypeCompatibility(
  typeName: string,
  kind: 'primitive' | 'class' | 'interface' | 'function' | 'generic' | 'array' | 'map' | 'unknown'
): TypeCompatibility | undefined {
  // Check for optional type (ends with ?)
  if (typeName.endsWith('?')) {
    const baseType = typeName.slice(0, -1)
    return getOptionalTypeCompatibility(baseType)
  }

  // Check for primitive
  const primitiveCompat = getPrimitiveCompatibility(typeName)
  if (primitiveCompat) {
    return primitiveCompat
  }

  // Check for array
  if (typeName.startsWith('مصفوفة<') && typeName.endsWith('>')) {
    const elementType = typeName.slice(7, -1)
    return getArrayTypeCompatibility(elementType)
  }

  // Check for map
  if (typeName.startsWith('قاموس<') && typeName.endsWith('>')) {
    const inner = typeName.slice(6, -1)
    const parts = inner.split(/[،,]/).map(p => p.trim())
    if (parts.length >= 2) {
      return getMapTypeCompatibility(parts[0], parts[1])
    }
  }

  // Class/interface types - basic optional wrapping
  if (kind === 'class' || kind === 'interface') {
    return {
      convertsTo: [
        { type: `${typeName}?`, conversionType: 'implicit', description: 'تغليف في اختياري' }
      ],
      assignableFrom: [
        { type: typeName, description: 'نفس النوع' }
      ]
    }
  }

  return undefined
}

/**
 * Check if a type is a known primitive
 */
export function isPrimitiveType(typeName: string): boolean {
  const primitives = ['عدد', 'عدد_عشري', 'نص', 'منطقي', 'لا_شيء', 'أي', 'أبداً']
  return primitives.includes(typeName)
}

/**
 * Get Arabic label for type kind
 */
export function getTypeKindLabel(kind: string): string {
  const labels: Record<string, string> = {
    'primitive': 'أساسي',
    'class': 'صنف',
    'interface': 'ميثاق',
    'function': 'دالة',
    'generic': 'معمم',
    'array': 'مصفوفة',
    'map': 'قاموس',
    'unknown': 'مجهول'
  }
  return labels[kind] || 'مجهول'
}
