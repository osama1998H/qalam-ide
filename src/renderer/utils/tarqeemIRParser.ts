/**
 * Tarqeem IR Parser Utility
 *
 * Parses IR text output from `tarqeem compile --dump-ir` into structured data.
 */

// ============================================================================
// Interfaces
// ============================================================================

export interface IRModule {
  name: string
  strings: IRStringEntry[]
  classes: IRClass[]
  globals: IRGlobal[]
  functions: IRFunction[]
}

export interface IRStringEntry {
  id: number
  value: string
}

export interface IRClass {
  name: string
  fields: IRField[]
}

export interface IRField {
  name: string
  type: string
}

export interface IRGlobal {
  name: string
  type: string
  value?: string
}

export interface IRFunction {
  name: string
  params: IRParam[]
  returnType: string
  isAsync: boolean
  blocks: IRBasicBlock[]
}

export interface IRParam {
  name: string
  type: string
}

export interface IRBasicBlock {
  id: string
  label?: string
  instructions: IRInstruction[]
  predecessors: string[]
  successors: string[]
}

export interface IRInstruction {
  raw: string
  dest?: string
  destType?: string
  op: string
  operands: string[]
  isTerminator: boolean
  isPhi: boolean
}

export interface CFGNode {
  id: string
  label: string
  instructionCount: number
  predecessors: string[]
  successors: string[]
}

export interface CFGEdge {
  from: string
  to: string
  label?: string
}

// ============================================================================
// Parser
// ============================================================================

/**
 * Parse IR text output into structured IRModule
 */
