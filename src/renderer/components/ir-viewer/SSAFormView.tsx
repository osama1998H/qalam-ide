import React, { useMemo } from 'react'
import { GitBranch, AlertCircle, CheckCircle, Variable, ArrowRight } from 'lucide-react'
import { IRFunction, IRInstruction, getDefinedVariables, hasPhiNodes } from '../../utils/tarqeemIRParser'

interface SSAFormViewProps {
  func: IRFunction | null
  onHighlightRange?: (start: number, end: number) => void
}

interface VariableDefinition {
  name: string
  type: string
  block: string
  instruction: IRInstruction
  isPhi: boolean
}

interface VariableUse {
  varName: string
  block: string
  instruction: IRInstruction
}

export default function SSAFormView({ func, onHighlightRange }: SSAFormViewProps) {
  // Collect all variable definitions and uses
  const { definitions, uses, isSSA } = useMemo(() => {
    if (!func) {
      return { definitions: [], uses: [], isSSA: false }
    }

    const defs: VariableDefinition[] = []
    const varUses: VariableUse[] = []
    const varDefCount = new Map<string, number>()

    for (const block of func.blocks) {
      for (const instr of block.instructions) {
        // Track definitions
        if (instr.dest) {
          const count = varDefCount.get(instr.dest) || 0
          varDefCount.set(instr.dest, count + 1)

          defs.push({
            name: instr.dest,
            type: instr.destType || 'unknown',
            block: block.id,
            instruction: instr,
            isPhi: instr.isPhi
          })
        }

        // Track uses (variables in operands)
        for (const op of instr.operands) {
          if (op.startsWith('%')) {
            varUses.push({
              varName: op,
              block: block.id,
              instruction: instr
            })
          }
        }
      }
    }

    // Check if it's true SSA (each variable defined exactly once)
    const ssaForm = Array.from(varDefCount.values()).every((count) => count === 1)

    return { definitions: defs, uses: varUses, isSSA: ssaForm }
  }, [func])

  // Group definitions by variable
  const groupedDefs = useMemo(() => {
    const groups = new Map<string, VariableDefinition[]>()
    for (const def of definitions) {
      const existing = groups.get(def.name) || []
      existing.push(def)
      groups.set(def.name, existing)
    }
    return groups
  }, [definitions])

  // Get uses for a variable
  const getUsesForVar = (varName: string): VariableUse[] => {
    return uses.filter((u) => u.varName === varName)
  }

  if (!func) {
    return (
      <div className="ir-ssa-view ir-empty-state">
        <Variable size={32} />
        <span>اختر دالة لعرض صيغة التعيين الوحيد</span>
      </div>
    )
  }

  const hasPhis = hasPhiNodes(func)

  return (
    <div className="ir-ssa-view">
      {/* SSA Status */}
      <div className={`ir-ssa-status ${isSSA ? 'ir-ssa-valid' : 'ir-ssa-invalid'}`}>
        {isSSA ? (
          <>
            <CheckCircle size={16} />
            <span>صيغة SSA صحيحة - كل متغير معرّف مرة واحدة</span>
          </>
        ) : (
          <>
            <AlertCircle size={16} />
            <span>ليست صيغة SSA كاملة - بعض المتغيرات معرّفة أكثر من مرة</span>
          </>
        )}
      </div>

      {/* Phi Nodes Summary */}
      {hasPhis && (
        <div className="ir-phi-summary">
          <GitBranch size={16} />
          <span>تحتوي على عقد phi للدمج عند نقاط التقاء التحكم</span>
        </div>
      )}

      {/* Function Header */}
      <div className="ir-ssa-header">
        <span className="ir-fn-keyword">{func.isAsync ? 'async fn' : 'fn'}</span>
        <span className="ir-fn-name">@{func.name}</span>
        <span className="ir-fn-sig">
          ({func.params.map((p) => `${p.name}: ${p.type}`).join(', ')})
          {func.returnType !== 'void' && ` -> ${func.returnType}`}
        </span>
      </div>

      {/* Variables Summary */}
      <div className="ir-ssa-summary">
        <div className="ir-summary-item">
          <span className="ir-summary-label">المتغيرات:</span>
          <span className="ir-summary-value">{groupedDefs.size}</span>
        </div>
        <div className="ir-summary-item">
          <span className="ir-summary-label">التعريفات:</span>
          <span className="ir-summary-value">{definitions.length}</span>
        </div>
        <div className="ir-summary-item">
          <span className="ir-summary-label">الاستخدامات:</span>
          <span className="ir-summary-value">{uses.length}</span>
        </div>
        {hasPhis && (
          <div className="ir-summary-item">
            <span className="ir-summary-label">عقد Phi:</span>
            <span className="ir-summary-value">
              {definitions.filter((d) => d.isPhi).length}
            </span>
          </div>
        )}
      </div>

      {/* Variable Definitions and Uses */}
      <div className="ir-ssa-variables">
        <div className="ir-section-header">التعريفات والاستخدامات</div>
        {Array.from(groupedDefs.entries()).map(([varName, defs]) => (
          <div key={varName} className="ir-ssa-var-group">
            <div className="ir-ssa-var-header">
              <Variable size={14} />
              <span className="ir-var-name">{varName}</span>
              <span className="ir-var-type">: {defs[0].type}</span>
              {defs.some((d) => d.isPhi) && (
                <span className="ir-phi-badge">phi</span>
              )}
            </div>

            {/* Definitions */}
            <div className="ir-ssa-defs">
              <div className="ir-def-label">تعريف:</div>
              {defs.map((def, idx) => (
                <div
                  key={idx}
                  className={`ir-ssa-def ${def.isPhi ? 'ir-phi-def' : ''}`}
                >
                  <span className="ir-def-block">[{def.block}]</span>
                  <span className="ir-def-instr">{def.instruction.raw}</span>
                </div>
              ))}
            </div>

            {/* Uses */}
            {getUsesForVar(varName).length > 0 && (
              <div className="ir-ssa-uses">
                <div className="ir-use-label">
                  <ArrowRight size={12} />
                  استخدام في:
                </div>
                {getUsesForVar(varName).map((use, idx) => (
                  <div key={idx} className="ir-ssa-use">
                    <span className="ir-use-block">[{use.block}]</span>
                    <span className="ir-use-op">{use.instruction.op}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Phi Nodes Detail */}
      {hasPhis && (
        <div className="ir-phi-nodes">
          <div className="ir-section-header">
            <GitBranch size={14} />
            عقد Phi (نقاط الدمج)
          </div>
          {func.blocks.map((block) => {
            const phiInstrs = block.instructions.filter((i) => i.isPhi)
            if (phiInstrs.length === 0) return null

            return (
              <div key={block.id} className="ir-phi-block">
                <div className="ir-phi-block-header">
                  <span className="ir-block-id">{block.id}</span>
                  {block.predecessors.length > 0 && (
                    <span className="ir-block-preds">
                      (من: {block.predecessors.join(', ')})
                    </span>
                  )}
                </div>
                {phiInstrs.map((instr, idx) => (
                  <div key={idx} className="ir-phi-instr">
                    <span className="ir-phi-dest">{instr.dest}</span>
                    <span className="ir-phi-equals"> = </span>
                    <span className="ir-phi-keyword">phi</span>
                    <span className="ir-phi-incoming">{instr.operands.join(' ')}</span>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
