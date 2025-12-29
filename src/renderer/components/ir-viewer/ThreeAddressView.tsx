import React, { useState } from 'react'
import { ChevronDown, ChevronLeft, Box, Zap, GitBranch, Database } from 'lucide-react'
import { IRModule, IRFunction, IRBasicBlock, IRInstruction, getInstructionCategory } from '../../utils/tarqeemIRParser'

interface ThreeAddressViewProps {
  irModule: IRModule
  rawIR: string
  selectedFunction: string
  onHighlightRange?: (start: number, end: number) => void
}

// Get icon for instruction category
function getCategoryIcon(category: string): React.ReactNode {
  const iconSize = 12
  switch (category) {
    case 'arithmetic':
      return <Box size={iconSize} className="ir-icon ir-icon-arithmetic" />
    case 'memory':
      return <Database size={iconSize} className="ir-icon ir-icon-memory" />
    case 'control':
      return <GitBranch size={iconSize} className="ir-icon ir-icon-control" />
    case 'call':
      return <Zap size={iconSize} className="ir-icon ir-icon-call" />
    case 'phi':
      return <GitBranch size={iconSize} className="ir-icon ir-icon-phi" />
    default:
      return <Box size={iconSize} className="ir-icon ir-icon-other" />
  }
}

// Instruction line component
function InstructionLine({ instr, index }: { instr: IRInstruction; index: number }) {
  const category = getInstructionCategory(instr.op)

  return (
    <div className={`ir-instruction ir-instr-${category}`}>
      <span className="ir-instr-index">{index.toString().padStart(2, '0')}</span>
      {getCategoryIcon(category)}
      <span className="ir-instr-text">
        {instr.dest && (
          <>
            <span className="ir-var">{instr.dest}</span>
            {instr.destType && <span className="ir-type">: {instr.destType}</span>}
            <span className="ir-equals"> = </span>
          </>
        )}
        <span className={`ir-op ir-op-${category}`}>{instr.op}</span>
        {instr.operands.length > 0 && (
          <span className="ir-operands"> {instr.operands.join(' ')}</span>
        )}
      </span>
    </div>
  )
}

// Basic block component
function BasicBlockView({ block }: { block: IRBasicBlock }) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div className="ir-block">
      <div className="ir-block-header" onClick={() => setExpanded(!expanded)}>
        <span className="ir-expand-icon">
          {expanded ? <ChevronDown size={12} /> : <ChevronLeft size={12} />}
        </span>
        <span className="ir-block-id">{block.id}:</span>
        {block.label && <span className="ir-block-label">; {block.label}</span>}
        <span className="ir-block-meta">
          ({block.instructions.length} تعليمات)
        </span>
      </div>
      {expanded && (
        <div className="ir-block-instructions">
          {block.instructions.map((instr, idx) => (
            <InstructionLine key={idx} instr={instr} index={idx} />
          ))}
        </div>
      )}
    </div>
  )
}

// Function view component
function FunctionView({ func }: { func: IRFunction }) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div className="ir-function">
      <div className="ir-function-header" onClick={() => setExpanded(!expanded)}>
        <span className="ir-expand-icon">
          {expanded ? <ChevronDown size={14} /> : <ChevronLeft size={14} />}
        </span>
        <span className="ir-fn-keyword">{func.isAsync ? 'async fn' : 'fn'}</span>
        <span className="ir-fn-name">@{func.name}</span>
        <span className="ir-fn-params">
          ({func.params.map((p) => `${p.name}: ${p.type}`).join(', ')})
        </span>
        {func.returnType !== 'void' && (
          <span className="ir-fn-return"> -&gt; {func.returnType}</span>
        )}
      </div>
      {expanded && (
        <div className="ir-function-body">
          {func.blocks.map((block) => (
            <BasicBlockView key={block.id} block={block} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function ThreeAddressView({
  irModule,
  rawIR,
  selectedFunction,
  onHighlightRange
}: ThreeAddressViewProps) {
  const [showRaw, setShowRaw] = useState(false)

  // Get selected function or show all
  const functionsToShow = selectedFunction
    ? irModule.functions.filter((f) => f.name === selectedFunction)
    : irModule.functions

  return (
    <div className="ir-tac-view">
      {/* Toggle for raw IR view */}
      <div className="ir-view-toggle">
        <button
          className={`ir-toggle-btn ${!showRaw ? 'active' : ''}`}
          onClick={() => setShowRaw(false)}
        >
          عرض منسق
        </button>
        <button
          className={`ir-toggle-btn ${showRaw ? 'active' : ''}`}
          onClick={() => setShowRaw(true)}
        >
          عرض خام
        </button>
      </div>

      {showRaw ? (
        <pre className="ir-raw-view">{rawIR}</pre>
      ) : (
        <div className="ir-structured-view">
          {/* Module info */}
          {irModule.name && (
            <div className="ir-module-info">
              <span className="ir-module-label">; Module:</span>
              <span className="ir-module-name">{irModule.name}</span>
            </div>
          )}

          {/* String table */}
          {irModule.strings.length > 0 && (
            <div className="ir-string-table">
              <div className="ir-section-header">; جدول النصوص</div>
              {irModule.strings.map((s) => (
                <div key={s.id} className="ir-string-entry">
                  <span className="ir-string-id">str#{s.id}</span>
                  <span className="ir-string-equals"> = </span>
                  <span className="ir-string-value">"{s.value}"</span>
                </div>
              ))}
            </div>
          )}

          {/* Classes */}
          {irModule.classes.length > 0 && (
            <div className="ir-classes">
              <div className="ir-section-header">; الأصناف</div>
              {irModule.classes.map((cls) => (
                <div key={cls.name} className="ir-class">
                  <div className="ir-class-header">
                    <span className="ir-keyword">struct</span>{' '}
                    <span className="ir-class-name">%class.{cls.name}</span> {'{'}
                  </div>
                  <div className="ir-class-fields">
                    {cls.fields.map((field) => (
                      <div key={field.name} className="ir-field">
                        <span className="ir-field-name">{field.name}</span>
                        <span className="ir-field-type">: {field.type}</span>
                      </div>
                    ))}
                  </div>
                  <div className="ir-class-close">{'}'}</div>
                </div>
              ))}
            </div>
          )}

          {/* Globals */}
          {irModule.globals.length > 0 && (
            <div className="ir-globals">
              <div className="ir-section-header">; المتغيرات العامة</div>
              {irModule.globals.map((g) => (
                <div key={g.name} className="ir-global">
                  <span className="ir-keyword">global</span>{' '}
                  <span className="ir-global-name">@{g.name}</span>
                  <span className="ir-global-type">: {g.type}</span>
                  {g.value && (
                    <>
                      <span className="ir-equals"> = </span>
                      <span className="ir-global-value">{g.value}</span>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Functions */}
          <div className="ir-functions">
            {functionsToShow.map((func) => (
              <FunctionView key={func.name} func={func} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