export function parseIR(irText: string): IRModule {
  const lines = irText.split('\n')
  const module: IRModule = {
    name: '',
    strings: [],
    classes: [],
    globals: [],
    functions: []
  }

  let currentFunction: IRFunction | null = null
  let currentBlock: IRBasicBlock | null = null
  let i = 0

  while (i < lines.length) {
    const line = lines[i].trim()

    // Skip empty lines and comments
    if (!line || line.startsWith(';')) {
      // Check for module name comment
      if (line.startsWith('; Module:')) {
        module.name = line.substring(9).trim()
      }
      // Check for string table entry
      if (line.match(/;\s*str#\d+\s*=/)) {
        const match = line.match(/;\s*str#(\d+)\s*=\s*"(.*)"/);
        if (match) {
          module.strings.push({
            id: parseInt(match[1]),
            value: match[2]
          })
        }
      }
      i++
      continue
    }

    // Parse struct/class definition
    if (line.startsWith('struct %class.')) {
      const className = line.match(/struct %class\.(\S+)/)?.[1] || 'Unknown'
      const classObj: IRClass = { name: className, fields: [] }

      i++ // Skip opening brace
      while (i < lines.length) {
        const fieldLine = lines[i].trim()
        if (fieldLine === '}') {
          i++
          break
        }
        const fieldMatch = fieldLine.match(/(\S+):\s*(.+)/)
        if (fieldMatch) {
          classObj.fields.push({
            name: fieldMatch[1],
            type: fieldMatch[2]
          })
        }
        i++
      }
      module.classes.push(classObj)
      continue
    }

    // Parse global variable
    if (line.startsWith('global @')) {
      const globalMatch = line.match(/global @(\S+):\s*(\S+)(?:\s*=\s*(.+))?/)
      if (globalMatch) {
        module.globals.push({
          name: globalMatch[1],
          type: globalMatch[2],
          value: globalMatch[3]
        })
      }
      i++
      continue
    }

    // Parse function definition
    if (line.startsWith('fn @') || line.startsWith('async fn @')) {
      const isAsync = line.startsWith('async')
      const funcMatch = line.match(/fn @(\S+)\(([^)]*)\)(?:\s*->\s*(\S+))?/)
      if (funcMatch) {
        currentFunction = {
          name: funcMatch[1],
          params: parseParams(funcMatch[2]),
          returnType: funcMatch[3] || 'void',
          isAsync,
          blocks: []
        }

        // Parse function body
        i++ // Skip opening brace if on same line, or move to next line
        if (!line.endsWith('{')) {
          i++ // Skip the opening brace line
        }

        while (i < lines.length) {
          const bodyLine = lines[i].trim()

          if (bodyLine === '}') {
            // End of function
            if (currentBlock) {
              inferBlockSuccessors(currentFunction.blocks)
              currentFunction.blocks.push(currentBlock)
              currentBlock = null
            }
            module.functions.push(currentFunction)
            currentFunction = null
            i++
            break
          }

          // Parse basic block label
          if (bodyLine.match(/^bb\d+:/)) {
            // Save previous block
            if (currentBlock) {
              currentFunction.blocks.push(currentBlock)
            }

            const blockMatch = bodyLine.match(/^(bb\d+):(?:\s*;\s*(.+))?/)
            currentBlock = {
              id: blockMatch?.[1] || 'bb0',
              label: blockMatch?.[2],
              instructions: [],
              predecessors: [],
              successors: []
            }
            i++
            continue
          }

          // Parse instruction
          if (currentBlock && bodyLine) {
            const instruction = parseInstruction(bodyLine)
            if (instruction) {
              currentBlock.instructions.push(instruction)

              // Extract successors from terminators
              if (instruction.isTerminator) {
                const successors = extractSuccessors(bodyLine)
                currentBlock.successors = successors
              }
            }
          }

          i++
        }
        continue
      }
    }

    i++
  }

  // Infer predecessors from successors
  inferPredecessors(module.functions)

  return module
}

/**
 * Parse function parameters
 */
function parseParams(paramStr: string): IRParam[] {
  if (!paramStr.trim()) return []

  return paramStr.split(',').map((p) => {
    const match = p.trim().match(/(%\d+):\s*(.+)/)
    if (match) {
      return { name: match[1], type: match[2] }
    }
    return { name: p.trim(), type: 'unknown' }
  })
}

/**
 * Parse a single instruction line
 */
function parseInstruction(line: string): IRInstruction | null {
  if (!line || line.startsWith(';')) return null

  const instruction: IRInstruction = {
    raw: line,
    op: 'unknown',
    operands: [],
    isTerminator: false,
    isPhi: false
  }

  // Check for assignment: %dest: type = op operands
  const assignMatch = line.match(/^(%\d+):\s*(\S+)\s*=\s*(.+)$/)
  if (assignMatch) {
    instruction.dest = assignMatch[1]
    instruction.destType = assignMatch[2]
    const rest = assignMatch[3]

    // Parse operation and operands
    const parts = rest.split(/\s+/)
    instruction.op = parts[0]
    instruction.operands = parts.slice(1)

    // Check for phi instruction
    if (instruction.op === 'phi') {
      instruction.isPhi = true
    }

    return instruction
  }

  // Check for terminators
  if (
    line.startsWith('ret') ||
    line.startsWith('jump') ||
    line.startsWith('br ') ||
    line.startsWith('throw')
  ) {
    instruction.isTerminator = true
    const parts = line.split(/\s+/)
    instruction.op = parts[0]
    instruction.operands = parts.slice(1)
    return instruction
  }

  // Check for call without assignment
  if (line.startsWith('call ')) {
    const parts = line.split(/\s+/)
    instruction.op = 'call'
    instruction.operands = parts.slice(1)
    return instruction
  }

  // Check for store
  if (line.startsWith('store ')) {
    const parts = line.split(/\s+/)
    instruction.op = 'store'
    instruction.operands = parts.slice(1)
    return instruction
  }

  // Generic parsing for other instructions
  const parts = line.split(/\s+/)
  instruction.op = parts[0]
  instruction.operands = parts.slice(1)

  return instruction
}

/**
 * Extract successor block IDs from terminator instruction
 */
function extractSuccessors(line: string): string[] {
  const successors: string[] = []

  // Jump: jump bb1
  const jumpMatch = line.match(/jump\s+(bb\d+)/)
  if (jumpMatch) {
    successors.push(jumpMatch[1])
    return successors
  }

  // Branch: br %cond, label bb1, label bb2
  const brMatch = line.match(/br\s+\S+,\s*label\s+(bb\d+),\s*label\s+(bb\d+)/)
  if (brMatch) {
    successors.push(brMatch[1], brMatch[2])
    return successors
  }

  // Alternative branch format: br i1 %0, bb1, bb2
  const brAltMatch = line.match(/br\s+\S+\s+\S+,\s*(bb\d+),\s*(bb\d+)/)
  if (brAltMatch) {
    successors.push(brAltMatch[1], brAltMatch[2])
    return successors
  }

  return successors
}

/**
 * Infer predecessors from successors
 */
function inferPredecessors(functions: IRFunction[]): void {
  for (const func of functions) {
    // Build map of block id to block
    const blockMap = new Map<string, IRBasicBlock>()
    for (const block of func.blocks) {
      blockMap.set(block.id, block)
    }

    // For each block, add it as predecessor to its successors
    for (const block of func.blocks) {
      for (const succId of block.successors) {
        const succBlock = blockMap.get(succId)
        if (succBlock && !succBlock.predecessors.includes(block.id)) {
          succBlock.predecessors.push(block.id)
        }
      }
    }
  }
}

/**
 * Infer successors for blocks that haven't been set yet
 * (for blocks that don't end with explicit terminators in some IR formats)
 */
function inferBlockSuccessors(blocks: IRBasicBlock[]): void {
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]
    // If no successors and not ending with ret/throw, assume fall-through to next block
    if (block.successors.length === 0 && i < blocks.length - 1) {
      const lastInstr = block.instructions[block.instructions.length - 1]
      if (lastInstr && !lastInstr.op.startsWith('ret') && lastInstr.op !== 'throw') {
        // This might be an implicit fall-through, but we shouldn't assume
        // In proper SSA form, every block should end with a terminator
      }
    }
  }
}

