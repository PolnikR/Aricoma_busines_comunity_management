import { useEffect, useMemo } from 'react'
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { PositionedInfrastructureTopology } from '../layout/layoutInfrastructureTopology'
import {
  mapTopologyToFlowElements,
  type InfrastructureFlowNode,
} from './topologyFlowModel'
import { topologyNodeTypes } from './topologyNodeTypes'

interface InfrastructureTopologyCanvasProps {
  topology: PositionedInfrastructureTopology
  fitViewRequest?: number
}

function InfrastructureTopologyCanvasContent({
  topology,
  fitViewRequest = 0,
}: InfrastructureTopologyCanvasProps) {
  const flowElements = useMemo(() => mapTopologyToFlowElements(topology), [topology])
  const [nodes, setNodes, onNodesChange] = useNodesState<InfrastructureFlowNode>(
    flowElements.nodes,
  )
  const [edges, setEdges, onEdgesChange] = useEdgesState(flowElements.edges)
  const { fitView } = useReactFlow()

  useEffect(() => {
    setNodes(flowElements.nodes)
    setEdges(flowElements.edges)
  }, [flowElements, setEdges, setNodes])

  useEffect(() => {
    const animationFrame = window.requestAnimationFrame(() => {
      void fitView({ duration: 300, padding: 0.08, minZoom: 0.45, maxZoom: 0.9 })
    })

    return () => {
      window.cancelAnimationFrame(animationFrame)
    }
  }, [fitView, fitViewRequest, topology])

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={topologyNodeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodesDraggable={false}
      nodesConnectable={false}
      edgesReconnectable={false}
      panOnDrag
      selectionOnDrag={false}
      zoomOnPinch
      preventScrolling
      deleteKeyCode={null}
      minZoom={0.15}
      maxZoom={1.6}
      fitView
      fitViewOptions={{ padding: 0.08, minZoom: 0.45, maxZoom: 0.9 }}
      proOptions={{ hideAttribution: true }}
      className="bg-[#f8fbfe]"
      aria-label="Infrastructure topology diagram"
    >
      <Background
        variant={BackgroundVariant.Dots}
        gap={22}
        size={1}
        color="#cbd9e7"
      />
      <Controls
        position="bottom-left"
        showInteractive={false}
        className="overflow-hidden! rounded-xl! border! border-[#d7e4ef]! bg-white! shadow-sm!"
      />
      <MiniMap
        position="bottom-right"
        pannable
        zoomable
        nodeColor={(node) => {
          if (node.type === 'cluster') return '#465fff'
          if (node.type === 'host') return '#0ba5ec'
          if (node.type === 'datastore') return '#f79009'
          return '#12b76a'
        }}
        maskColor="rgba(226, 235, 244, 0.72)"
        className="h-24! w-36! cursor-grab! rounded-xl! border! border-[#d7e4ef]! bg-white! shadow-sm! active:cursor-grabbing!"
      />
    </ReactFlow>
  )
}

export function InfrastructureTopologyCanvas(props: InfrastructureTopologyCanvasProps) {
  return (
    <div
      className="size-full min-h-0 min-w-0 max-w-full touch-none lg:touch-auto"
      aria-label="Infrastructure topology canvas"
    >
      <ReactFlowProvider>
        <InfrastructureTopologyCanvasContent {...props} />
      </ReactFlowProvider>
    </div>
  )
}
