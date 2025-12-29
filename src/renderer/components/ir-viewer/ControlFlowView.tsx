import React, { useEffect, useRef, useState, useCallback } from 'react'
import * as d3 from 'd3'
import dagreD3 from 'dagre-d3'
import { Network, ZoomIn, ZoomOut, Maximize2, List } from 'lucide-react'
import { IRFunction, IRBasicBlock, extractCFG } from '../../utils/tarqeemIRParser'

interface ControlFlowViewProps {
  func: IRFunction | null
  onHighlightRange?: (start: number, end: number) => void
}

export default function ControlFlowView({ func, onHighlightRange }: ControlFlowViewProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [selectedBlock, setSelectedBlock] = useState<IRBasicBlock | null>(null)
  const [zoom, setZoom] = useState(1)

  // Render the CFG using dagre-d3
  const renderCFG = useCallback(() => {
    if (!func || !svgRef.current || !containerRef.current) return

    const { nodes, edges } = extractCFG(func)

    // Clear previous graph
    d3.select(svgRef.current).selectAll('*').remove()

    // Create a new directed graph
    const g = new dagreD3.graphlib.Graph()
      .setGraph({
        rankdir: 'TB',
        marginx: 20,
        marginy: 20,
        nodesep: 50,
        ranksep: 50,
        edgesep: 20
      })
      .setDefaultEdgeLabel(() => ({}))

    // Add nodes
    nodes.forEach((node) => {
      const block = func.blocks.find((b) => b.id === node.id)
      const hasTerminator = block?.instructions.some(
        (i) => i.op === 'ret' || i.op === 'throw'
      )
      const hasPhi = block?.instructions.some((i) => i.isPhi)

      g.setNode(node.id, {
        label: `${node.id}\n(${node.instructionCount} تعليمات)`,
        class: `cfg-node ${hasTerminator ? 'cfg-exit' : ''} ${hasPhi ? 'cfg-phi' : ''} ${node.id === 'bb0' ? 'cfg-entry' : ''}`,
        shape: 'rect',
        rx: 5,
        ry: 5,
        padding: 10
      })
    })

    // Add edges
    edges.forEach((edge) => {
      g.setEdge(edge.from, edge.to, {
        curve: d3.curveBasis,
        arrowhead: 'vee'
      })
    })

    // Create the renderer
    const render = new dagreD3.render()

    // Set up the SVG
    const svg = d3.select(svgRef.current)
    const svgGroup = svg.append('g')

    // Run the renderer
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(svgGroup as any, g as any)

    // Get graph dimensions
    const graphInfo = g.graph() as { width?: number; height?: number } | undefined
    const graphWidth = graphInfo?.width || 400
    const graphHeight = graphInfo?.height || 300

    // Set SVG dimensions
    svg
      .attr('width', containerRef.current.clientWidth)
      .attr('height', Math.max(containerRef.current.clientHeight - 40, graphHeight + 40))

    // Set up zoom behavior
    const zoomBehavior = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        svgGroup.attr('transform', event.transform)
        setZoom(event.transform.k)
      })

    svg.call(zoomBehavior)

    // Initial centering
    const containerWidth = containerRef.current.clientWidth
    const containerHeight = containerRef.current.clientHeight - 40
    const initialScale = Math.min(
      containerWidth / (graphWidth + 40),
      containerHeight / (graphHeight + 40),
      1
    )
    const translateX = (containerWidth - graphWidth * initialScale) / 2
    const translateY = 20

    svg.call(
      zoomBehavior.transform,
      d3.zoomIdentity.translate(translateX, translateY).scale(initialScale)
    )

    // Add click handlers to nodes
    svgGroup.selectAll('.cfg-node').on('click', function () {
      const nodeId = d3.select(this).select('tspan').text().split('\n')[0]
      const block = func.blocks.find((b) => b.id === nodeId)
      if (block) {
        setSelectedBlock(block)
      }
    })

    // Style nodes
    svgGroup.selectAll('.node rect').style('cursor', 'pointer')
  }, [func])

  // Re-render when function changes
  useEffect(() => {
    renderCFG()
  }, [renderCFG])

  // Handle window resize
  useEffect(() => {
    const handleResize = () => renderCFG()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [renderCFG])

  // Zoom controls
  const handleZoomIn = () => {
    if (!svgRef.current) return
    const svg = d3.select(svgRef.current)
    svg.transition().call(
      d3.zoom<SVGSVGElement, unknown>().scaleBy as unknown as (
        transition: d3.Transition<SVGSVGElement, unknown, null, undefined>,
        k: number
      ) => void,
      1.3
    )
  }

  const handleZoomOut = () => {
    if (!svgRef.current) return
    const svg = d3.select(svgRef.current)
    svg.transition().call(
      d3.zoom<SVGSVGElement, unknown>().scaleBy as unknown as (
        transition: d3.Transition<SVGSVGElement, unknown, null, undefined>,
        k: number
      ) => void,
      0.7
    )
  }

  const handleFitToView = () => {
    renderCFG()
  }

  if (!func) {
    return (
      <div className="ir-cfg-view ir-empty-state">
        <Network size={32} />
        <span>اختر دالة لعرض مخطط تدفق التحكم</span>
      </div>
    )
  }

  return (
    <div className="ir-cfg-view">
      {/* Toolbar */}
      <div className="ir-cfg-toolbar">
        <div className="ir-cfg-info">
          <span className="ir-cfg-fn-name">@{func.name}</span>
          <span className="ir-cfg-stats">
            {func.blocks.length} كتل | {func.blocks.reduce((sum, b) => sum + b.successors.length, 0)}{' '}
            حواف
          </span>
        </div>
        <div className="ir-cfg-controls">
          <button className="ir-cfg-btn" onClick={handleZoomOut} title="تصغير">
            <ZoomOut size={14} />
          </button>
          <span className="ir-zoom-level">{Math.round(zoom * 100)}%</span>
          <button className="ir-cfg-btn" onClick={handleZoomIn} title="تكبير">
            <ZoomIn size={14} />
          </button>
          <button className="ir-cfg-btn" onClick={handleFitToView} title="ملائمة للعرض">
            <Maximize2 size={14} />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="ir-cfg-legend">
        <div className="ir-legend-item">
          <div className="ir-legend-node ir-legend-entry" />
          <span>نقطة الدخول</span>
        </div>
        <div className="ir-legend-item">
          <div className="ir-legend-node ir-legend-exit" />
          <span>نقطة الخروج</span>
        </div>
        <div className="ir-legend-item">
          <div className="ir-legend-node ir-legend-phi" />
          <span>يحتوي phi</span>
        </div>
      </div>

      {/* Graph container */}
      <div className="ir-cfg-container" ref={containerRef}>
        <svg ref={svgRef} className="ir-cfg-svg" />
      </div>

      {/* Selected block details */}
      {selectedBlock && (
        <div className="ir-cfg-block-details">
          <div className="ir-block-details-header">
            <List size={14} />
            <span>{selectedBlock.id}</span>
            {selectedBlock.label && <span className="ir-block-label">({selectedBlock.label})</span>}
            <button
              className="ir-block-close"
              onClick={() => setSelectedBlock(null)}
            >
              &times;
            </button>
          </div>
          <div className="ir-block-details-content">
            <div className="ir-block-meta">
              {selectedBlock.predecessors.length > 0 && (
                <div className="ir-block-preds">
                  <span className="ir-meta-label">من:</span>
                  {selectedBlock.predecessors.map((p) => (
                    <span key={p} className="ir-block-ref">
                      {p}
                    </span>
                  ))}
                </div>
              )}
              {selectedBlock.successors.length > 0 && (
                <div className="ir-block-succs">
                  <span className="ir-meta-label">إلى:</span>
                  {selectedBlock.successors.map((s) => (
                    <span key={s} className="ir-block-ref">
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="ir-block-instructions">
              {selectedBlock.instructions.map((instr, idx) => (
                <div
                  key={idx}
                  className={`ir-block-instr ${instr.isPhi ? 'ir-phi' : ''} ${instr.isTerminator ? 'ir-terminator' : ''}`}
                >
                  {instr.raw}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