// ============================================================================
// CFG Extraction
// ============================================================================

/**
 * Extract Control Flow Graph from a function
 */
export function extractCFG(func: IRFunction): { nodes: CFGNode[]; edges: CFGEdge[] } {
  const nodes: CFGNode[] = func.blocks.map((block) => ({
    id: block.id,
    label: block.label || block.id,
    instructionCount: block.instructions.length,
    predecessors: block.predecessors,
    successors: block.successors
  }))

  const edges: CFGEdge[] = []
  for (const block of func.blocks) {
    for (const succId of block.successors) {
      edges.push({
        from: block.id,
        to: succId
      })
    }
  }

  return { nodes, edges }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get instruction category for syntax highlighting
 */
export function getInstructionCategory(
  op: string
): 'arithmetic' | 'memory' | 'control' | 'call' | 'phi' | 'other' {
  const arithmetic = ['add', 'sub', 'mul', 'div', 'mod', 'pow', 'neg', 'not', 'and', 'or', 'xor']
  const memory = [
    'alloca',
    'load',
    'store',
    'gep',
    'global_load',
    'global_store',
    'get_field',
    'set_field'
  ]
  const control = ['jump', 'br', 'ret', 'throw', 'switch']
  const call = ['call', 'call_indirect', 'call_method', 'call_virtual']

  if (op === 'phi') return 'phi'
  if (arithmetic.includes(op)) return 'arithmetic'
  if (memory.includes(op)) return 'memory'
  if (control.includes(op)) return 'control'
  if (call.includes(op)) return 'call'
  return 'other'
}

/**
 * Format instruction for display with Arabic labels
 */
export function formatInstructionArabic(instr: IRInstruction): string {
  const categoryLabels: Record<string, string> = {
    arithmetic: 'حسابية',
    memory: 'ذاكرة',
    control: 'تحكم',
    call: 'استدعاء',
    phi: 'دمج',
    other: 'أخرى'
  }

  const category = getInstructionCategory(instr.op)
  return `[${categoryLabels[category]}] ${instr.raw}`
}

/**
 * Check if a function has phi nodes (indicates SSA form)
 */
export function hasPhiNodes(func: IRFunction): boolean {
  return func.blocks.some((block) => block.instructions.some((instr) => instr.isPhi))
}

/**
 * Get all variables defined in a function
 */
export function getDefinedVariables(func: IRFunction): string[] {
  const vars: string[] = []
  for (const block of func.blocks) {
    for (const instr of block.instructions) {
      if (instr.dest && !vars.includes(instr.dest)) {
        vars.push(instr.dest)
      }
    }
  }
  return vars
}
